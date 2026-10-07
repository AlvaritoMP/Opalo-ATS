import type { Candidate, Process, User } from '../types';
import { isProcessActive } from './processStatus';
import { bulkCandidatesApi } from './api/bulkCandidates';
import { contactTrackingApi } from './api/contactTracking';
import { interviewSchedulingApi } from './api/interviewScheduling';
import {
    enrichBulkCandidateForDashboard,
    bulkDashboardFieldExtrasFromCandidate,
} from './dashboardCandidatePool';
import type { ContactSummaryCandidate } from './contactAttemptReconcile';
import {
    backfillContactAttemptProcessIds,
    mergeContactAttemptsDedupe,
} from './contactAttemptReconcile';
import {
    mapRawHiringMoves,
    resolveHiringStageId,
    type HiredStageActor,
} from './hiringStageTracking';
import type { BulkSchedulingCandidateRow } from './interviewSchedulingReconcile';
import type { ContactAttempt } from './contactTracking';
import { buildUserLookupForStats, type DashboardActorUser } from './dashboardActorNames';

const PROCESS_LOAD_MS = 20_000;

function startAbortTimer(ms: number, parent?: AbortSignal): { signal: AbortSignal; done: () => void } {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    const onParent = () => controller.abort();
    if (parent) {
        if (parent.aborted) controller.abort();
        else parent.addEventListener('abort', onParent, { once: true });
    }
    return {
        signal: controller.signal,
        done: () => {
            clearTimeout(timer);
            parent?.removeEventListener('abort', onParent);
        },
    };
}

export type BulkCandidateFieldExtras = {
    bulkColumnValues?: Record<string, unknown>;
    age?: number;
    source?: string;
    province?: string;
    district?: string;
};

export interface DashboardDataCache {
    loadedAt: string;
    bulkPoolCandidates: Candidate[];
    bulkCandidateFields: Record<string, BulkCandidateFieldExtras>;
    bulkContactSummaries: Record<string, ContactSummaryCandidate>;
    bulkSchedulingRows: BulkSchedulingCandidateRow[];
    bulkHiringActorsByProcess: Record<string, Record<string, HiredStageActor>>;
    contactAttempts: ContactAttempt[];
    schedulingLogs: Awaited<ReturnType<typeof interviewSchedulingApi.getLogsForProcesses>>;
    schedulingCycles: Awaited<ReturnType<typeof interviewSchedulingApi.getCyclesForProcesses>>;
}

