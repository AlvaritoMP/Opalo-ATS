-- Configurar RLS (Row Level Security) para Opalo ATS en Supabase
-- SCRIPT SEGURO: No elimina políticas existentes, solo agrega las necesarias
-- Ejecuta este script en Supabase SQL Editor

-- ============================================
-- 1. HABILITAR RLS EN TODAS LAS TABLAS (si no está habilitado)
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_its ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. CREAR POLÍTICAS PARA OPALO ATS (solo si no existen)
-- ============================================

-- USERS
CREATE POLICY IF NOT EXISTS "Users can read Opalo ATS data"
ON public.users FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Users can insert Opalo ATS data"
ON public.users FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Users can update Opalo ATS data"
ON public.users FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Users can delete Opalo ATS data"
ON public.users FOR DELETE
USING (app_name = 'Opalo ATS');

-- PROCESSES
CREATE POLICY IF NOT EXISTS "Processes can read Opalo ATS data"
ON public.processes FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Processes can insert Opalo ATS data"
ON public.processes FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Processes can update Opalo ATS data"
ON public.processes FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Processes can delete Opalo ATS data"
ON public.processes FOR DELETE
USING (app_name = 'Opalo ATS');

-- CANDIDATES
CREATE POLICY IF NOT EXISTS "Candidates can read Opalo ATS data"
ON public.candidates FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Candidates can insert Opalo ATS data"
ON public.candidates FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Candidates can update Opalo ATS data"
ON public.candidates FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Candidates can delete Opalo ATS data"
ON public.candidates FOR DELETE
USING (app_name = 'Opalo ATS');

-- STAGES
CREATE POLICY IF NOT EXISTS "Stages can read Opalo ATS data"
ON public.stages FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Stages can insert Opalo ATS data"
ON public.stages FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Stages can update Opalo ATS data"
ON public.stages FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Stages can delete Opalo ATS data"
ON public.stages FOR DELETE
USING (app_name = 'Opalo ATS');

-- DOCUMENT_CATEGORIES
CREATE POLICY IF NOT EXISTS "Document categories can read Opalo ATS data"
ON public.document_categories FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Document categories can insert Opalo ATS data"
ON public.document_categories FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Document categories can update Opalo ATS data"
ON public.document_categories FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Document categories can delete Opalo ATS data"
ON public.document_categories FOR DELETE
USING (app_name = 'Opalo ATS');

-- ATTACHMENTS
CREATE POLICY IF NOT EXISTS "Attachments can read Opalo ATS data"
ON public.attachments FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Attachments can insert Opalo ATS data"
ON public.attachments FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Attachments can update Opalo ATS data"
ON public.attachments FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Attachments can delete Opalo ATS data"
ON public.attachments FOR DELETE
USING (app_name = 'Opalo ATS');

-- CANDIDATE_HISTORY
CREATE POLICY IF NOT EXISTS "Candidate history can read Opalo ATS data"
ON public.candidate_history FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Candidate history can insert Opalo ATS data"
ON public.candidate_history FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

-- POST_ITS
CREATE POLICY IF NOT EXISTS "Post its can read Opalo ATS data"
ON public.post_its FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Post its can insert Opalo ATS data"
ON public.post_its FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Post its can delete Opalo ATS data"
ON public.post_its FOR DELETE
USING (app_name = 'Opalo ATS');

-- COMMENTS
CREATE POLICY IF NOT EXISTS "Comments can read Opalo ATS data"
ON public.comments FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Comments can insert Opalo ATS data"
ON public.comments FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Comments can delete Opalo ATS data"
ON public.comments FOR DELETE
USING (app_name = 'Opalo ATS');

-- INTERVIEW_EVENTS
CREATE POLICY IF NOT EXISTS "Interview events can read Opalo ATS data"
ON public.interview_events FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Interview events can insert Opalo ATS data"
ON public.interview_events FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Interview events can update Opalo ATS data"
ON public.interview_events FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Interview events can delete Opalo ATS data"
ON public.interview_events FOR DELETE
USING (app_name = 'Opalo ATS');

-- FORM_INTEGRATIONS
CREATE POLICY IF NOT EXISTS "Form integrations can read Opalo ATS data"
ON public.form_integrations FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Form integrations can insert Opalo ATS data"
ON public.form_integrations FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Form integrations can update Opalo ATS data"
ON public.form_integrations FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "Form integrations can delete Opalo ATS data"
ON public.form_integrations FOR DELETE
USING (app_name = 'Opalo ATS');

-- APP_SETTINGS
CREATE POLICY IF NOT EXISTS "App settings can read Opalo ATS data"
ON public.app_settings FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "App settings can insert Opalo ATS data"
ON public.app_settings FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "App settings can update Opalo ATS data"
ON public.app_settings FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY IF NOT EXISTS "App settings can delete Opalo ATS data"
ON public.app_settings FOR DELETE
USING (app_name = 'Opalo ATS');

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que las políticas se crearon correctamente
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN policyname LIKE '%Opalo ATS%' THEN '✅ Opalo ATS'
        WHEN policyname LIKE '%Opalopy%' OR policyname LIKE '%ATS Pro%' THEN '✅ Opalopy'
        ELSE '⚠️ Otra política'
    END as app_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'processes', 'candidates', 'stages', 'document_categories', 'attachments', 'candidate_history', 'post_its', 'comments', 'interview_events', 'form_integrations', 'app_settings')
ORDER BY tablename, app_type, policyname;

