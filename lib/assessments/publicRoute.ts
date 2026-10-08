import { normalizeDniDigits } from '../complementaryFicha';

export function buildPublicAssessmentsUrl(dni?: string): string {
    const url = new URL(window.location.origin);
    url.searchParams.set('pruebas', '1');
    const digits = normalizeDniDigits(dni);
    if (digits) url.searchParams.set('dni', digits);
    return url.toString();
}

/** Ancho real del teléfono en píxeles CSS, aunque screen.width venga en píxeles físicos. */
function phoneCssWidth(): number {
    const dpr = window.devicePixelRatio || 1;
    const raw = Math.min(window.screen.width || 0, window.screen.height || 0) || window.screen.width || 0;
    if (raw > 540 && dpr > 1) {
        const css = raw / dpr;
        if (css >= 280 && css <= 540) return css;
    }
    const vv = window.visualViewport;
    if (vv && vv.scale > 0 && vv.scale < 0.92 && vv.width) {
        const visible = Math.round(vv.width * vv.scale);
        if (visible >= 280 && visible <= 540) return visible;
    }
    return raw;
}

/**
 * Algunos celulares abren el enlace como sitio de escritorio y achican la página.
 * Si la pantalla es de teléfono y el layout es mucho más ancho, se fija el viewport
 * al ancho real. screen.width a veces viene en píxeles físicos (1080) y el corte
 * anterior de 520 no llegaba a corregirlo.
 */
export function ensureAssessmentsMobileViewport(): void {
    if (typeof window === 'undefined') return;
    const phone = phoneCssWidth();
    if (!phone || phone > 540) return;
    const layout = window.innerWidth || 0;
    const vv = window.visualViewport;
    const shrunk = !!vv && vv.scale > 0 && vv.scale < 0.92;
    if (!shrunk && layout > 0 && layout <= phone * 1.2) return;
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    meta.setAttribute(
        'content',
        `width=${Math.round(phone)}, initial-scale=1, minimum-scale=1, viewport-fit=cover`
    );
    if (shrunk && vv && vv.scale < 0.9) {
        const zoom = Math.min(1 / vv.scale, 2.8);
        if (zoom > 1.15) document.documentElement.style.zoom = String(Math.round(zoom * 100) / 100);
    }
}

export function isPublicAssessmentsRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('pruebas');
}
