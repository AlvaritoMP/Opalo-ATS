-- Configurar RLS (Row Level Security) para Opalo ATS en Supabase
-- Ejecuta este script en Supabase SQL Editor

-- IMPORTANTE: Este script habilita RLS y crea políticas que permiten
-- leer/escribir datos con app_name = 'Opalo ATS'

-- ============================================
-- 1. HABILITAR RLS EN TODAS LAS TABLAS
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
-- 2. ELIMINAR POLÍTICAS EXISTENTES (si las hay)
-- ============================================

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Users can read their own app data" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own app data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own app data" ON public.users;
DROP POLICY IF EXISTS "Users can delete their own app data" ON public.users;

DROP POLICY IF EXISTS "Processes can read their own app data" ON public.processes;
DROP POLICY IF EXISTS "Processes can insert their own app data" ON public.processes;
DROP POLICY IF EXISTS "Processes can update their own app data" ON public.processes;
DROP POLICY IF EXISTS "Processes can delete their own app data" ON public.processes;

DROP POLICY IF EXISTS "Candidates can read their own app data" ON public.candidates;
DROP POLICY IF EXISTS "Candidates can insert their own app data" ON public.candidates;
DROP POLICY IF EXISTS "Candidates can update their own app data" ON public.candidates;
DROP POLICY IF EXISTS "Candidates can delete their own app data" ON public.candidates;

DROP POLICY IF EXISTS "Stages can read their own app data" ON public.stages;
DROP POLICY IF EXISTS "Stages can insert their own app data" ON public.stages;
DROP POLICY IF EXISTS "Stages can update their own app data" ON public.stages;
DROP POLICY IF EXISTS "Stages can delete their own app data" ON public.stages;

DROP POLICY IF EXISTS "Document categories can read their own app data" ON public.document_categories;
DROP POLICY IF EXISTS "Document categories can insert their own app data" ON public.document_categories;
DROP POLICY IF EXISTS "Document categories can update their own app data" ON public.document_categories;
DROP POLICY IF EXISTS "Document categories can delete their own app data" ON public.document_categories;

DROP POLICY IF EXISTS "Attachments can read their own app data" ON public.attachments;
DROP POLICY IF EXISTS "Attachments can insert their own app data" ON public.attachments;
DROP POLICY IF EXISTS "Attachments can update their own app data" ON public.attachments;
DROP POLICY IF EXISTS "Attachments can delete their own app data" ON public.attachments;

DROP POLICY IF EXISTS "Candidate history can read their own app data" ON public.candidate_history;
DROP POLICY IF EXISTS "Candidate history can insert their own app data" ON public.candidate_history;

DROP POLICY IF EXISTS "Post its can read their own app data" ON public.post_its;
DROP POLICY IF EXISTS "Post its can insert their own app data" ON public.post_its;
DROP POLICY IF EXISTS "Post its can delete their own app data" ON public.post_its;

DROP POLICY IF EXISTS "Comments can read their own app data" ON public.comments;
DROP POLICY IF EXISTS "Comments can insert their own app data" ON public.comments;
DROP POLICY IF EXISTS "Comments can delete their own app data" ON public.comments;

DROP POLICY IF EXISTS "Interview events can read their own app data" ON public.interview_events;
DROP POLICY IF EXISTS "Interview events can insert their own app data" ON public.interview_events;
DROP POLICY IF EXISTS "Interview events can update their own app data" ON public.interview_events;
DROP POLICY IF EXISTS "Interview events can delete their own app data" ON public.interview_events;

DROP POLICY IF EXISTS "Form integrations can read their own app data" ON public.form_integrations;
DROP POLICY IF EXISTS "Form integrations can insert their own app data" ON public.form_integrations;
DROP POLICY IF EXISTS "Form integrations can update their own app data" ON public.form_integrations;
DROP POLICY IF EXISTS "Form integrations can delete their own app data" ON public.form_integrations;

DROP POLICY IF EXISTS "App settings can read their own app data" ON public.app_settings;
DROP POLICY IF EXISTS "App settings can insert their own app data" ON public.app_settings;
DROP POLICY IF EXISTS "App settings can update their own app data" ON public.app_settings;
DROP POLICY IF EXISTS "App settings can delete their own app data" ON public.app_settings;

-- ============================================
-- 3. CREAR POLÍTICAS PARA USERS
-- ============================================

CREATE POLICY "Users can read Opalo ATS data"
ON public.users FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY "Users can insert Opalo ATS data"
ON public.users FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Users can update Opalo ATS data"
ON public.users FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Users can delete Opalo ATS data"
ON public.users FOR DELETE
USING (app_name = 'Opalo ATS');

-- ============================================
-- 4. CREAR POLÍTICAS PARA PROCESSES
-- ============================================

