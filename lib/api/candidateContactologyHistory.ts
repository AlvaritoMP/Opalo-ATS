import { supabase } from '../supabase';
import { APP_NAME } from '../appConfig';
import { bulkProcessActivityApi, BulkProcessActivityEntry } from './bulkProcessActivity';
import type { ContactAttempt, ContactStatus } from '../contactTracking';
import {
    CONTACT_OUTCOME_LABELS,
    CONTACT_STATUS_META,
    isSyncedContactAttempt,
    normalizeContactStatus,
} from '../contactTracking';
import {
    CONTACT_CHANNELS,
    type ContactAttemptChannel,
    readChannelSummaryFromRow,
} from '../contactChannelConfig';
import type { Process } from '../../types';

export type ContactologyEventKind =
    | 'contact_attempt'
    | 'contact_status'
    | 'contact_reset'
    | 'stage_change'
    | 'discard'
    | 'archive'
    | 'approval'
    | 'other';

export interface ContactologyChannelSummary {
    channel: ContactAttemptChannel;
    label: string;
    shortLabel: string;
    status: ContactStatus;
    attemptCount: number;
    lastAttemptAt?: string;
    lastUserName?: string;
}

export interface ContactologyEvent {
    id: string;
    kind: ContactologyEventKind;
    timestamp: string;
    title: string;
    description?: string;
    userName?: string;
    channel?: ContactAttemptChannel;
    attemptNumber?: number;
    isSynced?: boolean;
}

export interface CandidateContactologyHistoryResult {
    channelSummaries: ContactologyChannelSummary[];
    events: ContactologyEvent[];
    currentStageName?: string;
    recordStatusLabel?: string;
}

const CHANNEL_LABELS: Record<ContactAttemptChannel, string> = {
    call: 'Llamada',
    whatsapp: 'WhatsApp',
    email: 'Correo',
};

const ACTION_TITLES: Record<string, string> = {
    contact_attempt: 'Intento de contacto registrado',
    contact_status: 'Estado de contacto actualizado',
    contact_reset: 'Seguimiento de contacto reiniciado',
    stage_change: 'Cambio de etapa',
    bulk_stage_change: 'Cambio de etapa',
    bulk_discard: 'Candidato descartado',
    bulk_archive: 'Candidato archivado',
    bulk_approve: 'Candidato aprobado',
};

function mapAttemptRow(row: Record<string, unknown>): ContactAttempt {
    return {
        id: row.id as string,
        candidateId: row.candidate_id as string,
        processId: row.process_id as string,
        userId: (row.user_id as string) || undefined,
        userName: (row.user_name as string) || undefined,
        channel: row.channel as ContactAttempt['channel'],
        outcome: row.outcome as ContactAttempt['outcome'],
        attemptNumber: (row.attempt_number as number) || 1,
        statusAfter: (row.status_after as ContactStatus) || undefined,
        notes: (row.notes as string) || undefined,
        createdAt: row.created_at as string,
    };
}

function resolveStageName(process: Process | undefined, stageId: string): string {
    return process?.stages.find(s => s.id === stageId)?.name || 'Etapa desconocida';
}

