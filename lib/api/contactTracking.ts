import { supabase } from '../supabase';
import { APP_NAME } from '../appConfig';
import type { ContactAttempt, ContactOutcome, ContactStatus } from '../contactTracking';
import {
    normalizeContactStatus,
    nextStatusAfterCallAttempt,
    shouldAutoMarkUnreachable,
} from '../contactTracking';
import {
    type ContactAttemptChannel,
    type ChannelContactSummary,
    getChannelDbFields,
    readChannelSummaryFromRow,
    buildSingleChannelResetUpdate,
} from '../contactChannelConfig';

export type { ChannelContactSummary as ContactSummary };
export type { ContactAttemptChannel as ContactChannel };

function mapAttemptRow(row: Record<string, unknown>): ContactAttempt {
    return {
        id: row.id as string,
        candidateId: row.candidate_id as string,
        processId: row.process_id as string,
        userId: (row.user_id as string) || undefined,
        userName: (row.user_name as string) || undefined,
        channel: row.channel as ContactAttempt['channel'],
        outcome: row.outcome as ContactOutcome,
        attemptNumber: (row.attempt_number as number) || 1,
        statusAfter: (row.status_after as ContactStatus) || undefined,
        notes: (row.notes as string) || undefined,
        createdAt: row.created_at as string,
    };
}

export interface RecordContactAttemptInput {
    candidateId: string;
    processId: string;
    channel: ContactAttemptChannel;
    outcome: ContactOutcome;
    userId?: string;
    userName?: string;
    notes?: string;
    incrementAttempt?: boolean;
}

export interface SetContactStatusInput {
    candidateId: string;
    processId: string;
    channel: ContactAttemptChannel;
    status: ContactStatus;
    userId?: string;
    userName?: string;
}

export interface ResetContactTrackingResult {
    clearedAttempts: number;
    channel: ContactAttemptChannel;
}

export interface ContactUndoSnapshot {
    statusBefore: ContactStatus;
    attemptCountBefore: number;
}

let contactColumnsSupported: boolean | null = null;

function encodeUndoNotes(snapshot: ContactUndoSnapshot, extra?: string): string {
    return JSON.stringify({ undo: snapshot, label: extra ?? null });
}

export function parseUndoFromAttemptNotes(
    notes?: string | null,
    attemptNumberFallback = 0
): ContactUndoSnapshot | null {
    if (!notes) return null;
    try {
        const parsed = JSON.parse(notes) as { undo?: ContactUndoSnapshot };
        if (parsed.undo?.statusBefore) return parsed.undo;
    } catch {
        /* legacy */
    }
    const legacy = notes.match(/^([\w_]+)\s*→\s*([\w_]+)$/);
    if (legacy) {
        return {
            statusBefore: normalizeContactStatus(legacy[1]),
            attemptCountBefore: attemptNumberFallback,
        };
    }
    return null;
}

function isMissingContactColumnError(error: { message?: string; code?: string } | null): boolean {
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    return (
        error.code === '42703' ||
        msg.includes('contact_phone') ||
        msg.includes('contact_status') ||
        msg.includes('candidate_contact_attempts')
    );
}

const CHANNEL_SELECT_FIELDS = [
    'contact_phone_status', 'contact_phone_attempt_count', 'contact_phone_last_at', 'contact_phone_last_user_name',
    'contact_whatsapp_status', 'contact_whatsapp_attempt_count', 'contact_whatsapp_last_at', 'contact_whatsapp_last_user_name',
    'contact_email_status', 'contact_email_attempt_count', 'contact_email_last_at', 'contact_email_last_user_name',
    'contact_status', 'contact_attempt_count', 'contact_last_attempt_at', 'contact_last_user_name',
    'last_whatsapp_interaction_at',
].join(', ');

function buildChannelUpdate(
    channel: ContactAttemptChannel,
    summary: ChannelContactSummary,
    userId?: string,
    userName?: string
): Record<string, unknown> {
    const f = getChannelDbFields(channel);
    return {
        [f.status]: summary.status,
        [f.attemptCount]: summary.attemptCount,
        [f.lastAt]: summary.lastAttemptAt ?? null,
        [f.lastUserName]: summary.lastUserName ?? userName ?? null,
    };
}

