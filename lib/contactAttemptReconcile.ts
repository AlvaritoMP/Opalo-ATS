import type { ContactAttempt } from './contactTracking';
import type { ContactAttemptChannel, ChannelContactSummary } from './contactChannelConfig';
import { CONTACT_CHANNELS } from './contactChannelConfig';
import { formatDateKeyLima, isChannelVolumeAttempt } from './contactDashboardStats';

export interface ContactSummaryCandidate {
    id: string;
    processId: string;
    contactPhone?: ChannelContactSummary;
    contactWhatsapp?: ChannelContactSummary;
    contactEmail?: ChannelContactSummary;
}

function summaryForChannel(
    candidate: ContactSummaryCandidate,
    channel: ContactAttemptChannel
): ChannelContactSummary | undefined {
    if (channel === 'call') return candidate.contactPhone;
    if (channel === 'whatsapp') return candidate.contactWhatsapp;
    return candidate.contactEmail;
}

function syntheticAttempt(
    candidate: ContactSummaryCandidate,
    channel: ContactAttemptChannel,
    summary: ChannelContactSummary,
    attemptNumber: number,
    createdAt: string,
    userName?: string
): ContactAttempt {
    return {
        id: `reconcile-${candidate.id}-${channel}-${attemptNumber}-${createdAt}`,
        candidateId: candidate.id,
        processId: candidate.processId,
        userName: userName || summary.lastUserName,
        channel,
        outcome: channel === 'email' ? 'no_response' : channel === 'whatsapp' ? 'no_response' : 'no_answer',
        attemptNumber,
        statusAfter: summary.status,
        createdAt,
    };
}

function volumeAttemptsForCandidate(
    attempts: ContactAttempt[],
    candidateId: string,
    channel: ContactAttemptChannel
): ContactAttempt[] {
    return attempts.filter(
        a => a.candidateId === candidateId && isChannelVolumeAttempt(a, channel)
    );
}

function isGenericActorName(name?: string): boolean {
    const t = name?.trim();
    return !t || t === 'Usuario' || t === 'Sin consultor' || t === 'usuario';
}

/**
 * Si el historial no guardó user_name pero la tabla sí tiene lastUserName,
 * atribuye el intento al consultor visible en la columna de contacto.
 */
export function attributeContactAttemptsFromSummaries(
    attempts: ContactAttempt[],
    candidates: ContactSummaryCandidate[]
): ContactAttempt[] {
    const byCandidate = new Map(candidates.map(c => [c.id, c]));

    return attempts.map(attempt => {
        if (attempt.userId && !isGenericActorName(attempt.userName)) return attempt;

        const candidate = byCandidate.get(attempt.candidateId);
        if (!candidate) return attempt;

        const channel = attempt.channel as ContactAttemptChannel;
        if (!CONTACT_CHANNELS[channel]) return attempt;

        const summary = summaryForChannel(candidate, channel);
        const tableUser = summary?.lastUserName?.trim();
        if (!tableUser) return attempt;

        if (!isGenericActorName(attempt.userName)) {
            return attempt;
        }

        return { ...attempt, userName: tableUser };
    });
}

/**
 * Completa el historial cuando faltan intentos respecto a attempt_count en la tabla.
 * Reparte intentos sintéticos por día usando lastAttemptAt del resumen del canal.
 */
export function reconcileContactAttemptsWithSummaries(
    attempts: ContactAttempt[],
    candidates: ContactSummaryCandidate[]
): ContactAttempt[] {
    if (candidates.length === 0) return attempts;

    const result = [...attempts];
    const channels = Object.keys(CONTACT_CHANNELS) as ContactAttemptChannel[];

    for (const candidate of candidates) {
        for (const channel of channels) {
            const summary = summaryForChannel(candidate, channel);
            const attemptCount = summary?.attemptCount ?? 0;
            if (attemptCount <= 0 || !summary?.lastAttemptAt) continue;

            const volumeRows = volumeAttemptsForCandidate(result, candidate.id, channel);
            const deficit = attemptCount - volumeRows.length;
            if (deficit <= 0) continue;

            const tableUser = summary.lastUserName?.trim();
            const dayKey = formatDateKeyLima(summary.lastAttemptAt);

            for (let i = 0; i < deficit; i++) {
                result.push(
                    syntheticAttempt(
                        candidate,
                        channel,
                        summary,
                        volumeRows.length + i + 1,
                        summary.lastAttemptAt,
                        tableUser
                    )
                );
            }

            void dayKey;
        }
    }

    return result;
}

/**
 * Genera intentos de volumen desde la tabla masiva cuando no hay filas en el historial
 * pero sí attempt_count (p. ej. inserts fallidos en candidate_contact_attempts).
 */
export function synthesizeVolumeAttemptsFromSummaries(
    attempts: ContactAttempt[],
    candidates: ContactSummaryCandidate[]
): ContactAttempt[] {
    const result = [...attempts];
    const channels = Object.keys(CONTACT_CHANNELS) as ContactAttemptChannel[];

    for (const candidate of candidates) {
        for (const channel of channels) {
            const summary = summaryForChannel(candidate, channel);
            if (!summary?.lastAttemptAt || !summary.lastUserName?.trim()) continue;
            if ((summary.attemptCount ?? 0) <= 0) continue;

            const existing = volumeAttemptsForCandidate(result, candidate.id, channel);
            if (existing.length > 0) continue;

            for (let n = 1; n <= summary.attemptCount; n++) {
                result.push(
                    syntheticAttempt(
                        candidate,
                        channel,
                        summary,
                        n,
                        summary.lastAttemptAt,
                        summary.lastUserName.trim()
                    )
                );
            }
        }
    }

    return result;
}
