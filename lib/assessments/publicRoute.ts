import { normalizeDniDigits } from '../complementaryFicha';

export function buildPublicAssessmentsUrl(dni?: string): string {
    const url = new URL(window.location.origin);
    url.searchParams.set('pruebas', '1');
    const digits = normalizeDniDigits(dni);
    if (digits) url.searchParams.set('dni', digits);
    return url.toString();
}

/**
 * Algunos navegadores del celular abren el enlace como sitio de escritorio
 * y achican toda la página. Si la pantalla es de teléfono y el ancho de
 * layout es mucho mayor, se fija el viewport al ancho real de la pantalla.
 */
export function ensureAssessmentsMobileViewport(): void {
    if (typeof window === 'undefined') return;
    const screenWidth = window.screen.width || 0;
    if (!screenWidth || screenWidth > 520 || window.innerWidth <= screenWidth * 1.25) return;
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    meta.setAttribute('content', `width=${Math.round(screenWidth)}, initial-scale=1, viewport-fit=cover`);
}

export function isPublicAssessmentsRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('pruebas');
}
