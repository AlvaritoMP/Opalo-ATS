-- ÍNDICE CRÍTICO #3: Para candidatos (tercero más importante)
-- Ejecutar DESPUÉS de que el índice #2 termine exitosamente
-- Espera al menos 15-20 segundos entre índices

CREATE INDEX IF NOT EXISTS idx_candidates_process_id ON candidates(process_id);

-- Verificar que se creó
SELECT 
    'Índice creado' as status,
    indexname,
    tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'candidates'
  AND indexname = 'idx_candidates_process_id';

