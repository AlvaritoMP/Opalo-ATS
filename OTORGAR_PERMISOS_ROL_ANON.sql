-- Otorgar permisos al rol anon para que pueda acceder a las tablas
-- Ejecuta este script en Supabase SQL Editor

-- Verificar permisos actuales del rol anon
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
AND table_schema = 'public'
AND table_name IN ('users', 'processes', 'candidates', 'stages', 'document_categories', 'attachments', 'candidate_history', 'post_its', 'comments', 'interview_events', 'form_integrations', 'app_settings')
ORDER BY table_name, privilege_type;

-- Otorgar permisos al rol anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.processes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attachments TO anon;
GRANT SELECT, INSERT ON public.candidate_history TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_its TO anon;
GRANT SELECT, INSERT, DELETE ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_integrations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO anon;

-- Verificar permisos después de otorgarlos
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
AND table_schema = 'public'
AND table_name IN ('users', 'processes', 'candidates')
ORDER BY table_name, privilege_type;

