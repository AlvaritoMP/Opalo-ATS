// Edge Function pública: lookup y envío de ficha complementaria por DNI (sin login ATS).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_NAME = Deno.env.get('COMPLEMENTARY_FICHA_APP_NAME') || Deno.env.get('APP_NAME') || 'Opalo ATS'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeDni(dni?: string | null): string {
  return (dni || '').replace(/\D/g, '')
}

function trimText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  const text = String(value).trim()
  return text || undefined
}

function composeFullName(nombres?: string, apellidoPaterno?: string, apellidoMaterno?: string): string {
  return [nombres, apellidoPaterno, apellidoMaterno]
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseLegacyFullName(fullName: string): {
  nombres?: string
  apellidoPaterno?: string
  apellidoMaterno?: string
} {
  const tokens = fullName.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return {}
  if (tokens.length === 1) return { nombres: tokens[0] }
  if (tokens.length === 2) return { nombres: tokens[0], apellidoPaterno: tokens[1] }
  return {
    nombres: tokens.slice(0, -2).join(' '),
    apellidoPaterno: tokens[tokens.length - 2],
    apellidoMaterno: tokens[tokens.length - 1],
  }
}

function emptyForm() {
  return {
    version: 1 as const,
    tipoDocumento: 'DNI',
    familiares: [{}],
    educacion: [{}],
    experienciaLaboral: [{}],
    antecedentesSalud: [] as unknown[],
    parienteEnOpalo: null as boolean | null,
    declaracionAceptada: false,
  }
}

function mergePrefill(base: Record<string, unknown>, fromCandidate: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...emptyForm(), ...base }
  for (const [key, value] of Object.entries(fromCandidate)) {
    if (
      key === 'version' ||
      key === 'familiares' ||
      key === 'educacion' ||
      key === 'experienciaLaboral' ||
      key === 'antecedentesSalud'
    ) {
      continue
    }
    const current = out[key]
    const empty = current === undefined || current === null || current === ''
    if (empty && value !== undefined && value !== null && value !== '') {
      out[key] = value
    }
  }
  if (!Array.isArray(out.familiares) || out.familiares.length === 0) out.familiares = [{}]
  if (!Array.isArray(out.educacion) || out.educacion.length === 0) out.educacion = [{}]
  if (!Array.isArray(out.experienciaLaboral) || out.experienciaLaboral.length === 0) {
    out.experienciaLaboral = [{}]
  }
  if (!Array.isArray(out.antecedentesSalud)) out.antecedentesSalud = []
  return out
}

function candidateToPrefillFields(row: Record<string, unknown>): Record<string, unknown> {
  const name = trimText(row.name) || ''
  const parsed = parseLegacyFullName(name)
  return {
    nombres: parsed.nombres,
    apellidoPaterno: parsed.apellidoPaterno,
    apellidoMaterno: parsed.apellidoMaterno,
    nroDocumento: trimText(row.dni),
    tipoDocumento: 'DNI',
    email: trimText(row.email),
    telefono: trimText(row.phone) || trimText(row.phone2),
    edad: row.age != null && row.age !== '' ? String(row.age) : undefined,
    direccion: trimText(row.address),
    provincia: trimText(row.province),
    distrito: trimText(row.district),
  }
}

