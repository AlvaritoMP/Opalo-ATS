-- =============================================================================
-- PLANTILLA: RLS para tabla NUEVA en BD compartida
-- =============================================================================
-- Reemplazar __TABLA__. Incluir app_name NOT NULL sin DEFAULT (cada app lo envía).
-- Ejecutar DESPUÉS de crear la tabla. Añadir __TABLA__ a RLS_MULTIAPP_DEFINITIVO.sql
-- =============================================================================

ALTER TABLE public.__TABLA__ ENABLE ROW LEVEL SECURITY;

-- Opalo ATS
CREATE POLICY "__TABLA___public_select_opalo_ats"
ON public.__TABLA__ AS PERMISSIVE FOR SELECT TO public
USING (app_name = 'Opalo ATS');

CREATE POLICY "__TABLA___public_insert_opalo_ats"
ON public.__TABLA__ AS PERMISSIVE FOR INSERT TO public
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "__TABLA___public_update_opalo_ats"
ON public.__TABLA__ AS PERMISSIVE FOR UPDATE TO public
USING (app_name = 'Opalo ATS') WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "__TABLA___public_delete_opalo_ats"
ON public.__TABLA__ AS PERMISSIVE FOR DELETE TO public
USING (app_name = 'Opalo ATS');

-- Opalopy (+ ATS Pro)
CREATE POLICY "__TABLA___public_select_opalopy"
ON public.__TABLA__ AS PERMISSIVE FOR SELECT TO public
USING (app_name IN ('Opalopy', 'ATS Pro'));

CREATE POLICY "__TABLA___public_insert_opalopy"
ON public.__TABLA__ AS PERMISSIVE FOR INSERT TO public
WITH CHECK (app_name IN ('Opalopy', 'ATS Pro'));

CREATE POLICY "__TABLA___public_update_opalopy"
ON public.__TABLA__ AS PERMISSIVE FOR UPDATE TO public
USING (app_name IN ('Opalopy', 'ATS Pro')) WITH CHECK (app_name IN ('Opalopy', 'ATS Pro'));

CREATE POLICY "__TABLA___public_delete_opalopy"
ON public.__TABLA__ AS PERMISSIVE FOR DELETE TO public
USING (app_name IN ('Opalopy', 'ATS Pro'));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.__TABLA__ TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
