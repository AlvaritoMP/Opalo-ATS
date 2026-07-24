import {
    addDaysToDateKey,
    formatDateKeyLima,
    formatDayLabelFromKey,
    iterDateKeys,
} from './contactDashboardStats';
import {
    resolveHistoryUserName,
    type HiredStageActor,
} from './hiringStageTracking';
import type { FinalStageArrivalRow, ProcessDiscardRow, ProcessCoverageSnapshot } from './api/processCoverage';
import type { CandidateInflowRow } from './api/candidateInflow';
import type { User } from '../types';

export type CoveragePeriod = '30d' | '6m' | '1y';

export const COVERAGE_PERIOD_OPTIONS: { id: CoveragePeriod; label: string }[] = [
    { id: '30d', label: '30 días' },
    { id: '6m', label: '6 meses' },
    { id: '1y', label: '1 año' },
];

export interface CoveragePeriodRange {
    startKey: string;
    endKey: string;
    label: string;
    days: number;
}

export function getCoveragePeriodRange(
    period: CoveragePeriod,
    refDate = new Date()
): CoveragePeriodRange {
    const endKey = formatDateKeyLima(refDate);
    const days = period === '30d' ? 30 : period === '6m' ? 183 : 365;
    const startKey = addDaysToDateKey(endKey, -(days - 1));
    const label =
        period === '30d' ? 'Últimos 30 días' : period === '6m' ? 'Últimos 6 meses' : 'Último año';
    return { startKey, endKey, label, days };
}

export function coverageStartKeyToIso(startKey: string): string {
    return `${startKey}T00:00:00-05:00`;
}

type UserLookup = Pick<User, 'id' | 'name'> & Partial<Pick<User, 'email'>>;

export interface FinalStageArrivalDetail {
    candidateId: string;
    name: string;
    email: string;
    phone?: string;
    movedAt: string;
    consultant: string;
    discarded: boolean;
    dateKey: string;
}

export interface DailyCountPoint {
    dateKey: string;
    label: string;
    count: number;
}

export interface ConsultantDailyPoint {
    dateKey: string;
    label: string;
    [consultantKey: string]: string | number;
}

export interface ConsultantRankingRow {
    name: string;
    arrivals: number;
    sharePct: number;
}

export interface DiscardReasonRow {
    reason: string;
    count: number;
    sharePct: number;
}

export interface CoverageKpis {
    vacancies: number;
    hiredNow: number;
    coveragePct: number;
    remainingVacancies: number;
    activePipeline: number;
    discardedTotal: number;
    finalArrivalsInPeriod: number;
    newInPeriod: number;
    discardedInPeriod: number;
    dailyFinalPace: number;
    dailyNewPace: number;
    netFlowInPeriod: number;
}

export interface ProcessCoverageReport {
    range: CoveragePeriodRange;
    kpis: CoverageKpis;
    finalStageDaily: DailyCountPoint[];
    newCandidatesDaily: DailyCountPoint[];
    discardsDaily: DailyCountPoint[];
    arrivalsByDay: Record<string, FinalStageArrivalDetail[]>;
    allArrivals: FinalStageArrivalDetail[];
    consultantSeries: { key: string; name: string; color: string }[];
    consultantDaily: ConsultantDailyPoint[];
    consultantRanking: ConsultantRankingRow[];
    discardReasons: DiscardReasonRow[];
    discardsInPeriod: ProcessDiscardRow[];
}

const CONSULTANT_COLORS = [
    '#2563eb',
    '#059669',
    '#d97706',
    '#dc2626',
    '#7c3aed',
    '#0891b2',
    '#db2777',
    '#65a30d',
    '#ea580c',
    '#4f46e5',
    '#0d9488',
    '#9333ea',
];

function normalizeReason(reason: string | null | undefined): string {
    const trimmed = reason?.trim();
    return trimmed || 'Sin motivo registrado';
}

