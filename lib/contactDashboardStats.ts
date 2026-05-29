import type { ContactAttempt, ContactChannel } from './contactTracking';
import { CONTACT_CHANNELS, type ContactAttemptChannel } from './contactChannelConfig';

export interface ContactChannelDashboardStats {
    totalActions: number;
    mostUsedChannel: {
        channel: ContactAttemptChannel;
        label: string;
        count: number;
        pct: number;
    } | null;
    mostEffectiveChannel: {
        channel: ContactAttemptChannel;
        label: string;
        effectiveCount: number;
        totalCount: number;
        rate: number;
    } | null;
    topCaller: {
        userName: string;
        callCount: number;
    } | null;
    topEffectiveCaller: {
        userName: string;
        effectiveCalls: number;
        totalCalls: number;
        rate: number;
    } | null;
    channelVolume: { name: string; total: number; effective: number; rate: number }[];
    callerRankings: { name: string; llamadas: number; efectivas: number; rate: number }[];
}

/** Acciones que cuentan para volumen por canal (excluye reinicios). */
export function isCountableContactAction(attempt: Pick<ContactAttempt, 'outcome'>): boolean {
    return attempt.outcome !== 'reset_all';
}

/** Marca interés: clic en "Interesado" o cambio de estado a interesado. */
export function isEffectiveContactAttempt(
    attempt: Pick<ContactAttempt, 'outcome' | 'statusAfter'>
): boolean {
    return attempt.statusAfter === 'interesado' || attempt.outcome === 'interested';
}

/** Llamada registrada con botón de contacto (no cambio manual de estado). */
export function isRecordedCallAttempt(
    attempt: Pick<ContactAttempt, 'channel' | 'outcome'>
): boolean {
    return attempt.channel === 'call' && isCountableContactAction(attempt) && attempt.outcome !== 'status_change';
}

function channelLabel(channel: ContactChannel): string {
    return CONTACT_CHANNELS[channel as ContactAttemptChannel]?.shortLabel ?? channel;
}

function normalizeUserName(name?: string): string {
    const trimmed = name?.trim();
    return trimmed || 'Sin consultor';
}

export function computeContactDashboardStats(attempts: ContactAttempt[]): ContactChannelDashboardStats {
    const countable = attempts.filter(isCountableContactAction);
    const channels = Object.keys(CONTACT_CHANNELS) as ContactAttemptChannel[];

    const channelTotals = new Map<ContactAttemptChannel, { total: number; effective: number }>();
    for (const ch of channels) {
        channelTotals.set(ch, { total: 0, effective: 0 });
    }

    for (const a of countable) {
        const bucket = channelTotals.get(a.channel as ContactAttemptChannel);
        if (!bucket) continue;
        bucket.total += 1;
        if (isEffectiveContactAttempt(a)) bucket.effective += 1;
    }

    const totalActions = countable.length;

    let mostUsedChannel: ContactChannelDashboardStats['mostUsedChannel'] = null;
    let maxVolume = 0;
    for (const [channel, { total }] of channelTotals) {
        if (total > maxVolume) {
            maxVolume = total;
            mostUsedChannel = {
                channel,
                label: channelLabel(channel),
                count: total,
                pct: totalActions > 0 ? Math.round((total / totalActions) * 1000) / 10 : 0,
            };
        }
    }

    let mostEffectiveChannel: ContactChannelDashboardStats['mostEffectiveChannel'] = null;
    let bestRate = -1;
    let bestEffectiveTotal = 0;
    for (const [channel, { total, effective }] of channelTotals) {
        if (total === 0) continue;
        const rate = effective / total;
        if (rate > bestRate || (rate === bestRate && effective > bestEffectiveTotal)) {
            bestRate = rate;
            bestEffectiveTotal = effective;
            mostEffectiveChannel = {
                channel,
                label: channelLabel(channel),
                effectiveCount: effective,
                totalCount: total,
                rate: Math.round(rate * 1000) / 10,
            };
        }
    }

    const callerTotals = new Map<string, { total: number; effective: number }>();
    for (const a of attempts) {
        if (!isRecordedCallAttempt(a)) continue;
        const name = normalizeUserName(a.userName);
        const bucket = callerTotals.get(name) || { total: 0, effective: 0 };
        bucket.total += 1;
        if (isEffectiveContactAttempt(a)) bucket.effective += 1;
        callerTotals.set(name, bucket);
    }

    let topCaller: ContactChannelDashboardStats['topCaller'] = null;
    let topEffectiveCaller: ContactChannelDashboardStats['topEffectiveCaller'] = null;

    for (const [userName, { total }] of callerTotals) {
        if (!topCaller || total > topCaller.callCount) {
            topCaller = { userName, callCount: total };
        }
    }

    for (const [userName, { total, effective }] of callerTotals) {
        if (effective === 0) continue;
        if (
            !topEffectiveCaller ||
            effective > topEffectiveCaller.effectiveCalls ||
            (effective === topEffectiveCaller.effectiveCalls && total < topEffectiveCaller.totalCalls)
        ) {
            topEffectiveCaller = {
                userName,
                effectiveCalls: effective,
                totalCalls: total,
                rate: Math.round((effective / total) * 1000) / 10,
            };
        }
    }

    const channelVolume = channels
        .map(ch => {
            const { total, effective } = channelTotals.get(ch)!;
            return {
                name: channelLabel(ch),
                total,
                effective,
                rate: total > 0 ? Math.round((effective / total) * 1000) / 10 : 0,
            };
        })
        .filter(d => d.total > 0);

    const callerRankings = Array.from(callerTotals.entries())
        .map(([name, { total, effective }]) => ({
            name,
            llamadas: total,
            efectivas: effective,
            rate: total > 0 ? Math.round((effective / total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.llamadas - a.llamadas)
        .slice(0, 8);

    return {
        totalActions,
        mostUsedChannel,
        mostEffectiveChannel,
        topCaller,
        topEffectiveCaller,
        channelVolume,
        callerRankings,
    };
}
