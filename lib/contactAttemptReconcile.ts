import type { ContactAttempt } from './contactTracking';
import type { ContactAttemptChannel, ChannelContactSummary } from './contactChannelConfig';
import { CONTACT_CHANNELS } from './contactChannelConfig';
import { formatDateKeyLima, isRecordedChannelAttempt } from './contactDashboardStats';

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
    attemptNumber: number
): ContactAttempt {
    return {
        id: `reconcile-${candidate.id}-${channel}-${attemptNumber}`,
        candidateId: candidate.id,
        processId: candidate.processId,
        userName: summary.lastUserName,
        channel,
        outcome: 'no_answer',
        attemptNumber,
        statusAfter: summary.status,
        createdAt: summary.lastAttemptAt!,
    };
}

/**
 * Alinea el Panel con la tabla masiva cuando el historial en BD está incompleto
 * (p. ej. insert fallido en candidate_contact_attempts pero sí se actualizó candidates).
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
            if (!summary?.lastAttemptAt || !summary.lastUserName?.trim()) continue;

            const channelAttempts = result.filter(
                a => a.candidateId === candidate.id && isRecordedChannelAttempt(a, channel)
            );
            const attemptCount = summary.attemptCount ?? 0;

            if (attemptCount === 0) {
                const dayKey = formatDateKeyLima(summary.lastAttemptAt);
                const hasTouchOnDay = channelAttempts.some(
                    a => formatDateKeyLima(a.createdAt) === dayKey
                );
                if (!hasTouchOnDay) {
                    result.push(syntheticAttempt(candidate, channel, summary, 1));
                }
                continue;
            }

            const deficit = attemptCount - channelAttempts.length;
            if (deficit <= 0) continue;

            for (let i = 0; i < deficit; i++) {
                result.push(
                    syntheticAttempt(
                        candidate,
                        channel,
                        summary,
                        channelAttempts.length + i + 1
                    )
                );
            }
        }
    }

    return result;
}
