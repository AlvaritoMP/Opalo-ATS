export type AssessmentProfile = 'mandos' | 'operativos';

export type AssessmentTestId = 'barsit' | 'inteligencia' | 'personalidad' | 'riesgo' | 'atencion' | 'esfuerzo';

export type DiscFactor = 'D' | 'I' | 'S' | 'C';

export interface DiscFactorScore {
    most: number;
    least: number;
    net: number;
}

export interface AssessmentItemResult {
    id: string;
    prompt?: string;
    answer?: string;
    expected?: string;
    correct?: boolean | null;
    most?: string;
    least?: string;
    mostFactor?: DiscFactor;
    leastFactor?: DiscFactor;
    choice?: number | null;
    image?: string;
}

export interface AssessmentTestResult {
    status: 'in_progress' | 'completed';
    /** El consultor autorizó una sola reevaluación. El candidato no puede repetir sin esto. */
    retakeEnabled?: boolean;
    retakeEnabledAt?: string;
    previousAttempts?: Array<Record<string, unknown>>;
    startedAt?: string;
    submittedAt?: string;
    timedOut?: boolean;
    durationSec?: number;
    score?: number | null;
    maxScore?: number | null;
    /** Puntaje llevado a escala 0-60 para el informe psicolaboral. */
    scaledScore?: number | null;
    intellectualLevelId?: string | null;
    factors?: Record<DiscFactor, DiscFactorScore>;
    dominant?: DiscFactor | null;
    items?: AssessmentItemResult[];
    interpretation?: {
        band: string;
        title: string;
        summary: string;
        notes: string[];
    };
    telemetry?: Record<string, number | string | null>;
}

export interface AssessmentResults {
    profile?: AssessmentProfile;
    processId?: string;
    updatedAt?: string;
    tests?: Partial<Record<AssessmentTestId, AssessmentTestResult>>;
}

export const ASSESSMENT_PROFILE_LABELS: Record<AssessmentProfile, string> = {
    mandos: 'Mandos medios y superiores',
    operativos: 'Operativos y básicos',
};

export const ASSESSMENT_TEST_LABELS: Record<AssessmentTestId, string> = {
    barsit: 'Prueba Barsit',
    inteligencia: 'Prueba de inteligencia',
    personalidad: 'Prueba de personalidad (D)',
    riesgo: 'Riesgo y recompensa',
    atencion: 'Atención bajo presión',
    esfuerzo: 'Esfuerzo y retorno',
};

/** Nombres que ve el candidato. El consultor sigue viendo el nombre real de cada prueba. */
export const ASSESSMENT_PUBLIC_LABELS: Record<AssessmentTestId, string> = {
    barsit: 'Prueba de aptitud',
    inteligencia: 'Prueba de aptitud',
    personalidad: 'Cuestionario',
    riesgo: 'Riesgo y recompensa',
    atencion: 'Atención bajo presión',
    esfuerzo: 'Esfuerzo y retorno',
};

export const BEHAVIORAL_METHOD: Partial<Record<AssessmentTestId, string>> = {
    riesgo: 'Cada globo puede reventar entre la inflada 1 y la 32, sin avisar. Cobrar guarda 10 puntos por inflada de esa ronda; reventar las pierde. El dato central es el promedio de infladas en los globos que sí cobró. Las infladas justo después de una explosión muestran si el fallo le corta el plan o lo mantiene.',
    atencion: 'Debe responder solo a la flecha del centro, en menos de 800 ms, ignorando las de los costados. El efecto de interferencia es cuántos milisegundos más tarda cuando los costados apuntan al revés. También se comparan los errores del inicio con los del final, y los fallos en menos de 200 ms.',
    esfuerzo: 'En cada ronda elige una tarea fácil de 1 crédito seguro o una retadora de 3 créditos con probabilidad anunciada de 20, 50 u 80 %. La probabilidad es la chance de cobrar después de completar los toques, no la chance de poder hacerlos. Se mira en qué probabilidades elige la retadora y si llega a terminarla.',
};

export const BEHAVIORAL_TELEMETRY_LABELS: Record<string, string> = {
    adjustedAveragePumps: 'Infladas promedio en globos cobrados',
    bankedPoints: 'Puntos cobrados',
    popped: 'Globos reventados',
    cashed: 'Globos cobrados',
    popRate: 'Globos reventados (%)',
    meanPumpLatencyMs: 'Latencia media entre infladas (ms)',
    postFailureAveragePumps: 'Infladas promedio tras una explosión',
    rtCongruentMs: 'Reacción en figuras congruentes (ms)',
    rtIncongruentMs: 'Reacción en figuras incongruentes (ms)',
    flankerEffectMs: 'Efecto de interferencia (ms)',
    errorCongruentPct: 'Error en congruentes (%)',
    errorIncongruentPct: 'Error en incongruentes (%)',
    errorFirst10Pct: 'Error en los primeros 10 (%)',
    errorLast10Pct: 'Error en los últimos 10 (%)',
    fastErrors: 'Errores en menos de 200 ms',
    hardChoiceAt20Pct: 'Elige la retadora al 20 % (%)',
    hardChoiceAt50Pct: 'Elige la retadora al 50 % (%)',
    hardChoiceAt80Pct: 'Elige la retadora al 80 % (%)',
    hardCompletionPct: 'Completa la retadora (%)',
    easyCompletionPct: 'Completa la fácil (%)',
    meanDecisionMs: 'Tiempo medio para elegir (ms)',
    credits: 'Créditos obtenidos',
};

export const DISC_FACTOR_LABELS: Record<DiscFactor, string> = {
    D: 'Dominancia',
    I: 'Influencia',
    S: 'Estabilidad',
    C: 'Cumplimiento',
};
