export type ContactStatus =
    | 'por_contactar'
    | 'en_intento'
    | 'interesado'
    | 'no_interesado'
    | 'inubicable';

export type ContactChannel = 'call' | 'whatsapp';

export type ContactOutcome =
    | 'no_answer'
    | 'busy'
    | 'no_response'
    | 'answered'
    | 'interested'
    | 'not_interested'
    | 'unreachable'
    | 'status_change';

export interface ContactAttempt {
    id: string;
    candidateId: string;
    processId: string;
    userId?: string;
    userName?: string;
    channel: ContactChannel;
    outcome: ContactOutcome;
    attemptNumber: number;
    statusAfter?: ContactStatus;
    notes?: string;
    createdAt: string;
}

export interface ContactSummary {
    status: ContactStatus;
    attemptCount: number;
    lastAttemptAt?: string;
    lastUserId?: string;
    lastUserName?: string;
}

export const CONTACT_COOLDOWN_MS = 10 * 60 * 1000;

export const UNREACHABLE_AFTER_CALL_ATTEMPTS = 3;

export const CONTACT_STATUS_META: Record<
    ContactStatus,
    { label: string; shortLabel: string; badgeClass: string; dot: string }
> = {
    por_contactar: {
        label: 'Por contactar',
        shortLabel: 'Por contactar',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dot: '🟢',
    },
    en_intento: {
        label: 'En intento',
        shortLabel: 'Intento',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        dot: '🟡',
    },
    interesado: {
        label: 'Interesado / En proceso',
        shortLabel: 'Interesado',
        badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
        dot: '🟠',
    },
    no_interesado: {
        label: 'No interesado / Desistió',
        shortLabel: 'No interesado',
        badgeClass: 'bg-red-100 text-red-800 border-red-300',
        dot: '🔴',
    },
    inubicable: {
        label: 'Inubicable (descarte)',
        shortLabel: 'Inubicable',
        badgeClass: 'bg-gray-200 text-gray-800 border-gray-400',
        dot: '⚫',
    },
};

export const CONTACT_OUTCOME_LABELS: Record<ContactOutcome, string> = {
    no_answer: 'No contestó',
    busy: 'Ocupado',
    no_response: 'Sin respuesta',
    answered: 'Contestó',
    interested: 'Interesado',
    not_interested: 'No interesado',
    unreachable: 'Inubicable',
    status_change: 'Cambio de estado',
};

export const QUICK_STATUS_OPTIONS: {
    status: ContactStatus;
    label: string;
    description?: string;
}[] = [
    { status: 'por_contactar', label: 'Por contactar' },
    { status: 'en_intento', label: 'En intento (sin marcar llamada)' },
    { status: 'interesado', label: 'Interesado / En proceso' },
    { status: 'no_interesado', label: 'No interesado / Desistió' },
    { status: 'inubicable', label: 'Inubicable (descarte)' },
];

export function normalizeContactStatus(raw?: string | null): ContactStatus {
    const s = (raw || 'por_contactar') as ContactStatus;
    if (s in CONTACT_STATUS_META) return s;
    return 'por_contactar';
}

export function getContactBadgeLabel(status: ContactStatus, attemptCount: number): string {
    const meta = CONTACT_STATUS_META[status];
    if (status === 'en_intento' && attemptCount > 0) {
        return `Intento ${attemptCount}`;
    }
    return meta.shortLabel;
}

export function isContactCooldownActive(lastAttemptAt?: string | null, now = Date.now()): boolean {
    if (!lastAttemptAt) return false;
    const t = new Date(lastAttemptAt).getTime();
    if (isNaN(t)) return false;
    return now - t < CONTACT_COOLDOWN_MS;
}

export function formatContactCooldownWarning(lastAttemptAt: string, lastUserName?: string): string {
    const who = lastUserName ? ` por ${lastUserName}` : '';
    const mins = Math.max(1, Math.ceil((CONTACT_COOLDOWN_MS - (Date.now() - new Date(lastAttemptAt).getTime())) / 60000));
    return `Contacto hace ${mins} min${who}. Mejor esperar antes de insistir.`;
}

export function formatAttemptHistoryLine(attempt: ContactAttempt): string {
    const time = formatHistoryTime(attempt.createdAt);
    const who = attempt.userName || 'Usuario';
    const channel =
        attempt.channel === 'whatsapp'
            ? 'Envió WhatsApp'
            : 'Llamó';
    const outcome = CONTACT_OUTCOME_LABELS[attempt.outcome] || attempt.outcome;
    const attemptSuffix =
        attempt.outcome !== 'status_change' && attempt.attemptNumber > 0
            ? ` (Intento ${attempt.attemptNumber})`
            : '';
    return `${time} - ${who}: ${channel} - ${outcome}${attemptSuffix}`;
}

function formatHistoryTime(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const now = new Date();
    const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
        d.getDate() === yesterday.getDate() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getFullYear() === yesterday.getFullYear();

    const time = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return time;
    if (isYesterday) return `Ayer ${time}`;
    return d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function shouldAutoMarkUnreachable(
    status: ContactStatus,
    attemptCount: number,
    channel: ContactChannel,
    outcome: ContactOutcome
): boolean {
    return (
        channel === 'call' &&
        (outcome === 'no_answer' || outcome === 'busy') &&
        attemptCount >= UNREACHABLE_AFTER_CALL_ATTEMPTS &&
        status !== 'inubicable' &&
        status !== 'interesado' &&
        status !== 'no_interesado'
    );
}

export function nextStatusAfterCallAttempt(
    current: ContactStatus,
    attemptCount: number,
    channel: ContactChannel,
    outcome: ContactOutcome
): ContactStatus {
    if (shouldAutoMarkUnreachable(current, attemptCount, channel, outcome)) {
        return 'inubicable';
    }
    if (current === 'por_contactar' || current === 'en_intento') {
        return 'en_intento';
    }
    return current;
}
