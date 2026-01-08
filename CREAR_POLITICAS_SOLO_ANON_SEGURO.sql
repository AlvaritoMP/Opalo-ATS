-- Script SEGURO - NO elimina políticas existentes
-- Solo crea políticas nuevas para el rol anon si no existen
-- Ejecuta este script en Supabase SQL Editor

-- ============================================
-- 1. CREAR POLÍTICAS SOLO PARA ANON (sin eliminar existentes)
-- ============================================

-- USERS - Solo crear si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'anon_users_opalo_ats_select'
    ) THEN
        CREATE POLICY "anon_users_opalo_ats_select"
        ON public.users FOR SELECT
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'anon_users_opalo_ats_insert'
    ) THEN
        CREATE POLICY "anon_users_opalo_ats_insert"
        ON public.users FOR INSERT
        TO anon
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'anon_users_opalo_ats_update'
    ) THEN
        CREATE POLICY "anon_users_opalo_ats_update"
        ON public.users FOR UPDATE
        TO anon
        USING (app_name = 'Opalo ATS')
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'anon_users_opalo_ats_delete'
    ) THEN
        CREATE POLICY "anon_users_opalo_ats_delete"
        ON public.users FOR DELETE
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

-- PROCESSES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'processes' 
        AND policyname = 'anon_processes_opalo_ats_select'
    ) THEN
        CREATE POLICY "anon_processes_opalo_ats_select"
        ON public.processes FOR SELECT
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'processes' 
        AND policyname = 'anon_processes_opalo_ats_insert'
    ) THEN
        CREATE POLICY "anon_processes_opalo_ats_insert"
        ON public.processes FOR INSERT
        TO anon
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'processes' 
        AND policyname = 'anon_processes_opalo_ats_update'
    ) THEN
        CREATE POLICY "anon_processes_opalo_ats_update"
        ON public.processes FOR UPDATE
        TO anon
        USING (app_name = 'Opalo ATS')
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'processes' 
        AND policyname = 'anon_processes_opalo_ats_delete'
    ) THEN
        CREATE POLICY "anon_processes_opalo_ats_delete"
        ON public.processes FOR DELETE
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

-- CANDIDATES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'candidates' 
        AND policyname = 'anon_candidates_opalo_ats_select'
    ) THEN
        CREATE POLICY "anon_candidates_opalo_ats_select"
        ON public.candidates FOR SELECT
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'candidates' 
        AND policyname = 'anon_candidates_opalo_ats_insert'
    ) THEN
        CREATE POLICY "anon_candidates_opalo_ats_insert"
        ON public.candidates FOR INSERT
        TO anon
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'candidates' 
        AND policyname = 'anon_candidates_opalo_ats_update'
    ) THEN
        CREATE POLICY "anon_candidates_opalo_ats_update"
        ON public.candidates FOR UPDATE
        TO anon
        USING (app_name = 'Opalo ATS')
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'candidates' 
        AND policyname = 'anon_candidates_opalo_ats_delete'
    ) THEN
        CREATE POLICY "anon_candidates_opalo_ats_delete"
        ON public.candidates FOR DELETE
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

-- STAGES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'stages' 
        AND policyname = 'anon_stages_opalo_ats_select'
    ) THEN
        CREATE POLICY "anon_stages_opalo_ats_select"
        ON public.stages FOR SELECT
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'stages' 
        AND policyname = 'anon_stages_opalo_ats_insert'
    ) THEN
        CREATE POLICY "anon_stages_opalo_ats_insert"
        ON public.stages FOR INSERT
        TO anon
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'stages' 
        AND policyname = 'anon_stages_opalo_ats_update'
    ) THEN
        CREATE POLICY "anon_stages_opalo_ats_update"
        ON public.stages FOR UPDATE
        TO anon
        USING (app_name = 'Opalo ATS')
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'stages' 
        AND policyname = 'anon_stages_opalo_ats_delete'
    ) THEN
        CREATE POLICY "anon_stages_opalo_ats_delete"
        ON public.stages FOR DELETE
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

-- DOCUMENT_CATEGORIES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'document_categories' 
        AND policyname = 'anon_document_categories_opalo_ats_select'
    ) THEN
        CREATE POLICY "anon_document_categories_opalo_ats_select"
        ON public.document_categories FOR SELECT
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'document_categories' 
        AND policyname = 'anon_document_categories_opalo_ats_insert'
    ) THEN
        CREATE POLICY "anon_document_categories_opalo_ats_insert"
        ON public.document_categories FOR INSERT
        TO anon
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'document_categories' 
        AND policyname = 'anon_document_categories_opalo_ats_update'
    ) THEN
        CREATE POLICY "anon_document_categories_opalo_ats_update"
        ON public.document_categories FOR UPDATE
        TO anon
        USING (app_name = 'Opalo ATS')
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'document_categories' 
        AND policyname = 'anon_document_categories_opalo_ats_delete'
    ) THEN
        CREATE POLICY "anon_document_categories_opalo_ats_delete"
        ON public.document_categories FOR DELETE
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

-- ATTACHMENTS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'attachments' 
        AND policyname = 'anon_attachments_opalo_ats_select'
    ) THEN
        CREATE POLICY "anon_attachments_opalo_ats_select"
        ON public.attachments FOR SELECT
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'attachments' 
        AND policyname = 'anon_attachments_opalo_ats_insert'
    ) THEN
        CREATE POLICY "anon_attachments_opalo_ats_insert"
        ON public.attachments FOR INSERT
        TO anon
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'attachments' 
        AND policyname = 'anon_attachments_opalo_ats_update'
    ) THEN
        CREATE POLICY "anon_attachments_opalo_ats_update"
        ON public.attachments FOR UPDATE
        TO anon
        USING (app_name = 'Opalo ATS')
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'attachments' 
        AND policyname = 'anon_attachments_opalo_ats_delete'
    ) THEN
        CREATE POLICY "anon_attachments_opalo_ats_delete"
        ON public.attachments FOR DELETE
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

