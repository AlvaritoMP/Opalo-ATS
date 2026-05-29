import type { ContactAttempt, ContactChannel } from './contactTracking';
import { CONTACT_CHANNELS, type ContactAttemptChannel } from './contactChannelConfig';

export type ContactConsultantPeriod = 'week' | 'month' | 'year';

export interface ContactChannelDashboardStats {
    totalActions: number;
    periodLabel: string;
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
    topWhatsappUser: {
        userName: string;
        count: number;
    } | null;
    topEmailUser: {
        userName: string;
        count: number;
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

export interface ContactCallTrendPoint {
    key: string;
    label: string;
    [userName: string]: string | number;
}

export interface ContactCallTrendSeries {
    data: ContactCallTrendPoint[];
    users: string[];
    granularity: 'day' | 'month';
    periodLabel: string;
}

const PERIOD_LABELS: Record<ContactConsultantPeriod, string> = {
    week: 'Esta semana',
    month: 'Este mes',
    year: 'Este año',
};

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

/** Interés registrado en columna Llamadas (botón o menú rápido «Interesado»). */
export function isEffectiveCallConsultantAttempt(
    attempt: Pick<ContactAttempt, 'channel' | 'outcome' | 'statusAfter'>
): boolean {
    return attempt.channel === 'call' && isEffectiveContactAttempt(attempt);
}

function accumulateCallConsultantStats(
    attempts: ContactAttempt[]
): Map<string, { total: number; effective: number }> {
    const callerTotals = new Map<string, { total: number; effective: number }>();

    for (const a of attempts) {
        if (a.channel !== 'call' || !isCountableContactAction(a)) continue;

        const name = normalizeUserName(a.userName);
        const bucket = callerTotals.get(name) || { total: 0, effective: 0 };

        if (isRecordedCallAttempt(a)) {
            bucket.total += 1;
        }
        if (isEffectiveCallConsultantAttempt(a)) {
            bucket.effective += 1;
        }

        callerTotals.set(name, bucket);
    }

    return callerTotals;
}

/** Contacto registrado en un canal (llamada, WhatsApp o correo). */
export function isRecordedChannelAttempt(
    attempt: Pick<ContactAttempt, 'channel' | 'outcome'>,
    channel: ContactAttemptChannel
): boolean {
    return (
        attempt.channel === channel &&
        isCountableContactAction(attempt) &&
        attempt.outcome !== 'status_change'
    );
}

function channelLabel(channel: ContactChannel): string {
    return CONTACT_CHANNELS[channel as ContactAttemptChannel]?.shortLabel ?? channel;
}

function normalizeUserName(name?: string): string {
    const trimmed = name?.trim();
    return trimmed || 'Sin consultor';
}

function formatDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatMonthKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

function startOfWeekMonday(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    const day = x.getDay();
    const diff = day === 0 ? 6 : day - 1;
    x.setDate(x.getDate() - diff);
    return x;
}

export function getContactPeriodRange(
    period: ContactConsultantPeriod,
    refDate = new Date()
): { start: Date; end: Date; label: string } {
    const end = new Date(refDate);
    end.setHours(23, 59, 59, 999);

    if (period === 'week') {
        const start = startOfWeekMonday(refDate);
        return { start, end, label: PERIOD_LABELS.week };
    }
    if (period === 'month') {
        const start = new Date(refDate.getFullYear(), refDate.getMonth(), 1, 0, 0, 0, 0);
        return { start, end, label: PERIOD_LABELS.month };
    }
    const start = new Date(refDate.getFullYear(), 0, 1, 0, 0, 0, 0);
    return { start, end, label: PERIOD_LABELS.year };
}

export function filterAttemptsInDateRange(
    attempts: ContactAttempt[],
    start: Date,
    end: Date
): ContactAttempt[] {
    const startMs = start.getTime();
    const endMs = end.getTime();
    return attempts.filter(a => {
        const ts = new Date(a.createdAt).getTime();
        return !Number.isNaN(ts) && ts >= startMs && ts <= endMs;
    });
}

function countTopConsultantByChannel(
    attempts: ContactAttempt[],
    channel: ContactAttemptChannel
): { userName: string; count: number } | null {
    const totals = new Map<string, number>();
    for (const a of attempts) {
        if (!isRecordedChannelAttempt(a, channel)) continue;
        const name = normalizeUserName(a.userName);
        totals.set(name, (totals.get(name) || 0) + 1);
    }
    let best: { userName: string; count: number } | null = null;
    for (const [userName, count] of totals) {
        if (!best || count > best.count) best = { userName, count };
    }
    return best;
}

export function computeContactDashboardStats(
    attempts: ContactAttempt[],
    period: ContactConsultantPeriod = 'month'
): ContactChannelDashboardStats {
    const { start, end, label: periodLabel } = getContactPeriodRange(period);
    const scoped = filterAttemptsInDateRange(attempts, start, end);

    const countable = scoped.filter(isCountableContactAction);
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

    const callerTotals = accumulateCallConsultantStats(scoped);

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
                rate: total > 0 ? Math.round((effective / total) * 1000) / 10 : 100,
            };
        }
    }

    const topWhatsappUser = countTopConsultantByChannel(scoped, 'whatsapp');
    const topEmailUser = countTopConsultantByChannel(scoped, 'email');

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
            rate: total > 0 ? Math.round((effective / total) * 1000) / 10 : effective > 0 ? 100 : 0,
        }))
        .filter(d => d.llamadas > 0 || d.efectivas > 0)
        .sort((a, b) => b.llamadas - a.llamadas || b.efectivas - a.efectivas)
        .slice(0, 8);

    return {
        totalActions,
        periodLabel,
        mostUsedChannel,
        mostEffectiveChannel,
        topCaller,
        topWhatsappUser,
        topEmailUser,
        topEffectiveCaller,
        channelVolume,
        callerRankings,
    };
}

