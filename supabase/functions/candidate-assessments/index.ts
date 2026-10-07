// Enlace público de pruebas: el candidato entra con su DNI, sin login del ATS.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  type AssessmentProfile,
  type AssessmentTestId,
  factorForTrait,
  levelIdForScore,
  netToPersonalityLevel,
  publicQuestions,
  scoreTest,
  TEST_META,
  testsForProfile,
} from '../_shared/assessmentBank.ts'

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

const ASSESSMENT_STATUS_COLUMN: Record<string, string> = {
  barsit: 'assessmentBarsit',
  inteligencia: 'assessmentInteligencia',
  personalidad: 'assessmentPersonalidad',
}

function assessmentStatusLabel(state: TestState): string {
  if (state.status === 'completed') {
    const score = state.score
    const max = state.maxScore
    if (typeof score === 'number' && typeof max === 'number') return `Realizada ${score}/${max}`
    return 'Realizada'
  }
  if (state.status === 'in_progress' || typeof state.startedAt === 'string') return 'En curso'
  return 'Pendiente'
}

function withAssessmentStatus(bulk: unknown, testId: string, state: TestState): Record<string, unknown> {
  const key = ASSESSMENT_STATUS_COLUMN[testId]
  const next = asObject(bulk)
  if (!key) return next
  next[key] = assessmentStatusLabel(state)
  return next
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function profileOf(bulk: unknown): AssessmentProfile | null {
  const value = asObject(bulk).assessmentProfile
  if (value === 'mandos' || value === 'operativos') return value
  return null
}

type TestState = Record<string, unknown>

function testsOf(results: Record<string, unknown>): Record<string, TestState> {
  const tests = asObject(results.tests)
  const out: Record<string, TestState> = {}
  for (const [key, value] of Object.entries(tests)) out[key] = asObject(value)
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) return json({ error: 'Server misconfigured' }, 500)

    const body = await req.json().catch(() => ({}))
    const action = typeof body?.action === 'string' ? body.action.trim() : ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    if (action === 'rescore') {
      const candidateId = typeof body?.candidateId === 'string' ? body.candidateId.trim() : ''
      if (!candidateId) return json({ error: 'Falta el candidato.' }, 400)
      const { data: row, error } = await supabase
        .from('candidates')
        .select('id, process_id, assessment_results, psycholaboral_evaluation, bulk_column_values')
        .eq('id', candidateId)
        .eq('app_name', APP_NAME)
        .maybeSingle()
      if (error) return json({ error: 'No se pudieron leer los resultados', details: error.message }, 500)
      if (!row) return json({ error: 'Candidato no encontrado.' }, 404)
      const results = asObject(row.assessment_results)
      const tests = testsOf(results)
      for (const testId of Object.keys(tests)) {
        if (tests[testId].status !== 'completed') continue
        if (testId !== 'barsit' && testId !== 'inteligencia' && testId !== 'personalidad') continue
        const scored = scoreTest(testId, tests[testId].answers)
        tests[testId] = { ...tests[testId], ...scored, answers: tests[testId].answers }
      }
      results.tests = tests
      results.updatedAt = new Date().toISOString()
      const profile = (results.profile === 'mandos' || results.profile === 'operativos')
        ? results.profile as AssessmentProfile
        : null
      const evaluation = profile === 'operativos'
        ? await mergeOperativosReport(supabase, asObject(row.psycholaboral_evaluation), tests)
        : null
      let bulkValues = asObject(row.bulk_column_values)
      for (const [id, state] of Object.entries(tests)) {
        bulkValues = withAssessmentStatus(bulkValues, id, state)
      }
      const patch: Record<string, unknown> = { assessment_results: results, bulk_column_values: bulkValues }
      if (evaluation) patch.psycholaboral_evaluation = evaluation
      const { error: updateError } = await supabase.from('candidates').update(patch).eq('id', candidateId).eq('app_name', APP_NAME)
      if (updateError) return json({ error: 'No se pudo recalcular', details: updateError.message }, 500)
      return json({ ok: true })
    }

    const dniKey = normalizeDni(body?.dni)
    if (!dniKey || dniKey.length < 8) {
      return json({ error: 'Ingresa un número de documento válido (mínimo 8 dígitos).' }, 400)
    }

    const { data: rows, error } = await supabase
      .from('candidates')
      .select('id, name, dni, process_id, archived, assessment_results, psycholaboral_evaluation, bulk_column_values, created_at')
      .eq('app_name', APP_NAME)
      .eq('archived', false)
      .not('dni', 'is', null)
      .or(`dni.eq.${dniKey},dni.ilike.%${dniKey}%`)
      .order('created_at', { ascending: false })
      .limit(40)

    if (error) {
      const missing = /assessment_results/i.test(error.message || '')
      return json({
        error: missing
          ? 'Falta la columna de resultados. Ejecuta MIGRATION_ADD_ASSESSMENT_RESULTS.sql en Supabase.'
          : 'No se pudo buscar el candidato',
        details: error.message,
      }, 500)
    }

    const matches = (rows || []).filter((row) => normalizeDni(row.dni as string) === dniKey)
    if (matches.length === 0) {
      return json({ error: 'No encontramos un candidato activo con ese documento. Verifica el número o contacta a selección.' }, 404)
    }

    const processIds = [...new Set(matches.map((m) => m.process_id).filter(Boolean))]
    const processById = new Map<string, { title: string; profile: AssessmentProfile | null; position: string }>()
    if (processIds.length > 0) {
      const { data: processes } = await supabase
        .from('processes')
        .select('id, title, bulk_config')
        .eq('app_name', APP_NAME)
        .in('id', processIds)
      for (const p of processes || []) {
        const bulk = asObject(p.bulk_config)
        const psych = asObject(bulk.psycholaboral)
        processById.set(p.id, {
          title: p.title || 'Proceso',
          profile: profileOf(p.bulk_config),
          position: typeof psych.defaultPositionTitle === 'string' ? psych.defaultPositionTitle : '',
        })
      }
    }

    const eligible = matches.filter((m) => processById.get(m.process_id as string)?.profile)
    if (eligible.length === 0) {
      return json({ error: 'Tu proceso todavía no tiene pruebas asignadas. Contacta a selección.' }, 404)
    }

    const candidateId = typeof body?.candidateId === 'string' ? body.candidateId.trim() : ''
    if (!candidateId) {
      if (eligible.length > 1) {
        return json({
          multiple: true,
          matches: eligible.map((m) => ({
            candidateId: m.id,
            name: m.name,
            processId: m.process_id,
            processTitle: processById.get(m.process_id as string)?.title || 'Proceso',
            profile: processById.get(m.process_id as string)?.profile,
          })),
        })
      }
    }

    const selected = candidateId
      ? eligible.find((m) => m.id === candidateId)
      : eligible[0]
    if (!selected) return json({ error: 'El candidato seleccionado no coincide con el documento.' }, 400)

    const processInfo = processById.get(selected.process_id as string)!
    const profile = processInfo.profile!
    const results = asObject(selected.assessment_results)
    const tests = testsOf(results)

    if (action === 'lookup') {
      return json({
        multiple: false,
        candidateId: selected.id,
        name: selected.name,
        processId: selected.process_id,
        processTitle: processInfo.title,
        position: processInfo.position || processInfo.title,
        profile,
        tests: testsForProfile(profile).map((testId) => {
          const state = tests[testId] || {}
          const meta = TEST_META[testId]
          return {
            id: testId,
            title: meta.title,
            instructions: meta.instructions,
            timeLimitSec: meta.timeLimitSec,
            status: state.status === 'completed'
              ? (state.retakeEnabled ? 'retake' : 'completed')
              : state.startedAt ? 'in_progress' : 'pending',
            startedAt: state.startedAt || null,
            submittedAt: state.submittedAt || null,
          }
        }),
      })
    }

    const testId = body?.testId as AssessmentTestId
    if (!testsForProfile(profile).includes(testId)) {
      return json({ error: 'Esa prueba no corresponde a tu proceso.' }, 400)
    }

    if (action === 'start') {
      const current = tests[testId] || {}
      const retake = current.status === 'completed' && current.retakeEnabled === true
      if (current.status === 'completed' && !retake) {
        return json({ error: 'Esta prueba ya fue enviada y solo se puede resolver una vez. Si debes repetirla, pide a selección que habilite la reevaluación.' }, 409)
      }
      const nowIso = new Date().toISOString()
      let previousAttempts = Array.isArray(current.previousAttempts) ? current.previousAttempts : []
      if (retake) {
        const archived = { ...current }
        delete archived.previousAttempts
        delete archived.retakeEnabled
        delete archived.retakeEnabledAt
        previousAttempts = [...previousAttempts, archived]
      }
      const startedAt = retake
        ? nowIso
        : (typeof current.startedAt === 'string' ? current.startedAt : nowIso)
      tests[testId] = retake
        ? { status: 'in_progress', startedAt, previousAttempts }
        : { ...current, status: 'in_progress', startedAt, previousAttempts }
      const next = {
        ...results,
        profile,
        processId: selected.process_id,
        updatedAt: new Date().toISOString(),
        tests,
      }
      const { error: updateError } = await supabase
        .from('candidates')
        .update({
          assessment_results: next,
          bulk_column_values: withAssessmentStatus(selected.bulk_column_values, testId, tests[testId]),
        })
        .eq('id', selected.id)
        .eq('app_name', APP_NAME)
      if (updateError) return json({ error: 'No se pudo iniciar la prueba', details: updateError.message }, 500)
      const meta = TEST_META[testId]
      const deadlineAt = meta.timeLimitSec
        ? new Date(new Date(startedAt).getTime() + meta.timeLimitSec * 1000).toISOString()
        : null
      return json({
        testId,
        title: meta.title,
        instructions: meta.instructions,
        startedAt,
        deadlineAt,
        questions: publicQuestions(testId),
      })
    }

    if (action === 'submit') {
      const current = tests[testId] || {}
      if (current.status === 'completed') {
        return json({ error: 'Esta prueba ya fue enviada y solo se puede resolver una vez.' }, 409)
      }
      const meta = TEST_META[testId]
      const startedAt = typeof current.startedAt === 'string' ? current.startedAt : new Date().toISOString()
      const now = new Date()
      const deadline = meta.timeLimitSec ? new Date(new Date(startedAt).getTime() + meta.timeLimitSec * 1000) : null
      const timedOut = !!(deadline && now.getTime() > deadline.getTime() + 1500)
      const scored = scoreTest(testId, body?.answers)
      const submittedAt = now.toISOString()
      tests[testId] = {
        status: 'completed',
        startedAt,
        submittedAt,
        timedOut,
        durationSec: Math.max(0, Math.round((now.getTime() - new Date(startedAt).getTime()) / 1000)),
        score: scored.score,
        maxScore: scored.maxScore,
        scaledScore: scored.scaledScore,
        factors: scored.factors,
        dominant: scored.dominant,
        items: scored.items,
        answers: body?.answers && typeof body.answers === 'object' ? body.answers : {},
        retakeEnabled: false,
        previousAttempts: Array.isArray(current.previousAttempts) ? current.previousAttempts : [],
      }
      if (scored.scaledScore != null) {
        const inventory = await loadInventory(supabase)
        tests[testId].intellectualLevelId = levelIdForScore(scored.scaledScore, inventory)
      }
      const nextResults = {
        ...results,
        profile,
        processId: selected.process_id,
        updatedAt: submittedAt,
        tests,
      }
      const patch: Record<string, unknown> = {
        assessment_results: nextResults,
        bulk_column_values: withAssessmentStatus(selected.bulk_column_values, testId, tests[testId]),
      }
      if (profile === 'operativos') {
        patch.psycholaboral_evaluation = await mergeOperativosReport(
          supabase,
          asObject(selected.psycholaboral_evaluation),
          tests,
        )
      }
      const { error: updateError } = await supabase
        .from('candidates')
        .update(patch)
        .eq('id', selected.id)
        .eq('app_name', APP_NAME)
      if (updateError) return json({ error: 'No se pudo guardar la prueba', details: updateError.message }, 500)
      return json({ ok: true, submittedAt, timedOut })
    }

    return json({ error: 'Acción no reconocida' }, 400)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado'
    return json({ error: message }, 500)
  }
})

