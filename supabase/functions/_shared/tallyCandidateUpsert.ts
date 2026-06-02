/**
 * Upsert Tally → candidato (Deno Edge). Mantener alineado con lib/tallyCandidateUpsert.ts
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Supa = any

function normalizeDniKey(dni?: string): string {
  return (dni || '').replace(/\D/g, '')
}

function normalizePhoneKey(phone?: string): string {
  return (phone || '').replace(/\D/g, '')
}

function normalizeEmailKey(email?: string): string {
  return (email || '').trim().toLowerCase()
}

function isPlaceholderImportEmail(email?: string): boolean {
  if (!email) return false
  return /@import\.opalo$/i.test(email) || /^sin-email\./i.test(email)
}

function hasBulkCellValue(val: unknown): boolean {
  if (val === null || val === undefined) return false
  if (typeof val === 'boolean') return true
  if (typeof val === 'number') return !Number.isNaN(val)
  if (typeof val === 'string') return val.trim() !== ''
  return true
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  return false
}

function pickMergedValue(existing: unknown, incoming: unknown): unknown {
  if (!isEmptyValue(existing)) return existing
  if (!isEmptyValue(incoming)) return incoming
  return existing
}

const STANDARD_MERGE_KEYS = [
  'name', 'email', 'phone', 'phone2', 'description', 'source',
  'salary_expectation', 'dni', 'linkedin_url', 'address', 'province', 'district', 'age',
]

const SELECT_COLS =
  'id, name, email, phone, phone2, description, source, salary_expectation, dni, linkedin_url, address, province, district, age, bulk_column_values, application_count, first_application_at, created_at, stage_id, application_started_date'

export interface TallyUpsertResult {
  candidateId: string
  isReapplication: boolean
  applicationCount: number
}

function matchExisting(rows: Record<string, unknown>[], incoming: Record<string, unknown>) {
  const dniKey = normalizeDniKey(incoming.dni as string)
  const emailKey = normalizeEmailKey(incoming.email as string)
  const phoneKey = normalizePhoneKey(incoming.phone as string)
  const hasRealEmail = emailKey && !isPlaceholderImportEmail(emailKey)

  if (dniKey) {
    const m = rows.find((r) => normalizeDniKey(r.dni as string) === dniKey)
    if (m) return m
  }
  if (hasRealEmail) {
    const m = rows.find(
      (r) => normalizeEmailKey(r.email as string) === emailKey && !isPlaceholderImportEmail(r.email as string)
    )
    if (m) return m
  }
  if (phoneKey) {
    const m = rows.find((r) => normalizePhoneKey(r.phone as string) === phoneKey)
    if (m) return m
  }
  return undefined
}

export async function processTallyCandidateUpsert(
  supabase: Supa,
  params: {
    processId: string
    appName: string
    stageId: string
    candidateData: Record<string, unknown>
    customColumns?: unknown[]
  }
): Promise<TallyUpsertResult> {
  const { processId, appName, stageId, candidateData } = params
  const nowIso = new Date().toISOString()

  const { data: rows, error: findError } = await supabase
    .from('candidates')
    .select(SELECT_COLS)
    .eq('process_id', processId)
    .eq('app_name', appName)
    .eq('archived', false)

  if (findError) throw findError

  const existing = rows?.length ? matchExisting(rows, candidateData) : undefined

  if (existing?.id) {
    const update: Record<string, unknown> = {
      created_at: nowIso,
      application_count: Math.max(1, Number(existing.application_count) || 1) + 1,
    }
    if (!existing.first_application_at && existing.created_at) {
      update.first_application_at = existing.created_at
    }
    for (const key of STANDARD_MERGE_KEYS) {
      const merged = pickMergedValue(existing[key], candidateData[key])
      if (merged !== undefined && merged !== existing[key]) update[key] = merged
    }
    const base = { ...((existing.bulk_column_values as Record<string, unknown>) || {}) }
    const incomingBulk = candidateData.bulk_column_values as Record<string, unknown> | undefined
    if (incomingBulk) {
      for (const [k, v] of Object.entries(incomingBulk)) {
        if (!hasBulkCellValue(base[k]) && hasBulkCellValue(v)) base[k] = v
      }
      update.bulk_column_values = base
    }
    if (isEmptyValue(existing.application_started_date)) {
      update.application_started_date = nowIso
    }
    update.application_completed_date = nowIso

    const { data: updated, error: updateError } = await supabase
      .from('candidates')
      .update(update)
      .eq('id', existing.id)
      .eq('app_name', appName)
      .select('id, application_count')
      .single()

    if (updateError) throw updateError

    await supabase.from('candidate_history').insert({
      candidate_id: existing.id,
      stage_id: existing.stage_id || stageId,
      moved_at: nowIso,
      moved_by: null,
      app_name: appName,
    })

    return {
      candidateId: updated.id as string,
      isReapplication: true,
      applicationCount: (updated.application_count as number) || 2,
    }
  }

  const bulkValues = candidateData.bulk_column_values
  const insertPayload = { ...candidateData }
  delete insertPayload.bulk_column_values

  const { data: created, error: insertError } = await supabase
    .from('candidates')
    .insert({
      ...insertPayload,
      created_at: nowIso,
      first_application_at: nowIso,
      application_count: 1,
      application_started_date: nowIso,
      application_completed_date: nowIso,
    })
    .select('id, application_count')
    .single()

  if (insertError) throw insertError

  if (bulkValues && typeof bulkValues === 'object' && Object.keys(bulkValues).length > 0) {
    const { error: bulkError } = await supabase
      .from('candidates')
      .update({ bulk_column_values: bulkValues })
      .eq('id', created.id)
    if (bulkError) console.warn('bulk_column_values:', bulkError.message)
  }

  await supabase.from('candidate_history').insert({
    candidate_id: created.id,
    stage_id: stageId,
    moved_at: nowIso,
    moved_by: null,
    app_name: appName,
  })

  return {
    candidateId: created.id as string,
    isReapplication: false,
    applicationCount: 1,
  }
}
