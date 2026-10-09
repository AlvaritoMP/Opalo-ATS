export const BEHAVIORAL_TEST_IDS = ['riesgo', 'atencion', 'esfuerzo'] as const
export type BehavioralTestId = typeof BEHAVIORAL_TEST_IDS[number]

export function isBehavioralTest(testId: string): testId is BehavioralTestId {
  return (BEHAVIORAL_TEST_IDS as readonly string[]).includes(testId)
}

export function assignedTests(profile: 'mandos' | 'operativos' | null, behavioral: boolean): string[] {
  const base = profile === 'mandos'
    ? ['barsit', 'personalidad']
    : profile === 'operativos'
      ? ['inteligencia', 'personalidad']
      : []
  if (!behavioral) return base
  return [...base, 'riesgo', 'atencion', 'esfuerzo']
}

export const BEHAVIORAL_META: Record<BehavioralTestId, { title: string; instructions: string; timeLimitSec: number }> = {
  riesgo: {
    title: 'Riesgo y recompensa',
    instructions:
      'Verás un globo y dos botones: Inflar y Cobrar.\n\nCada inflada suma 10 puntos en esa ronda y agranda el globo. Puedes cobrar y guardar esos puntos, o seguir inflando. Si el globo revienta, pierdes los puntos de esa ronda. Los puntos ya cobrados en rondas anteriores se conservan.\n\nSon 15 globos. No hay un número fijo de infladas: cada globo puede reventar en un momento distinto.\n\nTómate el tiempo de decidir. Al terminar la última ronda, la prueba se envía sola.',
    timeLimitSec: 12 * 60,
  },
  atencion: {
    title: 'Atención bajo presión',
    instructions:
      'Verás cinco flechas en fila. Responde solo según la flecha del centro: izquierda o derecha.\n\nIgnora las flechas de los costados, aunque apunten al lado contrario.\n\nCada figura dura menos de un segundo. Si no alcanzas a responder, cuenta como fallo y sigue la siguiente.\n\nSon 40 figuras, una tras otra. Mantén el ritmo hasta el final.',
    timeLimitSec: 8 * 60,
  },
  esfuerzo: {
    title: 'Esfuerzo y retorno',
    instructions:
      'En cada ronda eliges una de dos tareas.\n\nLa fácil pide pocos toques, en poco tiempo, y paga 1 crédito seguro si la completas.\n\nLa retadora pide muchos más toques, en un poco más de tiempo, y paga 3 créditos solo si la completas y sale favorecida. La probabilidad de ese favor se muestra antes de elegir (20 %, 50 % u 80 %).\n\nSon 12 rondas. Elige y completa cada tarea antes de que se acabe su tiempo.',
    timeLimitSec: 10 * 60,
  },
}

interface Rng {
  (): number
}

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const swap = next[i]
    next[i] = next[j]
    next[j] = swap
  }
  return next
}

export interface RiskPlan {
  kind: 'riesgo'
  burstAt: number[]
}

export interface AttentionPlan {
  kind: 'atencion'
  limitMs: number
  trials: Array<{ direction: 'left' | 'right'; congruent: boolean }>
}

export interface EffortPlan {
  kind: 'esfuerzo'
  rounds: Array<{ probability: 20 | 50 | 80; rewardRoll: number }>
}

export type BehavioralPlan = RiskPlan | AttentionPlan | EffortPlan

export function createBehavioralPlan(testId: BehavioralTestId, seedKey: string): BehavioralPlan {
  const rng = mulberry32(hashSeed(seedKey))
  if (testId === 'riesgo') {
    return { kind: 'riesgo', burstAt: Array.from({ length: 15 }, () => randInt(rng, 1, 32)) }
  }
  if (testId === 'atencion') {
    const trials: AttentionPlan['trials'] = []
    for (let i = 0; i < 20; i++) trials.push({ direction: i % 2 === 0 ? 'left' : 'right', congruent: true })
    for (let i = 0; i < 20; i++) trials.push({ direction: i % 2 === 0 ? 'left' : 'right', congruent: false })
    return { kind: 'atencion', limitMs: 800, trials: shuffle(rng, trials) }
  }
  const rounds: EffortPlan['rounds'] = []
  for (const probability of [20, 50, 80] as const) {
    for (let i = 0; i < 4; i++) rounds.push({ probability, rewardRoll: rng() })
  }
  return { kind: 'esfuerzo', rounds: shuffle(rng, rounds) }
}

