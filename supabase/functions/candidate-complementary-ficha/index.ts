// Edge Function pública: lookup y envío de ficha complementaria por DNI (sin login ATS).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { buildPrefillForm, getMissingRequired, resolveRequiredFields } from '../_shared/complementaryFichaPrefill.ts'

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

function normalizeColumnKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function stripSpaces(norm: string): string {
  return norm.replace(/\s+/g, '')
}

function isNombreCompletoLabel(name: string): boolean {
  const s = stripSpaces(normalizeColumnKey(name))
  return /nombrecompleto|nombrescompletos|fullnamecompleto|^fullname$/.test(s)
}

function inferNamePart(labelNorm: string): string | null {
  const s = stripSpaces(labelNorm)
  if (/completo/.test(s)) return null
  if (/(nombres|nombrepropia|givenname|firstname|^nombre$)/.test(s) && !/apellido/.test(s)) return 'given_names'
  if (/(apellidopaterno|appaterno|apaterno|paternal)/.test(s)) return 'paternal_surname'
  if (/(apellidomaterno|apmaterno|amaterno|maternal)/.test(s)) return 'maternal_surname'
  if (/^apellidos$|^apellidoscompletos$/.test(s)) return 'surnames_combined'
  return null
}

function setBulkCell(
  bulk: Record<string, unknown>,
  col: { id: string; name: string },
  value: unknown
) {
  bulk[col.id] = value
  const bare = normalizeColumnKey(col.name).replace(/\s+/g, ' ')
  bulk[`__name__${bare}`] = value
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
          'id, name, dni, email, phone, phone2, age, address, province, district, process_id, archived, bulk_column_values, complementary_data, complementary_filled_at, created_at'
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
      const processById = new Map<string, { title: string; bulk_config?: Record<string, unknown> | null }>()
      if (processIds.length > 0) {
        const { data: processes } = await supabase
          .from('processes')
          .select('id, title, bulk_config')
          .eq('app_name', APP_NAME)
          .in('id', processIds)
        for (const p of processes || []) {
          processById.set(p.id, {
            title: p.title || 'Proceso',
            bulk_config: (p.bulk_config as Record<string, unknown>) || null,
          })
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
            processTitle: processById.get(m.process_id)?.title || 'Proceso',
            alreadyFilled: Boolean(m.complementary_filled_at),
            filledAt: m.complementary_filled_at || undefined,
          })),
        })
      }

      const selected = matches.find((m) => m.id === candidateId)
      if (!selected) {
        return json({ error: 'El candidato seleccionado no coincide con el documento.' }, 400)
      }

      const processInfo = processById.get(selected.process_id as string)
      const bulkConfig = (processInfo?.bulk_config || {}) as Record<string, unknown>
      const customColumns = Array.isArray(bulkConfig.customColumns)
        ? (bulkConfig.customColumns as { id: string; name: string; reportNamePart?: string }[])
        : []
      const savedMapping =
        bulkConfig.complementaryFichaMapping && typeof bulkConfig.complementaryFichaMapping === 'object'
          ? (bulkConfig.complementaryFichaMapping as Record<string, string>)
          : undefined
      const columnKeyAliases =
        bulkConfig.columnKeyAliases && typeof bulkConfig.columnKeyAliases === 'object'
          ? (bulkConfig.columnKeyAliases as Record<string, string>)
          : undefined
      const requiredFields = resolveRequiredFields(
        Array.isArray(bulkConfig.complementaryFichaRequiredFields)
          ? (bulkConfig.complementaryFichaRequiredFields as string[])
          : null
      )

      const form = buildPrefillForm({
        candidate: selected as Record<string, unknown>,
        customColumns,
        savedMapping,
        columnKeyAliases,
        processTitle: processInfo?.title || '',
      })

      return json({
        multiple: false,
        prefill: {
          candidateId: selected.id,
          name: selected.name,
          processId: selected.process_id,
          processTitle: processInfo?.title || 'Proceso',
          alreadyFilled: Boolean(selected.complementary_filled_at),
          filledAt: selected.complementary_filled_at || undefined,
          requiredFields,
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
        .select('id, dni, name, email, phone, phone2, age, address, province, district, archived, process_id, bulk_column_values')
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

      let requiredFields = resolveRequiredFields(null)
      let processTitle = ''
      let isBulkProcess = false
      let customColumns: { id: string; name: string; reportNamePart?: string }[] = []
      let savedMapping: Record<string, string> = {}
      if (row.process_id) {
        const { data: processRow } = await supabase
          .from('processes')
          .select('title, bulk_config, is_bulk_process')
          .eq('id', row.process_id)
          .eq('app_name', APP_NAME)
          .maybeSingle()
        processTitle = trimText(processRow?.title) || ''
        isBulkProcess = processRow?.is_bulk_process === true
        const bulkConfig = (processRow?.bulk_config || {}) as Record<string, unknown>
        customColumns = Array.isArray(bulkConfig.customColumns)
          ? (bulkConfig.customColumns as { id: string; name: string; reportNamePart?: string }[])
          : []
        savedMapping =
          bulkConfig.complementaryFichaMapping && typeof bulkConfig.complementaryFichaMapping === 'object'
            ? (bulkConfig.complementaryFichaMapping as Record<string, string>)
            : {}
        requiredFields = resolveRequiredFields(
          Array.isArray(bulkConfig.complementaryFichaRequiredFields)
            ? (bulkConfig.complementaryFichaRequiredFields as string[])
            : null
        )
      }

      if (processTitle) {
        form.puestoContrato = processTitle
      }

      const missing = getMissingRequired(form, requiredFields)
      if (missing.length > 0) {
        return json({
          error: `Completa los campos obligatorios: ${missing.join(', ')}.`,
        }, 400)
      }

      const nombresOnly = trimText(form.nombres) || ''
      const fullName =
        composeFullName(
          nombresOnly,
          trimText(form.apellidoPaterno),
          trimText(form.apellidoMaterno)
        ) || trimText(row.name) || 'Candidato'

      const hasStructuredSurnames = customColumns.some((col) => {
        const part = col.reportNamePart || inferNamePart(normalizeColumnKey(col.name))
        return part === 'paternal_surname' || part === 'maternal_surname' || part === 'surnames_combined'
      }) || Boolean(savedMapping.apellidoPaterno || savedMapping.apellidoMaterno)

      // En masivos, la columna fija "Nombre" guarda solo nombres propios (apellidos van en columnas).
      const useGivenNamesOnly = isBulkProcess || hasStructuredSurnames || customColumns.length > 0
      const nameForCandidateColumn = useGivenNamesOnly
        ? (nombresOnly || fullName)
        : fullName

      const ageNum = Number(form.edad)
      const updatePayload: Record<string, unknown> = {
        complementary_data: form,
        complementary_filled_at: form.submittedAt,
        name: nameForCandidateColumn,
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

      // Escribir de vuelta columnas custom mapeadas (+ "Nombre completo" de exportación).
      if (customColumns.length > 0) {
        const bulk: Record<string, unknown> = {
          ...((row.bulk_column_values && typeof row.bulk_column_values === 'object'
            ? row.bulk_column_values
            : {}) as Record<string, unknown>),
        }
        const mapping = { ...savedMapping }

        for (const [fieldKey, sourceId] of Object.entries(mapping)) {
          if (!sourceId || typeof sourceId !== 'string' || !sourceId.startsWith('custom.')) continue
          const colId = sourceId.slice('custom.'.length)
          const col = customColumns.find((c) => c.id === colId)
          if (!col) continue

          let value: unknown = form[fieldKey]
          if (fieldKey === 'nombres' && isNombreCompletoLabel(col.name)) {
            value = fullName
          }
          if (value === undefined || value === null || value === '') continue
          if (typeof value === 'boolean') {
            setBulkCell(bulk, col, value ? 'Sí' : 'No')
          } else {
            setBulkCell(bulk, col, String(value).trim())
          }
        }

        for (const col of customColumns) {
          if (!isNombreCompletoLabel(col.name)) continue
          setBulkCell(bulk, col, fullName)
        }

        // Si hay columna custom de solo nombres (no la fija del proceso), sincronizar.
        for (const col of customColumns) {
          if (isNombreCompletoLabel(col.name)) continue
          const part = col.reportNamePart || inferNamePart(normalizeColumnKey(col.name))
          if (part === 'given_names' && nombresOnly) {
            setBulkCell(bulk, col, nombresOnly)
          }
        }

        updatePayload.bulk_column_values = bulk
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
