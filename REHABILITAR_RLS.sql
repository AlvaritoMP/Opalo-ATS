-- Rehabilitar RLS después de diagnóstico
-- Ejecuta este script después de probar con RLS deshabilitado

-- ============================================
-- REHABILITAR RLS
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_its ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_integrations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICAR QUE LAS POLÍTICAS SIGUEN EXISTIENDO
-- ============================================

SELECT 
    tablename,
    COUNT(*) as "Policy Count"
FROM pg_policies
WHERE schemaname = 'public'
AND 'anon' = ANY(roles)
AND tablename IN (
    'users', 'processes', 'candidates', 'app_settings'
)
GROUP BY tablename
ORDER BY tablename;

