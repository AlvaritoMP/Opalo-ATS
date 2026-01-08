-- Probar deshabilitar RLS temporalmente para diagnosticar
-- ⚠️ SOLO PARA TESTING - NO DEJAR EN PRODUCCIÓN PERMANENTEMENTE

-- Deshabilitar RLS en todas las tablas
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_its DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está deshabilitado
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '❌ RLS aún habilitado'
        ELSE '✅ RLS deshabilitado'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'processes', 'candidates', 'stages', 'document_categories', 'attachments', 'candidate_history', 'post_its', 'comments', 'interview_events', 'form_integrations', 'app_settings')
ORDER BY tablename;

