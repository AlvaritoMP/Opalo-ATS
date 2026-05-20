import { supabase } from '../supabase';
import { APP_NAME } from '../appConfig';

/** Select mínimo — siempre disponible */
const BULK_SELECT_BASE =
    'id, name, email, phone, dni, age, source, province, district, score_ia, metadata_ia, stage_id, process_id, last_whatsapp_interaction_at';

const BULK_SELECT_WITH_CREATED = `${BULK_SELECT_BASE}, created_at`;
const BULK_SELECT_FULL = `${BULK_SELECT_WITH_CREATED}, bulk_column_values`;

/** Cache del select que funcionó en este entorno (evita reintentos en cada página) */
let cachedBulkSelect: string | null = null;

function isMissingColumnError(error: { message?: string; code?: string } | null): boolean {
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    return (
        error.code === '42703' ||
        msg.includes('bulk_column_values') ||
        msg.includes('schema cache') ||
        msg.includes('could not find') ||
        (msg.includes('column') && msg.includes('candidates'))
    );
}

function getBulkSelectCandidates(): string[] {
    if (cachedBulkSelect) return [cachedBulkSelect];
    return [BULK_SELECT_FULL, BULK_SELECT_WITH_CREATED, BULK_SELECT_BASE];
}

function mapBulkCandidateRow(
    c: Record<string, unknown>,
    nextInterviews: Map<string, { start: string; interviewerId: string; eventId: string }>
): BulkCandidate {
    const nextInterview = nextInterviews.get(c.id as string);
    return {
        id: c.id as string,
        name: c.name as string,
        email: (c.email as string) || undefined,
        phone: (c.phone as string) || undefined,
        dni: (c.dni as string) || undefined,
        source: (c.source as string) || undefined,
        province: (c.province as string) || undefined,
        district: (c.district as string) || undefined,
        age: c.age != null ? (c.age as number) : undefined,
        scoreIa: (c.score_ia as number) || undefined,
        metadataIa: (c.metadata_ia as string) || undefined,
        stageId: c.stage_id as string,
        processId: c.process_id as string,
        lastWhatsAppInteractionAt: (c.last_whatsapp_interaction_at as string) || undefined,
        createdAt: (c.created_at as string) || undefined,
        nextInterviewAt: nextInterview?.start || undefined,
        nextInterviewerId: nextInterview?.interviewerId || undefined,
        nextInterviewEventId: nextInterview?.eventId || undefined,
        bulkColumnValues: (c.bulk_column_values as Record<string, unknown>) || undefined,
    };
}

let bulkColumnValuesWriteSupported: boolean | null = null;

function isBulkColumnValuesWriteSupported(): boolean {
    return bulkColumnValuesWriteSupported !== false;
}

// Tipo ligero para la vista masiva (solo campos necesarios)
export interface BulkCandidate {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    dni?: string;
    source?: string;
    province?: string;
    district?: string;
    age?: number;
    scoreIa?: number;
    metadataIa?: string;
    stageId: string;
    processId: string;
    lastWhatsAppInteractionAt?: string; // Última interacción (editable manualmente)
    createdAt?: string;
    nextInterviewAt?: string; // Fecha/hora de la próxima entrevista
    nextInterviewerId?: string; // ID del entrevistador de la próxima entrevista
    nextInterviewEventId?: string;
    /** Valores de columnas personalizadas (tabla alta densidad) */
    bulkColumnValues?: Record<string, unknown>;
    // Campos adicionales para el drawer (se cargan bajo demanda)
    description?: string;
    attachments?: any[];
    history?: any[];
}

// Resultado de la query paginada
export interface BulkCandidatesResult {
    candidates: BulkCandidate[];
    total: number;
    hasMore: boolean;
}