function sanitizeForm(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const raw = input as Record<string, unknown>
  const form = { ...emptyForm(), ...raw, version: 1 as const }

  const requireText = (key: string) => trimText(form[key])
  if (!requireText('nombres') || !requireText('apellidoPaterno')) return null
  if (!requireText('nroDocumento')) return null
  if (!requireText('email') || !requireText('telefono')) return null
  if (form.declaracionAceptada !== true) return null

  form.submittedAt = new Date().toISOString()
  return form
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) {
      return json({ error: 'Server misconfigured' }, 500)
    }

    const body = await req.json().catch(() => ({}))
    const action = typeof body?.action === 'string' ? body.action.trim() : ''
    const dniKey = normalizeDni(body?.dni)

    if (!dniKey || dniKey.length < 8) {
      return json({ error: 'Ingresa un número de documento válido (mínimo 8 dígitos).' }, 400)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    if (action === 'lookup') {
      const { data: rows, error } = await supabase
        .from('candidates')
        .select(
          'id, name, dni, email, phone, phone2, age, address, province, district, process_id, archived, complementary_data, complementary_filled_at, created_at'
        )
        .eq('app_name', APP_NAME)
        .eq('archived', false)
        .not('dni', 'is', null)
        .or(`dni.eq.${dniKey},dni.ilike.%${dniKey}%`)
        .order('created_at', { ascending: false })
        .limit(40)

      if (error) {
        return json({ error: 'No se pudo buscar el candidato', details: error.message }, 500)
      }

      const matches = (rows || []).filter((row) => normalizeDni(row.dni as string) === dniKey)
      if (matches.length === 0) {
        return json({
          error:
            'No encontramos un candidato activo con ese documento. Verifica el número o contacta a selección.',
        }, 404)
      }

      const processIds = [...new Set(matches.map((m) => m.process_id).filter(Boolean))]
      const processTitleById = new Map<string, string>()
      if (processIds.length > 0) {
        const { data: processes } = await supabase
          .from('processes')
          .select('id, title')
          .eq('app_name', APP_NAME)
          .in('id', processIds)
        for (const p of processes || []) {
          processTitleById.set(p.id, p.title || 'Proceso')
        }
      }

      const candidateId =
        typeof body?.candidateId === 'string' && body.candidateId.trim()
          ? body.candidateId.trim()
          : matches.length === 1
            ? matches[0].id
            : ''

      if (!candidateId) {
        return json({
          multiple: true,
          matches: matches.map((m) => ({
            candidateId: m.id,
            name: m.name,
            processId: m.process_id,
            processTitle: processTitleById.get(m.process_id) || 'Proceso',
            alreadyFilled: Boolean(m.complementary_filled_at),
            filledAt: m.complementary_filled_at || undefined,
          })),
        })
      }

      const selected = matches.find((m) => m.id === candidateId)
      if (!selected) {
        return json({ error: 'El candidato seleccionado no coincide con el documento.' }, 400)
      }

      const saved =
        selected.complementary_data && typeof selected.complementary_data === 'object'
          ? (selected.complementary_data as Record<string, unknown>)
          : {}
      const form = mergePrefill(saved, candidateToPrefillFields(selected as Record<string, unknown>))

      return json({
        multiple: false,
        prefill: {
          candidateId: selected.id,
          name: selected.name,
          processId: selected.process_id,
          processTitle: processTitleById.get(selected.process_id) || 'Proceso',
          alreadyFilled: Boolean(selected.complementary_filled_at),
          filledAt: selected.complementary_filled_at || undefined,
          form,
        },
      })
    }

    if (action === 'submit') {
      const candidateId = typeof body?.candidateId === 'string' ? body.candidateId.trim() : ''
      if (!candidateId) {
        return json({ error: 'Falta el identificador del candidato.' }, 400)
      }

      const form = sanitizeForm(body?.form)
      if (!form) {
        return json({
          error:
            'Completa los datos obligatorios (nombres, apellido paterno, documento, correo, teléfono) y acepta la declaración.',
        }, 400)
      }

      const formDni = normalizeDni(form.nroDocumento as string)
      if (formDni !== dniKey) {
        return json({ error: 'El documento del formulario no coincide con la búsqueda.' }, 400)
      }

      const { data: row, error: loadError } = await supabase
        .from('candidates')
        .select('id, dni, name, email, phone, phone2, age, address, province, district, archived')
        .eq('id', candidateId)
        .eq('app_name', APP_NAME)
        .maybeSingle()

      if (loadError) {
        return json({ error: 'No se pudo cargar el candidato', details: loadError.message }, 500)
      }
      if (!row || row.archived) {
        return json({ error: 'Candidato no encontrado o archivado.' }, 404)
      }
      if (normalizeDni(row.dni as string) !== dniKey) {
        return json({ error: 'El documento no coincide con el candidato.' }, 400)
      }

      const fullName =
        composeFullName(
          trimText(form.nombres),
          trimText(form.apellidoPaterno),
          trimText(form.apellidoMaterno)
        ) || trimText(row.name) || 'Candidato'

      const ageNum = Number(form.edad)
      const updatePayload: Record<string, unknown> = {
        complementary_data: form,
        complementary_filled_at: form.submittedAt,
        name: fullName,
        dni: form.nroDocumento,
        email: trimText(form.email) || row.email,
        phone: trimText(form.telefono) || row.phone,
        address: trimText(form.direccion) ?? row.address,
        province: trimText(form.provincia) ?? row.province,
        district: trimText(form.distrito) ?? row.district,
      }
      if (!Number.isNaN(ageNum) && ageNum > 0) {
        updatePayload.age = Math.round(ageNum)
      }

      const { error: updateError } = await supabase
        .from('candidates')
        .update(updatePayload)
        .eq('id', candidateId)
        .eq('app_name', APP_NAME)

      if (updateError) {
        const msg = updateError.message || ''
        if (msg.includes('complementary_data') || msg.includes('complementary_filled_at') || msg.includes('schema cache')) {
          return json({
            error:
              'Falta ejecutar la migración MIGRATION_ADD_COMPLEMENTARY_FICHA.sql en Supabase.',
            details: msg,
          }, 500)
        }
        return json({ error: 'No se pudo guardar la ficha', details: msg }, 500)
      }

      return json({
        success: true,
        candidateId,
        filledAt: form.submittedAt,
      })
    }

    return json({ error: 'Acción no válida. Usa lookup o submit.' }, 400)
  } catch (error) {
    console.error('candidate-complementary-ficha error:', error)
    return json(
      {
        error: 'Internal error',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})
