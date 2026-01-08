-- Script específico para verificar políticas del rol anon
-- Ejecuta este script en Supabase SQL Editor

-- ============================================
-- 1. VERIFICAR SI HAY POLÍTICAS PARA ROL ANON
-- ============================================

SELECT 
    tablename,
    policyname,
    roles,
    cmd as "Command",
    qual as "USING clause"
FROM pg_policies
WHERE schemaname = 'public'
AND 'anon' = ANY(roles)
AND tablename IN (
    'users', 'processes', 'candidates', 'stages',
    'document_categories', 'attachments', 'candidate_history',
    'post_its', 'comments', 'interview_events',
    'form_integrations', 'app_settings'
)
ORDER BY tablename, policyname;

-- ============================================
-- 2. VERIFICAR POLÍTICAS QUE MENCIONAN "OPALO ATS"
-- ============================================

SELECT 
    tablename,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND (
    policyname LIKE '%Opalo%ATS%' 
    OR policyname LIKE '%opalo%ats%'
    OR qual::text LIKE '%Opalo%ATS%'
    OR qual::text LIKE '%opalo%ats%'
)
ORDER BY tablename, policyname;

-- ============================================
-- 3. VERIFICAR SI RLS ESTÁ HABILITADO
-- ============================================

SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'processes', 'candidates', 'app_settings'
)
ORDER BY tablename;

-- ============================================
-- 4. CONTAR POLÍTICAS POR TABLA Y ROL
-- ============================================

SELECT 
    tablename,
    CASE 
        WHEN 'anon' = ANY(roles) THEN 'anon'
        WHEN 'authenticated' = ANY(roles) THEN 'authenticated'
        ELSE 'other'
    END as "Role",
    cmd,
    COUNT(*) as "Policy Count"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'processes', 'candidates', 'app_settings'
)
GROUP BY tablename, roles, cmd
ORDER BY tablename, "Role", cmd;

-- ============================================
-- 5. VERIFICAR PERMISOS DEL ROL ANON
-- ============================================

SELECT 
    table_name,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) as "Privileges"
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
AND table_schema = 'public'
AND table_name IN (
    'users', 'processes', 'candidates', 'app_settings'
)
GROUP BY table_name
ORDER BY table_name;