async function loadInventory(supabase: ReturnType<typeof createClient>): Promise<{ id: string; scoreRange?: string }[]> {
  const { data } = await supabase
    .from('app_settings')
    .select('psycholaboral_inventory')
    .eq('app_name', APP_NAME)
    .maybeSingle()
  const inventory = asObject(data?.psycholaboral_inventory)
  const levels = inventory.intellectualLevels
  return Array.isArray(levels) ? levels as { id: string; scoreRange?: string }[] : []
}

async function loadTraits(supabase: ReturnType<typeof createClient>): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from('app_settings')
    .select('psycholaboral_inventory')
    .eq('app_name', APP_NAME)
    .maybeSingle()
  const inventory = asObject(data?.psycholaboral_inventory)
  const traits = inventory.personalityTraits
  if (Array.isArray(traits) && traits.length > 0) return traits as { id: string; name: string }[]
  return [
    { id: 'estabilidad_emocional', name: 'Estabilidad Emocional' },
    { id: 'autoconcepto', name: 'Autoconcepto' },
    { id: 'sociabilidad', name: 'Sociabilidad' },
  ]
}

async function mergeOperativosReport(
  supabase: ReturnType<typeof createClient>,
  existing: Record<string, unknown>,
  tests: Record<string, TestState>,
) {
  const personalityTest = tests.personalidad
  const intel = tests.inteligencia
  const traits = await loadTraits(supabase)
  const factors = asObject(personalityTest?.factors) as Record<string, { most?: number; least?: number; net?: number }>
  const previousPersonality = Array.isArray(existing.personality) ? existing.personality as Record<string, unknown>[] : []

  const personality = personalityTest?.status === 'completed'
    ? traits.map((trait) => {
        const prev = previousPersonality.find((p) => p.traitId === trait.id) || {}
        const factor = factorForTrait(trait.id, trait.name)
        const stats = factor ? factors[factor] : null
        const net = typeof stats?.net === 'number' ? stats.net : null
        const level = net == null ? (prev.level || 'promedio') : netToPersonalityLevel(net)
        const generated = factor && stats
          ? `Prueba D · ${factor}: MÁS ${stats.most ?? 0}, MENOS ${stats.least ?? 0}, neto ${stats.net ?? 0}.`
          : ''
        return {
          traitId: trait.id,
          level,
          observations: generated || (typeof prev.observations === 'string' ? prev.observations : ''),
        }
      })
    : previousPersonality

  let intellectualLevelId = typeof existing.intellectualLevelId === 'string' ? existing.intellectualLevelId : ''
  let intellectualScore = typeof existing.intellectualScore === 'number' ? existing.intellectualScore : undefined
  if (intel?.status === 'completed' && typeof intel.scaledScore === 'number') {
    const inventory = await loadInventory(supabase)
    intellectualScore = intel.scaledScore
    intellectualLevelId = levelIdForScore(intellectualScore, inventory)
  }

  const resolvedLevel = intellectualLevelId || (typeof existing.intellectualLevelId === 'string' ? existing.intellectualLevelId : '')
  return {
    ...existing,
    ...(resolvedLevel ? { intellectualLevelId: resolvedLevel } : {}),
    ...(typeof intellectualScore === 'number' ? { intellectualScore } : {}),
    personality,
    competencies: Array.isArray(existing.competencies) ? existing.competencies : [],
    conclusions: typeof existing.conclusions === 'string' ? existing.conclusions : '',
    suitabilityStatus: existing.suitabilityStatus,
    reportDate: existing.reportDate,
    positionApplied: existing.positionApplied,
    evaluatedAt: new Date().toISOString(),
    assessmentSource: {
      profile: 'operativos',
      updatedAt: new Date().toISOString(),
      personalidad: personalityTest?.status === 'completed',
      inteligencia: intel?.status === 'completed' && typeof intel.scaledScore === 'number',
    },
  }
}
