-- Crear políticas más permisivas que permitan acceso al rol anon
-- Ejecuta este script en Supabase SQL Editor

-- ============================================
-- 1. ELIMINAR POLÍTICAS EXISTENTES DE OPALO ATS (solo las de Opalo ATS)
-- ============================================

DROP POLICY IF EXISTS "Users can read Opalo ATS data" ON public.users;
DROP POLICY IF EXISTS "Users can insert Opalo ATS data" ON public.users;
DROP POLICY IF EXISTS "Users can update Opalo ATS data" ON public.users;
DROP POLICY IF EXISTS "Users can delete Opalo ATS data" ON public.users;

DROP POLICY IF EXISTS "Processes can read Opalo ATS data" ON public.processes;
DROP POLICY IF EXISTS "Processes can insert Opalo ATS data" ON public.processes;
DROP POLICY IF EXISTS "Processes can update Opalo ATS data" ON public.processes;
DROP POLICY IF EXISTS "Processes can delete Opalo ATS data" ON public.processes;

DROP POLICY IF EXISTS "Candidates can read Opalo ATS data" ON public.candidates;
DROP POLICY IF EXISTS "Candidates can insert Opalo ATS data" ON public.candidates;
DROP POLICY IF EXISTS "Candidates can update Opalo ATS data" ON public.candidates;
DROP POLICY IF EXISTS "Candidates can delete Opalo ATS data" ON public.candidates;

DROP POLICY IF EXISTS "Stages can read Opalo ATS data" ON public.stages;
DROP POLICY IF EXISTS "Stages can insert Opalo ATS data" ON public.stages;
DROP POLICY IF EXISTS "Stages can update Opalo ATS data" ON public.stages;
DROP POLICY IF EXISTS "Stages can delete Opalo ATS data" ON public.stages;

DROP POLICY IF EXISTS "Document categories can read Opalo ATS data" ON public.document_categories;
DROP POLICY IF EXISTS "Document categories can insert Opalo ATS data" ON public.document_categories;
DROP POLICY IF EXISTS "Document categories can update Opalo ATS data" ON public.document_categories;
DROP POLICY IF EXISTS "Document categories can delete Opalo ATS data" ON public.document_categories;

DROP POLICY IF EXISTS "Attachments can read Opalo ATS data" ON public.attachments;
DROP POLICY IF EXISTS "Attachments can insert Opalo ATS data" ON public.attachments;
DROP POLICY IF EXISTS "Attachments can update Opalo ATS data" ON public.attachments;
DROP POLICY IF EXISTS "Attachments can delete Opalo ATS data" ON public.attachments;

DROP POLICY IF EXISTS "Candidate history can read Opalo ATS data" ON public.candidate_history;
DROP POLICY IF EXISTS "Candidate history can insert Opalo ATS data" ON public.candidate_history;

DROP POLICY IF EXISTS "Post its can read Opalo ATS data" ON public.post_its;
DROP POLICY IF EXISTS "Post its can insert Opalo ATS data" ON public.post_its;
DROP POLICY IF EXISTS "Post its can delete Opalo ATS data" ON public.post_its;

DROP POLICY IF EXISTS "Comments can read Opalo ATS data" ON public.comments;
DROP POLICY IF EXISTS "Comments can insert Opalo ATS data" ON public.comments;
DROP POLICY IF EXISTS "Comments can delete Opalo ATS data" ON public.comments;

DROP POLICY IF EXISTS "Interview events can read Opalo ATS data" ON public.interview_events;
DROP POLICY IF EXISTS "Interview events can insert Opalo ATS data" ON public.interview_events;
DROP POLICY IF EXISTS "Interview events can update Opalo ATS data" ON public.interview_events;
DROP POLICY IF EXISTS "Interview events can delete Opalo ATS data" ON public.interview_events;

DROP POLICY IF EXISTS "Form integrations can read Opalo ATS data" ON public.form_integrations;
DROP POLICY IF EXISTS "Form integrations can insert Opalo ATS data" ON public.form_integrations;
DROP POLICY IF EXISTS "Form integrations can update Opalo ATS data" ON public.form_integrations;
DROP POLICY IF EXISTS "Form integrations can delete Opalo ATS data" ON public.form_integrations;

DROP POLICY IF EXISTS "App settings can read Opalo ATS data" ON public.app_settings;
DROP POLICY IF EXISTS "App settings can insert Opalo ATS data" ON public.app_settings;
DROP POLICY IF EXISTS "App settings can update Opalo ATS data" ON public.app_settings;
DROP POLICY IF EXISTS "App settings can delete Opalo ATS data" ON public.app_settings;

-- ============================================
-- 2. CREAR POLÍTICAS PERMISIVAS PARA ROL ANON
-- ============================================

-- USERS - Políticas permisivas para anon
CREATE POLICY "anon_users_opalo_ats_select"
ON public.users FOR SELECT
TO anon
USING (app_name = 'Opalo ATS');

CREATE POLICY "anon_users_opalo_ats_insert"
ON public.users FOR INSERT
TO anon
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_users_opalo_ats_update"
ON public.users FOR UPDATE
TO anon
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_users_opalo_ats_delete"
ON public.users FOR DELETE
TO anon
USING (app_name = 'Opalo ATS');

-- PROCESSES
CREATE POLICY "anon_processes_opalo_ats_select"
ON public.processes FOR SELECT
TO anon
USING (app_name = 'Opalo ATS');

