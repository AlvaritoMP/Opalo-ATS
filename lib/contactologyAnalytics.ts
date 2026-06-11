import type { ContactAttempt } from './contactTracking';
import { CONTACT_OUTCOME_LABELS } from './contactTracking';
import type { ContactAttemptChannel } from './contactChannelConfig';
import { CONTACT_CHANNELS } from './contactChannelConfig';
import {
    filterAttemptsInDateRange,
    getContactPeriodRange,
    isChannelVolumeAttempt,
    type ContactConsultantPeriod,
} from './contactDashboardStats';

export interface ContactologyCandidateInput {
    id: string;
    processId: string;
    /** Momento de origen del registro (primera postulación o alta en sistema). */
    registeredAt?: string;
}

/** El candidato respondió (contestó, interesado o no interesado). */
export function isCandidateResponseAttempt(
    attempt: Pick<ContactAttempt, 'outcome' | 'statusAfter' | 'notes'>
): boolean {
    if (attempt.outcome === 'answered' || attempt.outcome === 'interested' || attempt.outcome === 'not_interested') {
        return true;
    }
    if (attempt.outcome === 'status_change') {
        return attempt.statusAfter === 'interesado' || attempt.statusAfter === 'no_interesado';
    }
    return false;
}

export function isInterestedCandidateResponse(
    attempt: Pick<ContactAttempt, 'outcome' | 'statusAfter'>
): boolean {
    if (attempt.outcome === 'interested') return true;
    return attempt.outcome === 'status_change' && attempt.statusAfter === 'interesado';
}

export function isNotInterestedCandidateResponse(
    attempt: Pick<ContactAttempt, 'outcome' | 'statusAfter'>
): boolean {
    if (attempt.outcome === 'not_interested') return true;
    return attempt.outcome === 'status_change' && attempt.statusAfter === 'no_interesado';
}

function isAnyVolumeAttempt(attempt: ContactAttempt): boolean {
    const channels = Object.keys(CONTACT_CHANNELS) as ContactAttemptChannel[];
    return channels.some(ch => isChannelVolumeAttempt(attempt, ch));
}

function normalizeUserName(name?: string): string {
    const trimmed = name?.trim();
    return trimmed || 'Sin consultor';
}

function outcomeLabelForResponse(attempt: ContactAttempt): string {
    if (attempt.outcome === 'status_change' && attempt.statusAfter === 'interesado') {
        return 'Interesado (estado)';
    }
    if (attempt.outcome === 'status_change' && attempt.statusAfter === 'no_interesado') {
        return 'No interesado (estado)';
    }
    return CONTACT_OUTCOME_LABELS[attempt.outcome] ?? attempt.outcome;
}

