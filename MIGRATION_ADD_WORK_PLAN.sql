-- ============================================
-- Planeamiento de equipo (cuadro referencial)
-- ============================================
-- Asignaciones visuales de consultores a procesos por rango de fecha/hora.
-- No tiene llaves foráneas: no bloquea ni modifica procesos, candidatos,
-- entrevistas ni ninguna otra tabla del ATS.
--
-- INSTRUCCIONES:
-- 1. Supabase → SQL Editor
-- 2. Ejecutar este script completo
-- ============================================

CREATE TABLE IF NOT EXISTS public.work_plan_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_name TEXT NOT NULL,
    process_id TEXT,
    process_title TEXT NOT NULL,
    user_ids TEXT[] NOT NULL DEFAULT '{}',
    user_names TEXT[] NOT NULL DEFAULT '{}',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN NOT NULL DEFAULT TRUE,
    note TEXT,
    created_by TEXT,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT work_plan_assignments_range CHECK (ends_at >= starts_at)
);

COMMENT ON TABLE public.work_plan_assignments IS
'Planeamiento referencial del equipo. No altera procesos ni candidatos.';

CREATE INDEX IF NOT EXISTS idx_work_plan_assignments_app_range
    ON public.work_plan_assignments (app_name, starts_at, ends_at);

ALTER TABLE public.work_plan_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_plan_assignments_public_select_opalo_ats" ON public.work_plan_assignments;
DROP POLICY IF EXISTS "work_plan_assignments_public_insert_opalo_ats" ON public.work_plan_assignments;
DROP POLICY IF EXISTS "work_plan_assignments_public_update_opalo_ats" ON public.work_plan_assignments;
DROP POLICY IF EXISTS "work_plan_assignments_public_delete_opalo_ats" ON public.work_plan_assignments;
DROP POLICY IF EXISTS "work_plan_assignments_public_select_opalopy" ON public.work_plan_assignments;
DROP POLICY IF EXISTS "work_plan_assignments_public_insert_opalopy" ON public.work_plan_assignments;
DROP POLICY IF EXISTS "work_plan_assignments_public_update_opalopy" ON public.work_plan_assignments;
DROP POLICY IF EXISTS "work_plan_assignments_public_delete_opalopy" ON public.work_plan_assignments;

CREATE POLICY "work_plan_assignments_public_select_opalo_ats"
ON public.work_plan_assignments AS PERMISSIVE FOR SELECT TO public
USING (app_name = 'Opalo ATS');

CREATE POLICY "work_plan_assignments_public_insert_opalo_ats"
ON public.work_plan_assignments AS PERMISSIVE FOR INSERT TO public
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "work_plan_assignments_public_update_opalo_ats"
ON public.work_plan_assignments AS PERMISSIVE FOR UPDATE TO public
USING (app_name = 'Opalo ATS') WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "work_plan_assignments_public_delete_opalo_ats"
ON public.work_plan_assignments AS PERMISSIVE FOR DELETE TO public
USING (app_name = 'Opalo ATS');

CREATE POLICY "work_plan_assignments_public_select_opalopy"
ON public.work_plan_assignments AS PERMISSIVE FOR SELECT TO public
USING (app_name IN ('Opalopy', 'ATS Pro'));

CREATE POLICY "work_plan_assignments_public_insert_opalopy"
ON public.work_plan_assignments AS PERMISSIVE FOR INSERT TO public
WITH CHECK (app_name IN ('Opalopy', 'ATS Pro'));

CREATE POLICY "work_plan_assignments_public_update_opalopy"
ON public.work_plan_assignments AS PERMISSIVE FOR UPDATE TO public
USING (app_name IN ('Opalopy', 'ATS Pro')) WITH CHECK (app_name IN ('Opalopy', 'ATS Pro'));

CREATE POLICY "work_plan_assignments_public_delete_opalopy"
ON public.work_plan_assignments AS PERMISSIVE FOR DELETE TO public
USING (app_name IN ('Opalopy', 'ATS Pro'));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.work_plan_assignments TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
