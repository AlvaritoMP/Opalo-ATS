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
    contactLastAttemptAt?: string;
    contactLastUserId?: string;
    contactLockUserId?: string;
    contactLockUntil?: string;
    contactLockReason?: string;
    createdBy?: string;
    registrationOrigin?: string;
}

const ALERT_SELECT =
    'id, name, process_id, stage_id, created_at, contact_status, contact_last_attempt_at, contact_last_user_id, contact_lock_user_id, contact_lock_until, contact_lock_reason, created_by, registration_origin';

function mapRow(row: Record<string, unknown>): AlertCandidateRow {
    return {
        id: row.id as string,
        name: (row.name as string) || 'Sin nombre',
        processId: row.process_id as string,
        stageId: (row.stage_id as string) || undefined,
        createdAt: (row.created_at as string) || undefined,
        contactStatus: (row.contact_status as string) || undefined,
        contactLastAttemptAt: (row.contact_last_attempt_at as string) || undefined,
        contactLastUserId: (row.contact_last_user_id as string) || undefined,
        contactLockUserId: (row.contact_lock_user_id as string) || undefined,
        contactLockUntil: (row.contact_lock_until as string) || undefined,
        contactLockReason: (row.contact_lock_reason as string) || undefined,
        createdBy: (row.created_by as string) || undefined,
        registrationOrigin: (row.registration_origin as string) || undefined,
    };
}

export const userAlertsApi = {
    async fetchBulkCandidates(processIds: string[]): Promise<AlertCandidateRow[]> {
        if (processIds.length === 0) return [];

        const { data, error } = await supabase
            .from('candidates')
            .select(ALERT_SELECT)
            .eq('app_name', APP_NAME)
            .eq('archived', false)
            .in('process_id', processIds);

        if (error) {
            if (isMissingColumnError(error)) {
                const { data: fallback, error: fallbackError } = await supabase
                    .from('candidates')
                    .select('id, name, process_id, stage_id, created_at')
                    .eq('app_name', APP_NAME)
                    .eq('archived', false)
                    .in('process_id', processIds);
                if (fallbackError) throw fallbackError;
                return (fallback || []).map(mapRow);
            }
            throw error;
        }
        return (data || []).map(mapRow);
    },

    async fetchStandardCandidates(
        processes: Process[]
    ): Promise<AlertCandidateRow[]> {
        const standardIds = processes.filter(p => !p.isBulkProcess && p.status === 'en_proceso').map(p => p.id);
        if (standardIds.length === 0) return [];

        const { data, error } = await supabase
            .from('candidates')
            .select('id, name, process_id, stage_id, created_at')
            .eq('app_name', APP_NAME)
            .eq('archived', false)
            .in('process_id', standardIds);

        if (error) throw error;
        return (data || []).map(mapRow);
    },
};
