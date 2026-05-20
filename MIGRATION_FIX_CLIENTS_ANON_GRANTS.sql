-- =============================================================================
-- Fix: crear/editar clientes (tabla `clients`) fallaba desde la app (401/permiso).
-- Causa habitual: RLS existe pero el rol `anon` no tiene GRANT sobre la tabla.
-- Además: si hay sesión JWT, el rol es `authenticated`; hay que políticas + GRANT.
-- Ejecutar en Supabase → SQL Editor (una vez por proyecto).
-- =============================================================================

-- 1) Privilegios de tabla (imprescindibles; RLS filtra filas, GRANT permite usar la tabla)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;

-- 2) Políticas para rol `authenticated` (mismo criterio app_name que `anon`)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'clients'
          AND policyname = 'authenticated_clients_read_opalo_ats'
    ) THEN
        CREATE POLICY "authenticated_clients_read_opalo_ats"
        ON public.clients FOR SELECT
        TO authenticated
        USING (app_name = 'Opalo ATS');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'clients'
          AND policyname = 'authenticated_clients_insert_opalo_ats'
    ) THEN
        CREATE POLICY "authenticated_clients_insert_opalo_ats"
        ON public.clients FOR INSERT
        TO authenticated
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'clients'
          AND policyname = 'authenticated_clients_update_opalo_ats'
    ) THEN
        CREATE POLICY "authenticated_clients_update_opalo_ats"
        ON public.clients FOR UPDATE
        TO authenticated
        USING (app_name = 'Opalo ATS')
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'clients'
          AND policyname = 'authenticated_clients_delete_opalo_ats'
    ) THEN
        CREATE POLICY "authenticated_clients_delete_opalo_ats"
        ON public.clients FOR DELETE
        TO authenticated
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;