function activityToEvent(entry: BulkProcessActivityEntry, process?: Process): ContactologyEvent | null {
    const channel = entry.details?.channel as ContactAttemptChannel | undefined;
    const channelLabel = channel ? CHANNEL_LABELS[channel] || channel : undefined;

    let kind: ContactologyEventKind = 'other';
    switch (entry.actionType) {
        case 'contact_attempt':
            kind = 'contact_attempt';
            break;
        case 'contact_status':
            kind = 'contact_status';
            break;
        case 'contact_reset':
            kind = 'contact_reset';
            break;
        case 'stage_change':
        case 'bulk_stage_change':
            kind = 'stage_change';
            break;
        case 'bulk_discard':
            kind = 'discard';
            break;
        case 'bulk_archive':
            kind = 'archive';
            break;
        case 'bulk_approve':
            kind = 'approval';
            break;
        default:
            return null;
    }

    const title = ACTION_TITLES[entry.actionType] || entry.actionType;
    const parts: string[] = [];

    if (channelLabel) parts.push(channelLabel);
    if (entry.fieldName) parts.push(`«${entry.fieldName}»`);
    if (entry.oldValue != null || entry.newValue != null) {
        const from = entry.oldValue != null && entry.oldValue !== '' ? entry.oldValue : '(vacío)';
        const to = entry.newValue != null && entry.newValue !== '' ? entry.newValue : '(vacío)';
        parts.push(`${from} → ${to}`);
    } else if (entry.details?.summary) {
        parts.push(String(entry.details.summary));
    } else if (entry.actionType === 'stage_change' || entry.actionType === 'bulk_stage_change') {
        if (entry.newValue) {
            parts.push(`Nueva etapa: ${entry.newValue}`);
        } else if (entry.details?.stageId) {
            parts.push(`Nueva etapa: ${resolveStageName(process, String(entry.details.stageId))}`);
        }
    }

    return {
        id: `act-${entry.id}`,
        kind,
        timestamp: entry.createdAt,
        title,
        description: parts.length > 0 ? parts.join(' · ') : undefined,
        userName: entry.userName,
        channel,
    };
}

function attemptToEvent(attempt: ContactAttempt): ContactologyEvent {
    const channelLabel = CHANNEL_LABELS[attempt.channel] || attempt.channel;
    const outcome = CONTACT_OUTCOME_LABELS[attempt.outcome] || attempt.outcome;
    const statusAfter = attempt.statusAfter
        ? CONTACT_STATUS_META[normalizeContactStatus(attempt.statusAfter)].label
        : undefined;
    const synced = isSyncedContactAttempt(attempt);

    let kind: ContactologyEventKind = 'contact_attempt';
    let title = `Contacto por ${channelLabel}`;

    if (attempt.outcome === 'status_change') {
        kind = 'contact_status';
        title = `Estado de contacto (${channelLabel})`;
    } else if (attempt.outcome === 'reset_all') {
        kind = 'contact_reset';
        title = `Reinicio de seguimiento (${channelLabel})`;
    }

    const descriptionParts = [
        outcome,
        statusAfter ? `Estado: ${statusAfter}` : null,
        attempt.attemptNumber > 0 && attempt.outcome !== 'status_change' && attempt.outcome !== 'reset_all'
            ? `Intento #${attempt.attemptNumber}`
            : null,
        synced ? 'Registro sincronizado desde la tabla' : null,
    ].filter(Boolean);

    return {
        id: `contact-${attempt.id}`,
        kind,
        timestamp: attempt.createdAt,
        title: synced ? `${title} (sincronizado)` : title,
        description: descriptionParts.length > 0 ? descriptionParts.join(' · ') : undefined,
        userName: attempt.userName,
        channel: attempt.channel,
        attemptNumber: attempt.attemptNumber,
        isSynced: synced,
    };
}

