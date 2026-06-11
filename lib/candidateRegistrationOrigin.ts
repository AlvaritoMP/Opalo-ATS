/** Cómo se incorporó el trabajador al proceso masivo */
export type CandidateRegistrationOrigin = 'formulario' | 'manual' | 'masivo';

export const REGISTRATION_ORIGIN_COLUMN_ID = 'registrationOrigin';

export const REGISTRATION_ORIGIN_LABELS: Record<CandidateRegistrationOrigin, string> = {
    formulario: 'Formulario',
    manual: 'Manual',
    masivo: 'Carga masiva',
};

export const REGISTRATION_ORIGIN_BADGE_CLASS: Record<CandidateRegistrationOrigin, string> = {
    formulario: 'bg-violet-100 text-violet-800 border-violet-200',
    manual: 'bg-sky-100 text-sky-800 border-sky-200',
    masivo: 'bg-teal-100 text-teal-800 border-teal-200',
};

export function isCandidateRegistrationOrigin(value: unknown): value is CandidateRegistrationOrigin {
    return value === 'formulario' || value === 'manual' || value === 'masivo';
}

export function formatRegistrationOrigin(origin?: CandidateRegistrationOrigin | null): string {
    if (!origin) return '—';
    return REGISTRATION_ORIGIN_LABELS[origin] ?? origin;
}

/** Inserta la columna en procesos con orden guardado que aún no la incluyen */
export function ensureRegistrationOriginColumnInOrder(order: string[]): string[] {
    if (order.includes(REGISTRATION_ORIGIN_COLUMN_ID)) return order;
    const sourceIdx = order.indexOf('source');
    if (sourceIdx >= 0) {
        const out = [...order];
        out.splice(sourceIdx + 1, 0, REGISTRATION_ORIGIN_COLUMN_ID);
        return out;
    }
    const createdIdx = order.indexOf('createdAt');
    if (createdIdx >= 0) {
        const out = [...order];
        out.splice(createdIdx, 0, REGISTRATION_ORIGIN_COLUMN_ID);
        return out;
    }
    return [...order, REGISTRATION_ORIGIN_COLUMN_ID];
}
