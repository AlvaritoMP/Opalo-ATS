import type { AssessmentProfile, AssessmentTestId } from './types';

/** Columnas de la tabla masiva. El consultor las activa en el menú Columnas. */
export const ASSESSMENT_STATUS_COLUMNS: { id: string; testId: AssessmentTestId; label: string }[] = [
    { id: 'assessmentBarsit', testId: 'barsit', label: 'Barsit' },
    { id: 'assessmentInteligencia', testId: 'inteligencia', label: 'Raven' },
    { id: 'assessmentPersonalidad', testId: 'personalidad', label: 'Personalidad D' },
];

const BY_ID = new Map(ASSESSMENT_STATUS_COLUMNS.map((col) => [col.id, col]));

export function isAssessmentColumnId(colId: string): boolean {
    return BY_ID.has(colId);
}

export function assessmentColumnLabel(colId: string): string | undefined {
    return BY_ID.get(colId)?.label;
}

export function assessmentColumnsForProfile(profile?: AssessmentProfile | null): { id: string; label: string }[] {
    if (profile === 'mandos') {
        return ASSESSMENT_STATUS_COLUMNS.filter((col) => col.testId === 'barsit' || col.testId === 'personalidad');
    }
    if (profile === 'operativos') {
        return ASSESSMENT_STATUS_COLUMNS.filter((col) => col.testId === 'inteligencia' || col.testId === 'personalidad');
    }
    return [];
}

export function assessmentStatusColumnId(testId: AssessmentTestId): string {
    return ASSESSMENT_STATUS_COLUMNS.find((col) => col.testId === testId)?.id || '';
}
