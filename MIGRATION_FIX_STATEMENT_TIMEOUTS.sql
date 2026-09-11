-- ============================================
-- Índices para los timeouts 57014 / 522 de PostgREST
-- ============================================
-- Errores en logs:
--   GET /rest/v1/processes?is_bulk_process=eq.true  → statement timeout
--   GET /rest/v1/candidates?select=process_id,latest:created_at.max()
--   GET /rest/v1/bulk_process_activity_log?action_type=...
--
-- INSTRUCCIONES:
-- 1. Supabase → SQL Editor
-- 2. Ejecutar este script completo (fuera de horas pico si las tablas son grandes)
-- 3. Si un CREATE INDEX tarda mucho, ejecútalo solo (uno por uno)
-- ============================================

-- Listado de procesos masivos:
--   WHERE app_name = ? AND is_bulk_process = true ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_processes_app_bulk_created
ON public.processes (app_name, is_bulk_process, created_at DESC);

-- Agregación de avisos: MAX(created_at) GROUP BY process_id
CREATE INDEX IF NOT EXISTS idx_candidates_app_process_created
ON public.candidates (app_name, process_id, created_at DESC);

-- Log de actividad masiva filtrado por proceso + tipo de acción
CREATE INDEX IF NOT EXISTS idx_bulk_activity_process_app_action
ON public.bulk_process_activity_log (process_id, app_name, action_type);

ANALYZE public.processes;
ANALYZE public.candidates;
ANALYZE public.bulk_process_activity_log;

SELECT
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_processes_app_bulk_created',
    'idx_candidates_app_process_created',
    'idx_bulk_activity_process_app_action'
  )
ORDER BY tablename, indexname;
