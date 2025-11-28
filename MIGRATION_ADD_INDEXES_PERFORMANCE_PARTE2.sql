-- PARTE 2: Índices para candidatos
-- Ejecutar después de que PARTE 1 termine exitosamente

-- Índices para candidatos (mejoran las consultas de candidates)
CREATE INDEX IF NOT EXISTS idx_candidates_process_id ON candidates(process_id);
CREATE INDEX IF NOT EXISTS idx_candidates_stage_id ON candidates(stage_id);
CREATE INDEX IF NOT EXISTS idx_candidates_archived ON candidates(archived) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at DESC);

-- Verificar que se crearon correctamente
SELECT 
    'Parte 2 completada' as status,
    indexname,
    tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'candidates'
  AND indexname LIKE 'idx_%'
ORDER BY indexname;

