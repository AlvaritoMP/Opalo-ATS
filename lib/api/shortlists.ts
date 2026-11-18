import { supabase } from '../supabase';
import { APP_NAME } from '../appConfig';
import { isMissingColumnError, isMissingTableError } from '../supabaseColumnErrors';
import { toUuidOrNull } from '../uuid';
import {
    canMoveShortlistColumn,
    createShortlistToken,
    isValidAccessDni,
    normalizeAccessDni,
} from '../shortlists';
import type {
    Shortlist,
    ShortlistActor,
    ShortlistCandidateView,
    ShortlistColumnKey,
    ShortlistCounts,
    ShortlistDocument,
    ShortlistEvent,
    ShortlistEventType,
    ShortlistMember,
    ShortlistTestSummary,
} from '../../types';

const EMPTY_COUNTS: ShortlistCounts = { presentacion: 0, entrevista: 0, finalista: 0, rejected: 0 };

const TEST_LABELS: Record<string, string> = {
    barsit: 'BARSIT',
    inteligencia: 'Inteligencia',
    personalidad: 'Personalidad',
    riesgo: 'Riesgo',
    atencion: 'Atención',
    esfuerzo: 'Esfuerzo',
};

const SUITABILITY_LABELS: Record<string, string> = {
    apto: 'Apto',
    no_apto: 'No apto',
    apto_reservas: 'Apto con reservas',
};

const CANDIDATE_SELECTS = [
    'id, name, email, phone, age, province, district, description, salary_expectation, linkedin_url, avatar_url, assessment_results, psycholaboral_evaluation, complementary_data',
    'id, name, email, phone, age, province, district, description, salary_expectation, linkedin_url, avatar_url, psycholaboral_evaluation, complementary_data',
    'id, name, email, phone, age, province, district, description, salary_expectation, linkedin_url, avatar_url',
];

export class ShortlistSchemaError extends Error {
    constructor() {
        super('Falta crear las tablas de shortlists. En Supabase, ejecute MIGRATION_ADD_SHORTLISTS.sql.');
        this.name = 'ShortlistSchemaError';
    }
}

function throwIfMissing(error: { message?: string; code?: string; status?: number } | null): void {
    if (isMissingTableError(error)) throw new ShortlistSchemaError();
}

function asObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
}

