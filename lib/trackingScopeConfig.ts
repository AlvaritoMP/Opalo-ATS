import type { ContactAttemptChannel } from './contactChannelConfig';
import type { ContactStatus } from './contactTracking';
import { normalizeContactStatus } from './contactTracking';

export type TrackingScope = 'contact' | 'fidelization';

export interface ScopedChannelDef {
    columnId: string;
    label: string;
    shortLabel: string;
    attemptChannel: ContactAttemptChannel;
    dbPrefix: string;
    candidateSummaryKey: string;
}

const CONTACT_SCOPE: Record<ContactAttemptChannel, ScopedChannelDef> = {
    call: {
        columnId: 'contactPhone',
        label: 'Contacto teléfono',
        shortLabel: 'Llamadas',
        attemptChannel: 'call',
        dbPrefix: 'contact_phone',
        candidateSummaryKey: 'contactPhone',
    },
    whatsapp: {
        columnId: 'contactWhatsapp',
        label: 'Contacto WhatsApp',
        shortLabel: 'WhatsApp',
        attemptChannel: 'whatsapp',
        dbPrefix: 'contact_whatsapp',
        candidateSummaryKey: 'contactWhatsapp',
    },
    email: {
        columnId: 'contactEmail',
        label: 'Contacto correo',
        shortLabel: 'Correo',
        attemptChannel: 'email',
        dbPrefix: 'contact_email',
        candidateSummaryKey: 'contactEmail',
    },
};

const FIDELIZATION_SCOPE: Record<ContactAttemptChannel, ScopedChannelDef> = {
    call: {
        columnId: 'fidelizPhone',
        label: 'Fidelización llamadas',
        shortLabel: 'Fid. Llamadas',
        attemptChannel: 'call',
        dbPrefix: 'fideliz_phone',
        candidateSummaryKey: 'fidelizPhone',
    },
    whatsapp: {
        columnId: 'fidelizWhatsapp',
        label: 'Fidelización WhatsApp',
        shortLabel: 'Fid. WhatsApp',
        attemptChannel: 'whatsapp',
        dbPrefix: 'fideliz_whatsapp',
        candidateSummaryKey: 'fidelizWhatsapp',
    },
    email: {
        columnId: 'fidelizEmail',
        label: 'Fidelización correo',
        shortLabel: 'Fid. Correo',
        attemptChannel: 'email',
        dbPrefix: 'fideliz_email',
        candidateSummaryKey: 'fidelizEmail',
    },
};

export const SCOPED_CHANNEL_REGISTRY: Record<TrackingScope, Record<ContactAttemptChannel, ScopedChannelDef>> = {
    contact: CONTACT_SCOPE,
    fidelization: FIDELIZATION_SCOPE,
};

export const FIDELIZ_COLUMN_IDS = Object.values(FIDELIZATION_SCOPE).map(c => c.columnId);

export const DEFAULT_FLOATING_COLUMN_IDS = [...FIDELIZ_COLUMN_IDS];

export function getScopedChannelDef(scope: TrackingScope, channel: ContactAttemptChannel): ScopedChannelDef {
    return SCOPED_CHANNEL_REGISTRY[scope][channel];
}

export function getScopedChannels(scope: TrackingScope): ScopedChannelDef[] {
    return Object.values(SCOPED_CHANNEL_REGISTRY[scope]);
}

export function columnIdToScopedChannel(
    colId: string,
    scope: TrackingScope
): ContactAttemptChannel | null {
    const entry = Object.values(SCOPED_CHANNEL_REGISTRY[scope]).find(c => c.columnId === colId);
    return entry?.attemptChannel ?? null;
}

export function columnIdToTrackingScope(colId: string): TrackingScope | null {
    if (FIDELIZ_COLUMN_IDS.includes(colId)) return 'fidelization';
    if (Object.values(CONTACT_SCOPE).some(c => c.columnId === colId)) return 'contact';
    return null;
}

export interface ChannelDbFieldNames {
    status: string;
    attemptCount: string;
    lastAt: string;
    lastUserName: string;
}

export function getScopedDbFields(scope: TrackingScope, channel: ContactAttemptChannel): ChannelDbFieldNames {
    const p = getScopedChannelDef(scope, channel).dbPrefix;
    return {
        status: `${p}_status`,
        attemptCount: `${p}_attempt_count`,
        lastAt: `${p}_last_at`,
        lastUserName: `${p}_last_user_name`,
    };
}

export interface ChannelContactSummary {
    status: ContactStatus;
    attemptCount: number;
    lastAttemptAt?: string;
    lastUserName?: string;
}

export function readScopedChannelSummaryFromRow(
    row: Record<string, unknown>,
    scope: TrackingScope,
    channel: ContactAttemptChannel
): ChannelContactSummary {
    const f = getScopedDbFields(scope, channel);
    const statusRaw = row[f.status];

    if (statusRaw !== undefined && statusRaw !== null) {
        return {
            status: normalizeContactStatus(statusRaw as string),
            attemptCount: (row[f.attemptCount] as number) ?? 0,
            lastAttemptAt: (row[f.lastAt] as string) || undefined,
            lastUserName: (row[f.lastUserName] as string) || undefined,
        };
    }

    if (scope === 'contact') {
        if (channel === 'call' && row.contact_status != null) {
            return {
                status: normalizeContactStatus(row.contact_status as string),
                attemptCount: (row.contact_attempt_count as number) ?? 0,
                lastAttemptAt: (row.contact_last_attempt_at as string) || undefined,
                lastUserName: (row.contact_last_user_name as string) || undefined,
            };
        }
        if (channel === 'whatsapp' && row.last_whatsapp_interaction_at) {
            return {
                status: 'en_intento',
                attemptCount: 1,
                lastAttemptAt: row.last_whatsapp_interaction_at as string,
                lastUserName: undefined,
            };
        }
    }

    return { status: 'por_contactar', attemptCount: 0 };
}

export function buildScopedSingleChannelResetUpdate(
    scope: TrackingScope,
    channel: ContactAttemptChannel
): Record<string, string | number | null> {
    const f = getScopedDbFields(scope, channel);
    const out: Record<string, string | number | null> = {
        [f.status]: 'por_contactar',
        [f.attemptCount]: 0,
        [f.lastAt]: null,
        [f.lastUserName]: null,
    };
    if (scope === 'contact' && channel === 'call') {
        out.contact_status = 'por_contactar';
        out.contact_attempt_count = 0;
        out.contact_last_attempt_at = null;
        out.contact_last_user_id = null;
        out.contact_last_user_name = null;
    }
    if (scope === 'contact' && channel === 'whatsapp') {
        out.last_whatsapp_interaction_at = null;
    }
    return out;
}