function toArrivalDetail(
    row: FinalStageArrivalRow,
    users: UserLookup[]
): FinalStageArrivalDetail {
    const dateKey = formatDateKeyLima(row.movedAt);
    return {
        candidateId: row.candidateId,
        name: row.name,
        email: row.email,
        phone: row.phone,
        movedAt: row.movedAt,
        consultant: resolveHistoryUserName(row.movedBy, users),
        discarded: row.discarded,
        dateKey,
    };
}

function inRange(dateKey: string, startKey: string, endKey: string): boolean {
    return Boolean(dateKey) && dateKey >= startKey && dateKey <= endKey;
}

function buildDailyCounts(
    dateKeys: string[],
    incrementKeys: string[]
): DailyCountPoint[] {
    const counts = new Map<string, number>();
    for (const key of dateKeys) counts.set(key, 0);
    for (const key of incrementKeys) {
        if (!counts.has(key)) continue;
        counts.set(key, (counts.get(key) || 0) + 1);
    }
    return dateKeys.map(dateKey => ({
        dateKey,
        label: formatDayLabelFromKey(dateKey),
        count: counts.get(dateKey) || 0,
    }));
}

/**
 * Si faltan filas de historial pero hay actores de etapa final (bulk),
 * completa llegadas con movedAt del actor cuando cae en el rango.
 */
export function mergeArrivalsWithHiringActors(
    arrivals: FinalStageArrivalRow[],
    hiringActors: Record<string, HiredStageActor>,
    candidateMeta: Record<string, { name: string; email: string; phone?: string; discarded?: boolean }>,
    startKey: string,
    endKey: string
): FinalStageArrivalRow[] {
    const byId = new Map(arrivals.map(a => [a.candidateId, a]));
    for (const [candidateId, actor] of Object.entries(hiringActors)) {
        if (!actor?.movedAt) continue;
        const dateKey = formatDateKeyLima(actor.movedAt);
        if (!inRange(dateKey, startKey, endKey)) continue;
        if (byId.has(candidateId)) continue;
        const meta = candidateMeta[candidateId];
        byId.set(candidateId, {
            candidateId,
            name: meta?.name || 'Sin nombre',
            email: meta?.email || '',
            phone: meta?.phone,
            movedAt: actor.movedAt,
            movedBy: actor.userName === 'Sin consultor' ? null : actor.userName,
            discarded: Boolean(meta?.discarded),
            currentStageId: null,
        });
    }
    return [...byId.values()];
}

