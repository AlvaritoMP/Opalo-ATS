-- ÍNDICE CRÍTICO #1: Para procesos (el más importante)
-- Ejecutar SOLO este índice primero
-- Este es el índice más crítico para resolver los timeouts

CREATE INDEX IF NOT EXISTS idx_processes_created_at_desc ON processes(created_at DESC);

-- Verificar que se creó
SELECT 
    'Índice creado' as status,
    indexname,
    tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'processes'
  AND indexname = 'idx_processes_created_at_desc';

