import type { WorkPlanAssignment } from '../../types';
import { APP_NAME } from '../appConfig';
import { supabase } from '../supabase';

const LOCAL_KEY = `work-plan-assignments:${APP_NAME}`;

export type WorkPlanWrite = {
    processId: string;
    processTitle: string;
    userIds: string[];
    userNames: string[];
    startsAt: string;
    endsAt: string;
    allDay: boolean;
    note?: string;
    createdBy?: string;
    createdByName?: string;
};

export type WorkPlanSource = 'remote' | 'local';

export type WorkPlanListResult = {
    items: WorkPlanAssignment[];
    source: WorkPlanSource;
    /** La tabla ya existe y el borrador local todavía no se compartió. */
    remoteReady: boolean;
};

let source: WorkPlanSource | null = null;

function isMissingTableError(error: any): boolean {
    const code = String(error?.code || '');
    const msg = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
    if (code === '42P01' || code === 'PGRST205') return true;
    return msg.includes('work_plan_assignments')
        && (msg.includes('does not exist') || msg.includes('schema cache') || msg.includes('could not find'));
}

function newId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readLocal(): WorkPlanAssignment[] {
    try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeLocal(items: WorkPlanAssignment[]) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

function rowToAssignment(row: any): WorkPlanAssignment {
    return {
        id: row.id,
        processId: row.process_id || '',
        processTitle: row.process_title || 'Proceso',
        userIds: Array.isArray(row.user_ids) ? row.user_ids : [],
        userNames: Array.isArray(row.user_names) ? row.user_names : [],
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        allDay: row.all_day !== false,
        note: row.note || undefined,
        createdBy: row.created_by || undefined,
        createdByName: row.created_by_name || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function toRow(input: WorkPlanWrite, now = new Date().toISOString()) {
    return {
        app_name: APP_NAME,
        process_id: input.processId,
        process_title: input.processTitle,
        user_ids: input.userIds,
        user_names: input.userNames,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        all_day: input.allDay,
        note: input.note?.trim() || null,
        created_by: input.createdBy || null,
        created_by_name: input.createdByName || null,
        updated_at: now,
    };
}

function localFromWrite(input: WorkPlanWrite, id = newId()): WorkPlanAssignment {
    const now = new Date().toISOString();
    return {
        id,
        processId: input.processId,
        processTitle: input.processTitle,
        userIds: input.userIds,
        userNames: input.userNames,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        allDay: input.allDay,
        note: input.note?.trim() || undefined,
        createdBy: input.createdBy,
        createdByName: input.createdByName,
        createdAt: now,
        updatedAt: now,
    };
}

const ASSIGNMENT_COLUMNS = 'id, process_id, process_title, user_ids, user_names, starts_at, ends_at, all_day, note, created_by, created_by_name, created_at, updated_at';

export const workPlanningApi = {
    resetSource() {
        source = null;
    },

    async list(): Promise<WorkPlanListResult> {
        const { data, error } = await supabase
            .from('work_plan_assignments')
            .select(ASSIGNMENT_COLUMNS)
            .eq('app_name', APP_NAME)
            .order('starts_at', { ascending: true })
            .limit(2000);

        if (error) {
            if (isMissingTableError(error)) {
                source = 'local';
                return { items: readLocal(), source: 'local', remoteReady: false };
            }
            throw error;
        }

        const remote = (data || []).map(rowToAssignment);
        const local = readLocal();
        if (remote.length === 0 && local.length > 0) {
            source = 'local';
            return { items: local, source: 'local', remoteReady: true };
        }
        source = 'remote';
        return { items: remote, source: 'remote', remoteReady: false };
    },

    async publishLocal(): Promise<WorkPlanAssignment[]> {
        const local = readLocal();
        source = 'remote';
        try {
            const created = await this.createMany(local.map(item => ({
                processId: item.processId,
                processTitle: item.processTitle,
                userIds: item.userIds,
                userNames: item.userNames,
                startsAt: item.startsAt,
                endsAt: item.endsAt,
                allDay: item.allDay,
                note: item.note,
                createdBy: item.createdBy,
                createdByName: item.createdByName,
            })));
            writeLocal([]);
            return created;
        } catch (error) {
            source = 'local';
            throw error;
        }
    },

    async createMany(inputs: WorkPlanWrite[]): Promise<WorkPlanAssignment[]> {
        if (inputs.length === 0) return [];
        if (source === null) throw new Error('El planeamiento todavía se está cargando.');
        if (source !== 'remote') {
            const created = inputs.map(input => localFromWrite(input));
            writeLocal([...readLocal(), ...created]);
            source = 'local';
            return created;
        }
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('work_plan_assignments')
            .insert(inputs.map(input => ({ ...toRow(input, now), created_at: now })))
            .select(ASSIGNMENT_COLUMNS);
        if (error) throw error;
        return (data || []).map(rowToAssignment);
    },

    async update(id: string, input: WorkPlanWrite): Promise<WorkPlanAssignment> {
        if (source !== 'remote') {
            const items = readLocal();
            const index = items.findIndex(item => item.id === id);
            if (index === -1) throw new Error('No se encontró la asignación.');
            const updated: WorkPlanAssignment = {
                ...items[index],
                ...localFromWrite(input, id),
                createdAt: items[index].createdAt,
            };
            items[index] = updated;
            writeLocal(items);
            return updated;
        }
        const { data, error } = await supabase
            .from('work_plan_assignments')
            .update(toRow(input))
            .eq('id', id)
            .eq('app_name', APP_NAME)
            .select(ASSIGNMENT_COLUMNS)
            .single();
        if (error) throw error;
        return rowToAssignment(data);
    },

    async remove(id: string): Promise<void> {
        if (source !== 'remote') {
            writeLocal(readLocal().filter(item => item.id !== id));
            return;
        }
        const { error } = await supabase
            .from('work_plan_assignments')
            .delete()
            .eq('id', id)
            .eq('app_name', APP_NAME);
        if (error) throw error;
    },
};
