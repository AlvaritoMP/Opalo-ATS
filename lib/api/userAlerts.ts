import { supabase } from '../supabase';
import { APP_NAME } from '../appConfig';
import type { Process } from '../../types';
import { isMissingColumnError } from '../supabaseColumnErrors';

export interface AlertCandidateRow {
    id: string;
    name: string;
    processId: string;
    stageId?: string;
    createdAt?: string;
    contactStatus?: string;
    contactAttemptCount?: number;
    contactLastAttemptAt?: string;
    contactLastUserId?: string;
    contactLastUserName?: string;
    contactLockUserId?: string;
    contactLockUntil?: string;
    contactLockReason?: string;
    createdBy?: string;
    registrationOrigin?: string;
    contactPhoneStatus?: string;
    contactPhoneAttemptCount?: number;
    contactPhoneLastAt?: string;
    contactPhoneLastUserName?: string;
    contactWhatsappStatus?: string;
    contactWhatsappAttemptCount?: number;
    contactWhatsappLastAt?: string;
    contactWhatsappLastUserName?: string;
    contactEmailStatus?: string;
    contactEmailAttemptCount?: number;
    contactEmailLastAt?: string;
    contactEmailLastUserName?: string;
}

const ALERT_SELECT = [
    'id', 'name', 'process_id', 'stage_id', 'created_at',
    'contact_status', 'contact_attempt_count', 'contact_last_attempt_at', 'contact_last_user_id', 'contact_last_user_name',
    'contact_lock_user_id', 'contact_lock_until', 'contact_lock_reason', 'created_by', 'registration_origin',
    'contact_phone_status', 'contact_phone_attempt_count', 'contact_phone_last_at', 'contact_phone_last_user_name',
    'contact_whatsapp_status', 'contact_whatsapp_attempt_count', 'contact_whatsapp_last_at', 'contact_whatsapp_last_user_name',
    'contact_email_status', 'contact_email_attempt_count', 'contact_email_last_at', 'contact_email_last_user_name',
].join(', ');

function mapRow(row: Record<string, unknown>): AlertCandidateRow {
    return {
        id: row.id as string,
        name: (row.name as string) || 'Sin nombre',
        processId: row.process_id as string,
        stageId: (row.stage_id as string) || undefined,
        createdAt: (row.created_at as string) || undefined,
        contactStatus: (row.contact_status as string) || undefined,
        contactAttemptCount: (row.contact_attempt_count as number) ?? undefined,
        contactLastAttemptAt: (row.contact_last_attempt_at as string) || undefined,
        contactLastUserId: (row.contact_last_user_id as string) || undefined,
        contactLastUserName: (row.contact_last_user_name as string) || undefined,
        contactLockUserId: (row.contact_lock_user_id as string) || undefined,
        contactLockUntil: (row.contact_lock_until as string) || undefined,
        contactLockReason: (row.contact_lock_reason as string) || undefined,
        createdBy: (row.created_by as string) || undefined,
        registrationOrigin: (row.registration_origin as string) || undefined,
        contactPhoneStatus: (row.contact_phone_status as string) || undefined,
        contactPhoneAttemptCount: (row.contact_phone_attempt_count as number) ?? undefined,
        contactPhoneLastAt: (row.contact_phone_last_at as string) || undefined,
        contactPhoneLastUserName: (row.contact_phone_last_user_name as string) || undefined,
        contactWhatsappStatus: (row.contact_whatsapp_status as string) || undefined,
        contactWhatsappAttemptCount: (row.contact_whatsapp_attempt_count as number) ?? undefined,
        contactWhatsappLastAt: (row.contact_whatsapp_last_at as string) || undefined,
        contactWhatsappLastUserName: (row.contact_whatsapp_last_user_name as string) || undefined,
        contactEmailStatus: (row.contact_email_status as string) || undefined,
        contactEmailAttemptCount: (row.contact_email_attempt_count as number) ?? undefined,
        contactEmailLastAt: (row.contact_email_last_at as string) || undefined,
        contactEmailLastUserName: (row.contact_email_last_user_name as string) || undefined,
    };
}

function rowToChannelRecord(row: AlertCandidateRow): Record<string, unknown> {
    return {
        contact_status: row.contactStatus,
        contact_attempt_count: row.contactAttemptCount,
        contact_last_attempt_at: row.contactLastAttemptAt,
        contact_last_user_id: row.contactLastUserId,
        contact_last_user_name: row.contactLastUserName,
        contact_phone_status: row.contactPhoneStatus,
        contact_phone_attempt_count: row.contactPhoneAttemptCount,
        contact_phone_last_at: row.contactPhoneLastAt,
        contact_phone_last_user_name: row.contactPhoneLastUserName,
        contact_whatsapp_status: row.contactWhatsappStatus,
        contact_whatsapp_attempt_count: row.contactWhatsappAttemptCount,
        contact_whatsapp_last_at: row.contactWhatsappLastAt,
        contact_whatsapp_last_user_name: row.contactWhatsappLastUserName,
        contact_email_status: row.contactEmailStatus,
        contact_email_attempt_count: row.contactEmailAttemptCount,
        contact_email_last_at: row.contactEmailLastAt,
        contact_email_last_user_name: row.contactEmailLastUserName,
    };
}

export { rowToChannelRecord };

// PostgREST limita cada consulta a 1000 filas; sin paginar, los candidatos más
// recientes pueden quedar fuera y las alertas se calculan sobre datos parciales.
const ALERT_PAGE_SIZE = 1000;

async function fetchAllPages(select: string, processIds: string[]): Promise<Record<string, unknown>[]> {
    const all: Record<string, unknown>[] = [];
    for (let page = 0; ; page++) {
        const from = page * ALERT_PAGE_SIZE;
        const { data, error } = await supabase
            .from('candidates')
            .select(select)
            .eq('app_name', APP_NAME)
            .eq('archived', false)
            .in('process_id', processIds)
            .order('created_at', { ascending: false })
            .range(from, from + ALERT_PAGE_SIZE - 1);

        if (error) throw error;
        const rows = (data || []) as Record<string, unknown>[];
        all.push(...rows);
        if (rows.length < ALERT_PAGE_SIZE) break;
    }
    return all;
}

export const userAlertsApi = {
    async fetchBulkCandidates(processIds: string[]): Promise<AlertCandidateRow[]> {
        if (processIds.length === 0) return [];

        try {
            const data = await fetchAllPages(ALERT_SELECT, processIds);
            return data.map(mapRow);
        } catch (error) {
            if (isMissingColumnError(error as { message?: string; code?: string })) {
                const fallback = await fetchAllPages(
                    'id, name, process_id, stage_id, created_at, contact_status, contact_attempt_count, contact_last_attempt_at, contact_last_user_id, contact_lock_user_id, contact_lock_until, contact_lock_reason, created_by, registration_origin',
                    processIds
                );
                return fallback.map(mapRow);
            }
            throw error;
        }
    },

    async fetchStandardCandidates(processIds: string[]): Promise<AlertCandidateRow[]> {
        if (processIds.length === 0) return [];

        const data = await fetchAllPages(
            'id, name, process_id, stage_id, created_at, created_by',
            processIds
        );
        return data.map(mapRow);
    },
};
