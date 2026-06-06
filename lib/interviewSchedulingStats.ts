import type { InterviewSchedulingLogRow, InterviewSchedulingCycleRow } from './api/interviewScheduling';
import {
    formatDateKeyLima,
    getContactPeriodRange,
    type ContactConsultantPeriod,
} from './contactDashboardStats';

export type InterviewSchedulingPeriod = ContactConsultantPeriod;

export interface InterviewSchedulingDashboardStats {
    periodLabel: string;
    totalSchedulingActions: number;
    totalReschedules: number;
    totalAttended: number;
    openCycles: number;
    avgActionsUntilAttendance: number | null;
    topScheduler: { userName: string; count: number } | null;
    topInterviewer: { userName: string; count: number } | null;
    schedulerRankings: { name: string; agendas: number; reagendas: number }[];
    interviewerRankings: { name: string; agendas: number; reagendas: number }[];
}

function resolveUserName(
    userId: string | undefined,
    userName: string | undefined,
    users: Array<{ id: string; name?: string; email?: string }>
): string {
    if (userName?.trim()) return userName.trim();
    if (!userId) return 'Sin asignar';
    const u = users.find(x => x.id === userId);
    if (u?.name?.trim()) return u.name.trim();
    if (u?.email?.trim()) return u.email.split('@')[0];
    return 'Usuario';
}

export function computeInterviewSchedulingStats(
    logs: InterviewSchedulingLogRow[],
    cycles: InterviewSchedulingCycleRow[],
    period: InterviewSchedulingPeriod,
    users: Array<{ id: string; name?: string; email?: string }> = [],
    candidateIdsInScope?: Set<string>
): InterviewSchedulingDashboardStats {
    const { startKey, endKey, label: periodLabel } = getContactPeriodRange(period);

    const scopedLogs = logs.filter(l => {
        const key = formatDateKeyLima(l.createdAt);
        if (!key || key < startKey || key > endKey) return false;
        if (candidateIdsInScope && !candidateIdsInScope.has(l.candidateId)) return false;
        return l.action === 'scheduled' || l.action === 'rescheduled';
    });

    const scopedCycles = cycles.filter(c => {
        const ref = c.attendedAt || c.openedAt;
        const key = formatDateKeyLima(ref);
        if (!key || key < startKey || key > endKey) return false;
        if (candidateIdsInScope && !candidateIdsInScope.has(c.candidateId)) return false;
        return true;
    });

    const attendedCycles = scopedCycles.filter(c => c.status === 'attended');
    const openCycles = scopedCycles.filter(c => c.status === 'open').length;

    const schedulerCounts = new Map<string, number>();
    const schedulerReschedules = new Map<string, number>();
    const interviewerCounts = new Map<string, number>();
    const interviewerReschedules = new Map<string, number>();

    for (const log of scopedLogs) {
        const schedulerName = resolveUserName(log.performedBy, log.performedByName, users);
        schedulerCounts.set(schedulerName, (schedulerCounts.get(schedulerName) || 0) + 1);
        if (log.action === 'rescheduled') {
            schedulerReschedules.set(
                schedulerName,
                (schedulerReschedules.get(schedulerName) || 0) + 1
            );
        }

        const interviewerName = resolveUserName(log.interviewerId, undefined, users);
        interviewerCounts.set(interviewerName, (interviewerCounts.get(interviewerName) || 0) + 1);
        if (log.action === 'rescheduled') {
            interviewerReschedules.set(
                interviewerName,
                (interviewerReschedules.get(interviewerName) || 0) + 1
            );
        }
    }

    const buildRankings = (
        counts: Map<string, number>,
        reschedules: Map<string, number>
    ) => {
        const names = new Set([...counts.keys(), ...reschedules.keys()]);
        return Array.from(names)
            .map(name => ({
                name,
                agendas: counts.get(name) || 0,
                reagendas: reschedules.get(name) || 0,
            }))
            .filter(r => r.agendas > 0)
            .sort((a, b) => b.agendas - a.agendas);
    };

    const schedulerRankings = buildRankings(schedulerCounts, schedulerReschedules);
    const interviewerRankings = buildRankings(interviewerCounts, interviewerReschedules);

    const totalReschedules = scopedLogs.filter(l => l.action === 'rescheduled').length;
    const totalSchedulingActions = scopedLogs.length;

    const actionSums = attendedCycles
        .map(c => c.actionCount)
        .filter(n => n > 0);
    const avgActionsUntilAttendance =
        actionSums.length > 0
            ? Math.round((actionSums.reduce((s, n) => s + n, 0) / actionSums.length) * 10) / 10
            : null;

    return {
        periodLabel,
        totalSchedulingActions,
        totalReschedules,
        totalAttended: attendedCycles.length,
        openCycles,
        avgActionsUntilAttendance,
        topScheduler: schedulerRankings[0]
            ? { userName: schedulerRankings[0].name, count: schedulerRankings[0].agendas }
            : null,
        topInterviewer: interviewerRankings[0]
            ? { userName: interviewerRankings[0].name, count: interviewerRankings[0].agendas }
            : null,
        schedulerRankings,
        interviewerRankings,
    };
}
