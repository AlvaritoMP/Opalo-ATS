import { normalizeDniDigits } from '../complementaryFicha';

export function buildPublicAssessmentsUrl(dni?: string): string {
    const url = new URL(window.location.origin);
    url.searchParams.set('pruebas', '1');
    const digits = normalizeDniDigits(dni);
    if (digits) url.searchParams.set('dni', digits);
    return url.toString();
}

export function isPublicAssessmentsRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('pruebas');
}

export function getAssessmentDniFromUrl(): string {
    if (typeof window === 'undefined') return '';
    return normalizeDniDigits(new URLSearchParams(window.location.search).get('dni'));
}
