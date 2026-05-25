import { supabase } from '../supabase';
import { APP_NAME } from '../appConfig';
import type {
    ContactAttempt,
    ContactChannel,
    ContactOutcome,
    ContactStatus,
    ContactSummary,
} from '../contactTracking';
import {
    normalizeContactStatus,
    nextStatusAfterCallAttempt,
    shouldAutoMarkUnreachable,
} from '../contactTracking';

function mapAttemptRow(row: Record<string, unknown>): ContactAttempt {
    return {
        id: row.id as string,
        candidateId: row.candidate_id as string,
        processId: row.process_id as string,
        userId: (row.user_id as string) || undefined,
        userName: (row.user_name as string) || undefined,
        channel: row.channel as ContactChannel,
        outcome: row.outcome as ContactOutcome,
        attemptNumber: (row.attempt_number as number) || 1,
        statusAfter: (row.status_after as ContactStatus) || undefined,
        notes: (row.notes as string) || undefined,
        createdAt: row.created_at as string,
    };
}

function mapSummaryFromCandidate(row: Record<string, unknown>): ContactSummary {
    return {
        status: normalizeContactStatus(row.contact_status as string),
        attemptCount: (row.contact_attempt_count as number) || 0,
        lastAttemptAt: (row.contact_last_attempt_at as string) || undefined,
        lastUserId: (row.contact_last_user_id as string) || undefined,
        lastUserName: (row.contact_last_user_name as string) || undefined,
    };
}

export interface RecordContactAttemptInput {
    candidateId: string;
    processId: string;
    channel: ContactChannel;
    outcome: ContactOutcome;
    userId?: string;
    userName?: string;
    notes?: string;
    /** Si false, no incrementa el contador (p. ej. solo cambio de estado) */
    incrementAttempt?: boolean;
}

export interface SetContactStatusInput {
    candidateId: string;
    processId: string;
    status: ContactStatus;
    userId?: string;
    userName?: string;
}

let contactColumnsSupported: boolean | null = null;

function isMissingContactColumnError(error: { message?: string; code?: string } | null): boolean {
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    return (
        error.code === '42703' ||
        msg.includes('contact_status') ||
        msg.includes('candidate_contact_attempts')
    );
}

export const contactTrackingApi = {
    isSupported(): boolean {
        return contactColumnsSupported !== false;
    },

    mapSummaryFromCandidate,

    async getHistory(candidateId: string, limit = 25): Promise<ContactAttempt[]> {
        const { data, error } = await supabase
            .from('candidate_contact_attempts')
            .select('*')
            .eq('candidate_id', candidateId)
            .eq('app_name', APP_NAME)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            if (isMissingContactColumnError(error)) {
                contactColumnsSupported = false;
                return [];
            }
            throw error;
        }
        contactColumnsSupported = true;
        return (data || []).map(mapAttemptRow);
    },

    async setStatus(input: SetContactStatusInput): Promise<ContactSummary | null> {
        const now = new Date().toISOString();
        const { data: current, error: readErr } = await supabase
            .from('candidates')
            .select('contact_status, contact_attempt_count')
            .eq('id', input.candidateId)
            .eq('app_name', APP_NAME)
            .single();

        if (readErr) {
            if (isMissingContactColumnError(readErr)) {
                contactColumnsSupported = false;
                return null;
            }
            throw readErr;
        }

        const prevStatus = normalizeContactStatus(current?.contact_status as string);
        if (prevStatus === input.status) {
            return {
                status: input.status,
                attemptCount: (current?.contact_attempt_count as number) || 0,
            };
        }

        const { error: updErr } = await supabase
            .from('candidates')
            .update({
                contact_status: input.status,
                contact_last_attempt_at: now,
                contact_last_user_id: input.userId || null,
                contact_last_user_name: input.userName || null,
            })
            .eq('id', input.candidateId)
            .eq('app_name', APP_NAME);

        if (updErr) throw updErr;

        await supabase.from('candidate_contact_attempts').insert({
            candidate_id: input.candidateId,
            process_id: input.processId,
            user_id: input.userId || null,
            user_name: input.userName || null,
            channel: 'call',
            outcome: 'status_change',
            attempt_number: (current?.contact_attempt_count as number) || 0,
            status_after: input.status,
            notes: `${prevStatus} → ${input.status}`,
            app_name: APP_NAME,
        });

        contactColumnsSupported = true;
        return {
            status: input.status,
            attemptCount: (current?.contact_attempt_count as number) || 0,
            lastAttemptAt: now,
            lastUserId: input.userId,
            lastUserName: input.userName,
        };
    },

    async recordAttempt(input: RecordContactAttemptInput): Promise<ContactSummary | null> {
        const increment = input.incrementAttempt !== false;
        const now = new Date().toISOString();

        const { data: current, error: readErr } = await supabase
            .from('candidates')
            .select(
                'contact_status, contact_attempt_count, contact_last_attempt_at, contact_last_user_name'
            )
            .eq('id', input.candidateId)
            .eq('app_name', APP_NAME)
            .single();

        if (readErr) {
            if (isMissingContactColumnError(readErr)) {
                contactColumnsSupported = false;
                return null;
            }
            throw readErr;
        }

        const prevStatus = normalizeContactStatus(current?.contact_status as string);
        const prevCount = (current?.contact_attempt_count as number) || 0;
        const newCount = increment ? prevCount + 1 : prevCount;

        let newStatus = prevStatus;
        if (input.outcome === 'interested') {
            newStatus = 'interesado';
        } else if (input.outcome === 'not_interested') {
            newStatus = 'no_interesado';
        } else if (input.outcome === 'unreachable') {
            newStatus = 'inubicable';
        } else if (increment) {
            newStatus = nextStatusAfterCallAttempt(
                prevStatus,
                newCount,
                input.channel,
                input.outcome
            );
        }

        if (
            shouldAutoMarkUnreachable(prevStatus, newCount, input.channel, input.outcome) &&
            newStatus === 'en_intento'
        ) {
            newStatus = 'inubicable';
        }

        const { error: updErr } = await supabase
            .from('candidates')
            .update({
                contact_status: newStatus,
                contact_attempt_count: newCount,
                contact_last_attempt_at: now,
                contact_last_user_id: input.userId || null,
                contact_last_user_name: input.userName || null,
            })
            .eq('id', input.candidateId)
            .eq('app_name', APP_NAME);

        if (updErr) throw updErr;

        const { error: insErr } = await supabase.from('candidate_contact_attempts').insert({
            candidate_id: input.candidateId,
            process_id: input.processId,
            user_id: input.userId || null,
            user_name: input.userName || null,
            channel: input.channel,
            outcome: input.outcome,
            attempt_number: increment ? newCount : prevCount,
            status_after: newStatus,
            notes: input.notes || null,
            app_name: APP_NAME,
        });

        if (insErr && !isMissingContactColumnError(insErr)) {
            console.warn('Intento de contacto guardado en candidato pero no en historial:', insErr.message);
        }

        contactColumnsSupported = true;
        return {
            status: newStatus,
            attemptCount: newCount,
            lastAttemptAt: now,
            lastUserId: input.userId,
            lastUserName: input.userName,
        };
    },
};
