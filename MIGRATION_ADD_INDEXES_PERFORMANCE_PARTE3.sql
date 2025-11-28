-- PARTE 3: Índices para relaciones de candidatos
-- Ejecutar después de que PARTE 2 termine exitosamente

-- Índices para candidate_history (mejoran las consultas de historial)
CREATE INDEX IF NOT EXISTS idx_candidate_history_candidate_id ON candidate_history(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_history_moved_at ON candidate_history(candidate_id, moved_at);

-- Índices para post_its y comments
CREATE INDEX IF NOT EXISTS idx_post_its_candidate_id ON post_its(candidate_id);
CREATE INDEX IF NOT EXISTS idx_comments_candidate_id ON comments(candidate_id);

-- Verificar que se crearon correctamente
SELECT 
    'Parte 3 completada' as status,
    indexname,
    tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('candidate_history', 'post_its', 'comments')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

