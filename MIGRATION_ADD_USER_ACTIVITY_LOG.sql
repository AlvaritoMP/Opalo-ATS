-- ============================================
-- MIGRACIÓN: Auditoría de ingresos y actividad de usuarios
-- ============================================
-- INSTRUCCIONES:
-- 1. Supabase → SQL Editor
-- 2. Ejecutar este script completo
-- 3. NOTIFY recarga el schema de PostgREST
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_name TEXT,
    category TEXT NOT NULL,
    action TEXT NOT NULL,
    summary TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    app_name TEXT NOT NULL DEFAULT 'Opalo ATS'
);

COMMENT ON TABLE public.user_activity_log IS
'Auditoría de ingresos al ATS e interacciones categorizadas (solo consulta de admin en la UI).';

CREATE INDEX IF NOT EXISTS idx_user_activity_created
ON public.user_activity_log (app_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_created
ON public.user_activity_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_category
ON public.user_activity_log (app_name, category, created_at DESC);

ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'opalo_ensure_tenant_rls'
          AND pronamespace = 'public'::regnamespace
    ) THEN
        PERFORM public.opalo_ensure_tenant_rls(
            'user_activity_log',
            'opalo_ats',
            'app_name = ''Opalo ATS''',
            'app_name = ''Opalo ATS'''
        );
        PERFORM public.opalo_ensure_tenant_rls(
            'user_activity_log',
            'opalopy',
            'app_name IN (''Opalopy'', ''ATS Pro'')',
            'app_name IN (''Opalopy'', ''ATS Pro'')'
        );
    ELSE
        DROP POLICY IF EXISTS user_activity_log_anon_all ON public.user_activity_log;
        CREATE POLICY user_activity_log_anon_all ON public.user_activity_log
            FOR ALL TO anon, authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_activity_log TO anon, authenticated, service_role;

-- Backfill único (no repetir si el script se ejecuta otra vez)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.user_activity_log WHERE details->>'backfill' = 'true' LIMIT 1) THEN
        RAISE NOTICE 'Backfill de actividad ya aplicado — omitido';
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bulk_process_activity_log'
    ) THEN
        INSERT INTO public.user_activity_log (
            user_id, user_name, category, action, summary, details, created_at, app_name
        )
        SELECT
            b.user_id,
            b.user_name,
            CASE
                WHEN b.action_type IN ('contact_attempt', 'contact_status', 'contact_reset') THEN 'contact'
                WHEN b.action_type IN (
                    'stage_change', 'bulk_stage_change', 'bulk_discard', 'bulk_archive',
                    'bulk_approve', 'candidate_delete', 'candidate_transfer', 'add_row'
                ) THEN 'candidates'
                WHEN b.action_type = 'opsflow_send' THEN 'documents'
                WHEN b.action_type = 'config_change' THEN 'processes'
                ELSE 'bulk'
            END,
            b.action_type,
            CASE
                WHEN b.candidate_name IS NOT NULL AND b.candidate_name <> ''
                    THEN CONCAT(
                        CASE b.action_type
                            WHEN 'contact_attempt' THEN 'Registró un intento de contacto: '
                            WHEN 'contact_status' THEN 'Actualizó el estado de contacto: '
                            WHEN 'stage_change' THEN 'Cambió la etapa de un candidato: '
                            WHEN 'candidate_transfer' THEN 'Trasladó un candidato: '
                            WHEN 'add_row' THEN 'Añadió una fila: '
                            ELSE CONCAT('Acción en proceso masivo (', b.action_type, '): ')
                        END,
                        b.candidate_name
                    )
                ELSE CONCAT('Acción en proceso masivo: ', b.action_type)
            END,
            jsonb_build_object(
                'processId', b.process_id,
                'candidateName', b.candidate_name,
                'fieldName', b.field_name,
                'backfill', true
            ),
            b.created_at,
            COALESCE(b.app_name, 'Opalo ATS')
        FROM public.bulk_process_activity_log b;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_messages'
    ) THEN
        INSERT INTO public.user_activity_log (
            user_id, user_name, category, action, summary, details, created_at, app_name
        )
        SELECT
            m.sender_id,
            s.name,
            'messaging',
            'send_message',
            CASE WHEN r.name IS NOT NULL THEN CONCAT('Envió un mensaje a ', r.name) ELSE 'Envió un mensaje' END,
            jsonb_build_object('backfill', true),
            m.created_at,
            COALESCE(m.app_name, 'Opalo ATS')
        FROM public.user_messages m
        LEFT JOIN public.users s ON s.id = m.sender_id
        LEFT JOIN public.users r ON r.id = m.recipient_id;

        INSERT INTO public.user_activity_log (
            user_id, user_name, category, action, summary, details, created_at, app_name
        )
        SELECT
            m.recipient_id,
            r.name,
            'messaging',
            'read_message',
            CASE WHEN s.name IS NOT NULL THEN CONCAT('Leyó un mensaje de ', s.name) ELSE 'Leyó un mensaje' END,
            jsonb_build_object('backfill', true),
            m.read_at,
            COALESCE(m.app_name, 'Opalo ATS')
        FROM public.user_messages m
        LEFT JOIN public.users r ON r.id = m.recipient_id
        LEFT JOIN public.users s ON s.id = m.sender_id
        WHERE m.read_at IS NOT NULL;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_activity_log'
ORDER BY ordinal_position;
