import { supabase } from '../supabase';
import { APP_NAME } from '../appConfig';
import { isMissingTableError } from '../supabaseColumnErrors';
import {
    isUserActivityCategory,
    type UserActivityCategory,
} from '../userActivity';

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

    async getSince(sinceIso: string, limit = 3000): Promise<UserActivityEvent[]> {
        const { data, error } = await supabase
            .from('user_activity_log')
            .select('id, user_id, user_name, category, action, summary, details, created_at')
            .eq('app_name', APP_NAME)
            .gte('created_at', sinceIso)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            if (isMissingTableError(error)) return [];
            throw error;
        }
        return (data || []).map(mapRow);
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