/** Serie temporal de llamadas por consultor (día a día o mes a mes). */
export function buildCallTrendByUser(
    attempts: ContactAttempt[],
    period: ContactConsultantPeriod,
    maxUsers = 6
): ContactCallTrendSeries {
    const { start, end, label: periodLabel } = getContactPeriodRange(period);
    const callAttempts = filterAttemptsInDateRange(
        attempts.filter(isRecordedCallAttempt),
        start,
        end
    );

    const userTotals = new Map<string, number>();
    for (const a of callAttempts) {
        const name = normalizeUserName(a.userName);
        userTotals.set(name, (userTotals.get(name) || 0) + 1);
    }
    const users = [...userTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxUsers)
        .map(([name]) => name);

    if (period === 'year') {
        const buckets = new Map<string, ContactCallTrendPoint>();
        for (let m = 0; m <= end.getMonth(); m++) {
            const d = new Date(end.getFullYear(), m, 1);
            const key = formatMonthKey(d);
            const label = d.toLocaleDateString('es-PE', { month: 'short' });
            const row: ContactCallTrendPoint = { key, label };
            for (const u of users) row[u] = 0;
            buckets.set(key, row);
        }
        for (const a of callAttempts) {
            const name = normalizeUserName(a.userName);
            if (!users.includes(name)) continue;
            const key = formatMonthKey(new Date(a.createdAt));
            const row = buckets.get(key);
            if (row) row[name] = (Number(row[name]) || 0) + 1;
        }
        return {
            data: [...buckets.values()],
            users,
            granularity: 'month',
            periodLabel,
        };
    }

    const buckets = new Map<string, ContactCallTrendPoint>();
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setHours(0, 0, 0, 0);

    while (cursor <= last) {
        const key = formatDateKey(cursor);
        const label = cursor.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' });
        const row: ContactCallTrendPoint = { key, label };
        for (const u of users) row[u] = 0;
        buckets.set(key, row);
        cursor.setDate(cursor.getDate() + 1);
    }

    for (const a of callAttempts) {
        const name = normalizeUserName(a.userName);
        if (!users.includes(name)) continue;
        const key = formatDateKey(new Date(a.createdAt));
        const row = buckets.get(key);
        if (row) row[name] = (Number(row[name]) || 0) + 1;
    }

    return {
        data: [...buckets.values()],
        users,
        granularity: 'day',
        periodLabel,
    };
}