export function publicBehavioralPlan(
  plan: BehavioralPlan,
): RiskPlan | AttentionPlan | { kind: 'esfuerzo'; rounds: Array<{ probability: 20 | 50 | 80 }> } {
  if (plan.kind === 'esfuerzo') {
    return { kind: 'esfuerzo', rounds: plan.rounds.map((round) => ({ probability: round.probability })) }
  }
  return plan
}

export interface BehavioralScore {
  score: number | null
  maxScore: number | null
  interpretation: { band: string; title: string; summary: string; notes: string[] }
  telemetry: Record<string, number | string | null>
  items: Array<Record<string, unknown>>
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function round1(value: number | null): number | null {
  if (value == null) return null
  return Math.round(value * 10) / 10
}

function scoreRisk(plan: RiskPlan, answers: unknown): BehavioralScore {
  const rounds = asArray(asRecord(answers).rounds)
  const items: Array<Record<string, unknown>> = []
  const cashedPumps: number[] = []
  const latencies: number[] = []
  const postFailPumps: number[] = []
  let popped = 0
  let cashed = 0
  let banked = 0
  let previousPopped = false

  for (let i = 0; i < plan.burstAt.length; i++) {
    const raw = asRecord(rounds[i])
    const burst = plan.burstAt[i]
    const claimed = Math.max(0, Math.round(num(raw.pumps) ?? 0))
    const didPop = claimed >= burst
    const pumps = didPop ? burst : claimed
    const didCash = !didPop && raw.cashed === true && pumps > 0
    if (didPop) popped += 1
    if (didCash) {
      cashed += 1
      cashedPumps.push(pumps)
      banked += pumps * 10
    }
    const rowLat = asArray(raw.latenciesMs).map(num).filter((n): n is number => n != null && n >= 0 && n < 20000)
    latencies.push(...rowLat)
    if (previousPopped) postFailPumps.push(pumps)
    previousPopped = didPop
    items.push({
      id: `r${i + 1}`,
      prompt: `Globo ${i + 1}`,
      answer: didPop ? `Reventó en la inflada ${burst}` : didCash ? `Cobró en ${pumps}` : 'Sin cierre',
      correct: null,
    })
  }

  const adjusted = mean(cashedPumps)
  const popRate = popped / plan.burstAt.length
  const latency = mean(latencies)
  const postFail = mean(postFailPumps)
  const drop = adjusted != null && postFail != null && adjusted > 0 ? (adjusted - postFail) / adjusted : null

  let band = 'intermedio'
  let title = 'Zona intermedia'
  let summary = 'El patrón no cae con claridad en un extremo. Conviene leerlo junto con la entrevista y el puesto.'
  if (adjusted != null && (adjusted > 20 || popRate > 0.4)) {
    band = 'impulsivo'
    title = 'Impulsivo'
    summary = 'Infla mucho y revienta con frecuencia. Le cuesta frenar la ganancia inmediata. En roles con activos, caja o normas estrictas, el riesgo de exceso es alto.'
  } else if (adjusted != null && adjusted < 8 && popRate <= 0.15) {
    band = 'conservador'
    title = 'Conservador'
    summary = 'Infla poco y casi no revienta. Prioriza no perder. Es un perfil cauteloso, que puede dejar pasar oportunidades de mayor valor.'
  } else if (adjusted != null && adjusted >= 10 && adjusted <= 18) {
    band = 'equilibrado'
    title = 'Equilibrado'
    summary = 'Asume un riesgo calculado: busca puntos sin llevar la mayoría de los globos al límite. Tolera alguna pérdida sin que el patrón se desborde.'
  }

  const notes: string[] = []
  if (postFail != null && drop != null && drop >= 0.4) {
    notes.push('Después de un globo reventado baja mucho las infladas. La pérdida le corta el plan: baja tolerancia a la frustración en el momento.')
  } else if (postFail != null && adjusted != null && Math.abs(postFail - adjusted) / Math.max(adjusted, 1) <= 0.2) {
    notes.push('Después de reventar un globo mantiene un nivel parecido de infladas. El fallo no le desarma la estrategia.')
  } else if (popped === 0) {
    notes.push('No hubo explosiones, así que no se observa cómo se recupera después de una pérdida.')
  }
  notes.push('El punto de quiebre de cada globo se sorteó entre 1 y 32 infladas, con la misma regla para todos. El promedio que importa es el de los globos cobrados, no el de los que reventaron.')

  return {
    score: banked,
    maxScore: null,
    interpretation: { band, title, summary, notes },
    telemetry: {
      adjustedAveragePumps: round1(adjusted),
      bankedPoints: banked,
      popped,
      cashed,
      popRate: round1(popRate * 100),
      meanPumpLatencyMs: latency == null ? null : Math.round(latency),
      postFailureAveragePumps: round1(postFail),
    },
    items,
  }
}

function scoreAttention(plan: AttentionPlan, answers: unknown): BehavioralScore {
  const trials = asArray(asRecord(answers).trials)
  const items: Array<Record<string, unknown>> = []
  const rtCong: number[] = []
  const rtIncong: number[] = []
  let errCong = 0
  let errIncong = 0
  let nCong = 0
  let nIncong = 0
  let fastErrors = 0
  const errorsByIndex: boolean[] = []

  plan.trials.forEach((spec, i) => {
    const raw = asRecord(trials[i])
    const choice = raw.choice === 'left' || raw.choice === 'right' ? raw.choice : null
    const rt = num(raw.rtMs)
    const inTime = rt != null && rt >= 0 && rt <= plan.limitMs
    const correct = choice === spec.direction && inTime
    const error = !correct
    if (spec.congruent) nCong += 1
    else nIncong += 1
    if (error && spec.congruent) errCong += 1
    if (error && !spec.congruent) errIncong += 1
    if (correct && rt != null) {
      if (spec.congruent) rtCong.push(rt)
      else rtIncong.push(rt)
    }
    if (error && rt != null && rt < 200) fastErrors += 1
    errorsByIndex.push(error)
    items.push({
      id: `a${i + 1}`,
      prompt: spec.congruent ? 'Congruente' : 'Incongruente',
      answer: choice ? `${choice === 'left' ? 'Izquierda' : 'Derecha'}${rt != null ? ` · ${Math.round(rt)} ms` : ''}` : 'Sin respuesta',
      correct,
    })
  })

  const meanCong = mean(rtCong)
  const meanIncong = mean(rtIncong)
  const flanker = meanCong != null && meanIncong != null ? meanIncong - meanCong : null
  const errCongRate = nCong ? errCong / nCong : 0
  const errIncongRate = nIncong ? errIncong / nIncong : 0
  const errAll = (errCong + errIncong) / Math.max(1, plan.trials.length)
  const first10 = errorsByIndex.slice(0, 10).filter(Boolean).length / Math.max(1, Math.min(10, errorsByIndex.length))
  const last10 = errorsByIndex.slice(-10).filter(Boolean).length / Math.max(1, Math.min(10, errorsByIndex.length))

  let band = 'mixto'
  let title = 'Patrón mixto'
  let summary = 'El efecto de las flechas laterales no es ni muy bajo ni muy alto. Revísalo junto con la tasa de error y el puesto.'
  if (flanker != null && flanker < 60 && errAll < 0.05) {
    band = 'enfoque'
    title = 'Enfoque alto'
    summary = 'Filtra bien las flechas de los costados y se equivoca poco. Tiene buena concentración para tareas operativas o de precisión.'
  } else if ((flanker != null && flanker > 120) || errIncongRate > 0.25) {
    band = 'interferencia'
    title = 'Sensible a interferencias'
    summary = 'Las flechas de los costados le demoran o le hacen fallar más. Bajo presión del entorno puede perder el foco de la instrucción central.'
  }

  const notes: string[] = []
  if (fastErrors >= 3) {
    notes.push(`Hay ${fastErrors} errores en menos de 200 ms. Responde antes de mirar la flecha del centro: impulsividad motora.`)
  }
  const fatigue = last10 - first10
  if (fatigue >= 0.2) {
    notes.push('En los últimos 10 intentos falla bastante más que en los primeros 10. Aparece fatiga al sostener la atención.')
  } else if (fatigue <= -0.1) {
    notes.push('Los últimos intentos no empeoran respecto de los primeros. Sostiene el rendimiento durante la serie.')
  }
  notes.push('El efecto de interferencia es la diferencia, en milisegundos, entre el tiempo de las figuras incongruentes y el de las congruentes. Solo entran las respuestas correctas y dentro de los 800 ms.')

  return {
    score: plan.trials.length - errCong - errIncong,
    maxScore: plan.trials.length,
    interpretation: { band, title, summary, notes },
    telemetry: {
      rtCongruentMs: meanCong == null ? null : Math.round(meanCong),
      rtIncongruentMs: meanIncong == null ? null : Math.round(meanIncong),
      flankerEffectMs: flanker == null ? null : Math.round(flanker),
      errorCongruentPct: round1(errCongRate * 100),
      errorIncongruentPct: round1(errIncongRate * 100),
      errorFirst10Pct: round1(first10 * 100),
      errorLast10Pct: round1(last10 * 100),
      fastErrors,
    },
    items,
  }
}

function scoreEffort(plan: EffortPlan, answers: unknown): BehavioralScore {
  const rounds = asArray(asRecord(answers).rounds)
  const items: Array<Record<string, unknown>> = []
  const byProb: Record<number, { hard: number; total: number }> = { 20: { hard: 0, total: 0 }, 50: { hard: 0, total: 0 }, 80: { hard: 0, total: 0 } }
  let hardChosen = 0
  let hardCompleted = 0
  let hardAbandoned = 0
  let easyChosen = 0
  let easyCompleted = 0
  const decisionTimes: number[] = []
  let credits = 0

  plan.rounds.forEach((spec, i) => {
    const raw = asRecord(rounds[i])
    const choice = raw.choice === 'hard' ? 'hard' : raw.choice === 'easy' ? 'easy' : null
    const taps = Math.max(0, Math.round(num(raw.taps) ?? 0))
    const elapsed = num(raw.elapsedMs)
    const decision = num(raw.decisionMs)
    if (decision != null && decision >= 0 && decision < 60000) decisionTimes.push(decision)
    const bucket = byProb[spec.probability]
    if (choice && bucket) {
      bucket.total += 1
      if (choice === 'hard') bucket.hard += 1
    }
    const easyOk = choice === 'easy' && taps >= 10 && (elapsed == null || elapsed <= 4200)
    const hardOk = choice === 'hard' && taps >= 35 && (elapsed == null || elapsed <= 6200)
    if (choice === 'hard') {
      hardChosen += 1
      if (hardOk) {
        hardCompleted += 1
        if (spec.rewardRoll < spec.probability / 100) credits += 3
      } else hardAbandoned += 1
    }
    if (choice === 'easy') {
      easyChosen += 1
      if (easyOk) {
        easyCompleted += 1
        credits += 1
      }
    }
    items.push({
      id: `e${i + 1}`,
      prompt: `Ronda ${i + 1} · ${spec.probability}%`,
      answer: choice == null
        ? 'Sin elección'
        : `${choice === 'hard' ? 'Retadora' : 'Fácil'} · ${taps} toques${(choice === 'hard' ? hardOk : easyOk) ? ' · completó' : ' · no completó'}`,
      correct: choice === 'hard' ? hardOk : easyOk,
    })
  })

  const hardAtLeast50 = (byProb[50].total + byProb[80].total) > 0
    ? (byProb[50].hard + byProb[80].hard) / (byProb[50].total + byProb[80].total)
    : 0
  const hardAtLow = byProb[20].total > 0 ? byProb[20].hard / byProb[20].total : 0
  const hardAt80 = byProb[80].total > 0 ? byProb[80].hard / byProb[80].total : 0
  const abandonRate = hardChosen > 0 ? hardAbandoned / hardChosen : 0
  const completeRate = hardChosen > 0 ? hardCompleted / hardChosen : 0

  let band = 'mixto'
  let title = 'Patrón mixto'
  let summary = 'La elección entre la tarea fácil y la retadora no sigue una regla clara. Conviene contrastarla con la motivación que cuente en la entrevista.'
  if (abandonRate >= 0.4 && hardChosen >= 3) {
    band = 'baja_autoeficacia'
    title = 'Baja autoeficacia'
    summary = 'Elige la tarea difícil pero deja de tocar antes de terminarla. El esfuerzo se corta a mitad de camino.'
  } else if (hardAtLeast50 >= 0.7 && completeRate >= 0.7) {
    band = 'logro'
    title = 'Orientación al logro'
    summary = 'Cuando la probabilidad de la tarea retadora es de 50 % o más, la elige y la termina. Busca el retorno mayor y sostiene el esfuerzo. Encaja en roles por objetivos.'
  } else if (hardAtLow <= 0.25 && hardAt80 >= 0.75 && hardAtLeast50 < 0.7) {
    band = 'pragmatico'
    title = 'Pragmático'
    summary = 'Solo se va a la tarea difícil cuando la probabilidad de éxito es alta. Prefiere el crédito seguro si el retorno es incierto.'
  }

  const pct = (part: { hard: number; total: number }) => part.total ? round1((part.hard / part.total) * 100) : null

  return {
    score: credits,
    maxScore: null,
    interpretation: {
      band,
      title,
      summary,
      notes: [
        'La probabilidad anunciada es la chance de cobrar los 3 créditos después de completar la tarea retadora. No es la chance de poder tocarla.',
        'Un abandono es elegir la retadora y no llegar a 35 toques dentro del tiempo.',
      ],
    },
    telemetry: {
      hardChoiceAt20Pct: pct(byProb[20]),
      hardChoiceAt50Pct: pct(byProb[50]),
      hardChoiceAt80Pct: pct(byProb[80]),
      hardCompletionPct: hardChosen ? round1(completeRate * 100) : null,
      easyCompletionPct: easyChosen ? round1((easyCompleted / easyChosen) * 100) : null,
      meanDecisionMs: decisionTimes.length ? Math.round(mean(decisionTimes) || 0) : null,
      credits,
    },
    items,
  }
}

export function scoreBehavioral(testId: BehavioralTestId, plan: unknown, answers: unknown): BehavioralScore {
  const record = asRecord(plan)
  if (testId === 'riesgo' && record.kind === 'riesgo' && Array.isArray(record.burstAt)) {
    return scoreRisk(record as unknown as RiskPlan, answers)
  }
  if (testId === 'atencion' && record.kind === 'atencion' && Array.isArray(record.trials)) {
    return scoreAttention({ kind: 'atencion', limitMs: 800, trials: record.trials as AttentionPlan['trials'] }, answers)
  }
  if (testId === 'esfuerzo' && record.kind === 'esfuerzo' && Array.isArray(record.rounds)) {
    return scoreEffort(record as unknown as EffortPlan, answers)
  }
  return {
    score: null,
    maxScore: null,
    interpretation: {
      band: 'incompleto',
      title: 'Sin protocolo',
      summary: 'No quedó guardado el protocolo de la prueba, así que no se puede interpretar.',
      notes: [],
    },
    telemetry: {},
    items: [],
  }
}
