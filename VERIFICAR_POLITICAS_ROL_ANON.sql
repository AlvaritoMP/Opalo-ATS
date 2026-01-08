-- Verificar que las políticas RLS permitan acceso al rol anon
-- Ejecuta este script en Supabase SQL Editor

-- ============================================
-- 1. VERIFICAR PERMISOS DEL ROL ANON
-- ============================================

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

-- ============================================
-- 2. VERIFICAR POLÍTICAS RLS Y ROLES
-- ============================================

SELECT 
    tablename,
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
AND policyname LIKE '%Opalo ATS%'
ORDER BY policyname;

-- ============================================
-- 3. PROBAR QUERY COMO ROL ANON
-- ============================================

-- Simular query como anon user
SET ROLE anon;

-- Intentar leer usuarios de Opalo ATS
SELECT 
    id,
    name,
    email,
    app_name
FROM public.users
WHERE app_name = 'Opalo ATS'
LIMIT 1;

RESET ROLE;

-- ============================================
-- 4. VERIFICAR SI HAY POLÍTICAS QUE BLOQUEAN
-- ============================================

-- Ver todas las políticas de users
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
ORDER BY policyname;

