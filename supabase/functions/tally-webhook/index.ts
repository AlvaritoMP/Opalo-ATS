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
    const pathParts = url.pathname.split('/')
    const webhookId = pathParts[pathParts.length - 1]

    console.log(`📥 Webhook recibido de Tally - ID: ${webhookId}`)

    const tallyData = await req.json()
    console.log('📋 Datos recibidos:', JSON.stringify(tallyData, null, 2))

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const webhookUrl = `https://${url.host}${url.pathname}`
    console.log(`🔍 Buscando integración con webhook_url: ${webhookUrl}`)

    const { data: integration, error: integrationError } = await supabase
      .from('form_integrations')
      .select('*')
      .eq('webhook_url', webhookUrl)
      .maybeSingle()

    if (integrationError) {
      console.error('❌ Error buscando integración:', integrationError)
      return new Response(
        JSON.stringify({ error: 'Error buscando integración', details: integrationError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!integration) {
      console.error(`❌ Integración no encontrada para webhook: ${webhookUrl}`)
      return new Response(
        JSON.stringify({ error: 'Integration not found', webhookUrl }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Integración encontrada: ${integration.form_name} (${integration.id})`)

    const { data: process, error: processError } = await supabase
      .from('processes')
      .select('id, stages, is_bulk_process, bulk_config')
      .eq('id', integration.process_id)
      .eq('app_name', integration.app_name)
      .maybeSingle()

    if (processError) {
      console.error('❌ Error buscando proceso:', processError)
      return new Response(
        JSON.stringify({ error: 'Error buscando proceso', details: processError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!process) {
      console.error(`❌ Proceso no encontrado: ${integration.process_id}`)
      return new Response(
        JSON.stringify({ error: 'Process not found', processId: integration.process_id }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!process.stages || process.stages.length === 0) {
      console.error(`❌ Proceso no tiene etapas: ${integration.process_id}`)
      return new Response(
        JSON.stringify({ error: 'Process has no stages', processId: integration.process_id }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Proceso encontrado (masivo: ${process.is_bulk_process})`)

    const candidateData = buildTallyCandidateFromSubmission(tallyData, integration, process)
    applyImportTextCaseToCandidate(candidateData)

    candidateData.process_id = integration.process_id
    candidateData.stage_id = process.stages[0].id
    candidateData.app_name = integration.app_name

    console.log('👤 Datos del candidato mapeados:', JSON.stringify(candidateData, null, 2))

    if (!candidateData.name && !candidateData.email) {
      console.error('❌ Candidato sin nombre ni email')
      return new Response(
        JSON.stringify({ error: 'Candidate must have at least name or email', candidateData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .insert({
        ...candidateData,
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

    console.log(`✅ Candidato creado: ${candidate.id} - ${candidate.name || candidate.email}`)

    const { error: historyError } = await supabase
      .from('candidate_history')
      .insert({
        candidate_id: candidate.id,
        stage_id: process.stages[0].id,
        moved_at: new Date().toISOString(),
        moved_by: null,
        app_name: integration.app_name,
      })

    if (historyError) {
      console.warn('⚠️ Error creando historial (no crítico):', historyError)
    } else {
      console.log(`✅ Historial creado para candidato ${candidate.id}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        candidateId: candidate.id,
        candidateName: candidate.name || candidate.email,
      }),
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
