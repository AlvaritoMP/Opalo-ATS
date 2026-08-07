import { supabase } from '../supabase';
import { APP_NAME } from '../appConfig';
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

/** Evita saturar PostgREST/DB con un Promise.all por cada proceso. */
const ALERT_CONCURRENCY = 3;

/** Tamaño de lote para filtros `.in('process_id', ...)`. */
const ALERT_PROCESS_CHUNK = 40;

const ALERT_SELECT_FALLBACK =
    'id, name, process_id, stage_id, created_at, contact_status, contact_attempt_count, contact_last_attempt_at, contact_last_user_id, contact_lock_user_id, contact_lock_until, contact_lock_reason, created_by, registration_origin';

/** Valor seguro para usar dentro de un filtro .or() de PostgREST. */
function quoteOrValue(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

type AlertQuery = ReturnType<ReturnType<typeof supabase.from>['select']>;

async function mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<R>
): Promise<R[]> {
    if (items.length === 0) return [];
    const results = new Array<R>(items.length);
    let nextIndex = 0;

    const workers = Array.from(
        { length: Math.min(concurrency, items.length) },
        async () => {
            while (true) {
                const index = nextIndex++;
                if (index >= items.length) break;
                results[index] = await fn(items[index]);
            }
        }
    );

    await Promise.all(workers);
    return results;
}

function chunkIds(ids: string[], size: number): string[][] {
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += size) {
        chunks.push(ids.slice(i, i + size));
    }
    return chunks;
}

function applyAbort(query: AlertQuery, abortSignal?: AbortSignal): AlertQuery {
    return abortSignal ? (query.abortSignal(abortSignal) as AlertQuery) : query;
}

async function runCapped(query: AlertQuery, abortSignal?: AbortSignal): Promise<Record<string, unknown>[]> {
    const { data, error } = await applyAbort(
        query.order('created_at', { ascending: false }).limit(ALERT_ROW_LIMIT) as AlertQuery,
        abortSignal
    );
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
function fetchUncontacted(
    select: string,
    processId: string,
    abortSignal?: AbortSignal
): Promise<Record<string, unknown>[]> {
    return runCapped(
        baseQuery(select, processId)
            .or('contact_attempt_count.is.null,contact_attempt_count.eq.0')
            .is('contact_last_attempt_at', null) as AlertQuery,
        abortSignal
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
    includeChannelNameColumns: boolean,
    abortSignal?: AbortSignal
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
    return runCapped(
        baseQuery(select, processId).or(conditions.join(',')) as AlertQuery,
        abortSignal
    );
}

async function fetchBulkRows(
    select: string,
    processIds: string[],
    userId: string,
    userName: string,
    includeChannelNameColumns: boolean,
    abortSignal?: AbortSignal
): Promise<AlertCandidateRow[]> {
    const perProcess = await mapWithConcurrency(processIds, ALERT_CONCURRENCY, async processId => {
        if (abortSignal?.aborted) return [] as Record<string, unknown>[];
        const [uncontacted, mine] = await Promise.all([
            fetchUncontacted(select, processId, abortSignal),
            fetchUnderMyManagement(select, processId, userId, userName, includeChannelNameColumns, abortSignal),
        ]);
        return [...uncontacted, ...mine];
    });

    const byId = new Map<string, Record<string, unknown>>();
    for (const row of perProcess.flat()) {
        byId.set(row.id as string, row);
    }
    return Array.from(byId.values()).map(mapRow);
}

function parseLatestMs(value: unknown): number | null {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) && ms > 0 ? ms : null;
}

/** Una query agregada por lote en lugar de N consultas `limit 1`. */
async function fetchLatestViaAggregation(
    processIds: string[],
    abortSignal?: AbortSignal
): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    const chunks = chunkIds(processIds, ALERT_PROCESS_CHUNK);

    await mapWithConcurrency(chunks, ALERT_CONCURRENCY, async chunk => {
        if (abortSignal?.aborted) return;
        let query = supabase
            .from('candidates')
            .select('process_id, latest:created_at.max()')
            .eq('app_name', APP_NAME)
            .in('process_id', chunk);
        if (abortSignal) query = query.abortSignal(abortSignal);

        const { data, error } = await query;
        if (error) throw error;

        for (const row of (data || []) as Record<string, unknown>[]) {
            const processId = row.process_id as string | undefined;
            if (!processId) continue;
            const ms = parseLatestMs(row.latest);
            if (ms != null) result.set(processId, ms);
        }
    });

    return result;
}

/** Fallback: una fila por proceso, con concurrencia limitada. */
async function fetchLatestPerProcess(
    processIds: string[],
    abortSignal?: AbortSignal
): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    await mapWithConcurrency(processIds, ALERT_CONCURRENCY, async processId => {
        if (abortSignal?.aborted) return;
        let query = supabase
            .from('candidates')
            .select('created_at')
            .eq('app_name', APP_NAME)
            .eq('process_id', processId)
            .order('created_at', { ascending: false })
            .limit(1);
        if (abortSignal) query = query.abortSignal(abortSignal);

        const { data, error } = await query;
        if (error) throw error;
        const ms = parseLatestMs(data?.[0]?.created_at);
        if (ms != null) result.set(processId, ms);
    });

    return result;
}

export const userAlertsApi = {
    async fetchBulkCandidates(
        processIds: string[],
        userId: string,
        userName: string,
        abortSignal?: AbortSignal
    ): Promise<AlertCandidateRow[]> {
        if (processIds.length === 0) return [];

        try {
            return await fetchBulkRows(ALERT_SELECT, processIds, userId, userName, true, abortSignal);
        } catch (error) {
            if (isMissingColumnError(error as { message?: string; code?: string })) {
                return fetchBulkRows(ALERT_SELECT_FALLBACK, processIds, userId, userName, false, abortSignal);
            }
            throw error;
        }
    },

    async fetchStandardCandidates(
        processIds: string[],
        userId: string,
        abortSignal?: AbortSignal
    ): Promise<AlertCandidateRow[]> {
        if (processIds.length === 0) return [];

        const perProcess = await mapWithConcurrency(processIds, ALERT_CONCURRENCY, async processId => {
            if (abortSignal?.aborted) return [] as Record<string, unknown>[];
            return runCapped(
                baseQuery(
                    'id, name, process_id, stage_id, created_at, created_by',
                    processId
                ).eq('created_by', userId) as AlertQuery,
                abortSignal
            );
        });
        return perProcess.flat().map(mapRow);
    },

    /**
     * Fecha de registro del último candidato de cada proceso.
     * Preferimos agregación (pocas queries); si falla, un `limit 1` por proceso
     * con concurrencia acotada. Errores parciales no tumban el resto de avisos.
     */
    async fetchLatestCandidateCreatedAt(
        processIds: string[],
        abortSignal?: AbortSignal
    ): Promise<Map<string, number>> {
        if (processIds.length === 0) return new Map();

        try {
            return await fetchLatestViaAggregation(processIds, abortSignal);
        } catch (aggError) {
            console.warn('Avisos: agregación de created_at falló, usando fallback por proceso:', aggError);
            try {
                return await fetchLatestPerProcess(processIds, abortSignal);
            } catch (fallbackError) {
                console.warn('Avisos: no se pudo obtener último created_at por proceso:', fallbackError);
                return new Map();
            }
        }
    },
};
