-- ============================================
-- RLS para bulk_process_activity_log (si ya creaste la tabla)
-- Ejecutar solo si el historial no carga o no guarda registros
-- ============================================

ALTER TABLE bulk_process_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_bulk_activity_opalo_ats_select" ON public.bulk_process_activity_log;
DROP POLICY IF EXISTS "anon_bulk_activity_opalo_ats_insert" ON public.bulk_process_activity_log;

CREATE POLICY "anon_bulk_activity_opalo_ats_select"
ON public.bulk_process_activity_log FOR SELECT
TO anon
USING (app_name = 'Opalo ATS');

CREATE POLICY "anon_bulk_activity_opalo_ats_insert"
ON public.bulk_process_activity_log FOR INSERT
TO anon
WITH CHECK (app_name = 'Opalo ATS');

GRANT SELECT, INSERT ON public.bulk_process_activity_log TO anon;