function sortAttemptsChronologically(attempts: ContactAttempt[]): ContactAttempt[] {
    return [...attempts].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

function msToHours(ms: number): number {
    return Math.round((ms / (1000 * 60 * 60)) * 10) / 10;
}

function msToReadableDuration(ms: number): string {
    if (ms < 0 || Number.isNaN(ms)) return 'N/D';
    const hours = ms / (1000 * 60 * 60);
    if (hours < 1) {
        const mins = Math.round(ms / (1000 * 60));
        return `${mins} min`;
    }
    if (hours < 48) return `${Math.round(hours * 10) / 10} h`;
    const days = Math.round((hours / 24) * 10) / 10;
    return `${days} d`;
}

export interface ContactologyAdvancedStats {
    periodLabel: string;
    /** Desglose por tipo de resultado en llamadas con respuesta del candidato */
    effectiveCallOutcomeBreakdown: { name: string; count: number }[];
    /** Distribución de intentos hasta lograr respuesta (1, 2, 3…) */
    attemptsUntilResponseDistribution: { name: string; count: number }[];
    avgAttemptsUntilResponse: number | null;
    /** Tiempo promedio desde origen del registro hasta primer intento de contacto */
    avgHoursRegistrationToFirstContact: number | null;
    avgRegistrationToFirstContactLabel: string;
    /** Consultor con menor tiempo promedio de reacción al primer contacto */
    fastestFirstContactConsultant: { userName: string; avgHours: number; sampleCount: number } | null;
    /** Promedio de intentos de contacto hasta lograr respuesta efectiva */
    avgAttemptsUntilEffectiveResponse: number | null;
    /** % respuestas con interés sobre total de contactos con respuesta */
    interestedResponseRatio: number | null;
    interestedResponseCount: number;
    /** % respuestas sin interés sobre total de contactos con respuesta */
    notInterestedResponseRatio: number | null;
    notInterestedResponseCount: number;
    totalEffectiveResponses: number;
    candidatesWithResponse: number;
    candidatesWithAnyContact: number;
}

export function computeContactologyAdvancedStats(
    attempts: ContactAttempt[],
    candidates: ContactologyCandidateInput[],
    period: ContactConsultantPeriod = 'month',
    candidateIdFilter?: Set<string>
): ContactologyAdvancedStats {
    const { startKey, endKey, label: periodLabel } = getContactPeriodRange(period);
    const scopedAttempts = filterAttemptsInDateRange(attempts, startKey, endKey).filter(
        a => !candidateIdFilter || candidateIdFilter.has(a.candidateId)
    );

    const candidateById = new Map(candidates.map(c => [c.id, c]));

    const effectiveCallOutcomeBreakdownMap = new Map<string, number>();
    for (const attempt of scopedAttempts) {
        if (attempt.channel !== 'call') continue;
        if (!isCandidateResponseAttempt(attempt)) continue;
        const label = outcomeLabelForResponse(attempt);
        effectiveCallOutcomeBreakdownMap.set(label, (effectiveCallOutcomeBreakdownMap.get(label) || 0) + 1);
    }

    const attemptsByCandidate = new Map<string, ContactAttempt[]>();
    for (const attempt of scopedAttempts) {
        if (!isAnyVolumeAttempt(attempt)) continue;
        const list = attemptsByCandidate.get(attempt.candidateId) || [];
        list.push(attempt);
        attemptsByCandidate.set(attempt.candidateId, list);
    }

    const attemptsUntilResponseCounts: number[] = [];
    const attemptsUntilResponseDistributionMap = new Map<string, number>();
    const registrationToFirstContactMs: number[] = [];
    const consultantFirstContactMs = new Map<string, number[]>();
    let interestedResponseCount = 0;
    let notInterestedResponseCount = 0;
    let totalEffectiveResponses = 0;
    let candidatesWithResponse = 0;
    let candidatesWithAnyContact = 0;

    for (const [candidateId, rawAttempts] of attemptsByCandidate) {
        const sorted = sortAttemptsChronologically(rawAttempts);
        if (sorted.length === 0) continue;
        candidatesWithAnyContact += 1;

        const candidate = candidateById.get(candidateId);
        const firstAttempt = sorted[0];
        if (candidate?.registeredAt && firstAttempt?.createdAt) {
            const regTs = new Date(candidate.registeredAt).getTime();
            const contactTs = new Date(firstAttempt.createdAt).getTime();
            if (!Number.isNaN(regTs) && !Number.isNaN(contactTs) && contactTs >= regTs) {
                const delta = contactTs - regTs;
                registrationToFirstContactMs.push(delta);
                const consultant = normalizeUserName(firstAttempt.userName);
                const bucket = consultantFirstContactMs.get(consultant) || [];
                bucket.push(delta);
                consultantFirstContactMs.set(consultant, bucket);
            }
        }

        const firstResponseIdx = sorted.findIndex(a => isCandidateResponseAttempt(a));
        if (firstResponseIdx < 0) continue;

        candidatesWithResponse += 1;
        const attemptsUntil = firstResponseIdx + 1;
        attemptsUntilResponseCounts.push(attemptsUntil);
        const bucketKey = attemptsUntil >= 6 ? '6+' : String(attemptsUntil);
        attemptsUntilResponseDistributionMap.set(
            bucketKey,
            (attemptsUntilResponseDistributionMap.get(bucketKey) || 0) + 1
        );

        const responseAttempt = sorted[firstResponseIdx];
        totalEffectiveResponses += 1;
        if (isInterestedCandidateResponse(responseAttempt)) interestedResponseCount += 1;
        if (isNotInterestedCandidateResponse(responseAttempt)) notInterestedResponseCount += 1;
    }

    const avgAttemptsUntilResponse =
        attemptsUntilResponseCounts.length > 0
            ? Math.round(
                  (attemptsUntilResponseCounts.reduce((s, n) => s + n, 0) /
                      attemptsUntilResponseCounts.length) *
                      10
              ) / 10
            : null;

    const avgMsRegistrationToFirstContact =
        registrationToFirstContactMs.length > 0
            ? registrationToFirstContactMs.reduce((s, n) => s + n, 0) /
              registrationToFirstContactMs.length
            : null;

    let fastestFirstContactConsultant: ContactologyAdvancedStats['fastestFirstContactConsultant'] = null;
    let fastestAvgMs: number | null = null;
    for (const [userName, deltas] of consultantFirstContactMs) {
        if (deltas.length === 0 || userName === 'Sin consultor') continue;
        const avg = deltas.reduce((s, n) => s + n, 0) / deltas.length;
        if (fastestAvgMs === null || avg < fastestAvgMs) {
            fastestAvgMs = avg;
            fastestFirstContactConsultant = {
                userName,
                avgHours: msToHours(avg),
                sampleCount: deltas.length,
            };
        }
    }

    const interestedResponseRatio =
        totalEffectiveResponses > 0
            ? Math.round((interestedResponseCount / totalEffectiveResponses) * 1000) / 10
            : null;
    const notInterestedResponseRatio =
        totalEffectiveResponses > 0
            ? Math.round((notInterestedResponseCount / totalEffectiveResponses) * 1000) / 10
            : null;

    const effectiveCallOutcomeBreakdown = [...effectiveCallOutcomeBreakdownMap.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const attemptsUntilResponseDistribution = ['1', '2', '3', '4', '5', '6+']
        .filter(k => attemptsUntilResponseDistributionMap.has(k))
        .map(k => ({
            name: k === '1' ? '1 intento' : k === '6+' ? '6 o más' : `${k} intentos`,
            count: attemptsUntilResponseDistributionMap.get(k) || 0,
        }));

    return {
        periodLabel,
        effectiveCallOutcomeBreakdown,
        attemptsUntilResponseDistribution,
        avgAttemptsUntilResponse,
        avgHoursRegistrationToFirstContact: avgMsRegistrationToFirstContact
            ? msToHours(avgMsRegistrationToFirstContact)
            : null,
        avgRegistrationToFirstContactLabel: avgMsRegistrationToFirstContact
            ? msToReadableDuration(avgMsRegistrationToFirstContact)
            : 'N/D',
        fastestFirstContactConsultant,
        avgAttemptsUntilEffectiveResponse: avgAttemptsUntilResponse,
        interestedResponseRatio,
        interestedResponseCount,
        notInterestedResponseRatio,
        notInterestedResponseCount,
        totalEffectiveResponses,
        candidatesWithResponse,
        candidatesWithAnyContact,
    };
}

/** Origen del registro para métricas de tiempo hasta contacto. */
export function resolveCandidateRegisteredAt(candidate: {
    firstApplicationAt?: string;
    createdAt?: string;
    history?: { movedAt?: string }[];
    applicationStartedDate?: string;
}): string | undefined {
    return (
        candidate.firstApplicationAt ||
        candidate.createdAt ||
        candidate.applicationStartedDate ||
        candidate.history?.[0]?.movedAt ||
        undefined
    );
}
