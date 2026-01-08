-- Verificar políticas RLS existentes antes de ejecutar el script
-- Ejecuta esto PRIMERO para ver qué políticas ya existen

SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN policyname LIKE '%Opalo ATS%' THEN '✅ Opalo ATS'
        WHEN policyname LIKE '%Opalopy%' OR policyname LIKE '%ATS Pro%' THEN '✅ Opalopy'
        WHEN policyname LIKE '%read%' OR policyname LIKE '%select%' THEN '📖 Read'
        WHEN policyname LIKE '%insert%' THEN '➕ Insert'
        WHEN policyname LIKE '%update%' THEN '✏️ Update'
        WHEN policyname LIKE '%delete%' THEN '🗑️ Delete'
        ELSE '⚠️ Otra'
    END as tipo
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'processes', 'candidates', 'stages', 'document_categories', 'attachments', 'candidate_history', 'post_its', 'comments', 'interview_events', 'form_integrations', 'app_settings')
ORDER BY tablename, policyname;

-- Verificar si RLS está habilitado
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'processes', 'candidates', 'stages', 'document_categories', 'attachments', 'candidate_history', 'post_its', 'comments', 'interview_events', 'form_integrations', 'app_settings')
ORDER BY tablename;

