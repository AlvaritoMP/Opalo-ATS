-- ============================================
-- MIGRACIÓN: Registro de actividad en procesos masivos
-- ============================================
-- Guarda quién modificó qué en cada proceso masivo (celdas, etapas, config, etc.)
--
-- INSTRUCCIONES:
-- 1. Supabase → SQL Editor
-- 2. Ejecutar este script completo
-- ============================================

CREATE TABLE IF NOT EXISTS bulk_process_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
    candidate_name TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name TEXT,
    action_type TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    app_name TEXT NOT NULL DEFAULT 'Opalo ATS'
);

COMMENT ON TABLE bulk_process_activity_log IS
'Auditoría de cambios en procesos masivos: ediciones de celdas, etapas, importaciones, configuración.';

CREATE INDEX IF NOT EXISTS idx_bulk_activity_process_created
ON bulk_process_activity_log (process_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bulk_activity_app_name
ON bulk_process_activity_log (app_name);

CREATE INDEX IF NOT EXISTS idx_bulk_activity_user
ON bulk_process_activity_log (user_id);

-- RLS: mismo patrón que candidate_history (solo Opalo ATS)
ALTER TABLE bulk_process_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_bulk_activity_opalo_ats_select"
ON public.bulk_process_activity_log FOR SELECT
TO anon
USING (app_name = 'Opalo ATS');

CREATE POLICY "anon_bulk_activity_opalo_ats_insert"
ON public.bulk_process_activity_log FOR INSERT
TO anon
WITH CHECK (app_name = 'Opalo ATS');

GRANT SELECT, INSERT ON public.bulk_process_activity_log TO anon;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bulk_process_activity_log'
ORDER BY ordinal_position;
