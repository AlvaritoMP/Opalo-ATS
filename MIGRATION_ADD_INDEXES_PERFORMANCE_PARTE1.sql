-- PARTE 1: Índices para procesos y sus relaciones directas
-- Ejecutar esta parte primero, esperar a que termine, luego ejecutar PARTE 2

-- 1. Índice para ordenar procesos por created_at (mejora la consulta principal)
CREATE INDEX IF NOT EXISTS idx_processes_created_at_desc ON processes(created_at DESC);

-- 2. Índices para las relaciones de procesos
CREATE INDEX IF NOT EXISTS idx_stages_process_id ON stages(process_id);
CREATE INDEX IF NOT EXISTS idx_stages_order_index ON stages(process_id, order_index);

CREATE INDEX IF NOT EXISTS idx_document_categories_process_id ON document_categories(process_id);

CREATE INDEX IF NOT EXISTS idx_attachments_process_id ON attachments(process_id);
CREATE INDEX IF NOT EXISTS idx_attachments_process_no_candidate ON attachments(process_id, candidate_id) WHERE candidate_id IS NULL;

-- Verificar que se crearon correctamente
SELECT 
    'Parte 1 completada' as status,
    indexname,
    tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('processes', 'stages', 'document_categories', 'attachments')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

