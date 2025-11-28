-- ÍNDICE CRÍTICO #2: Para stages (segundo más importante)
-- Ejecutar DESPUÉS de que el índice #1 termine exitosamente
-- Espera al menos 10 segundos entre índices

CREATE INDEX IF NOT EXISTS idx_stages_process_id ON stages(process_id);

-- Verificar que se creó
SELECT 
    'Índice creado' as status,
    indexname,
    tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'stages'
  AND indexname = 'idx_stages_process_id';

