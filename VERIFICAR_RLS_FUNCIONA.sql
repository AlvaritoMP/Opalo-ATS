-- Verificar que las políticas RLS estén funcionando correctamente
-- Ejecuta este script en Supabase SQL Editor

-- ============================================
-- 1. VERIFICAR QUE RLS ESTÉ HABILITADO
-- ============================================

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

-- ============================================
-- 2. VERIFICAR POLÍTICAS CREADAS PARA OPALO ATS
-- ============================================

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
AND tablename IN ('users', 'processes', 'candidates', 'stages', 'document_categories', 'attachments', 'candidate_history', 'post_its', 'comments', 'interview_events', 'form_integrations', 'app_settings')
ORDER BY tablename, app_type, policyname;

-- ============================================
-- 3. VERIFICAR QUE HAY POLÍTICAS PARA SELECT EN USERS
-- ============================================

SELECT 
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
AND cmd = 'SELECT'
AND policyname LIKE '%Opalo ATS%';

-- ============================================
-- 4. PROBAR QUERY CON ROL ANON
-- ============================================

-- Simular query como anon user
SET ROLE anon;
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
-- 5. VERIFICAR PERMISOS DEL ROL ANON
-- ============================================

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

