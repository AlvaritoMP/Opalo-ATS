import type { ContactAttemptChannel } from './contactChannelConfig';
import { readChannelSummaryFromRow } from './contactChannelConfig';
import type { AlertCandidateRow } from './api/userAlerts';
import { rowToChannelRecord } from './api/userAlerts';
import { normalizeContactStatus, type ContactStatus } from './contactTracking';

const CONTACT_CHANNELS: ContactAttemptChannel[] = ['call', 'whatsapp', 'email'];

const CLOSED_CONTACT_STATUSES: ContactStatus[] = [
    'no_interesado',
    'inubicable',
    'interesado',
];

function dbRow(row: AlertCandidateRow): Record<string, unknown> {
    return rowToChannelRecord(row);
}

export function isClosedForContact(row: AlertCandidateRow): boolean {
    const global = normalizeContactStatus(row.contactStatus);
    if (CLOSED_CONTACT_STATUSES.includes(global)) return true;

    for (const channel of CONTACT_CHANNELS) {
        const summary = readChannelSummaryFromRow(dbRow(row), channel);
        if (CLOSED_CONTACT_STATUSES.includes(summary.status)) return true;
    }
    return false;
}

/** Ningún usuario ha registrado intento de contacto en ningún canal. */
export function neverContactedByAnyone(row: AlertCandidateRow): boolean {
    const globalAttempts = row.contactAttemptCount ?? 0;
    if (globalAttempts > 0) return false;
    if (row.contactLastAttemptAt) return false;

    for (const channel of CONTACT_CHANNELS) {
        const summary = readChannelSummaryFromRow(dbRow(row), channel);
        if (summary.attemptCount > 0) return false;
        if (summary.lastAttemptAt) return false;
        if (summary.status !== 'por_contactar') return false;
    }

    return normalizeContactStatus(row.contactStatus) === 'por_contactar';
}

export function isUnderUserManagement(
    row: AlertCandidateRow,
    userId: string,
    userName: string
): boolean {
    if (row.createdBy === userId) return true;
    if (row.contactLastUserId === userId) return true;
    if (row.contactLockUserId === userId) return true;

    const normalizedName = userName.trim().toLowerCase();
    if (!normalizedName) return false;

    for (const channel of CONTACT_CHANNELS) {
        const summary = readChannelSummaryFromRow(dbRow(row), channel);
        if (summary.attemptCount > 0 && summary.lastUserName?.trim().toLowerCase() === normalizedName) {
            return true;
        }
    }
    return false;
}

export function lastUserContactMs(
    row: AlertCandidateRow,
    userId: string,
    userName: string
): number {
    let max = 0;
    const normalizedName = userName.trim().toLowerCase();

    if (row.contactLastUserId === userId && row.contactLastAttemptAt) {
        const t = new Date(row.contactLastAttemptAt).getTime();
        if (Number.isFinite(t)) max = Math.max(max, t);
    }

    for (const channel of CONTACT_CHANNELS) {
        const summary = readChannelSummaryFromRow(dbRow(row), channel);
        if (
            summary.lastAttemptAt &&
            summary.lastUserName?.trim().toLowerCase() === normalizedName
        ) {
            const t = new Date(summary.lastAttemptAt).getTime();
            if (Number.isFinite(t)) max = Math.max(max, t);
        }
    }

    if (max === 0 && row.createdBy === userId && row.createdAt) {
        const t = new Date(row.createdAt).getTime();
        if (Number.isFinite(t)) max = t;
    }

    return max;
}