export function buildProcessCoverageReport(input: {
    range: CoveragePeriodRange;
    snapshot: ProcessCoverageSnapshot;
    arrivals: FinalStageArrivalRow[];
    discards: ProcessDiscardRow[];
    inflow: CandidateInflowRow[];
    users?: UserLookup[];
}): ProcessCoverageReport {
    const { range, snapshot, arrivals, discards, inflow } = input;
    const users = input.users || [];
    const dateKeys = iterDateKeys(range.startKey, range.endKey);

    const details = arrivals
        .map(row => toArrivalDetail(row, users))
        .filter(d => inRange(d.dateKey, range.startKey, range.endKey))
        .sort((a, b) => b.movedAt.localeCompare(a.movedAt));

    const arrivalsByDay: Record<string, FinalStageArrivalDetail[]> = {};
    for (const d of details) {
        if (!arrivalsByDay[d.dateKey]) arrivalsByDay[d.dateKey] = [];
        arrivalsByDay[d.dateKey].push(d);
    }

    const finalStageDaily = buildDailyCounts(
        dateKeys,
        details.map(d => d.dateKey)
    );

    const inflowKeys = inflow
        .map(r => formatDateKeyLima(r.createdAt))
        .filter(k => inRange(k, range.startKey, range.endKey));
    const newCandidatesDaily = buildDailyCounts(dateKeys, inflowKeys);

    const discardsInPeriod = discards.filter(d => {
        if (!d.discardedAt) return false;
        const key = formatDateKeyLima(d.discardedAt);
        return inRange(key, range.startKey, range.endKey);
    });
    const discardKeys = discardsInPeriod
        .map(d => formatDateKeyLima(d.discardedAt!))
        .filter(Boolean);
    const discardsDaily = buildDailyCounts(dateKeys, discardKeys);

    const consultantTotals = new Map<string, number>();
    for (const d of details) {
        consultantTotals.set(d.consultant, (consultantTotals.get(d.consultant) || 0) + 1);
    }
    const rankedNames = [...consultantTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);
    const topNames = rankedNames.slice(0, 8);
    const hasOther = rankedNames.length > topNames.length;

    const consultantSeries = [
        ...topNames.map((name, i) => ({
            key: `c${i}`,
            name,
            color: CONSULTANT_COLORS[i % CONSULTANT_COLORS.length],
        })),
        ...(hasOther
            ? [{ key: 'cOther', name: 'Otros', color: '#94a3b8' }]
            : []),
    ];

    const nameToKey = new Map(consultantSeries.map(s => [s.name, s.key]));
    for (let i = 0; i < topNames.length; i++) {
        nameToKey.set(topNames[i], `c${i}`);
    }

    const consultantDaily: ConsultantDailyPoint[] = dateKeys.map(dateKey => {
        const point: ConsultantDailyPoint = {
            dateKey,
            label: formatDayLabelFromKey(dateKey),
        };
        for (const series of consultantSeries) point[series.key] = 0;
        const dayArrivals = arrivalsByDay[dateKey] || [];
        for (const arrival of dayArrivals) {
            const key = nameToKey.get(arrival.consultant) || (hasOther ? 'cOther' : null);
            if (!key) continue;
            point[key] = (Number(point[key]) || 0) + 1;
        }
        return point;
    });

    const totalArrivals = details.length;
    const consultantRanking: ConsultantRankingRow[] = rankedNames.map(name => {
        const arrivalsCount = consultantTotals.get(name) || 0;
        return {
            name,
            arrivals: arrivalsCount,
            sharePct: totalArrivals > 0 ? Math.round((arrivalsCount / totalArrivals) * 1000) / 10 : 0,
        };
    });

    const reasonCounts = new Map<string, number>();
    for (const d of discardsInPeriod) {
        const reason = normalizeReason(d.discardReason);
        reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    }
    const discardTotalPeriod = discardsInPeriod.length;
    const discardReasons: DiscardReasonRow[] = [...reasonCounts.entries()]
        .map(([reason, count]) => ({
            reason,
            count,
            sharePct: discardTotalPeriod > 0 ? Math.round((count / discardTotalPeriod) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.count - a.count);

    const coveragePct =
        snapshot.vacancies > 0
            ? Math.min(100, Math.round((snapshot.hiredCount / snapshot.vacancies) * 1000) / 10)
            : snapshot.hiredCount > 0
              ? 100
              : 0;

    const kpis: CoverageKpis = {
        vacancies: snapshot.vacancies,
        hiredNow: snapshot.hiredCount,
        coveragePct,
        remainingVacancies: Math.max(0, snapshot.vacancies - snapshot.hiredCount),
        activePipeline: snapshot.activeCount,
        discardedTotal: snapshot.discardedTotal,
        finalArrivalsInPeriod: details.length,
        newInPeriod: inflowKeys.length,
        discardedInPeriod: discardsInPeriod.length,
        dailyFinalPace: Math.round((details.length / Math.max(1, range.days)) * 10) / 10,
        dailyNewPace: Math.round((inflowKeys.length / Math.max(1, range.days)) * 10) / 10,
        netFlowInPeriod: inflowKeys.length - discardsInPeriod.length,
    };

    return {
        range,
        kpis,
        finalStageDaily,
        newCandidatesDaily,
        discardsDaily,
        arrivalsByDay,
        allArrivals: details,
        consultantSeries,
        consultantDaily,
        consultantRanking,
        discardReasons,
        discardsInPeriod,
    };
}

export function consolidateArrivalsForDays(
    report: ProcessCoverageReport,
    dayKeys: string[]
): FinalStageArrivalDetail[] {
    const set = new Set(dayKeys);
    return report.allArrivals
        .filter(a => set.has(a.dateKey))
        .sort((a, b) => b.movedAt.localeCompare(a.movedAt));
}

export function formatDateTimeLima(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}
