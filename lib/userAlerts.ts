import type { Process, UserAlert, UserAlertSeverity } from '../types';
import type { AlertCandidateRow } from './api/userAlerts';
import {
    resolveActiveContactLock,
    isContactLockedForUser,
    type ContactLockCandidateRow,
} from './contactLock';
import { normalizeContactStatus } from './contactTracking';

const ONE_HOUR_MS = 60 * 60 * 1000;

function toLockRow(row: AlertCandidateRow): ContactLockCandidateRow {
    return {
        contact_lock_user_id: row.contactLockUserId,
        contact_lock_user_name: null,
        contact_lock_until: row.contactLockUntil,
        contact_lock_reason: row.contactLockReason,
        created_by: row.createdBy,
        created_at: row.createdAt,
        registration_origin: row.registrationOrigin,
    };
}

function isContactable(row: AlertCandidateRow, userId: string, nowMs: number): boolean {
    const lock = resolveActiveContactLock(toLockRow(row), nowMs);
    return !isContactLockedForUser(lock, userId);
}

function lastActivityMs(row: AlertCandidateRow): number {
    if (row.contactLastAttemptAt) {
        const t = new Date(row.contactLastAttemptAt).getTime();
        if (Number.isFinite(t)) return t;
    }
    if (row.createdAt) {
        const t = new Date(row.createdAt).getTime();
        if (Number.isFinite(t)) return t;
    }
    return 0;
}

function hadExpiredLockByUser(row: AlertCandidateRow, userId: string, nowMs: number): boolean {
    if (!row.contactLockUserId || row.contactLockUserId !== userId) {
        if (row.createdBy === userId && row.registrationOrigin) {
            const uploadLock = resolveActiveContactLock(toLockRow(row), nowMs);
            if (!uploadLock) {
                const createdMs = row.createdAt ? new Date(row.createdAt).getTime() : 0;
                if (createdMs > 0 && nowMs - createdMs > 30 * 60 * 1000) return true;
            }
        }
        return false;
    }
    const untilMs = row.contactLockUntil ? new Date(row.contactLockUntil).getTime() : 0;
    return Number.isFinite(untilMs) && untilMs <= nowMs;
}

function buildProcessAlert(
    type: UserAlert['type'],
    severity: UserAlertSeverity,
    title: string,
    message: string,
    process: Process,
    count: number,
    candidateNames: string[]
): UserAlert {
    return {
        id: `${type}-${process.id}`,
        type,
        severity,
        title,
        message,
        processId: process.id,
        processTitle: process.title,
        count,
        candidateNames: candidateNames.slice(0, 5),
    };
}

export function computeUserAlerts(
    processes: Process[],
    bulkRows: AlertCandidateRow[],
    standardRows: AlertCandidateRow[],
    userId: string,
    nowMs = Date.now()
): UserAlert[] {
    const alerts: UserAlert[] = [];
    const processMap = new Map(processes.map(p => [p.id, p]));

    const bulkByProcess = new Map<string, AlertCandidateRow[]>();
    for (const row of bulkRows) {
        const list = bulkByProcess.get(row.processId) || [];
        list.push(row);
        bulkByProcess.set(row.processId, list);
    }

    for (const [processId, rows] of bulkByProcess) {
        const process = processMap.get(processId);
        if (!process || process.status !== 'en_proceso') continue;

        const newCandidates = rows.filter(row => {
            const status = normalizeContactStatus(row.contactStatus);
            return status === 'por_contactar' && isContactable(row, userId, nowMs);
        });

        if (newCandidates.length > 0) {
            alerts.push(
                buildProcessAlert(
                    'new_candidates',
                    'info',
                    'Candidatos nuevos por contactar',
                    `Tienes ${newCandidates.length} candidato(s) listo(s) para llamar o contactar.`,
                    process,
                    newCandidates.length,
                    newCandidates.map(c => c.name)
                )
            );
        }

        const stale = rows.filter(row => {
            const status = normalizeContactStatus(row.contactStatus);
            if (status !== 'por_contactar' && status !== 'en_intento') return false;
            if (!isContactable(row, userId, nowMs)) return false;
            const activity = lastActivityMs(row);
            return activity > 0 && nowMs - activity >= ONE_HOUR_MS;
        });

        if (stale.length > 0) {
            alerts.push(
                buildProcessAlert(
                    'stale_without_contact',
                    'warning',
                    'Sin contacto por más de 1 hora',
                    `${stale.length} candidato(s) llevan más de 1 hora sin intento de contacto.`,
                    process,
                    stale.length,
                    stale.map(c => c.name)
                )
            );
        }

        const lockExpired = rows.filter(row => {
            const status = normalizeContactStatus(row.contactStatus);
            if (status !== 'en_intento') return false;
            if (!isContactable(row, userId, nowMs)) return false;
            const wasMyContact =
                row.contactLastUserId === userId || row.contactLockUserId === userId;
            if (!wasMyContact) return false;
            return hadExpiredLockByUser(row, userId, nowMs);
        });

        if (lockExpired.length > 0) {
            alerts.push(
                buildProcessAlert(
                    'lock_expired',
                    'info',
                    'Bloqueo expirado — puedes recontactar',
                    `${lockExpired.length} candidato(s) que contactaste sin respuesta ya pueden volver a contactarse.`,
                    process,
                    lockExpired.length,
                    lockExpired.map(c => c.name)
                )
            );
        }

        const latestCreated = rows.reduce((max, row) => {
            const t = row.createdAt ? new Date(row.createdAt).getTime() : 0;
            return Math.max(max, Number.isFinite(t) ? t : 0);
        }, 0);

        if (latestCreated > 0 && nowMs - latestCreated >= ONE_HOUR_MS) {
            const hours = Math.floor((nowMs - latestCreated) / ONE_HOUR_MS);
            alerts.push(
                buildProcessAlert(
                    'no_new_in_process',
                    'urgent',
                    'Sin candidatos nuevos',
                    `No ingresan candidatos hace ${hours}h. Inicia difusión orgánica de la oferta o carga candidatos manualmente.`,
                    process,
                    0,
                    []
                )
            );
        }
    }

    const standardByProcess = new Map<string, AlertCandidateRow[]>();
    for (const row of standardRows) {
        const list = standardByProcess.get(row.processId) || [];
        list.push(row);
        standardByProcess.set(row.processId, list);
    }

    for (const [processId, rows] of standardByProcess) {
        const process = processMap.get(processId);
        if (!process || process.status !== 'en_proceso') continue;

        const firstStageId = process.stages[0]?.id;
        const newInFirstStage = rows.filter(
            row => !firstStageId || row.stageId === firstStageId
        );

        if (newInFirstStage.length > 0) {
            alerts.push(
                buildProcessAlert(
                    'new_candidates',
                    'info',
                    'Candidatos en etapa inicial',
                    `${newInFirstStage.length} candidato(s) en la primera etapa del proceso.`,
                    process,
                    newInFirstStage.length,
                    newInFirstStage.map(c => c.name)
                )
            );
        }
    }

    const severityOrder: Record<UserAlertSeverity, number> = {
        urgent: 0,
        warning: 1,
        info: 2,
    };

    return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export function getSporadicAlerts(alerts: UserAlert[]): UserAlert[] {
    return alerts.filter(a => a.type === 'lock_expired' || a.type === 'no_new_in_process');
}