CREATE POLICY "Processes can read Opalo ATS data"
ON public.processes FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY "Processes can insert Opalo ATS data"
ON public.processes FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Processes can update Opalo ATS data"
ON public.processes FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Processes can delete Opalo ATS data"
ON public.processes FOR DELETE
USING (app_name = 'Opalo ATS');

-- ============================================
-- 5. CREAR POLÍTICAS PARA CANDIDATES
-- ============================================

CREATE POLICY "Candidates can read Opalo ATS data"
ON public.candidates FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY "Candidates can insert Opalo ATS data"
ON public.candidates FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Candidates can update Opalo ATS data"
ON public.candidates FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Candidates can delete Opalo ATS data"
ON public.candidates FOR DELETE
USING (app_name = 'Opalo ATS');

-- ============================================
-- 6. CREAR POLÍTICAS PARA STAGES
-- ============================================

CREATE POLICY "Stages can read Opalo ATS data"
ON public.stages FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY "Stages can insert Opalo ATS data"
ON public.stages FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Stages can update Opalo ATS data"
ON public.stages FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Stages can delete Opalo ATS data"
ON public.stages FOR DELETE
USING (app_name = 'Opalo ATS');

-- ============================================
-- 7. CREAR POLÍTICAS PARA DOCUMENT_CATEGORIES
-- ============================================

CREATE POLICY "Document categories can read Opalo ATS data"
ON public.document_categories FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY "Document categories can insert Opalo ATS data"
ON public.document_categories FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Document categories can update Opalo ATS data"
ON public.document_categories FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Document categories can delete Opalo ATS data"
ON public.document_categories FOR DELETE
USING (app_name = 'Opalo ATS');

-- ============================================
-- 8. CREAR POLÍTICAS PARA ATTACHMENTS
-- ============================================

CREATE POLICY "Attachments can read Opalo ATS data"
ON public.attachments FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY "Attachments can insert Opalo ATS data"
ON public.attachments FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Attachments can update Opalo ATS data"
ON public.attachments FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Attachments can delete Opalo ATS data"
ON public.attachments FOR DELETE
USING (app_name = 'Opalo ATS');

-- ============================================
-- 9. CREAR POLÍTICAS PARA CANDIDATE_HISTORY
-- ============================================

CREATE POLICY "Candidate history can read Opalo ATS data"
ON public.candidate_history FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY "Candidate history can insert Opalo ATS data"
ON public.candidate_history FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

-- ============================================
-- 10. CREAR POLÍTICAS PARA POST_ITS
-- ============================================

CREATE POLICY "Post its can read Opalo ATS data"
ON public.post_its FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY "Post its can insert Opalo ATS data"
ON public.post_its FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Post its can delete Opalo ATS data"
ON public.post_its FOR DELETE
USING (app_name = 'Opalo ATS');

-- ============================================
-- 11. CREAR POLÍTICAS PARA COMMENTS
-- ============================================

CREATE POLICY "Comments can read Opalo ATS data"
ON public.comments FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY "Comments can insert Opalo ATS data"
ON public.comments FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Comments can delete Opalo ATS data"
ON public.comments FOR DELETE
USING (app_name = 'Opalo ATS');

-- ============================================
-- 12. CREAR POLÍTICAS PARA INTERVIEW_EVENTS
-- ============================================

CREATE POLICY "Interview events can read Opalo ATS data"
ON public.interview_events FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY "Interview events can insert Opalo ATS data"
ON public.interview_events FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Interview events can update Opalo ATS data"
ON public.interview_events FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Interview events can delete Opalo ATS data"
ON public.interview_events FOR DELETE
USING (app_name = 'Opalo ATS');

-- ============================================
-- 13. CREAR POLÍTICAS PARA FORM_INTEGRATIONS
-- ============================================

CREATE POLICY "Form integrations can read Opalo ATS data"
ON public.form_integrations FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY "Form integrations can insert Opalo ATS data"
ON public.form_integrations FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Form integrations can update Opalo ATS data"
ON public.form_integrations FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "Form integrations can delete Opalo ATS data"
ON public.form_integrations FOR DELETE
USING (app_name = 'Opalo ATS');

-- ============================================
-- 14. CREAR POLÍTICAS PARA APP_SETTINGS
-- ============================================

CREATE POLICY "App settings can read Opalo ATS data"
ON public.app_settings FOR SELECT
USING (app_name = 'Opalo ATS');

CREATE POLICY "App settings can insert Opalo ATS data"
ON public.app_settings FOR INSERT
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "App settings can update Opalo ATS data"
ON public.app_settings FOR UPDATE
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

CREATE POLICY "App settings can delete Opalo ATS data"
ON public.app_settings FOR DELETE
USING (app_name = 'Opalo ATS');

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que las políticas se crearon correctamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'processes', 'candidates', 'stages', 'document_categories', 'attachments', 'candidate_history', 'post_its', 'comments', 'interview_events', 'form_integrations', 'app_settings')
ORDER BY tablename, policyname;