CREATE POLICY "anon_processes_opalo_ats_insert"
ON public.processes FOR INSERT
TO anon
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_processes_opalo_ats_update"
ON public.processes FOR UPDATE
TO anon
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_processes_opalo_ats_delete"
ON public.processes FOR DELETE
TO anon
USING (app_name = 'Opalo ATS');

-- CANDIDATES
CREATE POLICY "anon_candidates_opalo_ats_select"
ON public.candidates FOR SELECT
TO anon
USING (app_name = 'Opalo ATS');

CREATE POLICY "anon_candidates_opalo_ats_insert"
ON public.candidates FOR INSERT
TO anon
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_candidates_opalo_ats_update"
ON public.candidates FOR UPDATE
TO anon
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_candidates_opalo_ats_delete"
ON public.candidates FOR DELETE
TO anon
USING (app_name = 'Opalo ATS');

-- STAGES
CREATE POLICY "anon_stages_opalo_ats_select"
ON public.stages FOR SELECT
TO anon
USING (app_name = 'Opalo ATS');

CREATE POLICY "anon_stages_opalo_ats_insert"
ON public.stages FOR INSERT
TO anon
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_stages_opalo_ats_update"
ON public.stages FOR UPDATE
TO anon
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_stages_opalo_ats_delete"
ON public.stages FOR DELETE
TO anon
USING (app_name = 'Opalo ATS');

-- DOCUMENT_CATEGORIES
CREATE POLICY "anon_document_categories_opalo_ats_select"
ON public.document_categories FOR SELECT
TO anon
USING (app_name = 'Opalo ATS');

CREATE POLICY "anon_document_categories_opalo_ats_insert"
ON public.document_categories FOR INSERT
TO anon
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_document_categories_opalo_ats_update"
ON public.document_categories FOR UPDATE
TO anon
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_document_categories_opalo_ats_delete"
ON public.document_categories FOR DELETE
TO anon
USING (app_name = 'Opalo ATS');

-- ATTACHMENTS
CREATE POLICY "anon_attachments_opalo_ats_select"
ON public.attachments FOR SELECT
TO anon
USING (app_name = 'Opalo ATS');

CREATE POLICY "anon_attachments_opalo_ats_insert"
ON public.attachments FOR INSERT
TO anon
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_attachments_opalo_ats_update"
ON public.attachments FOR UPDATE
TO anon
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_attachments_opalo_ats_delete"
ON public.attachments FOR DELETE
TO anon
USING (app_name = 'Opalo ATS');

-- CANDIDATE_HISTORY
CREATE POLICY "anon_candidate_history_opalo_ats_select"
ON public.candidate_history FOR SELECT
TO anon
USING (app_name = 'Opalo ATS');

CREATE POLICY "anon_candidate_history_opalo_ats_insert"
ON public.candidate_history FOR INSERT
TO anon
WITH CHECK (app_name = 'Opalo ATS');

-- POST_ITS
CREATE POLICY "anon_post_its_opalo_ats_select"
ON public.post_its FOR SELECT
TO anon
USING (app_name = 'Opalo ATS');

CREATE POLICY "anon_post_its_opalo_ats_insert"
ON public.post_its FOR INSERT
TO anon
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_post_its_opalo_ats_delete"
ON public.post_its FOR DELETE
TO anon
USING (app_name = 'Opalo ATS');

-- COMMENTS
CREATE POLICY "anon_comments_opalo_ats_select"
ON public.comments FOR SELECT
TO anon
USING (app_name = 'Opalo ATS');

CREATE POLICY "anon_comments_opalo_ats_insert"
ON public.comments FOR INSERT
TO anon
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_comments_opalo_ats_delete"
ON public.comments FOR DELETE
TO anon
USING (app_name = 'Opalo ATS');

-- INTERVIEW_EVENTS
CREATE POLICY "anon_interview_events_opalo_ats_select"
ON public.interview_events FOR SELECT
TO anon
USING (app_name = 'Opalo ATS');

CREATE POLICY "anon_interview_events_opalo_ats_insert"
ON public.interview_events FOR INSERT
TO anon
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_interview_events_opalo_ats_update"
ON public.interview_events FOR UPDATE
TO anon
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_interview_events_opalo_ats_delete"
ON public.interview_events FOR DELETE
TO anon
USING (app_name = 'Opalo ATS');

-- FORM_INTEGRATIONS
CREATE POLICY "anon_form_integrations_opalo_ats_select"
ON public.form_integrations FOR SELECT
TO anon
USING (app_name = 'Opalo ATS');

CREATE POLICY "anon_form_integrations_opalo_ats_insert"
ON public.form_integrations FOR INSERT
TO anon
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_form_integrations_opalo_ats_update"
ON public.form_integrations FOR UPDATE
TO anon
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_form_integrations_opalo_ats_delete"
ON public.form_integrations FOR DELETE
TO anon
USING (app_name = 'Opalo ATS');

-- APP_SETTINGS
CREATE POLICY "anon_app_settings_opalo_ats_select"
ON public.app_settings FOR SELECT
TO anon
USING (app_name = 'Opalo ATS');

CREATE POLICY "anon_app_settings_opalo_ats_insert"
ON public.app_settings FOR INSERT
TO anon
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_app_settings_opalo_ats_update"
ON public.app_settings FOR UPDATE
TO anon
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "anon_app_settings_opalo_ats_delete"
ON public.app_settings FOR DELETE
TO anon
USING (app_name = 'Opalo ATS');

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
AND tablename IN ('users', 'processes', 'candidates')
AND policyname LIKE '%anon%opalo%ats%'
ORDER BY tablename, cmd;

