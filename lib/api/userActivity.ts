import { supabase } from '../supabase';
import { APP_NAME } from '../appConfig';
import { isMissingTableError } from '../supabaseColumnErrors';
import {
    isUserActivityCategory,
    type UserActivityCategory,
} from '../userActivity';

const ACTIVITY_SELECT = 'id, user_id, user_name, category, action, summary, details, created_at';
const PAGE_SIZE = 1000;
const OVERVIEW_MAX_PAGES = 15;
const USER_HISTORY_MAX_PAGES = 15;

export interface UserActivityEvent {
    id: string;
    userId?: string;
    userName?: string;
    category: UserActivityCategory;
    action: string;
    summary: string;
    details?: Record<string, unknown>;
    createdAt: string;
}

export interface LogUserActivityInput {
    userId?: string;
    userName?: string;
    category: UserActivityCategory;
    action: string;
    summary: string;
    details?: Record<string, unknown>;
}

function mapRow(row: Record<string, unknown>): UserActivityEvent {
    const categoryRaw = String(row.category || 'navigation');
    return {
        id: row.id as string,
        userId: (row.user_id as string) || undefined,
        userName: (row.user_name as string) || undefined,
        category: isUserActivityCategory(categoryRaw) ? categoryRaw : 'navigation',
        action: String(row.action || ''),
        summary: String(row.summary || ''),
        details: (row.details as Record<string, unknown>) || undefined,
        createdAt: row.created_at as string,
    };
}

function isFkViolation(error: { message?: string; code?: string } | null): boolean {
    if (!error) return false;
    return error.code === '23503';
}

function quoteFilterValue(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function userMatchOrFilter(userId?: string, userName?: string): string | null {
    const parts: string[] = [];
    if (userId) parts.push(`user_id.eq.${userId}`);
    const name = userName?.trim();
    if (name) parts.push(`user_name.ilike.${quoteFilterValue(name)}`);
    return parts.length ? parts.join(',') : null;
}

async function fetchActivityPages(
    buildQuery: (from: number, to: number) => Promise<{ data: unknown[] | null; error: { message?: string; code?: string } | null }>,
    maxPages: number,
    maxRows?: number,
): Promise<UserActivityEvent[]> {
    const all: UserActivityEvent[] = [];
    for (let page = 0; page < maxPages; page++) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await buildQuery(from, to);
        if (error) {
            if (isMissingTableError(error)) return [];
            throw error;
        }
        const rows = (data || []).map(row => mapRow(row as Record<string, unknown>));
        all.push(...rows);
        if (rows.length < PAGE_SIZE) break;
        if (maxRows && all.length >= maxRows) {
            return all.slice(0, maxRows);
        }
    }
    return all;
}

export const userActivityApi = {
    async log(input: LogUserActivityInput): Promise<void> {
        const baseRow = {
            user_id: input.userId || null,
            user_name: input.userName || null,
            category: input.category,
            action: input.action,
            summary: input.summary.slice(0, 500),
            details: input.details || {},
            app_name: APP_NAME,
        };

        let { error } = await supabase.from('user_activity_log').insert(baseRow);

        if (error && isFkViolation(error)) {
            ({ error } = await supabase.from('user_activity_log').insert({
                ...baseRow,
                user_id: null,
            }));
        }

        if (error) {
            if (isMissingTableError(error)) return;
            console.warn('No se pudo registrar actividad de usuario:', error.message);
        }
    },

    async getSince(sinceIso: string, limit = OVERVIEW_MAX_PAGES * PAGE_SIZE): Promise<UserActivityEvent[]> {
        const maxPages = Math.max(1, Math.ceil(limit / PAGE_SIZE));
        return fetchActivityPages(
            async (from, to) => supabase
                .from('user_activity_log')
                .select(ACTIVITY_SELECT)
                .eq('app_name', APP_NAME)
                .gte('created_at', sinceIso)
                .order('created_at', { ascending: false })
                .range(from, to),
            maxPages,
            limit,
        );
    },

    async getForUser(input: {
        userId?: string;
        userName?: string;
        sinceIso: string;
        limit?: number;
    }): Promise<UserActivityEvent[]> {
        const orFilter = userMatchOrFilter(input.userId, input.userName);
        if (!orFilter) return [];
        const limit = input.limit ?? USER_HISTORY_MAX_PAGES * PAGE_SIZE;
        const maxPages = Math.max(1, Math.ceil(limit / PAGE_SIZE));
        return fetchActivityPages(
            async (from, to) => supabase
                .from('user_activity_log')
                .select(ACTIVITY_SELECT)
                .eq('app_name', APP_NAME)
                .gte('created_at', input.sinceIso)
                .or(orFilter)
                .order('created_at', { ascending: false })
                .range(from, to),
            maxPages,
            limit,
        );
    },

    async getLatestForUsers(
        users: { id: string; name: string }[],
        sinceIso: string,
        perUserLimit = 80,
    ): Promise<UserActivityEvent[]> {
        if (users.length === 0) return [];
        const extras: UserActivityEvent[] = [];
        const concurrency = 4;
        for (let i = 0; i < users.length; i += concurrency) {
            const chunk = users.slice(i, i + concurrency);
            const pages = await Promise.all(
                chunk.map(user => this.getForUser({
                    userId: user.id,
                    userName: user.name,
                    sinceIso,
                    limit: perUserLimit,
                })),
            );
            for (const rows of pages) extras.push(...rows);
        }
        return extras;
    },

    async isAvailable(): Promise<boolean> {
        const { error } = await supabase
            .from('user_activity_log')
            .select('id')
            .eq('app_name', APP_NAME)
            .limit(1);
        if (error && isMissingTableError(error)) return false;
        return !error;
    },
};

export function logUserActivitySafe(input: LogUserActivityInput): void {
    void userActivityApi.log(input);
}

export async function logUserActivityAwait(input: LogUserActivityInput, timeoutMs = 2000): Promise<void> {
    await Promise.race([
        userActivityApi.log(input),
        new Promise<void>(resolve => setTimeout(resolve, timeoutMs)),
    ]);
}
