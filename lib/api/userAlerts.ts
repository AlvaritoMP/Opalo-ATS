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

/**
 * Tope de filas por proceso y por tipo de alerta. Las alertas son un aviso,
 * no un listado exhaustivo: 50 candidatos bastan para el conteo y los nombres.
 */
const ALERT_ROW_LIMIT = 50;

const ALERT_SELECT_FALLBACK =
    'id, name, process_id, stage_id, created_at, contact_status, contact_attempt_count, contact_last_attempt_at, contact_last_user_id, contact_lock_user_id, contact_lock_until, contact_lock_reason, created_by, registration_origin';

/** Valor seguro para usar dentro de un filtro .or() de PostgREST. */
function quoteOrValue(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

type AlertQuery = ReturnType<ReturnType<typeof supabase.from>['select']>;

async function runCapped(query: AlertQuery): Promise<Record<string, unknown>[]> {
    const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(ALERT_ROW_LIMIT);
    if (error) throw error;
    return (data || []) as Record<string, unknown>[];
}

function baseQuery(select: string, processId: string): AlertQuery {
    return supabase
        .from('candidates')
        .select(select)
        .eq('app_name', APP_NAME)
        .eq('archived', false)
        .eq('process_id', processId) as AlertQuery;
}

/**
 * Candidatos sin ningún intento de contacto global. Es un superconjunto de lo
 * que valida `neverContactedByAnyone` en el cliente, que aplica el filtro fino
 * por canal sobre estas filas.
 */
function fetchUncontacted(select: string, processId: string): Promise<Record<string, unknown>[]> {
    return runCapped(
        baseQuery(select, processId)
            .or('contact_attempt_count.is.null,contact_attempt_count.eq.0')
            .is('contact_last_attempt_at', null) as AlertQuery
    );
}

/**
 * Candidatos vinculados al usuario (creados por él, con su bloqueo o con su
 * último intento). Superconjunto de `isUnderUserManagement`.
 */
function fetchUnderMyManagement(
    select: string,
    processId: string,
    userId: string,
    userName: string,
    includeChannelNameColumns: boolean
): Promise<Record<string, unknown>[]> {
    const conditions = [
        `created_by.eq.${userId}`,
        `contact_lock_user_id.eq.${userId}`,
        `contact_last_user_id.eq.${userId}`,
    ];
    const name = userName.trim();
    if (name && includeChannelNameColumns) {
        const quoted = quoteOrValue(name);
        conditions.push(
            `contact_last_user_name.ilike.${quoted}`,
            `contact_phone_last_user_name.ilike.${quoted}`,
            `contact_whatsapp_last_user_name.ilike.${quoted}`,
            `contact_email_last_user_name.ilike.${quoted}`
        );
    }
    return runCapped(baseQuery(select, processId).or(conditions.join(',')) as AlertQuery);
}

async function fetchBulkRows(
    select: string,
    processIds: string[],
    userId: string,
    userName: string,
    includeChannelNameColumns: boolean
): Promise<AlertCandidateRow[]> {
    const perProcess = await Promise.all(
        processIds.map(async processId => {
            const [uncontacted, mine] = await Promise.all([
                fetchUncontacted(select, processId),
                fetchUnderMyManagement(select, processId, userId, userName, includeChannelNameColumns),
            ]);
            return [...uncontacted, ...mine];
        })
    );

    const byId = new Map<string, Record<string, unknown>>();
    for (const row of perProcess.flat()) {
        byId.set(row.id as string, row);
    }
    return Array.from(byId.values()).map(mapRow);
}

export const userAlertsApi = {
    async fetchBulkCandidates(
        processIds: string[],
        userId: string,
        userName: string
    ): Promise<AlertCandidateRow[]> {
        if (processIds.length === 0) return [];

        try {
            return await fetchBulkRows(ALERT_SELECT, processIds, userId, userName, true);
        } catch (error) {
            if (isMissingColumnError(error as { message?: string; code?: string })) {
                return fetchBulkRows(ALERT_SELECT_FALLBACK, processIds, userId, userName, false);
            }
            throw error;
        }
    },

    async fetchStandardCandidates(processIds: string[], userId: string): Promise<AlertCandidateRow[]> {
        if (processIds.length === 0) return [];

        const perProcess = await Promise.all(
            processIds.map(processId =>
                runCapped(
                    baseQuery(
                        'id, name, process_id, stage_id, created_at, created_by',
                        processId
                    ).eq('created_by', userId) as AlertQuery
                )
            )
        );
        return perProcess.flat().map(mapRow);
    },

    /**
     * Fecha de registro del último candidato de cada proceso.
     * Una consulta mínima por proceso (1 fila) en lugar de traer candidatos completos.
     */
    async fetchLatestCandidateCreatedAt(processIds: string[]): Promise<Map<string, number>> {
        const result = new Map<string, number>();
        if (processIds.length === 0) return result;

        await Promise.all(
            processIds.map(async processId => {
                const { data, error } = await supabase
                    .from('candidates')
                    .select('created_at')
                    .eq('app_name', APP_NAME)
                    .eq('process_id', processId)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (error) throw error;
                const createdAt = data?.[0]?.created_at as string | undefined;
                if (!createdAt) return;
                const ms = new Date(createdAt).getTime();
                if (Number.isFinite(ms) && ms > 0) result.set(processId, ms);
            })
        );

        return result;
    },
};
