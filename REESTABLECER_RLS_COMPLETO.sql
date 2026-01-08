-- Reestablecer RLS y políticas para Opalo ATS
-- Ejecuta este script después de configurar las URLs en Supabase

-- ============================================
-- 1. REHABILITAR RLS EN TODAS LAS TABLAS
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
-- 2. CREAR POLÍTICAS PARA OPALO ATS (si no existen)
-- ============================================

DO $$
BEGIN
    -- USERS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can read Opalo ATS data') THEN
        CREATE POLICY "Users can read Opalo ATS data" ON public.users FOR SELECT USING (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can insert Opalo ATS data') THEN
        CREATE POLICY "Users can insert Opalo ATS data" ON public.users FOR INSERT WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can update Opalo ATS data') THEN
        CREATE POLICY "Users can update Opalo ATS data" ON public.users FOR UPDATE USING (app_name = 'Opalo ATS') WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can delete Opalo ATS data') THEN
        CREATE POLICY "Users can delete Opalo ATS data" ON public.users FOR DELETE USING (app_name = 'Opalo ATS');
    END IF;

    -- PROCESSES
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'processes' AND policyname = 'Processes can read Opalo ATS data') THEN
        CREATE POLICY "Processes can read Opalo ATS data" ON public.processes FOR SELECT USING (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'processes' AND policyname = 'Processes can insert Opalo ATS data') THEN
        CREATE POLICY "Processes can insert Opalo ATS data" ON public.processes FOR INSERT WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'processes' AND policyname = 'Processes can update Opalo ATS data') THEN
        CREATE POLICY "Processes can update Opalo ATS data" ON public.processes FOR UPDATE USING (app_name = 'Opalo ATS') WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'processes' AND policyname = 'Processes can delete Opalo ATS data') THEN
        CREATE POLICY "Processes can delete Opalo ATS data" ON public.processes FOR DELETE USING (app_name = 'Opalo ATS');
    END IF;

    -- CANDIDATES
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'candidates' AND policyname = 'Candidates can read Opalo ATS data') THEN
        CREATE POLICY "Candidates can read Opalo ATS data" ON public.candidates FOR SELECT USING (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'candidates' AND policyname = 'Candidates can insert Opalo ATS data') THEN
        CREATE POLICY "Candidates can insert Opalo ATS data" ON public.candidates FOR INSERT WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'candidates' AND policyname = 'Candidates can update Opalo ATS data') THEN
        CREATE POLICY "Candidates can update Opalo ATS data" ON public.candidates FOR UPDATE USING (app_name = 'Opalo ATS') WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'candidates' AND policyname = 'Candidates can delete Opalo ATS data') THEN
        CREATE POLICY "Candidates can delete Opalo ATS data" ON public.candidates FOR DELETE USING (app_name = 'Opalo ATS');
    END IF;

    -- STAGES
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stages' AND policyname = 'Stages can read Opalo ATS data') THEN
        CREATE POLICY "Stages can read Opalo ATS data" ON public.stages FOR SELECT USING (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stages' AND policyname = 'Stages can insert Opalo ATS data') THEN
        CREATE POLICY "Stages can insert Opalo ATS data" ON public.stages FOR INSERT WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stages' AND policyname = 'Stages can update Opalo ATS data') THEN
        CREATE POLICY "Stages can update Opalo ATS data" ON public.stages FOR UPDATE USING (app_name = 'Opalo ATS') WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stages' AND policyname = 'Stages can delete Opalo ATS data') THEN
        CREATE POLICY "Stages can delete Opalo ATS data" ON public.stages FOR DELETE USING (app_name = 'Opalo ATS');
    END IF;

    -- DOCUMENT_CATEGORIES
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_categories' AND policyname = 'Document categories can read Opalo ATS data') THEN
        CREATE POLICY "Document categories can read Opalo ATS data" ON public.document_categories FOR SELECT USING (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_categories' AND policyname = 'Document categories can insert Opalo ATS data') THEN
        CREATE POLICY "Document categories can insert Opalo ATS data" ON public.document_categories FOR INSERT WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_categories' AND policyname = 'Document categories can update Opalo ATS data') THEN
        CREATE POLICY "Document categories can update Opalo ATS data" ON public.document_categories FOR UPDATE USING (app_name = 'Opalo ATS') WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_categories' AND policyname = 'Document categories can delete Opalo ATS data') THEN
        CREATE POLICY "Document categories can delete Opalo ATS data" ON public.document_categories FOR DELETE USING (app_name = 'Opalo ATS');
    END IF;

    -- ATTACHMENTS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attachments' AND policyname = 'Attachments can read Opalo ATS data') THEN
        CREATE POLICY "Attachments can read Opalo ATS data" ON public.attachments FOR SELECT USING (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attachments' AND policyname = 'Attachments can insert Opalo ATS data') THEN
        CREATE POLICY "Attachments can insert Opalo ATS data" ON public.attachments FOR INSERT WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attachments' AND policyname = 'Attachments can update Opalo ATS data') THEN
        CREATE POLICY "Attachments can update Opalo ATS data" ON public.attachments FOR UPDATE USING (app_name = 'Opalo ATS') WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attachments' AND policyname = 'Attachments can delete Opalo ATS data') THEN
        CREATE POLICY "Attachments can delete Opalo ATS data" ON public.attachments FOR DELETE USING (app_name = 'Opalo ATS');
    END IF;

    -- CANDIDATE_HISTORY
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'candidate_history' AND policyname = 'Candidate history can read Opalo ATS data') THEN
        CREATE POLICY "Candidate history can read Opalo ATS data" ON public.candidate_history FOR SELECT USING (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'candidate_history' AND policyname = 'Candidate history can insert Opalo ATS data') THEN
        CREATE POLICY "Candidate history can insert Opalo ATS data" ON public.candidate_history FOR INSERT WITH CHECK (app_name = 'Opalo ATS');
    END IF;

    -- POST_ITS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_its' AND policyname = 'Post its can read Opalo ATS data') THEN
        CREATE POLICY "Post its can read Opalo ATS data" ON public.post_its FOR SELECT USING (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_its' AND policyname = 'Post its can insert Opalo ATS data') THEN
        CREATE POLICY "Post its can insert Opalo ATS data" ON public.post_its FOR INSERT WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_its' AND policyname = 'Post its can delete Opalo ATS data') THEN
        CREATE POLICY "Post its can delete Opalo ATS data" ON public.post_its FOR DELETE USING (app_name = 'Opalo ATS');
    END IF;

    -- COMMENTS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'Comments can read Opalo ATS data') THEN
        CREATE POLICY "Comments can read Opalo ATS data" ON public.comments FOR SELECT USING (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'Comments can insert Opalo ATS data') THEN
        CREATE POLICY "Comments can insert Opalo ATS data" ON public.comments FOR INSERT WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'Comments can delete Opalo ATS data') THEN
        CREATE POLICY "Comments can delete Opalo ATS data" ON public.comments FOR DELETE USING (app_name = 'Opalo ATS');
    END IF;

    -- INTERVIEW_EVENTS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'interview_events' AND policyname = 'Interview events can read Opalo ATS data') THEN
        CREATE POLICY "Interview events can read Opalo ATS data" ON public.interview_events FOR SELECT USING (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'interview_events' AND policyname = 'Interview events can insert Opalo ATS data') THEN
        CREATE POLICY "Interview events can insert Opalo ATS data" ON public.interview_events FOR INSERT WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'interview_events' AND policyname = 'Interview events can update Opalo ATS data') THEN
        CREATE POLICY "Interview events can update Opalo ATS data" ON public.interview_events FOR UPDATE USING (app_name = 'Opalo ATS') WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'interview_events' AND policyname = 'Interview events can delete Opalo ATS data') THEN
        CREATE POLICY "Interview events can delete Opalo ATS data" ON public.interview_events FOR DELETE USING (app_name = 'Opalo ATS');
    END IF;

    -- FORM_INTEGRATIONS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'form_integrations' AND policyname = 'Form integrations can read Opalo ATS data') THEN
        CREATE POLICY "Form integrations can read Opalo ATS data" ON public.form_integrations FOR SELECT USING (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'form_integrations' AND policyname = 'Form integrations can insert Opalo ATS data') THEN
        CREATE POLICY "Form integrations can insert Opalo ATS data" ON public.form_integrations FOR INSERT WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'form_integrations' AND policyname = 'Form integrations can update Opalo ATS data') THEN
        CREATE POLICY "Form integrations can update Opalo ATS data" ON public.form_integrations FOR UPDATE USING (app_name = 'Opalo ATS') WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'form_integrations' AND policyname = 'Form integrations can delete Opalo ATS data') THEN
        CREATE POLICY "Form integrations can delete Opalo ATS data" ON public.form_integrations FOR DELETE USING (app_name = 'Opalo ATS');
    END IF;

    -- APP_SETTINGS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_settings' AND policyname = 'App settings can read Opalo ATS data') THEN
        CREATE POLICY "App settings can read Opalo ATS data" ON public.app_settings FOR SELECT USING (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_settings' AND policyname = 'App settings can insert Opalo ATS data') THEN
        CREATE POLICY "App settings can insert Opalo ATS data" ON public.app_settings FOR INSERT WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_settings' AND policyname = 'App settings can update Opalo ATS data') THEN
        CREATE POLICY "App settings can update Opalo ATS data" ON public.app_settings FOR UPDATE USING (app_name = 'Opalo ATS') WITH CHECK (app_name = 'Opalo ATS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_settings' AND policyname = 'App settings can delete Opalo ATS data') THEN
        CREATE POLICY "App settings can delete Opalo ATS data" ON public.app_settings FOR DELETE USING (app_name = 'Opalo ATS');
    END IF;

END $$;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que RLS está habilitado
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS habilitado'
        ELSE '❌ RLS NO habilitado'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'processes', 'candidates', 'stages', 'document_categories', 'attachments', 'candidate_history', 'post_its', 'comments', 'interview_events', 'form_integrations', 'app_settings')
ORDER BY tablename;

-- Verificar políticas creadas
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN policyname LIKE '%Opalo ATS%' THEN '✅ Opalo ATS'
        WHEN policyname LIKE '%Opalopy%' OR policyname LIKE '%ATS Pro%' THEN '✅ Opalopy'
        ELSE '⚠️ Otra'
    END as app_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'processes', 'candidates')
ORDER BY tablename, app_type, policyname;