export async function fetchDashboardData(
    processes: Process[],
    users: User[],
    currentUser: User | null,
    signal?: AbortSignal
): Promise<DashboardDataCache> {
    // Stand By / cerrados: sin cargas de candidatos, contactos ni scheduling.
    const activeProcesses = processes.filter(p => isProcessActive(p.status));
    const processMap = new Map(activeProcesses.map(p => [p.id, p]));
    const bulkProcessIds = activeProcesses.filter(p => p.isBulkProcess).map(p => p.id);
    const allProcessIds = activeProcesses.map(p => p.id);
    const statsUsers = buildUserLookupForStats(users, currentUser ?? undefined);

    const pool: Candidate[] = [];
    const fields: Record<string, BulkCandidateFieldExtras> = {};
    const summaries: Record<string, ContactSummaryCandidate> = {};
    const schedulingRows: BulkSchedulingCandidateRow[] = [];

    // Procesos masivos en serie para no saturar I/O de Supabase al abrir el panel
    for (const processId of bulkProcessIds) {
        if (signal?.aborted) break;
        const deadline = startAbortTimer(PROCESS_LOAD_MS, signal);
        try {
            const process = processMap.get(processId);
            const all = await bulkCandidatesApi.getAllCandidates(processId, { signal: deadline.signal });
            const candidateIds = all.map(c => c.id);
            const columnValuesMap = await bulkCandidatesApi.loadAllBulkColumnValues(processId, deadline.signal);
            const historyByCandidate = await bulkCandidatesApi.loadCandidateHistoryByIds(candidateIds, deadline.signal);
            for (const c of all) {
                const columnRow = columnValuesMap[c.id] || {};
                const withHistory = {
                    ...c,
                    history: historyByCandidate[c.id] ?? [],
                };
                const mapped = enrichBulkCandidateForDashboard(withHistory, process, columnRow);
                pool.push(mapped);
                fields[c.id] = bulkDashboardFieldExtrasFromCandidate(mapped);
                summaries[c.id] = {
                    id: c.id,
                    processId: c.processId,
                    contactPhone: c.contactPhone,
                    contactWhatsapp: c.contactWhatsapp,
                    contactEmail: c.contactEmail,
                };
                schedulingRows.push({
                    id: c.id,
                    processId: c.processId,
                    bulkColumnValues: {
                        ...(c.bulkColumnValues || {}),
                        ...columnRow,
                    },
                    nextInterviewAt: c.nextInterviewAt,
                    nextInterviewerId: c.nextInterviewerId,
                });
            }
        } catch (err) {
            if (signal?.aborted) break;
            const timedOut = deadline.signal.aborted;
            console.warn(
                timedOut
                    ? `Inteligencia/Panel: el proceso masivo ${processId} superó ${PROCESS_LOAD_MS / 1000}s y se omitió`
                    : `Inteligencia/Panel: no se pudo cargar el proceso masivo ${processId}`,
                err
            );
        } finally {
            deadline.done();
        }
    }

    const byProcess: Record<string, Record<string, HiredStageActor>> = {};
    for (const processId of bulkProcessIds) {
        if (signal?.aborted) break;
        const process = processMap.get(processId);
        const hiringStageId = resolveHiringStageId(process);
        if (!hiringStageId) {
            byProcess[processId] = {};
            continue;
        }
        try {
            const actorDeadline = startAbortTimer(PROCESS_LOAD_MS, signal);
            let rows: Awaited<ReturnType<typeof bulkCandidatesApi.getHiringStageActorsForProcess>> = [];
            try {
                rows = await bulkCandidatesApi.getHiringStageActorsForProcess(
                    processId,
                    hiringStageId,
                    actorDeadline.signal
                );
            } finally {
                actorDeadline.done();
            }
            byProcess[processId] = mapRawHiringMoves(rows, statsUsers);
        } catch {
            byProcess[processId] = {};
        }
    }

    let contactAttempts: ContactAttempt[] = [];
    let schedulingLogs: DashboardDataCache['schedulingLogs'] = [];
    let schedulingCycles: DashboardDataCache['schedulingCycles'] = [];

    if (allProcessIds.length > 0) {
        const tailDeadline = startAbortTimer(PROCESS_LOAD_MS, signal);
        const loadTail = async () => {
            const summaryList = Object.values(summaries);
            if (summaryList.length > 0) {
                try {
                    await contactTrackingApi.syncSummariesToHistory(summaryList, bulkProcessIds);
                } catch {
                    /* opcional */
                }
            }

            const bulkCandidateIds = pool.map(c => c.id);
            const candidateProcessIdMap = new Map<string, string>();
            for (const c of pool) candidateProcessIdMap.set(c.id, c.processId);

            try {
                const byProcessAttempts = await contactTrackingApi.getAttemptsForProcesses(allProcessIds);
                const byCandidates = bulkCandidateIds.length > 0
                    ? await contactTrackingApi.getAttemptsForCandidateIds(bulkCandidateIds)
                    : [];
                const logs = await interviewSchedulingApi.getLogsForProcesses(allProcessIds);
                const cycles = await interviewSchedulingApi.getCyclesForProcesses(allProcessIds);
                contactAttempts = backfillContactAttemptProcessIds(
                    mergeContactAttemptsDedupe([...byProcessAttempts, ...byCandidates]),
                    candidateProcessIdMap
                );
                schedulingLogs = logs;
                schedulingCycles = cycles;
            } catch {
                contactAttempts = [];
                schedulingLogs = [];
                schedulingCycles = [];
            }
        };

        await Promise.race([
            loadTail(),
            new Promise<void>(resolve => {
                if (tailDeadline.signal.aborted) {
                    resolve();
                    return;
                }
                tailDeadline.signal.addEventListener('abort', () => resolve(), { once: true });
            }),
        ]);
        if (tailDeadline.signal.aborted && !signal?.aborted) {
            console.warn('Inteligencia/Panel: contactos y agenda se omitieron por tiempo de espera');
        }
        tailDeadline.done();
    }

    if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    return {
        loadedAt: new Date().toISOString(),
        bulkPoolCandidates: pool,
        bulkCandidateFields: fields,
        bulkContactSummaries: summaries,
        bulkSchedulingRows: schedulingRows,
        bulkHiringActorsByProcess: byProcess,
        contactAttempts,
        schedulingLogs,
        schedulingCycles,
    };
}
