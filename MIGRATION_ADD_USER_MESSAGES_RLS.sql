-- ============================================
-- RLS + Realtime para user_messages (si la tabla ya existe)
-- ============================================
-- Ejecutar si ya creaste user_messages pero los mensajes no llegan
-- a otros usuarios (falta RLS o Realtime).
-- ============================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'opalo_ensure_tenant_rls'
          AND pronamespace = 'public'::regnamespace
    ) THEN
        PERFORM public.opalo_ensure_tenant_rls(
            'user_messages',
            'opalo_ats',
            'app_name = ''Opalo ATS''',
            'app_name = ''Opalo ATS'''
        );
        PERFORM public.opalo_ensure_tenant_rls(
            'user_messages',
            'opalopy',
            'app_name IN (''Opalopy'', ''ATS Pro'')',
            'app_name IN (''Opalopy'', ''ATS Pro'')'
        );
    ELSE
        ALTER TABLE user_messages ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS user_messages_anon_all ON user_messages;
        CREATE POLICY user_messages_anon_all ON user_messages
            FOR ALL TO anon, authenticated
            USING (true)
            WITH CHECK (true);

        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_messages TO anon, authenticated, service_role;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'user_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_messages;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
