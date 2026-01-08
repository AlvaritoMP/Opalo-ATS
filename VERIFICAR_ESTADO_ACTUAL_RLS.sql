-- Script NO DESTRUCTIVO - Solo verificación
-- Ejecuta este script primero para entender el estado actual
-- NO elimina ni modifica nada

-- ============================================
-- 1. VERIFICAR SI RLS ESTÁ HABILITADO
-- ============================================

SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'processes', 'candidates', 'stages', 
    'document_categories', 'attachments', 'candidate_history',
    'post_its', 'comments', 'interview_events', 
    'form_integrations', 'app_settings'
)
ORDER BY tablename;

-- ============================================
-- 2. VER TODAS LAS POLÍTICAS EXISTENTES
-- ============================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as "Command",
    qual as "USING clause",
    with_check as "WITH CHECK clause"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'processes', 'candidates', 'stages',
    'document_categories', 'attachments', 'candidate_history',
    'post_its', 'comments', 'interview_events',
    'form_integrations', 'app_settings'
)
ORDER BY tablename, policyname;

-- ============================================
-- 3. VERIFICAR QUÉ ROLES TIENEN ACCESO
-- ============================================

-- Ver políticas que mencionan "Opalo ATS"
SELECT 
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND (
    policyname LIKE '%Opalo%ATS%' 
    OR policyname LIKE '%opalo%ats%'
    OR qual::text LIKE '%Opalo%ATS%'
)
ORDER BY tablename, policyname;

-- ============================================
-- 4. VERIFICAR SI HAY POLÍTICAS PARA ROL ANON
-- ============================================

SELECT 
    tablename,
    policyname,
    roles,
    cmd
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
-- 5. VERIFICAR PERMISOS DEL ROL ANON
-- ============================================

SELECT 
    grantee as "Role",
    table_schema,
    table_name,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) as "Privileges"
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
AND table_schema = 'public'
AND table_name IN (
    'users', 'processes', 'candidates', 'stages',
    'document_categories', 'attachments', 'candidate_history',
    'post_its', 'comments', 'interview_events',
    'form_integrations', 'app_settings'
)
GROUP BY grantee, table_schema, table_name
ORDER BY table_name;

-- ============================================
-- 6. CONTAR POLÍTICAS POR TABLA Y ROL
-- ============================================

SELECT 
    tablename,
    roles,
    cmd,
    COUNT(*) as "Policy Count"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'processes', 'candidates', 'stages',
    'document_categories', 'attachments', 'candidate_history',
    'post_its', 'comments', 'interview_events',
    'form_integrations', 'app_settings'
)
GROUP BY tablename, roles, cmd
ORDER BY tablename, roles, cmd;

-- ============================================
-- 7. VERIFICAR DATOS DE OPALO ATS
-- ============================================

-- Verificar que existen datos con app_name = 'Opalo ATS'
SELECT 
    'users' as table_name,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE app_name = 'Opalo ATS') as opalo_ats_rows
FROM public.users
UNION ALL
SELECT 
    'processes',
    COUNT(*),
    COUNT(*) FILTER (WHERE app_name = 'Opalo ATS')
FROM public.processes
UNION ALL
SELECT 
    'candidates',
    COUNT(*),
    COUNT(*) FILTER (WHERE app_name = 'Opalo ATS')
FROM public.candidates
UNION ALL
SELECT 
    'app_settings',
    COUNT(*),
    COUNT(*) FILTER (WHERE app_name = 'Opalo ATS')
FROM public.app_settings;

