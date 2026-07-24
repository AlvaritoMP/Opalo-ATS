import { supabase } from '../supabase';
import { APP_NAME } from '../appConfig';

const PAGE_SIZE = 1000;
const MAX_PAGES = 200;

export interface FinalStageArrivalRow {
    candidateId: string;
    name: string;
    email: string;
    phone?: string;
    movedAt: string;
    movedBy: string | null;
    discarded: boolean;
    currentStageId: string | null;
}

export interface ProcessDiscardRow {
    candidateId: string;
    name: string;
    email: string;
    phone?: string;
    discardedAt: string | null;
    discardReason: string | null;
    stageId: string | null;
}

export interface ProcessCoverageSnapshot {
    activeCount: number;
    hiredCount: number;
    discardedTotal: number;
    vacancies: number;
}

/**
 * Llegadas a la etapa final del proceso (historial) desde sinceIso.
 * Usa el movimiento más reciente por candidato hacia esa etapa.
 */
export async function fetchFinalStageArrivals(
    processId: string,
    hiringStageId: string,
    sinceIso: string
): Promise<FinalStageArrivalRow[]> {
    const candidateIds: string[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await supabase
            .from('candidates')
            .select('id')
            .eq('app_name', APP_NAME)
            .eq('process_id', processId)
            .order('id', { ascending: true })
            .range(from, to);
        if (error) throw error;
        const rows = (data || []) as Array<{ id: string }>;
        for (const row of rows) {
            if (row.id) candidateIds.push(row.id);
        }
        if (rows.length < PAGE_SIZE) break;
    }
    if (candidateIds.length === 0) return [];

    const latestByCandidate = new Map<string, { movedAt: string; movedBy: string | null }>();

    for (let i = 0; i < candidateIds.length; i += 80) {
        const chunk = candidateIds.slice(i, i + 80);
        for (let page = 0; page < MAX_PAGES; page++) {
            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;
            const { data, error } = await supabase
                .from('candidate_history')
                .select('candidate_id, moved_at, moved_by')
                .eq('app_name', APP_NAME)
                .eq('stage_id', hiringStageId)
                .in('candidate_id', chunk)
                .gte('moved_at', sinceIso)
                .order('moved_at', { ascending: false })
                .range(from, to);
            if (error) throw error;
            const rows = (data || []) as Array<{
                candidate_id: string;
                moved_at: string;
                moved_by: string | null;
            }>;
            for (const row of rows) {
                if (!row.candidate_id || !row.moved_at) continue;
                if (latestByCandidate.has(row.candidate_id)) continue;
                latestByCandidate.set(row.candidate_id, {
                    movedAt: row.moved_at,
                    movedBy: row.moved_by,
                });
            }
            if (rows.length < PAGE_SIZE) break;
        }
    }

    const arrivalIds = [...latestByCandidate.keys()];
    if (arrivalIds.length === 0) return [];

    const details = new Map<
        string,
        { name: string; email: string; phone?: string; discarded: boolean; stageId: string | null }
    >();

    for (let i = 0; i < arrivalIds.length; i += 80) {
        const chunk = arrivalIds.slice(i, i + 80);
        const { data, error } = await supabase
            .from('candidates')
            .select('id, name, email, phone, discarded, stage_id')
            .eq('app_name', APP_NAME)
            .in('id', chunk);
        if (error) throw error;
        for (const row of (data || []) as Array<{
            id: string;
            name: string;
            email: string;
            phone: string | null;
            discarded: boolean | null;
            stage_id: string | null;
        }>) {
            details.set(row.id, {
                name: row.name || 'Sin nombre',
                email: row.email || '',
                phone: row.phone || undefined,
                discarded: Boolean(row.discarded),
                stageId: row.stage_id,
            });
        }
    }

    const out: FinalStageArrivalRow[] = [];
    for (const [candidateId, move] of latestByCandidate) {
        const detail = details.get(candidateId);
        if (!detail) continue;
        out.push({
            candidateId,
            name: detail.name,
            email: detail.email,
            phone: detail.phone,
            movedAt: move.movedAt,
            movedBy: move.movedBy,
            discarded: detail.discarded,
            currentStageId: detail.stageId,
        });
    }
    out.sort((a, b) => b.movedAt.localeCompare(a.movedAt));
    return out;
}

/** Descartas del proceso (opcionalmente desde sinceIso). */
export async function fetchProcessDiscards(
    processId: string,
    sinceIso?: string
): Promise<ProcessDiscardRow[]> {
    const out: ProcessDiscardRow[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        let query = supabase
            .from('candidates')
            .select('id, name, email, phone, discarded_at, discard_reason, stage_id')
            .eq('app_name', APP_NAME)
            .eq('process_id', processId)
            .eq('discarded', true)
            .order('discarded_at', { ascending: false })
            .range(from, to);
        if (sinceIso) {
            query = query.gte('discarded_at', sinceIso);
        }
        const { data, error } = await query;
        if (error) throw error;
        const rows = (data || []) as Array<{
            id: string;
            name: string;
            email: string;
            phone: string | null;
            discarded_at: string | null;
            discard_reason: string | null;
            stage_id: string | null;
        }>;
        for (const row of rows) {
            out.push({
                candidateId: row.id,
                name: row.name || 'Sin nombre',
                email: row.email || '',
                phone: row.phone || undefined,
                discardedAt: row.discarded_at,
                discardReason: row.discard_reason,
                stageId: row.stage_id,
            });
        }
        if (rows.length < PAGE_SIZE) break;
    }
    return out;
}

/** Conteos actuales del proceso para el encabezado del informe. */
export async function fetchProcessCoverageSnapshot(
    processId: string,
    hiringStageId: string | null,
    vacancies: number
): Promise<ProcessCoverageSnapshot> {
    const activeQuery = supabase
        .from('candidates')
        .select('id', { count: 'exact', head: true })
        .eq('app_name', APP_NAME)
        .eq('process_id', processId)
        .eq('archived', false)
        .eq('discarded', false);

    const discardedQuery = supabase
        .from('candidates')
        .select('id', { count: 'exact', head: true })
        .eq('app_name', APP_NAME)
        .eq('process_id', processId)
        .eq('discarded', true);

    let hiredCount = 0;
    if (hiringStageId) {
        const hiredQuery = supabase
            .from('candidates')
            .select('id', { count: 'exact', head: true })
            .eq('app_name', APP_NAME)
            .eq('process_id', processId)
            .eq('stage_id', hiringStageId)
            .eq('discarded', false)
            .eq('archived', false);
        const { count, error } = await hiredQuery;
        if (error) throw error;
        hiredCount = count ?? 0;
    }

    const [activeRes, discardedRes] = await Promise.all([activeQuery, discardedQuery]);
    if (activeRes.error) throw activeRes.error;
    if (discardedRes.error) throw discardedRes.error;

    return {
        activeCount: activeRes.count ?? 0,
        hiredCount,
        discardedTotal: discardedRes.count ?? 0,
        vacancies: Math.max(0, vacancies || 0),
    };
}
