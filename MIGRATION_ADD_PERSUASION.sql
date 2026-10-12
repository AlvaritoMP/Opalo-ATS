-- Lienzo de persuasión para procesos masivos.
-- Guion y argumentos de WhatsApp: uno por proceso, compartido entre consultores.
-- Avance de la llamada: uno por candidato.
-- Ejecutar en el SQL Editor de Supabase del proyecto de producción.

CREATE TABLE IF NOT EXISTS public.persuasion_scripts (
    process_id UUID PRIMARY KEY,
    app_name TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.persuasion_scripts IS
'Guion semiestructurado y argumentos de WhatsApp del lienzo, por proceso masivo.';

COMMENT ON COLUMN public.persuasion_scripts.payload IS
'JSON: version, nodes, whatsappArguments.';

CREATE INDEX IF NOT EXISTS idx_persuasion_scripts_app
ON public.persuasion_scripts (app_name, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.persuasion_boards (
    candidate_id UUID PRIMARY KEY,
    process_id UUID NOT NULL,
    app_name TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.persuasion_boards IS
'Avance del lienzo de persuasión de un candidato: respuestas, notas, capturas y temperatura.';

CREATE INDEX IF NOT EXISTS idx_persuasion_boards_process
ON public.persuasion_boards (app_name, process_id, updated_at DESC);

ALTER TABLE public.persuasion_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persuasion_boards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS persuasion_scripts_select ON public.persuasion_scripts;
DROP POLICY IF EXISTS persuasion_scripts_insert ON public.persuasion_scripts;
DROP POLICY IF EXISTS persuasion_scripts_update ON public.persuasion_scripts;
DROP POLICY IF EXISTS persuasion_scripts_delete ON public.persuasion_scripts;
DROP POLICY IF EXISTS persuasion_boards_select ON public.persuasion_boards;
DROP POLICY IF EXISTS persuasion_boards_insert ON public.persuasion_boards;
DROP POLICY IF EXISTS persuasion_boards_update ON public.persuasion_boards;
DROP POLICY IF EXISTS persuasion_boards_delete ON public.persuasion_boards;

CREATE POLICY persuasion_scripts_select
ON public.persuasion_scripts AS PERMISSIVE FOR SELECT TO public
USING (app_name IN ('Opalo ATS', 'Opalopy', 'ATS Pro'));

CREATE POLICY persuasion_scripts_insert
ON public.persuasion_scripts AS PERMISSIVE FOR INSERT TO public
WITH CHECK (app_name IN ('Opalo ATS', 'Opalopy', 'ATS Pro'));

CREATE POLICY persuasion_scripts_update
ON public.persuasion_scripts AS PERMISSIVE FOR UPDATE TO public
USING (app_name IN ('Opalo ATS', 'Opalopy', 'ATS Pro'))
WITH CHECK (app_name IN ('Opalo ATS', 'Opalopy', 'ATS Pro'));

CREATE POLICY persuasion_scripts_delete
ON public.persuasion_scripts AS PERMISSIVE FOR DELETE TO public
USING (app_name IN ('Opalo ATS', 'Opalopy', 'ATS Pro'));

CREATE POLICY persuasion_boards_select
ON public.persuasion_boards AS PERMISSIVE FOR SELECT TO public
USING (app_name IN ('Opalo ATS', 'Opalopy', 'ATS Pro'));

CREATE POLICY persuasion_boards_insert
ON public.persuasion_boards AS PERMISSIVE FOR INSERT TO public
WITH CHECK (app_name IN ('Opalo ATS', 'Opalopy', 'ATS Pro'));

CREATE POLICY persuasion_boards_update
ON public.persuasion_boards AS PERMISSIVE FOR UPDATE TO public
USING (app_name IN ('Opalo ATS', 'Opalopy', 'ATS Pro'))
WITH CHECK (app_name IN ('Opalo ATS', 'Opalopy', 'ATS Pro'));

CREATE POLICY persuasion_boards_delete
ON public.persuasion_boards AS PERMISSIVE FOR DELETE TO public
USING (app_name IN ('Opalo ATS', 'Opalopy', 'ATS Pro'));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.persuasion_scripts TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.persuasion_boards TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
