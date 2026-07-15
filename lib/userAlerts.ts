import type { Process, User, UserAlert, UserAlertSeverity } from '../types';
import type { AlertCandidateRow } from './api/userAlerts';
import { getProcessesVisibleToUser } from './userAlertAccess';
import {
    isClosedForContact,
    isUnderUserManagement,
    lastUserContactMs,
    neverContactedByAnyone,
} from './userAlertContactRules';
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

function hadExpiredLockByUser(row: AlertCandidateRow, userId: string, nowMs: number): boolean {
    if (row.contactLockUserId === userId) {
        const untilMs = row.contactLockUntil ? new Date(row.contactLockUntil).getTime() : 0;
        return Number.isFinite(untilMs) && untilMs <= nowMs;
    }
    if (row.createdBy === userId && row.registrationOrigin) {
        const uploadLock = resolveActiveContactLock(toLockRow(row), nowMs);
        if (!uploadLock) {
            const createdMs = row.createdAt ? new Date(row.createdAt).getTime() : 0;
            return createdMs > 0 && nowMs - createdMs > 30 * 60 * 1000;
        }
    }
    return false;
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
    user: User,
    latestBulkCreatedAt?: Map<string, number>,
    nowMs = Date.now()
): UserAlert[] {
    const alerts: UserAlert[] = [];
    const visibleProcesses = getProcessesVisibleToUser(user, processes);
    const processMap = new Map(visibleProcesses.map(p => [p.id, p]));
    const visibleProcessIds = new Set(visibleProcesses.map(p => p.id));

    const bulkByProcess = new Map<string, AlertCandidateRow[]>();
    for (const row of bulkRows) {
        if (!visibleProcessIds.has(row.processId)) continue;
        const list = bulkByProcess.get(row.processId) || [];
        list.push(row);
        bulkByProcess.set(row.processId, list);
    }

    for (const [processId, rows] of bulkByProcess) {
        const process = processMap.get(processId);
        if (!process?.isBulkProcess) continue;

        const newCandidates = rows.filter(row => {
            if (isClosedForContact(row)) return false;
            if (!neverContactedByAnyone(row)) return false;
            if (!isContactable(row, user.id, nowMs)) return false;
            return true;
        });

        if (newCandidates.length > 0) {
            alerts.push(
                buildProcessAlert(
                    'new_candidates',
                    'info',
                    'Candidatos sin ningún intento de contacto',
                    `${newCandidates.length} candidato(s) aún no han sido contactados por ningún usuario.`,
                    process,
                    newCandidates.length,
                    newCandidates.map(c => c.name)
                )
            );
        }

        const stale = rows.filter(row => {
            if (isClosedForContact(row)) return false;
            if (neverContactedByAnyone(row)) return false;
            if (!isUnderUserManagement(row, user.id, user.name)) return false;
            if (!isContactable(row, user.id, nowMs)) return false;
            const status = normalizeContactStatus(row.contactStatus);
            if (status !== 'por_contactar' && status !== 'en_intento') return false;
            const lastMine = lastUserContactMs(row, user.id, user.name);
            return lastMine > 0 && nowMs - lastMine >= ONE_HOUR_MS;
        });

        if (stale.length > 0) {
            alerts.push(
                buildProcessAlert(
                    'stale_without_contact',
                    'warning',
                    'Tu gestión sin seguimiento (+1 h)',
                    `${stale.length} candidato(s) de tu gestión llevan más de 1 hora sin nuevo intento de contacto.`,
                    process,
                    stale.length,
                    stale.map(c => c.name)
                )
            );
        }

        const lockExpired = rows.filter(row => {
            if (isClosedForContact(row)) return false;
            if (!isUnderUserManagement(row, user.id, user.name)) return false;
            const status = normalizeContactStatus(row.contactStatus);
            if (status !== 'en_intento') return false;
            if (!isContactable(row, user.id, nowMs)) return false;
            return hadExpiredLockByUser(row, user.id, nowMs);
        });

        if (lockExpired.length > 0) {
            alerts.push(
                buildProcessAlert(
                    'lock_expired',
                    'info',
                    'Bloqueo expirado — puedes recontactar',
                    `${lockExpired.length} candidato(s) de tu gestión sin respuesta ya pueden volver a contactarse.`,
                    process,
                    lockExpired.length,
                    lockExpired.map(c => c.name)
                )
            );
        }

    }

    // Aviso "sin candidatos nuevos": se basa en la fecha del último registro real de cada
    // proceso (consulta dedicada), no en las filas cargadas para las alertas de contacto.
    for (const process of visibleProcesses) {
        if (!process.isBulkProcess) continue;

        const latestCreated = latestBulkCreatedAt
            ? latestBulkCreatedAt.get(process.id) ?? 0
            : (bulkByProcess.get(process.id) || []).reduce((max, row) => {
                  const t = row.createdAt ? new Date(row.createdAt).getTime() : 0;
                  return Math.max(max, Number.isFinite(t) ? t : 0);
              }, 0);

        if (latestCreated > 0 && nowMs - latestCreated >= ONE_HOUR_MS) {
            const hours = Math.floor((nowMs - latestCreated) / ONE_HOUR_MS);
            alerts.push(
                buildProcessAlert(
                    'no_new_in_process',
                    'urgent',
                    'Sin candidatos nuevos en el proceso',
                    `No ingresan candidatos hace ${hours}h. Inicia difusión orgánica o carga manualmente.`,
                    process,
                    0,
                    []
                )
            );
        }
    }

    const standardByProcess = new Map<string, AlertCandidateRow[]>();
    for (const row of standardRows) {
        if (!visibleProcessIds.has(row.processId)) continue;
        const list = standardByProcess.get(row.processId) || [];
        list.push(row);
        standardByProcess.set(row.processId, list);
    }

    for (const [processId, rows] of standardByProcess) {
        const process = processMap.get(processId);
        if (!process || process.isBulkProcess) continue;

        const firstStageId = process.stages[0]?.id;
        const mineInFirstStage = rows.filter(row => {
            if (!isUnderUserManagement(row, user.id, user.name)) return false;
            return !firstStageId || row.stageId === firstStageId;
        });

        if (mineInFirstStage.length > 0) {
            alerts.push(
                buildProcessAlert(
                    'new_candidates',
                    'info',
                    'Candidatos en etapa inicial (tu gestión)',
                    `${mineInFirstStage.length} candidato(s) en la primera etapa bajo tu gestión.`,
                    process,
                    mineInFirstStage.length,
                    mineInFirstStage.map(c => c.name)
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
