import type { UserAlert } from '../types';

const STORAGE_PREFIX = 'ats_alerts_ack_';

export function alertFingerprint(alert: UserAlert): string {
    return `${alert.count ?? 0}|${alert.candidateNames?.join(',') ?? ''}|${alert.message}`;
}

export function loadAlertAcknowledgements(userId: string): Record<string, string> {
    try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Record<string, string>;
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

export function saveAlertAcknowledgement(
    userId: string,
    alert: UserAlert,
    acks: Record<string, string>
): Record<string, string> {
    const next = { ...acks, [alert.id]: alertFingerprint(alert) };
    try {
        localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(next));
    } catch { /* ignore */ }
    return next;
}

export function isAlertPending(alert: UserAlert, acks: Record<string, string>): boolean {
    return acks[alert.id] !== alertFingerprint(alert);
}

export function filterPendingAlerts(
    alerts: UserAlert[],
    acks: Record<string, string>
): UserAlert[] {
    return alerts.filter(a => isAlertPending(a, acks));
}
