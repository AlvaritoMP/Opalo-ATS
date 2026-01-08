-- Rehabilitar RLS después de la prueba
-- Ejecuta esto después de probar si deshabilitar RLS solucionó el problema

-- Rehabilitar RLS
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

