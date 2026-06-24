-- Índices para acelerar listado de candidatos por app (arranque Opalo ATS)
CREATE INDEX IF NOT EXISTS idx_candidates_app_archived_created
ON public.candidates (app_name, archived, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_candidates_app_process
ON public.candidates (app_name, process_id);

CREATE INDEX IF NOT EXISTS idx_candidates_app_process_archived
ON public.candidates (app_name, process_id, archived);