export const candidateContactologyHistoryApi = {
    async getHistory(
        candidateId: string,
        process?: Process
    ): Promise<CandidateContactologyHistoryResult> {
        const channelSelect = [
            'contact_phone_status', 'contact_phone_attempt_count', 'contact_phone_last_at', 'contact_phone_last_user_name',
            'contact_whatsapp_status', 'contact_whatsapp_attempt_count', 'contact_whatsapp_last_at', 'contact_whatsapp_last_user_name',
            'contact_email_status', 'contact_email_attempt_count', 'contact_email_last_at', 'contact_email_last_user_name',
            'stage_id', 'discarded', 'discarded_at', 'discard_reason', 'archived', 'archived_at',
            'hire_date', 'offer_accepted_date',
            'history:candidate_history!candidate_id(stage_id, moved_at, moved_by)',
        ].join(', ');

        const [candidateRes, contactRes, activityEntries] = await Promise.all([
            supabase
                .from('candidates')
                .select(channelSelect)
                .eq('id', candidateId)
                .eq('app_name', APP_NAME)
                .single(),
            supabase
                .from('candidate_contact_attempts')
                .select('*')
                .eq('candidate_id', candidateId)
                .eq('app_name', APP_NAME)
                .order('created_at', { ascending: false })
                .limit(200),
            bulkProcessActivityApi.getByCandidate(candidateId).catch(() => [] as BulkProcessActivityEntry[]),
        ]);

        if (candidateRes.error) throw candidateRes.error;
        const candidate = candidateRes.data;

        const channelSummaries: ContactologyChannelSummary[] = (
            Object.keys(CONTACT_CHANNELS) as ContactAttemptChannel[]
        ).map(channel => {
            const def = CONTACT_CHANNELS[channel];
            const summary = readChannelSummaryFromRow(candidate, channel);
            return {
                channel,
                label: def.label,
                shortLabel: def.shortLabel,
                status: summary.status,
                attemptCount: summary.attemptCount,
                lastAttemptAt: summary.lastAttemptAt,
                lastUserName: summary.lastUserName,
            };
        });

        const events: ContactologyEvent[] = [];
        const seenContactIds = new Set<string>();

        const contactAttempts = (contactRes.data || []).map(mapAttemptRow);
        for (const attempt of contactAttempts) {
            seenContactIds.add(attempt.id);
            events.push(attemptToEvent(attempt));
        }

        for (const entry of activityEntries) {
            const mapped = activityToEvent(entry, process);
            if (!mapped) continue;
            if (mapped.kind === 'contact_attempt' || mapped.kind === 'contact_status' || mapped.kind === 'contact_reset') {
                const attemptId = entry.details?.attemptId as string | undefined;
                if (attemptId && seenContactIds.has(attemptId)) continue;
            }
            if (mapped.kind === 'stage_change') continue;
            events.push(mapped);
        }

        const historyRows = (candidate.history || []) as Array<{ stage_id: string; moved_at: string; moved_by?: string }>;
        for (const h of historyRows) {
            events.push({
                id: `hist-${h.stage_id}-${h.moved_at}`,
                kind: 'stage_change',
                timestamp: h.moved_at,
                title: 'Cambio de etapa',
                description: `Avanzó a «${resolveStageName(process, h.stage_id)}»`,
                userName: h.moved_by || 'Sistema',
            });
        }

        if (candidate.discarded && candidate.discarded_at) {
            events.push({
                id: `discard-${candidateId}`,
                kind: 'discard',
                timestamp: candidate.discarded_at as string,
                title: 'Registro descartado',
                description: (candidate.discard_reason as string) || undefined,
            });
        }

        if (candidate.archived && candidate.archived_at) {
            events.push({
                id: `archive-${candidateId}`,
                kind: 'archive',
                timestamp: candidate.archived_at as string,
                title: 'Registro archivado',
            });
        }

        if (candidate.offer_accepted_date) {
            events.push({
                id: `offer-${candidateId}`,
                kind: 'approval',
                timestamp: candidate.offer_accepted_date as string,
                title: 'Oferta aceptada',
            });
        } else if (candidate.hire_date) {
            events.push({
                id: `hire-${candidateId}`,
                kind: 'approval',
                timestamp: candidate.hire_date as string,
                title: 'Contratación registrada',
            });
        }

        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const currentStageName = resolveStageName(process, candidate.stage_id as string);
        let recordStatusLabel: string | undefined;
        if (candidate.discarded) recordStatusLabel = 'Descartado';
        else if (candidate.archived) recordStatusLabel = 'Archivado';
        else if (candidate.hire_date || candidate.offer_accepted_date) recordStatusLabel = 'Contratado / Oferta aceptada';
        else recordStatusLabel = currentStageName;

        return { channelSummaries, events, currentStageName, recordStatusLabel };
    },
};
