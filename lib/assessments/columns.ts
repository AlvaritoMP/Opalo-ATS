import type { AssessmentProfile, AssessmentTestId } from './types';

/** Columnas de la tabla masiva. El consultor las activa en el menú Columnas. */
export const ASSESSMENT_STATUS_COLUMNS: { id: string; testId: AssessmentTestId; label: string }[] = [
    { id: 'assessmentBarsit', testId: 'barsit', label: 'Barsit' },
    { id: 'assessmentInteligencia', testId: 'inteligencia', label: 'Raven' },
    { id: 'assessmentPersonalidad', testId: 'personalidad', label: 'Personalidad D' },
    { id: 'assessmentRiesgo', testId: 'riesgo', label: 'Riesgo' },
    { id: 'assessmentAtencion', testId: 'atencion', label: 'Atención' },
    { id: 'assessmentEsfuerzo', testId: 'esfuerzo', label: 'Esfuerzo' },
];

const BY_ID = new Map(ASSESSMENT_STATUS_COLUMNS.map((col) => [col.id, col]));

export function isAssessmentColumnId(colId: string): boolean {
    return BY_ID.has(colId);
}

export function assessmentColumnLabel(colId: string): string | undefined {
    return BY_ID.get(colId)?.label;
}

export function assessmentColumnsForProfile(profile?: AssessmentProfile | null, behavioral?: boolean): { id: string; label: string }[] {
    const classic = profile === 'mandos'
        ? ASSESSMENT_STATUS_COLUMNS.filter((col) => col.testId === 'barsit' || col.testId === 'personalidad')
        : profile === 'operativos'
            ? ASSESSMENT_STATUS_COLUMNS.filter((col) => col.testId === 'inteligencia' || col.testId === 'personalidad')
            : [];
    if (!behavioral) return classic;
    const extra = ASSESSMENT_STATUS_COLUMNS.filter((col) => col.testId === 'riesgo' || col.testId === 'atencion' || col.testId === 'esfuerzo');
    return [...classic, ...extra];
}

export function assessmentStatusColumnId(testId: AssessmentTestId): string {
    return ASSESSMENT_STATUS_COLUMNS.find((col) => col.testId === testId)?.id || '';
}

export function assessmentTrackingLabel(testId: AssessmentTestId): string {
    const label = ASSESSMENT_STATUS_COLUMNS.find((col) => col.testId === testId)?.label || 'Prueba';
    return `${label} completada`;
}

/** La prueba cuenta como enviada si la columna de estado dice Realizada. */
export function isAssessmentStatusComplete(value: unknown): boolean {
    if (value === true || value === 1) return true;
    const text = String(value ?? '').trim().toLowerCase();
    return text === 'true' || text === '1' || text === 'sí' || text === 'si' || text.startsWith('realizada');
}
