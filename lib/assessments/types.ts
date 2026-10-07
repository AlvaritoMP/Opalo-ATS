export type AssessmentProfile = 'mandos' | 'operativos';

export type AssessmentTestId = 'barsit' | 'inteligencia' | 'personalidad';

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
};

/** Nombres que ve el candidato. El consultor sigue viendo el nombre real de cada prueba. */
export const ASSESSMENT_PUBLIC_LABELS: Record<AssessmentTestId, string> = {
    barsit: 'Prueba de aptitud',
    inteligencia: 'Prueba de aptitud',
    personalidad: 'Cuestionario',
};

export const DISC_FACTOR_LABELS: Record<DiscFactor, string> = {
    D: 'Dominancia',
    I: 'Influencia',
    S: 'Estabilidad',
    C: 'Cumplimiento',
};