export const bulkCandidatesApi = {
    /**
     * Obtener candidatos con paginación optimizada (solo campos ligeros)
     * @param processId - ID del proceso (opcional, si no se proporciona trae todos)
     * @param page - Número de página (0-indexed)
     * @param pageSize - Tamaño de página (default: 50)
     * @param filters - Filtros opcionales (stageId, search, etc.)
     */
    async getCandidates(
        processId?: string,
        page: number = 0,
        pageSize: number = 50,
        filters?: {
            stageId?: string;
            search?: string;
            archived?: boolean;
            discarded?: boolean;
        }
    ): Promise<BulkCandidatesResult> {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const applyFilters = (query: ReturnType<typeof supabase.from>) => {
            let q = query
                .eq('app_name', APP_NAME)
                .eq('archived', filters?.archived ?? false)
                .eq('discarded', filters?.discarded ?? false)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (processId) q = q.eq('process_id', processId);
            if (filters?.stageId) q = q.eq('stage_id', filters.stageId);
            if (filters?.search) {
                q = q.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
            }
            return q;
        };

        let data: Record<string, unknown>[] | null = null;
        let count: number | null = null;
        let lastError: { message?: string; code?: string } | null = null;

        for (const selectFields of getBulkSelectCandidates()) {
            const { data: rows, error, count: total } = await applyFilters(
                supabase.from('candidates').select(selectFields, { count: 'exact' })
            );
            if (!error) {
                data = (rows || []) as Record<string, unknown>[];
                count = total;
                cachedBulkSelect = selectFields;
                bulkColumnValuesWriteSupported = selectFields.includes('bulk_column_values');
                break;
            }
            lastError = error;
            if (!isMissingColumnError(error)) break;
            if (cachedBulkSelect === selectFields) cachedBulkSelect = null;
        }

        if (lastError && !data) throw lastError;

        // Obtener próximas entrevistas para los candidatos
        const candidateIds = (data || []).map(c => c.id as string);
        let nextInterviews: Map<string, { start: string; interviewerId: string; eventId: string }> = new Map();
        
        if (candidateIds.length > 0) {
            const now = new Date().toISOString();
            const { data: interviews } = await supabase
                .from('interview_events')
                .select('id, candidate_id, start_time, interviewer_id')
                .in('candidate_id', candidateIds)
                .eq('app_name', APP_NAME)
                .gte('start_time', now)
                .order('start_time', { ascending: true });

            if (interviews) {
                interviews.forEach(interview => {
                    if (!nextInterviews.has(interview.candidate_id)) {
                        nextInterviews.set(interview.candidate_id, {
                            start: interview.start_time,
                            interviewerId: interview.interviewer_id,
                            eventId: interview.id,
                        });
                    }
                });
            }
        }

        const candidates: BulkCandidate[] = (data || []).map(c =>
            mapBulkCandidateRow(c, nextInterviews)
        );

        return {
            candidates,
            total: count || 0,
            hasMore: (count || 0) > to + 1,
        };
    },

    /** Todas las páginas (para exportación masiva). Respeta los mismos filtros que getCandidates. */
    async getAllCandidates(
        processId: string,
        filters?: {
            stageId?: string;
            search?: string;
            archived?: boolean;
            discarded?: boolean;
        }
    ): Promise<BulkCandidate[]> {
        const pageSize = 400;
        const out: BulkCandidate[] = [];
        for (let page = 0; page < 500; page++) {
            const r = await this.getCandidates(processId, page, pageSize, filters);
            out.push(...r.candidates);
            if (!r.hasMore) break;
        }
        return out;
    },

    /**
     * Registrar interacción por WhatsApp
     * @param candidateId - ID del candidato
     */
    async recordWhatsAppInteraction(candidateId: string): Promise<void> {
        const { error } = await supabase
            .from('candidates')
            .update({ 
                last_whatsapp_interaction_at: new Date().toISOString() 
            })
            .eq('id', candidateId)
            .eq('app_name', APP_NAME);

        if (error) throw error;
    },

    /**
     * Actualizar estado de un candidato (optimistic update)
     * @param candidateId - ID del candidato
     * @param updates - Campos a actualizar
     */
    async updateCandidate(candidateId: string, updates: {
        stageId?: string;
        discarded?: boolean;
        discardReason?: string;
        archived?: boolean;
    }, context?: { previousStageId?: string; movedBy?: string }): Promise<void> {
        const dbUpdates: any = {};
        
        if (updates.stageId !== undefined) dbUpdates.stage_id = updates.stageId;
        if (updates.discarded !== undefined) dbUpdates.discarded = updates.discarded;
        if (updates.discardReason !== undefined) dbUpdates.discard_reason = updates.discardReason;
        if (updates.archived !== undefined) dbUpdates.archived = updates.archived;

        if (updates.discarded) {
            dbUpdates.discarded_at = new Date().toISOString();
        }

        if (updates.archived) {
            dbUpdates.archived_at = new Date().toISOString();
        }

        const { error } = await supabase
            .from('candidates')
            .update(dbUpdates)
            .eq('id', candidateId)
            .eq('app_name', APP_NAME);

        if (error) throw error;

        if (updates.stageId && context?.previousStageId && updates.stageId !== context.previousStageId) {
            await supabase.from('candidate_history').insert({
                candidate_id: candidateId,
                stage_id: updates.stageId,
                moved_at: new Date().toISOString(),
                moved_by: context.movedBy || null,
                app_name: APP_NAME,
            });
        }
    },

    /**
     * Actualización ligera de campos editables en la tabla (sin getById)
     */
    async patchFields(candidateId: string, updates: {
        name?: string;
        email?: string;
        phone?: string;
        dni?: string;
        source?: string;
        province?: string;
        district?: string;
        lastWhatsAppInteractionAt?: string | null;
    }): Promise<void> {
        const dbUpdates: Record<string, string | null> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
        if (updates.dni !== undefined) dbUpdates.dni = updates.dni || null;
        if (updates.source !== undefined) dbUpdates.source = updates.source || null;
        if (updates.lastWhatsAppInteractionAt !== undefined) {
            dbUpdates.last_whatsapp_interaction_at = updates.lastWhatsAppInteractionAt;
        }

        const locationFields: Record<string, string | null> = {};
        if (updates.province !== undefined) locationFields.province = updates.province || null;
        if (updates.district !== undefined) locationFields.district = updates.district || null;

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase
                .from('candidates')
                .update(dbUpdates)
                .eq('id', candidateId)
                .eq('app_name', APP_NAME);
            if (error) throw error;
        }

        if (Object.keys(locationFields).length > 0) {
            const { error: locationError } = await supabase
                .from('candidates')
                .update(locationFields)
                .eq('id', candidateId)
                .eq('app_name', APP_NAME);
            if (locationError) {
                const msg = locationError.message || '';
                if (!msg.includes('schema cache') && !msg.includes('Could not find') && !msg.includes('column')) {
                    throw locationError;
                }
            }
        }
    },

    /**
     * Actualizar múltiples candidatos en lote
     * @param candidateIds - Array de IDs de candidatos
     * @param updates - Campos a actualizar
     */
    async updateCandidatesBatch(
        candidateIds: string[],
        updates: {
            stageId?: string;
            discarded?: boolean;
            discardReason?: string;
            archived?: boolean;
        }
    ): Promise<void> {
        if (candidateIds.length === 0) return;

        const dbUpdates: any = {};
        
        if (updates.stageId !== undefined) dbUpdates.stage_id = updates.stageId;
        if (updates.discarded !== undefined) dbUpdates.discarded = updates.discarded;
        if (updates.discardReason !== undefined) dbUpdates.discard_reason = updates.discardReason;
        if (updates.archived !== undefined) dbUpdates.archived = updates.archived;

        if (updates.discarded) {
            dbUpdates.discarded_at = new Date().toISOString();
        }

        if (updates.archived) {
            dbUpdates.archived_at = new Date().toISOString();
        }

        const { error } = await supabase
            .from('candidates')
            .update(dbUpdates)
            .in('id', candidateIds)
            .eq('app_name', APP_NAME);

        if (error) throw error;
    },

    /**
     * Cargar detalles completos de un candidato (para el drawer)
     * @param candidateId - ID del candidato
     */
    async getCandidateDetails(candidateId: string): Promise<BulkCandidate> {
        const { data, error } = await supabase
            .from('candidates')
            .select(`
                id,
                name,
                email,
                phone,
                description,
                score_ia,
                metadata_ia,
                stage_id,
                process_id,
                attachments:attachments!candidate_id(id, name, url, type, size, category, uploaded_at),
                history:candidate_history!candidate_id(stage_id, moved_at, moved_by)
            `)
            .eq('id', candidateId)
            .eq('app_name', APP_NAME)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            email: data.email,
            phone: data.phone || undefined,
            description: data.description || undefined,
            scoreIa: data.score_ia || undefined,
            metadataIa: data.metadata_ia || undefined,
            stageId: data.stage_id,
            processId: data.process_id,
            attachments: data.attachments || [],
            history: data.history || [],
        };
    },

    /**
     * Fusiona valores de columnas personalizadas en bulk_column_values (JSONB).
     */
    async patchBulkColumnValues(
        candidateId: string,
        values: Record<string, unknown>
    ): Promise<void> {
        if (Object.keys(values).length === 0) return;
        if (!isBulkColumnValuesWriteSupported()) return;

        const { data, error: fetchError } = await supabase
            .from('candidates')
            .select('bulk_column_values')
            .eq('id', candidateId)
            .eq('app_name', APP_NAME)
            .single();

        if (fetchError) {
            if (isMissingColumnError(fetchError)) {
                bulkColumnValuesWriteSupported = false;
                return;
            }
            throw fetchError;
        }

        const current = (data?.bulk_column_values as Record<string, unknown>) || {};
        const merged = { ...current, ...values };

        const { error } = await supabase
            .from('candidates')
            .update({ bulk_column_values: merged })
            .eq('id', candidateId)
            .eq('app_name', APP_NAME);

        if (error) {
            if (isMissingColumnError(error)) {
                bulkColumnValuesWriteSupported = false;
                return;
            }
            throw error;
        }
    },

    /**
     * Establece bulk_column_values para varios candidatos (p. ej. importación Excel).
     */
    async batchSetBulkColumnValues(
        updates: Record<string, Record<string, unknown>>
    ): Promise<void> {
        const entries = Object.entries(updates);
        if (entries.length === 0) return;

        await Promise.all(
            entries.map(([candidateId, values]) =>
                this.patchBulkColumnValues(candidateId, values)
            )
        );
    },

    /**
     * Eliminar candidato permanentemente
     * @param candidateId - ID del candidato
     */
    async deleteCandidate(candidateId: string): Promise<void> {
        const { error } = await supabase
            .from('candidates')
            .delete()
            .eq('id', candidateId)
            .eq('app_name', APP_NAME);
        
        if (error) throw error;
    },

    /**
     * Eliminar múltiples candidatos en lote
     * @param candidateIds - Array de IDs de candidatos
     */
    async deleteCandidatesBatch(candidateIds: string[]): Promise<void> {
        if (candidateIds.length === 0) return;
        
        const { error } = await supabase
            .from('candidates')
            .delete()
            .in('id', candidateIds)
            .eq('app_name', APP_NAME);
        
        if (error) throw error;
    },
};