function textOf(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function dbToShortlist(row: Record<string, unknown>, counts: ShortlistCounts = EMPTY_COUNTS): Shortlist {
    return {
        id: String(row.id),
        title: textOf(row.title),
        clientId: textOf(row.client_id) || undefined,
        clientLabel: textOf(row.client_label) || undefined,
        accessDni: textOf(row.access_dni),
        token: textOf(row.token),
        status: row.status === 'closed' ? 'closed' : 'open',
        showDocuments: row.show_documents !== false,
        showAssessments: row.show_assessments !== false,
        showProfile: row.show_profile !== false,
        createdBy: textOf(row.created_by) || undefined,
        createdByName: textOf(row.created_by_name) || undefined,
        closedAt: textOf(row.closed_at) || undefined,
        createdAt: textOf(row.created_at),
        updatedAt: textOf(row.updated_at),
        counts,
    };
}

function dbToMember(row: Record<string, unknown>): ShortlistMember {
    const column = textOf(row.column_key);
    return {
        id: String(row.id),
        shortlistId: String(row.shortlist_id),
        candidateId: String(row.candidate_id),
        sourceProcessId: textOf(row.source_process_id) || undefined,
        sourceProcessTitle: textOf(row.source_process_title) || undefined,
        sourceStageId: textOf(row.source_stage_id) || undefined,
        sourceStageName: textOf(row.source_stage_name) || undefined,
        sourceClientLabel: textOf(row.source_client_label) || undefined,
        column: column === 'entrevista' || column === 'finalista' ? column : 'presentacion',
        status: row.status === 'rejected' ? 'rejected' : 'active',
        rejectionReason: textOf(row.rejection_reason) || undefined,
        rejectedAt: textOf(row.rejected_at) || undefined,
        addedByName: textOf(row.added_by_name) || undefined,
        addedAt: textOf(row.added_at),
    };
}

function dbToEvent(row: Record<string, unknown>): ShortlistEvent {
    const payload = asObject(row.payload);
    return {
        id: String(row.id),
        shortlistId: String(row.shortlist_id),
        memberId: textOf(row.member_id) || undefined,
        candidateId: textOf(row.candidate_id) || undefined,
        eventType: textOf(row.event_type) as ShortlistEventType,
        body: textOf(row.body) || undefined,
        payload: Object.keys(payload).length ? payload : undefined,
        actorType: row.actor_type === 'client' ? 'client' : 'staff',
        actorName: textOf(row.actor_name) || undefined,
        createdAt: textOf(row.created_at),
    };
}

function summarizeTests(raw: unknown): ShortlistTestSummary[] {
    const tests = asObject(asObject(raw).tests);
    return Object.entries(tests).map(([id, value]) => {
        const state = asObject(value);
        const interpretation = asObject(state.interpretation);
        const title = textOf(interpretation.title);
        let summary = 'Pendiente';
        if (state.status === 'completed') {
            const score = typeof state.score === 'number' ? state.score : null;
            const max = typeof state.maxScore === 'number' ? state.maxScore : null;
            summary = title || (score !== null ? `Resultado ${score}${max !== null ? `/${max}` : ''}` : 'Realizada');
        } else if (state.status === 'in_progress' || typeof state.startedAt === 'string') {
            summary = 'En curso';
        }
        return { id, name: TEST_LABELS[id] || id, summary };
    });
}

function fichaLines(raw: unknown): string[] {
    const data = asObject(raw);
    const lines: string[] = [];
    const educacion = Array.isArray(data.educacion) ? data.educacion : [];
    for (const item of educacion.slice(0, 4)) {
        const row = asObject(item);
        const line = [textOf(row.nivel), textOf(row.grado), textOf(row.institucion)].filter(Boolean).join(' · ');
        if (line) lines.push(line);
    }
    const experiencia = Array.isArray(data.experienciaLaboral) ? data.experienciaLaboral : [];
    for (const item of experiencia.slice(0, 4)) {
        const row = asObject(item);
        const line = [textOf(row.puesto), textOf(row.empresa)].filter(Boolean).join(' · ');
        if (line) lines.push(line);
    }
    return lines;
}

function suitabilityLabel(raw: unknown): string | undefined {
    const status = textOf(asObject(raw).suitabilityStatus);
    return status ? SUITABILITY_LABELS[status] || status : undefined;
}

async function loadCandidateRows(ids: string[]): Promise<Record<string, unknown>[]> {
    if (ids.length === 0) return [];
    let lastError: { message?: string; code?: string } | null = null;
    for (const fields of CANDIDATE_SELECTS) {
        const { data, error } = await supabase
            .from('candidates')
            .select(fields)
            .in('id', ids)
            .eq('app_name', APP_NAME);
        if (!error) return (data || []) as unknown as Record<string, unknown>[];
        lastError = error;
        if (!isMissingColumnError(error)) break;
    }
    if (lastError) console.error('[shortlists] candidatos', lastError);
    return [];
}

async function loadDocuments(ids: string[]): Promise<Record<string, ShortlistDocument[]>> {
    const grouped: Record<string, ShortlistDocument[]> = {};
    if (ids.length === 0) return grouped;
    const withTenant = await supabase
        .from('attachments')
        .select('id, candidate_id, name, url, type')
        .in('candidate_id', ids)
        .eq('app_name', APP_NAME);
    const result = withTenant.error
        ? await supabase.from('attachments').select('id, candidate_id, name, url, type').in('candidate_id', ids)
        : withTenant;
    if (result.error) {
        console.error('[shortlists] documentos', result.error);
        return grouped;
    }
    for (const row of result.data || []) {
        const candidateId = textOf((row as { candidate_id?: string }).candidate_id);
        if (!candidateId) continue;
        const doc: ShortlistDocument = {
            id: String((row as { id: string }).id),
            name: textOf((row as { name?: string }).name) || 'Documento',
            url: textOf((row as { url?: string }).url),
            type: textOf((row as { type?: string }).type),
        };
        if (!doc.url) continue;
        grouped[candidateId] = grouped[candidateId] || [];
        grouped[candidateId].push(doc);
    }
    return grouped;
}

async function loadCandidateViews(ids: string[], shortlist: Shortlist): Promise<Record<string, ShortlistCandidateView>> {
    const [rows, documents] = await Promise.all([loadCandidateRows(ids), loadDocuments(ids)]);
    const views: Record<string, ShortlistCandidateView> = {};
    for (const row of rows) {
        const id = String(row.id);
        const psych = asObject(row.psycholaboral_evaluation);
        views[id] = {
            id,
            name: textOf(row.name) || 'Sin nombre',
            email: shortlist.showProfile ? textOf(row.email) || undefined : undefined,
            phone: shortlist.showProfile ? textOf(row.phone) || undefined : undefined,
            age: shortlist.showProfile && typeof row.age === 'number' ? row.age : undefined,
            province: shortlist.showProfile ? textOf(row.province) || undefined : undefined,
            district: shortlist.showProfile ? textOf(row.district) || undefined : undefined,
            description: shortlist.showProfile ? textOf(row.description) || undefined : undefined,
            salaryExpectation: shortlist.showProfile ? textOf(row.salary_expectation) || undefined : undefined,
            linkedinUrl: shortlist.showProfile ? textOf(row.linkedin_url) || undefined : undefined,
            avatarUrl: textOf(row.avatar_url) || undefined,
            documents: shortlist.showDocuments ? documents[id] || [] : [],
            tests: shortlist.showAssessments ? summarizeTests(row.assessment_results) : [],
            psycholaboralConclusion: shortlist.showAssessments ? textOf(psych.conclusions) || undefined : undefined,
            psycholaboralSuitability: shortlist.showAssessments ? suitabilityLabel(psych) : undefined,
            fichaLines: shortlist.showProfile ? fichaLines(row.complementary_data) : [],
        };
    }
    return views;
}

async function attachViews(shortlist: Shortlist, members: ShortlistMember[]): Promise<ShortlistMember[]> {
    const views = await loadCandidateViews(members.map(member => member.candidateId), shortlist);
    return members.map(member => ({ ...member, candidate: views[member.candidateId] }));
}

async function insertEvent(input: {
    shortlistId: string;
    memberId?: string;
    candidateId?: string;
    eventType: ShortlistEventType;
    body?: string;
    payload?: Record<string, unknown>;
    actor: ShortlistActor;
}): Promise<void> {
    const { error } = await supabase.from('shortlist_events').insert({
        app_name: APP_NAME,
        shortlist_id: input.shortlistId,
        member_id: input.memberId || null,
        candidate_id: input.candidateId || null,
        event_type: input.eventType,
        body: input.body || null,
        payload: input.payload || null,
        actor_type: input.actor.actorType,
        actor_name: input.actor.actorName,
        actor_user_id: toUuidOrNull(input.actor.actorUserId) || null,
    });
    throwIfMissing(error);
    if (error) throw new Error(error.message);
}

async function requireOpen(shortlistId: string): Promise<void> {
    const { data, error } = await supabase
        .from('shortlists')
        .select('status')
        .eq('id', shortlistId)
        .eq('app_name', APP_NAME)
        .maybeSingle();
    throwIfMissing(error);
    if (error) throw new Error(error.message);
    if (!data || data.status !== 'open') throw new Error('Esta sala está cerrada.');
}

async function loadRoom(shortlist: Shortlist): Promise<{ members: ShortlistMember[]; events: ShortlistEvent[] }> {
    const [membersResult, eventsResult] = await Promise.all([
        supabase
            .from('shortlist_members')
            .select('*')
            .eq('shortlist_id', shortlist.id)
            .eq('app_name', APP_NAME)
            .order('added_at', { ascending: true }),
        supabase
            .from('shortlist_events')
            .select('*')
            .eq('shortlist_id', shortlist.id)
            .eq('app_name', APP_NAME)
            .order('created_at', { ascending: false })
            .limit(80),
    ]);
    throwIfMissing(membersResult.error);
    throwIfMissing(eventsResult.error);
    if (membersResult.error) throw new Error(membersResult.error.message);
    if (eventsResult.error) throw new Error(eventsResult.error.message);
    const members = await attachViews(
        shortlist,
        ((membersResult.data || []) as unknown as Record<string, unknown>[]).map(dbToMember)
    );
    const events = ((eventsResult.data || []) as unknown as Record<string, unknown>[]).map(dbToEvent);
    return { members, events };
}

export interface CreateShortlistInput {
    title: string;
    clientId?: string;
    clientLabel?: string;
    accessDni: string;
    showDocuments: boolean;
    showAssessments: boolean;
    showProfile: boolean;
    actor: ShortlistActor;
}

export interface AddShortlistMemberInput {
    shortlistId: string;
    candidateId: string;
    candidateName: string;
    sourceProcessId?: string;
    sourceProcessTitle?: string;
    sourceStageId?: string;
    sourceStageName?: string;
    sourceClientId?: string;
    sourceClientLabel?: string;
    actor: ShortlistActor;
}

export const shortlistsApi = {
    async list(): Promise<Shortlist[]> {
        const { data, error } = await supabase
            .from('shortlists')
            .select('*')
            .eq('app_name', APP_NAME)
            .order('created_at', { ascending: false });
        throwIfMissing(error);
        if (error) throw new Error(error.message);
        const rows = (data || []) as unknown as Record<string, unknown>[];
        const counts = new Map<string, ShortlistCounts>();
        const ids = rows.map(row => String(row.id));
        if (ids.length > 0) {
            const members = await supabase
                .from('shortlist_members')
                .select('shortlist_id, column_key, status')
                .in('shortlist_id', ids)
                .eq('app_name', APP_NAME);
            throwIfMissing(members.error);
            if (members.error) throw new Error(members.error.message);
            for (const row of members.data || []) {
                const id = String(row.shortlist_id);
                const current = counts.get(id) || { ...EMPTY_COUNTS };
                if (row.status === 'rejected') current.rejected += 1;
                else if (row.column_key === 'entrevista') current.entrevista += 1;
                else if (row.column_key === 'finalista') current.finalista += 1;
                else current.presentacion += 1;
                counts.set(id, current);
            }
        }
        return rows.map(row => dbToShortlist(row, counts.get(String(row.id)) || { ...EMPTY_COUNTS }));
    },

    async create(input: CreateShortlistInput): Promise<Shortlist> {
        const title = input.title.trim();
        const dni = normalizeAccessDni(input.accessDni);
        if (!title) throw new Error('Escriba un nombre para la sala.');
        if (!isValidAccessDni(dni)) throw new Error('El DNI de acceso debe tener al menos 8 dígitos.');
        const { data, error } = await supabase
            .from('shortlists')
            .insert({
                app_name: APP_NAME,
                title,
                client_id: toUuidOrNull(input.clientId) || null,
                client_label: input.clientLabel?.trim() || null,
                access_dni: dni,
                token: createShortlistToken(),
                status: 'open',
                show_documents: input.showDocuments,
                show_assessments: input.showAssessments,
                show_profile: input.showProfile,
                created_by: toUuidOrNull(input.actor.actorUserId) || null,
                created_by_name: input.actor.actorName,
            })
            .select('*')
            .single();
        throwIfMissing(error);
        if (error) throw new Error(error.message);
        return dbToShortlist(data as unknown as Record<string, unknown>);
    },

    async getRoom(id: string): Promise<{ shortlist: Shortlist; members: ShortlistMember[]; events: ShortlistEvent[] }> {
        const { data, error } = await supabase
            .from('shortlists')
            .select('*')
            .eq('id', id)
            .eq('app_name', APP_NAME)
            .maybeSingle();
        throwIfMissing(error);
        if (error) throw new Error(error.message);
        if (!data) throw new Error('No se encontró la sala.');
        const shortlist = dbToShortlist(data as unknown as Record<string, unknown>);
        const room = await loadRoom(shortlist);
        return { shortlist, ...room };
    },

    async openByToken(token: string, dni: string): Promise<
        | { ok: true; shortlist: Shortlist; members: ShortlistMember[]; events: ShortlistEvent[] }
        | { ok: false; reason: 'not_found' | 'closed' | 'dni' }
    > {
        const { data, error } = await supabase
            .from('shortlists')
            .select('*')
            .eq('token', token.trim())
            .eq('app_name', APP_NAME)
            .maybeSingle();
        throwIfMissing(error);
        if (error) throw new Error(error.message);
        if (!data) return { ok: false, reason: 'not_found' };
        const shortlist = dbToShortlist(data as unknown as Record<string, unknown>);
        if (shortlist.status !== 'open') return { ok: false, reason: 'closed' };
        if (normalizeAccessDni(dni) !== shortlist.accessDni) return { ok: false, reason: 'dni' };
        const room = await loadRoom(shortlist);
        return { ok: true, shortlist, ...room };
    },

    async membershipsForCandidate(candidateId: string): Promise<Pick<ShortlistMember, 'shortlistId' | 'column' | 'status'>[]> {
        const { data, error } = await supabase
            .from('shortlist_members')
            .select('shortlist_id, column_key, status')
            .eq('candidate_id', candidateId)
            .eq('app_name', APP_NAME);
        throwIfMissing(error);
        if (error) throw new Error(error.message);
        return (data || []).map(row => ({
            shortlistId: String(row.shortlist_id),
            column: row.column_key === 'entrevista' || row.column_key === 'finalista' ? row.column_key : 'presentacion',
            status: row.status === 'rejected' ? 'rejected' : 'active',
        }));
    },

    async addMember(input: AddShortlistMemberInput): Promise<void> {
        await requireOpen(input.shortlistId);
        const existing = await supabase
            .from('shortlist_members')
            .select('id, status')
            .eq('shortlist_id', input.shortlistId)
            .eq('candidate_id', input.candidateId)
            .eq('app_name', APP_NAME)
            .maybeSingle();
        throwIfMissing(existing.error);
        if (existing.error) throw new Error(existing.error.message);
        if (existing.data?.status === 'active') throw new Error('Este candidato ya está en la sala.');

        const payload = {
            source_process_id: toUuidOrNull(input.sourceProcessId) || null,
            source_process_title: input.sourceProcessTitle || null,
            source_stage_id: input.sourceStageId || null,
            source_stage_name: input.sourceStageName || null,
            source_client_label: input.sourceClientLabel || null,
            column_key: 'presentacion',
            status: 'active',
            rejection_reason: null,
            rejected_at: null,
            added_by: toUuidOrNull(input.actor.actorUserId) || null,
            added_by_name: input.actor.actorName,
            updated_at: new Date().toISOString(),
        };

        let memberId = existing.data?.id as string | undefined;
        if (memberId) {
            const { error } = await supabase.from('shortlist_members').update(payload).eq('id', memberId);
            if (error) throw new Error(error.message);
        } else {
            const { data, error } = await supabase
                .from('shortlist_members')
                .insert({
                    ...payload,
                    app_name: APP_NAME,
                    shortlist_id: input.shortlistId,
                    candidate_id: input.candidateId,
                })
                .select('id')
                .single();
            if (error) throw new Error(error.message);
            memberId = data.id as string;
        }

        await insertEvent({
            shortlistId: input.shortlistId,
            memberId,
            candidateId: input.candidateId,
            eventType: 'added',
            actor: input.actor,
            payload: {
                candidateName: input.candidateName,
                processTitle: input.sourceProcessTitle || null,
            },
        });
    },

    async moveMember(memberId: string, to: ShortlistColumnKey, actor: ShortlistActor, mode: 'staff' | 'client'): Promise<void> {
        const member = await readMember(memberId);
        await requireOpen(member.shortlistId);
        if (member.status !== 'active') throw new Error('Este candidato está rechazado.');
        if (!canMoveShortlistColumn(member.column, to, mode)) {
            throw new Error('Solo puede avanzar a la siguiente etapa.');
        }
        const { error } = await supabase
            .from('shortlist_members')
            .update({ column_key: to, updated_at: new Date().toISOString() })
            .eq('id', memberId);
        if (error) throw new Error(error.message);
        await insertEvent({
            shortlistId: member.shortlistId,
            memberId,
            candidateId: member.candidateId,
            eventType: 'moved',
            actor,
            payload: {
                candidateName: member.candidate?.name || 'Candidato',
                from: member.column,
                to,
            },
        });
    },

    async rejectMember(memberId: string, reason: string, actor: ShortlistActor): Promise<void> {
        const text = reason.trim();
        if (!text) throw new Error('Escriba el sustento del rechazo.');
        const member = await readMember(memberId);
        await requireOpen(member.shortlistId);
        if (member.status === 'rejected') throw new Error('Este candidato ya está rechazado.');
        const { error } = await supabase
            .from('shortlist_members')
            .update({
                status: 'rejected',
                rejection_reason: text,
                rejected_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', memberId);
        if (error) throw new Error(error.message);
        await insertEvent({
            shortlistId: member.shortlistId,
            memberId,
            candidateId: member.candidateId,
            eventType: 'rejected',
            body: text,
            actor,
            payload: {
                candidateName: member.candidate?.name || 'Candidato',
                from: member.column,
            },
        });
    },

    async commentMember(memberId: string, body: string, actor: ShortlistActor): Promise<void> {
        const text = body.trim();
        if (!text) throw new Error('Escriba un comentario.');
        const member = await readMember(memberId);
        await requireOpen(member.shortlistId);
        await insertEvent({
            shortlistId: member.shortlistId,
            memberId,
            candidateId: member.candidateId,
            eventType: 'comment',
            body: text,
            actor,
            payload: { candidateName: member.candidate?.name || 'Candidato' },
        });
    },

    async removeMember(memberId: string, actor: ShortlistActor): Promise<void> {
        const member = await readMember(memberId);
        await requireOpen(member.shortlistId);
        await insertEvent({
            shortlistId: member.shortlistId,
            memberId,
            candidateId: member.candidateId,
            eventType: 'removed',
            actor,
            payload: { candidateName: member.candidate?.name || 'Candidato' },
        });
        const { error } = await supabase.from('shortlist_members').delete().eq('id', memberId);
        if (error) throw new Error(error.message);
    },

    async close(id: string, actor: ShortlistActor): Promise<void> {
        const { error } = await supabase
            .from('shortlists')
            .update({
                status: 'closed',
                closed_at: new Date().toISOString(),
                closed_by: toUuidOrNull(actor.actorUserId) || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('app_name', APP_NAME);
        throwIfMissing(error);
        if (error) throw new Error(error.message);
        await insertEvent({ shortlistId: id, eventType: 'closed', actor });
    },

    async reopen(id: string, actor: ShortlistActor): Promise<void> {
        const { error } = await supabase
            .from('shortlists')
            .update({
                status: 'open',
                closed_at: null,
                closed_by: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('app_name', APP_NAME);
        throwIfMissing(error);
        if (error) throw new Error(error.message);
        await insertEvent({ shortlistId: id, eventType: 'reopened', actor });
    },

    async logAccess(shortlistId: string): Promise<void> {
        await insertEvent({
            shortlistId,
            eventType: 'access',
            actor: { actorType: 'client', actorName: 'Cliente' },
        });
    },
};

async function readMember(memberId: string): Promise<ShortlistMember> {
    const { data, error } = await supabase
        .from('shortlist_members')
        .select('*')
        .eq('id', memberId)
        .eq('app_name', APP_NAME)
        .maybeSingle();
    throwIfMissing(error);
    if (error) throw new Error(error.message);
    if (!data) throw new Error('El candidato ya no está en la sala.');
    const member = dbToMember(data as unknown as Record<string, unknown>);
    const views = await loadCandidateRows([member.candidateId]);
    const name = textOf(views[0]?.name);
    if (name) member.candidate = { id: member.candidateId, name, documents: [], tests: [], fichaLines: [] };
    return member;
}
