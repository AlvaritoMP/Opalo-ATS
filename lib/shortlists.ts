import type { ShortlistColumnKey, ShortlistEvent } from '../types';
import { normalizeDniDigits } from './complementaryFicha';

export const SHORTLIST_COLUMNS: { key: ShortlistColumnKey; label: string; hint: string }[] = [
    { key: 'presentacion', label: 'Presentación', hint: 'El cliente revisa la ficha' },
    { key: 'entrevista', label: 'Entrevista', hint: 'Pasa a entrevista' },
    { key: 'finalista', label: 'Finalista', hint: 'Queda designado finalista' },
];

const COLUMN_INDEX: Record<ShortlistColumnKey, number> = {
    presentacion: 0,
    entrevista: 1,
    finalista: 2,
};

export function shortlistColumnLabel(column: ShortlistColumnKey): string {
    return SHORTLIST_COLUMNS.find(item => item.key === column)?.label || column;
}

export function nextShortlistColumn(column: ShortlistColumnKey): ShortlistColumnKey | null {
    const index = COLUMN_INDEX[column];
    return SHORTLIST_COLUMNS[index + 1]?.key || null;
}

/** El cliente solo avanza un paso. El equipo puede corregir hacia cualquier columna. */
export function canMoveShortlistColumn(
    from: ShortlistColumnKey,
    to: ShortlistColumnKey,
    mode: 'staff' | 'client'
): boolean {
    if (from === to) return false;
    if (mode === 'staff') return true;
    return COLUMN_INDEX[to] === COLUMN_INDEX[from] + 1;
}

export function createShortlistToken(): string {
    const bytes = new Uint8Array(18);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function normalizeAccessDni(value?: string | null): string {
    return normalizeDniDigits(value);
}

export function isValidAccessDni(value?: string | null): boolean {
    return normalizeAccessDni(value).length >= 8;
}

export function buildPublicShortlistUrl(token: string): string {
    const url = new URL(window.location.origin);
    url.searchParams.set('sala', token);
    return url.toString();
}

export function readPublicShortlistToken(): string | null {
    if (typeof window === 'undefined') return null;
    const token = new URLSearchParams(window.location.search).get('sala')?.trim() || '';
    if (token.length < 16) return null;
    return token;
}

export function isPublicShortlistRoute(): boolean {
    return readPublicShortlistToken() !== null;
}

export function shortlistEventText(event: ShortlistEvent): string {
    const payload = event.payload || {};
    const name = typeof payload.candidateName === 'string' ? payload.candidateName : 'un candidato';
    const from = typeof payload.from === 'string' ? shortlistColumnLabel(payload.from as ShortlistColumnKey) : '';
    const to = typeof payload.to === 'string' ? shortlistColumnLabel(payload.to as ShortlistColumnKey) : '';
    switch (event.eventType) {
        case 'added':
            return `presentó a ${name}`;
        case 'moved':
            return from && to ? `pasó a ${name} de ${from} a ${to}` : `movió a ${name}`;
        case 'rejected':
            return `rechazó a ${name}`;
        case 'removed':
            return `quitó a ${name} de la sala`;
        case 'comment':
            if (payload.kind === 'appointment') return `agendó la cita final de ${name}`;
            if (payload.kind === 'interview') return 'marcó la disponibilidad de la sala';
            if (payload.scope === 'room') return 'comentó en la sala';
            return `comentó sobre ${name}`;
        case 'closed':
            return 'cerró la sala';
        case 'reopened':
            return 'reabrió la sala';
        case 'access':
            return 'ingresó a la sala';
        default:
            return 'registró una acción';
    }
}

export function formatShortlistWhen(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}
