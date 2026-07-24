import type { Candidate, Process, ProcessStatus, User } from '../types';
import {
    addDaysToDateKey,
    filterAttemptsInDateRange,
    formatDateKeyLima,
    formatDayLabelFromKey,
    getContactPeriodRange,
    isEffectiveCallConsultantAttempt,
    isRecordedCallAttempt,
    isCountableContactAction,
    iterDateKeys,
    type ContactConsultantPeriod,
} from './contactDashboardStats';
import {
    isInterestedCandidateResponse,
    isNotInterestedCandidateResponse,
} from './contactologyAnalytics';
import type { ContactAttempt } from './contactTracking';
import { PROCESS_STATUS_LABELS } from './processStatus';
import {
    getHiredStageActorFromHistory,
    resolveHiringStageId,
    type HiredStageActor,
} from './hiringStageTracking';
import type { BulkProcessActivityEntry } from './api/bulkProcessActivity';
import type { ContactSummaryCandidate } from './contactAttemptReconcile';
import { normalizeContactStatus } from './contactTracking';

export const INTELLIGENCE_PROCESS_COLORS = [
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
];

export interface IntelligenceProcessMeta {
    processId: string;
    shortTitle: string;
    color: string;
    dataKey: string;
}

export interface DailyInflowSeries {
    periodLabel: string;
    startKey: string;
    endKey: string;
    /** Filas diarias: label + total + una clave por proceso */
    rows: Array<Record<string, string | number>>;
    processSeries: IntelligenceProcessMeta[];
    totalInflow: number;
    dailyAverage: number;
    peakDay: { label: string; total: number } | null;
}

export interface UserPerformanceRow {
    name: string;
    calls: number;
    effectiveCalls: number;
    effectivenessPct: number;
    interested: number;
    notInterested: number;
    hires: number;
}

export interface UserDailyEvolutionPoint {
    dateKey: string;
    label: string;
    calls: number;
    effective: number;
    hires: number;
}

export interface ProcessIntelligenceRow {
    processId: string;
    title: string;
    status: ProcessStatus;
    statusLabel: string;
    isBulk: boolean;
    totalCandidates: number;
    activeCandidates: number;
    newInPeriod: number;
    /** Ingresos nuevos por hora en el periodo seleccionado */
    newPerHour: number;
    /** Ingresos en las últimas 24 h */
    newLast24h: number;
    desisted: number;
    desistedRatio: number;
    interested: number;
    interestedRatio: number;
    transfersIn: number;
    transfersOut: number;
    hired: number;
    conversionPct: number;
    contacted: number;
    contactRate: number;
}

export interface PortfolioStatusCounts {
    en_proceso: number;
    standby: number;
    terminado: number;
    cancelado: number;
    trunco: number;
    total: number;
}

