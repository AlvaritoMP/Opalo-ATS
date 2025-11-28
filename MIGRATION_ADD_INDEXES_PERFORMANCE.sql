-- Migración: Agregar índices para mejorar el rendimiento y evitar timeouts
-- ⚠️ IMPORTANTE: Este script puede causar timeout si se ejecuta completo
-- ✅ RECOMENDADO: Usa los scripts PARTE1, PARTE2, PARTE3 en su lugar
-- Ver: INSTRUCCIONES_EJECUTAR_INDICES.md

-- Si aún quieres ejecutar este script completo, hazlo en horas de menor tráfico
-- o ejecuta cada CREATE INDEX individualmente

-- 1. Índice para ordenar procesos por created_at (mejora la consulta principal)
CREATE INDEX IF NOT EXISTS idx_processes_created_at_desc ON processes(created_at DESC);

-- 2. Índices para las relaciones de procesos (mejoran las consultas de stages, categories, attachments)
CREATE INDEX IF NOT EXISTS idx_stages_process_id ON stages(process_id);
CREATE INDEX IF NOT EXISTS idx_stages_order_index ON stages(process_id, order_index);

CREATE INDEX IF NOT EXISTS idx_document_categories_process_id ON document_categories(process_id);

CREATE INDEX IF NOT EXISTS idx_attachments_process_id ON attachments(process_id);
CREATE INDEX IF NOT EXISTS idx_attachments_process_no_candidate ON attachments(process_id, candidate_id) WHERE candidate_id IS NULL;

-- 3. Índices para candidatos (mejoran las consultas de candidates)
CREATE INDEX IF NOT EXISTS idx_candidates_process_id ON candidates(process_id);
CREATE INDEX IF NOT EXISTS idx_candidates_stage_id ON candidates(stage_id);
CREATE INDEX IF NOT EXISTS idx_candidates_archived ON candidates(archived) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at DESC);

-- 4. Índices para candidate_history (mejoran las consultas de historial)
CREATE INDEX IF NOT EXISTS idx_candidate_history_candidate_id ON candidate_history(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_history_moved_at ON candidate_history(candidate_id, moved_at);

-- 5. Índices para post_its y comments
CREATE INDEX IF NOT EXISTS idx_post_its_candidate_id ON post_its(candidate_id);
CREATE INDEX IF NOT EXISTS idx_comments_candidate_id ON comments(candidate_id);

-- 6. Verificar que los índices se crearon correctamente
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('processes', 'stages', 'document_categories', 'attachments', 'candidates', 'candidate_history', 'post_its', 'comments')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