export const contactTrackingApi = {
    isSupported(): boolean {
        return contactColumnsSupported !== false;
    },

    readChannelSummary(row: Record<string, unknown>, channel: ContactAttemptChannel): ChannelContactSummary {
        return readChannelSummaryFromRow(row, channel);
    },

    async getAttemptsForProcesses(processIds: string[]): Promise<ContactAttempt[]> {
        if (processIds.length === 0) return [];

        const selectFields =
            'id, candidate_id, process_id, user_id, user_name, channel, outcome, attempt_number, status_after, notes, created_at';

        const pageSize = 1000;
        const all: ContactAttempt[] = [];

        for (let page = 0; page < 500; page++) {
            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data, error } = await supabase
                .from('candidate_contact_attempts')
                .select(selectFields)
                .in('process_id', processIds)
                .eq('app_name', APP_NAME)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) {
                if (isMissingContactColumnError(error)) {
                    contactColumnsSupported = false;
                    return all;
                }
                throw error;
            }

            contactColumnsSupported = true;
            all.push(...(data || []).map(mapAttemptRow));

            if (!data || data.length < pageSize) break;
        }

        return all;
    },

    async getHistory(
        candidateId: string,
        channel: ContactAttemptChannel,
        limit = 25
    ): Promise<ContactAttempt[]> {
        const { data, error } = await supabase
            .from('candidate_contact_attempts')
            .select('*')
            .eq('candidate_id', candidateId)
            .eq('channel', channel)
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

    async setStatus(input: SetContactStatusInput): Promise<ChannelContactSummary | null> {
        const now = new Date().toISOString();
        const { data: current, error: readErr } = await supabase
            .from('candidates')
            .select(CHANNEL_SELECT_FIELDS)
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

        const prev = readChannelSummaryFromRow(current as Record<string, unknown>, input.channel);
        if (prev.status === input.status) return { ...prev };

        const summary: ChannelContactSummary = {
            status: input.status,
            attemptCount: prev.attemptCount,
            lastAttemptAt: now,
            lastUserName: input.userName,
        };

        const { error: updErr } = await supabase
            .from('candidates')
            .update(buildChannelUpdate(input.channel, summary, input.userId, input.userName))
            .eq('id', input.candidateId)
            .eq('app_name', APP_NAME);

        if (updErr) throw updErr;

        await supabase.from('candidate_contact_attempts').insert({
            candidate_id: input.candidateId,
            process_id: input.processId,
            user_id: input.userId || null,
            user_name: input.userName || null,
            channel: input.channel,
            outcome: 'status_change',
            attempt_number: prev.attemptCount,
            status_after: input.status,
            notes: encodeUndoNotes(
                { statusBefore: prev.status, attemptCountBefore: prev.attemptCount },
                `${prev.status} → ${input.status}`
            ),
            app_name: APP_NAME,
        });

        contactColumnsSupported = true;
        return summary;
    },

    async recordAttempt(input: RecordContactAttemptInput): Promise<ChannelContactSummary | null> {
        const increment = input.incrementAttempt !== false;
        const now = new Date().toISOString();

        const { data: current, error: readErr } = await supabase
            .from('candidates')
            .select(CHANNEL_SELECT_FIELDS)
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

        const prev = readChannelSummaryFromRow(current as Record<string, unknown>, input.channel);
        const prevStatus = prev.status;
        const prevCount = prev.attemptCount;
        const newCount = increment ? prevCount + 1 : prevCount;

        let newStatus = prevStatus;
        if (input.outcome === 'interested') newStatus = 'interesado';
        else if (input.outcome === 'not_interested') newStatus = 'no_interesado';
        else if (input.outcome === 'unreachable') newStatus = 'inubicable';
        else if (increment) {
            newStatus = nextStatusAfterCallAttempt(prevStatus, newCount, input.channel, input.outcome);
        }

        if (
            shouldAutoMarkUnreachable(prevStatus, newCount, input.channel, input.outcome) &&
            newStatus === 'en_intento'
        ) {
            newStatus = 'inubicable';
        }

        const summary: ChannelContactSummary = {
            status: newStatus,
            attemptCount: newCount,
            lastAttemptAt: now,
            lastUserName: input.userName,
        };

        const updatePayload: Record<string, unknown> = buildChannelUpdate(
            input.channel,
            summary,
            input.userId,
            input.userName
        );
        if (input.channel === 'whatsapp') {
            updatePayload.last_whatsapp_interaction_at = now;
        }

        const { error: updErr } = await supabase
            .from('candidates')
            .update(updatePayload)
            .eq('id', input.candidateId)
            .eq('app_name', APP_NAME);

        if (updErr) throw updErr;

        const undoNotes =
            input.notes ||
            encodeUndoNotes(
                { statusBefore: prevStatus, attemptCountBefore: prevCount },
                `${input.channel}:${input.outcome}`
            );

        const { error: insErr } = await supabase.from('candidate_contact_attempts').insert({
            candidate_id: input.candidateId,
            process_id: input.processId,
            user_id: input.userId || null,
            user_name: input.userName || null,
            channel: input.channel,
            outcome: input.outcome,
            attempt_number: increment ? newCount : prevCount,
            status_after: newStatus,
            notes: undoNotes,
            app_name: APP_NAME,
        });

        if (insErr && !isMissingContactColumnError(insErr)) {
            console.error('Historial de contacto no guardado; reintentando:', insErr.message);
            const { error: retryErr } = await supabase.from('candidate_contact_attempts').insert({
                candidate_id: input.candidateId,
                process_id: input.processId,
                user_id: input.userId || null,
                user_name: input.userName || null,
                channel: input.channel,
                outcome: input.outcome,
                attempt_number: increment ? newCount : prevCount,
                status_after: newStatus,
                notes: undoNotes,
                app_name: APP_NAME,
            });
            if (retryErr && !isMissingContactColumnError(retryErr)) {
                console.error('Historial de contacto falló tras reintento:', retryErr.message);
            }
        }

        contactColumnsSupported = true;
        return summary;
    },

    async revertLastAction(input: {
        candidateId: string;
        processId: string;
        channel: ContactAttemptChannel;
        userId?: string;
        userName?: string;
    }): Promise<ChannelContactSummary | null> {
        const history = await this.getHistory(input.candidateId, input.channel, 1);
        const latest = history[0];
        if (!latest) return null;

        let snapshot = parseUndoFromAttemptNotes(latest.notes, latest.attemptNumber);
        if (!snapshot) {
            const older = await this.getHistory(input.candidateId, input.channel, 2);
            if (older.length < 2) {
                snapshot = { statusBefore: 'por_contactar', attemptCountBefore: 0 };
            } else {
                const prev = older[1];
                snapshot = {
                    statusBefore: normalizeContactStatus(prev.statusAfter || 'por_contactar'),
                    attemptCountBefore: Math.max(0, (prev.attemptNumber || 1) - 1),
                };
            }
        }

        const now = new Date().toISOString();
        const summary: ChannelContactSummary = {
            status: snapshot.statusBefore,
            attemptCount: snapshot.attemptCountBefore,
            lastAttemptAt: now,
            lastUserName: input.userName,
        };

        const { error: updErr } = await supabase
            .from('candidates')
            .update(buildChannelUpdate(input.channel, summary, input.userId, input.userName))
            .eq('id', input.candidateId)
            .eq('app_name', APP_NAME);

        if (updErr) throw updErr;

        await supabase.from('candidate_contact_attempts').insert({
            candidate_id: input.candidateId,
            process_id: input.processId,
            user_id: input.userId || null,
            user_name: input.userName || null,
            channel: input.channel,
            outcome: 'status_change',
            attempt_number: snapshot.attemptCountBefore,
            status_after: snapshot.statusBefore,
            notes: encodeUndoNotes(
                {
                    statusBefore: normalizeContactStatus(latest.statusAfter),
                    attemptCountBefore: latest.attemptNumber,
                },
                `Deshacer: ${latest.statusAfter ?? 'actual'} → ${snapshot.statusBefore}`
            ),
            app_name: APP_NAME,
        });

        return summary;
    },

    /** Reinicia un solo canal — candidato como nuevo en esa columna */
    async resetChannelContactTracking(input: {
        candidateId: string;
        processId: string;
        channel: ContactAttemptChannel;
        userId?: string;
        userName?: string;
    }): Promise<ResetContactTrackingResult | null> {
        const { count, error: countErr } = await supabase
            .from('candidate_contact_attempts')
            .select('id', { count: 'exact', head: true })
            .eq('candidate_id', input.candidateId)
            .eq('channel', input.channel)
            .eq('app_name', APP_NAME);

        if (countErr && !isMissingContactColumnError(countErr)) throw countErr;
        const clearedAttempts = count ?? 0;

        const { error: delErr } = await supabase
            .from('candidate_contact_attempts')
            .delete()
            .eq('candidate_id', input.candidateId)
            .eq('channel', input.channel)
            .eq('app_name', APP_NAME);

        if (delErr && !isMissingContactColumnError(delErr)) throw delErr;

        const { error: updErr } = await supabase
            .from('candidates')
            .update(buildSingleChannelResetUpdate(input.channel))
            .eq('id', input.candidateId)
            .eq('app_name', APP_NAME);

        if (updErr) {
            if (isMissingContactColumnError(updErr)) {
                contactColumnsSupported = false;
                return null;
            }
            throw updErr;
        }

        contactColumnsSupported = true;
        return {
            clearedAttempts,
            channel: input.channel,
        };
    },
};