function shortProcessTitle(title: string, max = 22): string {
    const t = title.trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1)}…`;
}

function processDataKey(processId: string): string {
    return `p_${processId.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

function hoursElapsedInPeriod(startKey: string, endKey: string, now = new Date()): number {
    const start = new Date(`${startKey}T00:00:00-05:00`).getTime();
    const endCap = Math.min(
        now.getTime(),
        new Date(`${endKey}T23:59:59-05:00`).getTime()
    );
    const hours = (endCap - start) / (1000 * 60 * 60);
    return Math.max(hours, 1);
}

function candidateHasContactStatus(
    summary: ContactSummaryCandidate | undefined,
    status: 'interesado' | 'no_interesado'
): boolean {
    if (!summary) return false;
    const channels = [summary.contactPhone, summary.contactWhatsapp, summary.contactEmail];
    return channels.some(ch => ch && normalizeContactStatus(ch.status) === status);
}

function candidateWasContacted(summary: ContactSummaryCandidate | undefined): boolean {
    if (!summary) return false;
    const channels = [summary.contactPhone, summary.contactWhatsapp, summary.contactEmail];
    return channels.some(ch => {
        if (!ch) return false;
        const s = normalizeContactStatus(ch.status);
        return s !== 'por_contactar';
    });
}

function isHiredCandidate(
    candidate: {
        id: string;
        processId: string;
        stageId?: string;
        discarded?: boolean;
        history?: Candidate['history'];
    },
    process: Process | undefined,
    bulkHiringActorsByProcess: Record<string, Record<string, HiredStageActor>>
): boolean {
    const hiringStageId = resolveHiringStageId(process);
    if (!hiringStageId) return false;
    if (candidate.stageId === hiringStageId && !candidate.discarded) return true;
    if (getHiredStageActorFromHistory(candidate.history, process)) return true;
    return Boolean(bulkHiringActorsByProcess[candidate.processId]?.[candidate.id]);
}

export interface InflowTimestamp {
    processId: string;
    createdAt: string;
}

/**
 * Resuelve la fecha de ingreso para métricas de flujo.
 * Preferimos created_at explícito (altas / re-postulaciones). Los traslados por
 * movimiento no cambian created_at, así que no cuentan como ingreso nuevo.
 */
export function resolveInflowCreatedAt(candidate: {
    createdAt?: string;
    firstApplicationAt?: string;
    applicationStartedDate?: string;
    history?: { movedAt?: string }[];
}): string | undefined {
    // Solo created_at: evita contar traslados vía history.movedAt del día del traslado.
    if (candidate.createdAt) return candidate.createdAt;
    return (
        candidate.firstApplicationAt ||
        candidate.applicationStartedDate ||
        undefined
    );
}

/**
 * Flujo diario de nuevos postulantes por proceso (comparativo) + totalización.
 * `inflowRows` (si viene) tiene prioridad: consulta fresca por created_at desde BD.
 */
export function buildMultiProcessDailyInflow(
    candidates: Candidate[],
    processes: Process[],
    period: ContactConsultantPeriod,
    maxProcesses = 8,
    inflowRows?: InflowTimestamp[] | null
): DailyInflowSeries {
    const { startKey, endKey, label: periodLabel } = getContactPeriodRange(period);
    const dateKeys = iterDateKeys(startKey, endKey);

    const countsByProcessDay = new Map<string, Map<string, number>>();
    const totalsByProcess = new Map<string, number>();

    const source: InflowTimestamp[] =
        inflowRows != null
            ? inflowRows
            : candidates
                  .map(c => {
                      const createdAt = resolveInflowCreatedAt(c);
                      return createdAt ? { processId: c.processId, createdAt } : null;
                  })
                  .filter((r): r is InflowTimestamp => Boolean(r));

    for (const row of source) {
        const dayKey = formatDateKeyLima(row.createdAt);
        if (!dayKey || dayKey < startKey || dayKey > endKey) continue;

        const byDay = countsByProcessDay.get(row.processId) || new Map<string, number>();
        byDay.set(dayKey, (byDay.get(dayKey) || 0) + 1);
        countsByProcessDay.set(row.processId, byDay);
        totalsByProcess.set(row.processId, (totalsByProcess.get(row.processId) || 0) + 1);
    }

    const rankedProcessIds = [...totalsByProcess.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);

    const processMap = new Map(processes.map(p => [p.id, p]));
    const topIds = rankedProcessIds.slice(0, maxProcesses);
    // Incluir procesos sin ingresos si hay pocos, para contexto de cartera
    if (topIds.length < Math.min(maxProcesses, processes.length)) {
        for (const p of processes) {
            if (topIds.includes(p.id)) continue;
            topIds.push(p.id);
            if (topIds.length >= maxProcesses) break;
        }
    }

    const processSeries: IntelligenceProcessMeta[] = topIds.map((processId, idx) => {
        const title = processMap.get(processId)?.title || 'Proceso';
        return {
            processId,
            shortTitle: shortProcessTitle(title),
            color: INTELLIGENCE_PROCESS_COLORS[idx % INTELLIGENCE_PROCESS_COLORS.length],
            dataKey: processDataKey(processId),
        };
    });

    let totalInflow = 0;
    let peakDay: DailyInflowSeries['peakDay'] = null;

    const rows = dateKeys.map(dateKey => {
        const row: Record<string, string | number> = {
            dateKey,
            label: formatDayLabelFromKey(dateKey),
            total: 0,
        };
        let dayTotal = 0;
        for (const series of processSeries) {
            const n = countsByProcessDay.get(series.processId)?.get(dateKey) || 0;
            row[series.dataKey] = n;
            dayTotal += n;
        }
        // Procesos fuera del top también suman al total
        for (const [processId, byDay] of countsByProcessDay) {
            if (topIds.includes(processId)) continue;
            dayTotal += byDay.get(dateKey) || 0;
        }
        row.total = dayTotal;
        totalInflow += dayTotal;
        if (!peakDay || dayTotal > peakDay.total) {
            peakDay = { label: String(row.label), total: dayTotal };
        }
        return row;
    });

    const dayCount = Math.max(dateKeys.length, 1);
    return {
        periodLabel,
        startKey,
        endKey,
        rows,
        processSeries,
        totalInflow,
        dailyAverage: Math.round((totalInflow / dayCount) * 10) / 10,
        peakDay: peakDay && peakDay.total > 0 ? peakDay : null,
    };
}

/**
 * Desempeño por consultor: llamadas, efectividad, interés y contrataciones.
 */
export function computeUserPerformanceRows(
    attempts: ContactAttempt[],
    candidates: Candidate[],
    processes: Process[],
    users: Pick<User, 'id' | 'name'>[],
    bulkHiringActorsByProcess: Record<string, Record<string, HiredStageActor>>,
    period: ContactConsultantPeriod
): UserPerformanceRow[] {
    const { startKey, endKey } = getContactPeriodRange(period);
    const scoped = filterAttemptsInDateRange(attempts, startKey, endKey);
    const processMap = new Map(processes.map(p => [p.id, p]));

    const byUser = new Map<
        string,
        { calls: number; effectiveCalls: number; interested: number; notInterested: number }
    >();

    const ensure = (name: string) => {
        const key = name.trim() || 'Sin consultor';
        let row = byUser.get(key);
        if (!row) {
            row = { calls: 0, effectiveCalls: 0, interested: 0, notInterested: 0 };
            byUser.set(key, row);
        }
        return row;
    };

    for (const attempt of scoped) {
        if (!isCountableContactAction(attempt)) continue;
        const name = (attempt.userName || '').trim() || 'Sin consultor';
        const row = ensure(name);

        if (attempt.channel === 'call') {
            if (isRecordedCallAttempt(attempt)) row.calls += 1;
            if (isEffectiveCallConsultantAttempt(attempt)) row.effectiveCalls += 1;
        }
        if (isInterestedCandidateResponse(attempt)) row.interested += 1;
        if (isNotInterestedCandidateResponse(attempt)) row.notInterested += 1;
    }

    const hiresByUser = new Map<string, number>();
    for (const candidate of candidates) {
        const process = processMap.get(candidate.processId);
        const hiringStageId = resolveHiringStageId(process);
        if (!hiringStageId) continue;

        let actor = getHiredStageActorFromHistory(candidate.history, process, users);
        if (!actor) {
            actor = bulkHiringActorsByProcess[candidate.processId]?.[candidate.id] ?? null;
        }
        if (!actor) continue;

        const movedKey = actor.movedAt ? formatDateKeyLima(actor.movedAt) : '';
        if (movedKey && (movedKey < startKey || movedKey > endKey)) continue;

        const name = actor.userName.trim() || 'Sin consultor';
        hiresByUser.set(name, (hiresByUser.get(name) || 0) + 1);
        ensure(name);
    }

    return [...byUser.entries()]
        .map(([name, stats]) => {
            const hires = hiresByUser.get(name) || 0;
            return {
                name,
                calls: stats.calls,
                effectiveCalls: stats.effectiveCalls,
                effectivenessPct:
                    stats.calls > 0
                        ? Math.round((stats.effectiveCalls / stats.calls) * 1000) / 10
                        : stats.effectiveCalls > 0
                          ? 100
                          : 0,
                interested: stats.interested,
                notInterested: stats.notInterested,
                hires,
            };
        })
        .filter(r => r.calls > 0 || r.effectiveCalls > 0 || r.hires > 0 || r.interested > 0)
        .sort((a, b) => b.calls - a.calls || b.hires - a.hires || b.effectivenessPct - a.effectivenessPct);
}

/**
 * Evolución diaria agregada de llamadas / efectivas / contrataciones del equipo.
 */
export function buildTeamDailyEvolution(
    attempts: ContactAttempt[],
    candidates: Candidate[],
    processes: Process[],
    users: Pick<User, 'id' | 'name'>[],
    bulkHiringActorsByProcess: Record<string, Record<string, HiredStageActor>>,
    period: ContactConsultantPeriod
): UserDailyEvolutionPoint[] {
    const { startKey, endKey } = getContactPeriodRange(period);
    const dateKeys = iterDateKeys(startKey, endKey);
    const processMap = new Map(processes.map(p => [p.id, p]));

    const callByDay = new Map<string, { calls: number; effective: number }>();
    for (const key of dateKeys) callByDay.set(key, { calls: 0, effective: 0 });

    for (const attempt of filterAttemptsInDateRange(attempts, startKey, endKey)) {
        if (attempt.channel !== 'call' || !isCountableContactAction(attempt)) continue;
        const dayKey = formatDateKeyLima(attempt.createdAt);
        const bucket = callByDay.get(dayKey);
        if (!bucket) continue;
        if (isRecordedCallAttempt(attempt)) bucket.calls += 1;
        if (isEffectiveCallConsultantAttempt(attempt)) bucket.effective += 1;
    }

    const hiresByDay = new Map<string, number>();
    for (const key of dateKeys) hiresByDay.set(key, 0);

    for (const candidate of candidates) {
        const process = processMap.get(candidate.processId);
        let actor = getHiredStageActorFromHistory(candidate.history, process, users);
        if (!actor) {
            actor = bulkHiringActorsByProcess[candidate.processId]?.[candidate.id] ?? null;
        }
        if (!actor?.movedAt) continue;
        const dayKey = formatDateKeyLima(actor.movedAt);
        if (!hiresByDay.has(dayKey)) continue;
        hiresByDay.set(dayKey, (hiresByDay.get(dayKey) || 0) + 1);
    }

    return dateKeys.map(dateKey => ({
        dateKey,
        label: formatDayLabelFromKey(dateKey),
        calls: callByDay.get(dateKey)?.calls || 0,
        effective: callByDay.get(dateKey)?.effective || 0,
        hires: hiresByDay.get(dateKey) || 0,
    }));
}

function transferVolume(entry: BulkProcessActivityEntry): number {
    const raw = entry.details?.count;
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * El log de traslado se escribe en el proceso origen con details.targetProcessId.
 */
function countTransfers(
    entries: BulkProcessActivityEntry[],
    processId: string,
    direction: 'in' | 'out',
    startKey: string,
    endKey: string
): number {
    let count = 0;
    for (const entry of entries) {
        if (entry.actionType !== 'candidate_transfer') continue;
        const dayKey = formatDateKeyLima(entry.createdAt);
        if (dayKey < startKey || dayKey > endKey) continue;

        const details = entry.details || {};
        const sourceId = entry.processId;
        const targetId = String(details.targetProcessId || details.toProcessId || '');
        const volume = transferVolume(entry);

        if (direction === 'out' && sourceId === processId) count += volume;
        if (direction === 'in' && targetId === processId) count += volume;
    }
    return count;
}

function countInflowForProcess(
    rows: InflowTimestamp[],
    processId: string,
    startKey: string,
    endKey: string,
    last24hCutoff: number
): { newInPeriod: number; newLast24h: number } {
    let newInPeriod = 0;
    let newLast24h = 0;
    for (const row of rows) {
        if (row.processId !== processId) continue;
        const dayKey = formatDateKeyLima(row.createdAt);
        if (dayKey >= startKey && dayKey <= endKey) newInPeriod += 1;
        const ts = new Date(row.createdAt).getTime();
        if (!Number.isNaN(ts) && ts >= last24hCutoff) newLast24h += 1;
    }
    return { newInPeriod, newLast24h };
}

/**
 * Cuadro resumen por proceso: flujo, desistimiento, traspasos, estado y ratios.
 * `inflowRows` (si viene) define ingresos 24h/periodo; el resto usa el pool de candidatos.
 */
export function computeProcessIntelligenceRows(
    candidates: Candidate[],
    processes: Process[],
    attempts: ContactAttempt[],
    transferActivity: BulkProcessActivityEntry[],
    contactSummaries: Record<string, ContactSummaryCandidate>,
    bulkHiringActorsByProcess: Record<string, Record<string, HiredStageActor>>,
    period: ContactConsultantPeriod,
    now = new Date(),
    inflowRows?: InflowTimestamp[] | null
): ProcessIntelligenceRow[] {
    const { startKey, endKey } = getContactPeriodRange(period);
    const hours = hoursElapsedInPeriod(startKey, endKey, now);
    const last24hCutoff = now.getTime() - 24 * 60 * 60 * 1000;
    const processMap = new Map(processes.map(p => [p.id, p]));

    const candidatesByProcess = new Map<string, Candidate[]>();
    for (const c of candidates) {
        const list = candidatesByProcess.get(c.processId) || [];
        list.push(c);
        candidatesByProcess.set(c.processId, list);
    }

    const inflowSource: InflowTimestamp[] =
        inflowRows != null
            ? inflowRows
            : candidates
                  .map(c => {
                      const createdAt = resolveInflowCreatedAt(c);
                      return createdAt ? { processId: c.processId, createdAt } : null;
                  })
                  .filter((r): r is InflowTimestamp => Boolean(r));

    const notInterestedAttemptsByProcess = new Map<string, Set<string>>();
    for (const attempt of filterAttemptsInDateRange(attempts, startKey, endKey)) {
        if (!isNotInterestedCandidateResponse(attempt)) continue;
        const set = notInterestedAttemptsByProcess.get(attempt.processId) || new Set<string>();
        set.add(attempt.candidateId);
        notInterestedAttemptsByProcess.set(attempt.processId, set);
    }

    return processes.map(process => {
        const list = candidatesByProcess.get(process.id) || [];
        const active = list.filter(c => !c.discarded && !c.archived);
        const { newInPeriod, newLast24h } = countInflowForProcess(
            inflowSource,
            process.id,
            startKey,
            endKey,
            last24hCutoff
        );
        let desisted = 0;
        let interested = 0;
        let contacted = 0;
        let hired = 0;

        for (const candidate of list) {
            const summary = contactSummaries[candidate.id];
            if (candidateHasContactStatus(summary, 'no_interesado')) desisted += 1;
            else if (notInterestedAttemptsByProcess.get(process.id)?.has(candidate.id)) desisted += 1;

            if (candidateHasContactStatus(summary, 'interesado')) interested += 1;
            if (candidateWasContacted(summary)) contacted += 1;
            if (isHiredCandidate(candidate, processMap.get(process.id), bulkHiringActorsByProcess)) {
                hired += 1;
            }
        }

        const status: ProcessStatus = process.status || 'en_proceso';
        const pool = Math.max(list.length, 1);

        return {
            processId: process.id,
            title: process.title,
            status,
            statusLabel: PROCESS_STATUS_LABELS[status],
            isBulk: Boolean(process.isBulkProcess),
            totalCandidates: list.length,
            activeCandidates: active.length,
            newInPeriod,
            newPerHour: Math.round((newInPeriod / hours) * 100) / 100,
            newLast24h,
            desisted,
            desistedRatio: Math.round((desisted / pool) * 1000) / 10,
            interested,
            interestedRatio: Math.round((interested / pool) * 1000) / 10,
            transfersIn: countTransfers(transferActivity, process.id, 'in', startKey, endKey),
            transfersOut: countTransfers(transferActivity, process.id, 'out', startKey, endKey),
            hired,
            conversionPct: Math.round((hired / pool) * 1000) / 10,
            contacted,
            contactRate: Math.round((contacted / pool) * 1000) / 10,
        };
    }).sort((a, b) => b.newPerHour - a.newPerHour || b.newInPeriod - a.newInPeriod);
}

export function computePortfolioStatusCounts(processes: Process[]): PortfolioStatusCounts {
    const counts: PortfolioStatusCounts = {
        en_proceso: 0,
        standby: 0,
        terminado: 0,
        cancelado: 0,
        trunco: 0,
        total: processes.length,
    };
    for (const p of processes) {
        const s = p.status || 'en_proceso';
        counts[s] += 1;
    }
    return counts;
}
