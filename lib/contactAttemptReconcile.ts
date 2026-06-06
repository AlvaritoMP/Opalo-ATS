import type { ContactAttempt } from './contactTracking';
import type { ContactAttemptChannel, ChannelContactSummary } from './contactChannelConfig';
import { CONTACT_CHANNELS } from './contactChannelConfig';
import { isChannelVolumeAttempt } from './contactDashboardStats';

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
    createdAt: string
): ContactAttempt {
    return {
        id: `reconcile-${candidate.id}-${channel}-${attemptNumber}`,
        candidateId: candidate.id,
        processId: candidate.processId,
        userName: summary.lastUserName,
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

/**
 * Completa el historial solo cuando faltan intentos reales respecto a attempt_count
 * (p. ej. insert fallido en candidate_contact_attempts). No inventa intentos por cambios
 * de estado manual ni duplica filas ya registradas.
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

            for (let i = 0; i < deficit; i++) {
                result.push(
                    syntheticAttempt(
                        candidate,
                        channel,
                        summary,
                        volumeRows.length + i + 1,
                        summary.lastAttemptAt
                    )
                );
            }
        }
    }

    return result;
}