-- CANDIDATE_HISTORY
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'candidate_history' 
        AND policyname = 'anon_candidate_history_opalo_ats_select'
    ) THEN
        CREATE POLICY "anon_candidate_history_opalo_ats_select"
        ON public.candidate_history FOR SELECT
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'candidate_history' 
        AND policyname = 'anon_candidate_history_opalo_ats_insert'
    ) THEN
        CREATE POLICY "anon_candidate_history_opalo_ats_insert"
        ON public.candidate_history FOR INSERT
        TO anon
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

-- POST_ITS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'post_its' 
        AND policyname = 'anon_post_its_opalo_ats_select'
    ) THEN
        CREATE POLICY "anon_post_its_opalo_ats_select"
        ON public.post_its FOR SELECT
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'post_its' 
        AND policyname = 'anon_post_its_opalo_ats_insert'
    ) THEN
        CREATE POLICY "anon_post_its_opalo_ats_insert"
        ON public.post_its FOR INSERT
        TO anon
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'post_its' 
        AND policyname = 'anon_post_its_opalo_ats_delete'
    ) THEN
        CREATE POLICY "anon_post_its_opalo_ats_delete"
        ON public.post_its FOR DELETE
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

-- COMMENTS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'comments' 
        AND policyname = 'anon_comments_opalo_ats_select'
    ) THEN
        CREATE POLICY "anon_comments_opalo_ats_select"
        ON public.comments FOR SELECT
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'comments' 
        AND policyname = 'anon_comments_opalo_ats_insert'
    ) THEN
        CREATE POLICY "anon_comments_opalo_ats_insert"
        ON public.comments FOR INSERT
        TO anon
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'comments' 
        AND policyname = 'anon_comments_opalo_ats_delete'
    ) THEN
        CREATE POLICY "anon_comments_opalo_ats_delete"
        ON public.comments FOR DELETE
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

-- INTERVIEW_EVENTS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'interview_events' 
        AND policyname = 'anon_interview_events_opalo_ats_select'
    ) THEN
        CREATE POLICY "anon_interview_events_opalo_ats_select"
        ON public.interview_events FOR SELECT
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'interview_events' 
        AND policyname = 'anon_interview_events_opalo_ats_insert'
    ) THEN
        CREATE POLICY "anon_interview_events_opalo_ats_insert"
        ON public.interview_events FOR INSERT
        TO anon
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'interview_events' 
        AND policyname = 'anon_interview_events_opalo_ats_update'
    ) THEN
        CREATE POLICY "anon_interview_events_opalo_ats_update"
        ON public.interview_events FOR UPDATE
        TO anon
        USING (app_name = 'Opalo ATS')
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'interview_events' 
        AND policyname = 'anon_interview_events_opalo_ats_delete'
    ) THEN
        CREATE POLICY "anon_interview_events_opalo_ats_delete"
        ON public.interview_events FOR DELETE
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

-- FORM_INTEGRATIONS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'form_integrations' 
        AND policyname = 'anon_form_integrations_opalo_ats_select'
    ) THEN
        CREATE POLICY "anon_form_integrations_opalo_ats_select"
        ON public.form_integrations FOR SELECT
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'form_integrations' 
        AND policyname = 'anon_form_integrations_opalo_ats_insert'
    ) THEN
        CREATE POLICY "anon_form_integrations_opalo_ats_insert"
        ON public.form_integrations FOR INSERT
        TO anon
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'form_integrations' 
        AND policyname = 'anon_form_integrations_opalo_ats_update'
    ) THEN
        CREATE POLICY "anon_form_integrations_opalo_ats_update"
        ON public.form_integrations FOR UPDATE
        TO anon
        USING (app_name = 'Opalo ATS')
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'form_integrations' 
        AND policyname = 'anon_form_integrations_opalo_ats_delete'
    ) THEN
        CREATE POLICY "anon_form_integrations_opalo_ats_delete"
        ON public.form_integrations FOR DELETE
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

-- APP_SETTINGS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'app_settings' 
        AND policyname = 'anon_app_settings_opalo_ats_select'
    ) THEN
        CREATE POLICY "anon_app_settings_opalo_ats_select"
        ON public.app_settings FOR SELECT
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'app_settings' 
        AND policyname = 'anon_app_settings_opalo_ats_insert'
    ) THEN
        CREATE POLICY "anon_app_settings_opalo_ats_insert"
        ON public.app_settings FOR INSERT
        TO anon
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'app_settings' 
        AND policyname = 'anon_app_settings_opalo_ats_update'
    ) THEN
        CREATE POLICY "anon_app_settings_opalo_ats_update"
        ON public.app_settings FOR UPDATE
        TO anon
        USING (app_name = 'Opalo ATS')
        WITH CHECK (app_name = 'Opalo ATS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'app_settings' 
        AND policyname = 'anon_app_settings_opalo_ats_delete'
    ) THEN
        CREATE POLICY "anon_app_settings_opalo_ats_delete"
        ON public.app_settings FOR DELETE
        TO anon
        USING (app_name = 'Opalo ATS');
    END IF;
END $$;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar políticas creadas
SELECT 
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'processes', 'candidates', 'app_settings')
AND policyname LIKE '%anon%opalo%ats%'
ORDER BY tablename, cmd;

