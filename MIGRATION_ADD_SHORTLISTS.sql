-- ============================================
-- Shortlists: salas temporales para presentar candidatos a un cliente
-- ============================================
-- La sala no modifica etapa, historial ni estado del candidato en su proceso.
-- Supabase → SQL Editor → ejecutar este script.
-- ============================================

CREATE TABLE IF NOT EXISTS public.shortlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_name TEXT NOT NULL DEFAULT 'Opalo ATS',
    title TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_label TEXT,
    access_dni TEXT NOT NULL,
    token TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    show_documents BOOLEAN NOT NULL DEFAULT TRUE,
    show_assessments BOOLEAN NOT NULL DEFAULT TRUE,
    show_profile BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_by_name TEXT,
    closed_at TIMESTAMPTZ,
    closed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.shortlists IS
'Sala temporal de presentación a un cliente. El acceso público es el token del enlace más el DNI.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_shortlists_token ON public.shortlists (token);
CREATE INDEX IF NOT EXISTS idx_shortlists_app_status ON public.shortlists (app_name, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.shortlist_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_name TEXT NOT NULL DEFAULT 'Opalo ATS',
    shortlist_id UUID NOT NULL REFERENCES public.shortlists(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    source_process_id UUID,
    source_process_title TEXT,
    source_stage_id TEXT,
    source_stage_name TEXT,
    source_client_label TEXT,
    column_key TEXT NOT NULL DEFAULT 'presentacion' CHECK (column_key IN ('presentacion', 'entrevista', 'finalista')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rejected')),
    rejection_reason TEXT,
    rejected_at TIMESTAMPTZ,
    added_by UUID,
    added_by_name TEXT,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shortlist_id, candidate_id)
);

COMMENT ON TABLE public.shortlist_members IS
'Candidato presentado en una sala. Su columna y su rechazo viven aquí, no en el proceso de origen.';

CREATE INDEX IF NOT EXISTS idx_shortlist_members_shortlist ON public.shortlist_members (shortlist_id, status);

CREATE TABLE IF NOT EXISTS public.shortlist_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_name TEXT NOT NULL DEFAULT 'Opalo ATS',
    shortlist_id UUID NOT NULL REFERENCES public.shortlists(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.shortlist_members(id) ON DELETE SET NULL,
    candidate_id UUID,
    event_type TEXT NOT NULL CHECK (event_type IN ('added', 'comment', 'moved', 'rejected', 'removed', 'closed', 'reopened', 'access')),
    body TEXT,
    payload JSONB,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('staff', 'client')),
    actor_name TEXT,
    actor_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.shortlist_events IS
'Historial de la sala: comentarios, movimientos, rechazos y accesos del cliente.';

CREATE INDEX IF NOT EXISTS idx_shortlist_events_shortlist ON public.shortlist_events (shortlist_id, created_at DESC);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'opalo_ensure_tenant_rls'
          AND pronamespace = 'public'::regnamespace
    ) THEN
        PERFORM public.opalo_ensure_tenant_rls('shortlists', 'opalo_ats', 'app_name = ''Opalo ATS''', 'app_name = ''Opalo ATS''');
        PERFORM public.opalo_ensure_tenant_rls('shortlists', 'opalopy', 'app_name IN (''Opalopy'', ''ATS Pro'')', 'app_name IN (''Opalopy'', ''ATS Pro'')');
        PERFORM public.opalo_ensure_tenant_rls('shortlist_members', 'opalo_ats', 'app_name = ''Opalo ATS''', 'app_name = ''Opalo ATS''');
        PERFORM public.opalo_ensure_tenant_rls('shortlist_members', 'opalopy', 'app_name IN (''Opalopy'', ''ATS Pro'')', 'app_name IN (''Opalopy'', ''ATS Pro'')');
        PERFORM public.opalo_ensure_tenant_rls('shortlist_events', 'opalo_ats', 'app_name = ''Opalo ATS''', 'app_name = ''Opalo ATS''');
        PERFORM public.opalo_ensure_tenant_rls('shortlist_events', 'opalopy', 'app_name IN (''Opalopy'', ''ATS Pro'')', 'app_name IN (''Opalopy'', ''ATS Pro'')');
    ELSE
        ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.shortlist_members ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.shortlist_events ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS shortlists_anon_all ON public.shortlists;
        CREATE POLICY shortlists_anon_all ON public.shortlists FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
        DROP POLICY IF EXISTS shortlist_members_anon_all ON public.shortlist_members;
        CREATE POLICY shortlist_members_anon_all ON public.shortlist_members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
        DROP POLICY IF EXISTS shortlist_events_anon_all ON public.shortlist_events;
        CREATE POLICY shortlist_events_anon_all ON public.shortlist_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shortlists TO anon, authenticated, service_role;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shortlist_members TO anon, authenticated, service_role;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shortlist_events TO anon, authenticated, service_role;
    END IF;
END $$;

ALTER TABLE public.shortlists ADD COLUMN IF NOT EXISTS client_fields JSONB;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('shortlists', 'shortlist_members', 'shortlist_events')
ORDER BY table_name;
