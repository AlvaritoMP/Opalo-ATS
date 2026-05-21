// Edge Function para recibir webhooks de Tally y crear candidatos
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { applyImportTextCaseToCandidate } from '../_shared/importTextCase.ts'
import { buildTallyCandidateFromSubmission } from '../_shared/tallyMapping.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const tallyData = await req.json()
    console.log('📋 Webhook Tally recibido')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const webhookUrl = `https://${url.host}${url.pathname}`

    const { data: integration, error: integrationError } = await supabase
      .from('form_integrations')
      .select('*')
      .eq('webhook_url', webhookUrl)
      .maybeSingle()

    if (integrationError || !integration) {
      console.error('❌ Integración no encontrada:', webhookUrl, integrationError)
      return new Response(
        JSON.stringify({ error: 'Integration not found', webhookUrl }),
        { status: integrationError ? 500 : 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: process, error: processError } = await supabase
      .from('processes')
      .select('id, is_bulk_process, bulk_config')
      .eq('id', integration.process_id)
      .eq('app_name', integration.app_name)
      .maybeSingle()

    if (processError || !process) {
      return new Response(
        JSON.stringify({ error: 'Process not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: stages, error: stagesError } = await supabase
      .from('stages')
      .select('id')
      .eq('process_id', integration.process_id)
      .eq('app_name', integration.app_name)
      .order('order_index', { ascending: true })
      .limit(1)

    if (stagesError || !stages?.length) {
      return new Response(
        JSON.stringify({ error: 'Process has no stages' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const candidateData = buildTallyCandidateFromSubmission(tallyData, integration, process)
    applyImportTextCaseToCandidate(candidateData)

    candidateData.process_id = integration.process_id
    candidateData.stage_id = stages[0].id
    candidateData.app_name = integration.app_name

    console.log('👤 Candidato mapeado:', JSON.stringify(candidateData, null, 2))

    if (!candidateData.name && !candidateData.email) {
      return new Response(
        JSON.stringify({ error: 'Candidate must have at least name or email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const bulkValues = candidateData.bulk_column_values
    const insertPayload = { ...candidateData }
    delete insertPayload.bulk_column_values

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .insert({
        ...insertPayload,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (candidateError) {
      console.error('❌ Error creando candidato:', candidateError)
      return new Response(
        JSON.stringify({ error: 'Failed to create candidate', details: candidateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (bulkValues && Object.keys(bulkValues).length > 0) {
      const { error: bulkError } = await supabase
        .from('candidates')
        .update({ bulk_column_values: bulkValues })
        .eq('id', candidate.id)

      if (bulkError) {
        console.warn('⚠️ bulk_column_values no guardado:', bulkError.message)
      } else {
        console.log('✅ bulk_column_values guardado')
      }
    }

    await supabase.from('candidate_history').insert({
      candidate_id: candidate.id,
      stage_id: stages[0].id,
      moved_at: new Date().toISOString(),
      moved_by: null,
      app_name: integration.app_name,
    })

    return new Response(
      JSON.stringify({ success: true, candidateId: candidate.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Error procesando webhook:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
