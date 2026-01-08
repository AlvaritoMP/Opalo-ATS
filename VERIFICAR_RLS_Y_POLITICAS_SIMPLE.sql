-- Script simple para verificar RLS y políticas
-- Ejecuta este script en Supabase SQL Editor

-- ============================================
-- 1. ¿RLS ESTÁ HABILITADO?
-- ============================================
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'processes', 'candidates', 'app_settings')
ORDER BY tablename;

-- ============================================
-- 2. ¿HAY POLÍTICAS PARA ROL ANON?
-- ============================================
SELECT 
    tablename,
    COUNT(*) as "Policies for anon"
FROM pg_policies
WHERE schemaname = 'public'
AND 'anon' = ANY(roles)
AND tablename IN ('users', 'processes', 'candidates', 'app_settings')
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- 3. LISTAR TODAS LAS POLÍTICAS PARA ANON
-- ============================================
SELECT 
    tablename,
    policyname,
    cmd as "Command"
FROM pg_policies
WHERE schemaname = 'public'
AND 'anon' = ANY(roles)
AND tablename IN ('users', 'processes', 'candidates', 'app_settings')
ORDER BY tablename, cmd;

-- ============================================
-- 4. ¿HAY POLÍTICAS QUE MENCIONAN "OPALO ATS"?
-- ============================================
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
AND tablename IN ('users', 'processes', 'candidates', 'app_settings')
ORDER BY tablename, policyname;

-- ============================================
-- 5. RESUMEN: ¿QUÉ FALTA?
-- ============================================
SELECT 
    t.tablename,
    CASE WHEN t.rowsecurity THEN 'YES' ELSE 'NO' END as "RLS Enabled",
    COALESCE(p.policy_count, 0) as "Policies for anon",
    CASE 
        WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN '❌ NEEDS POLICIES'
        WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) > 0 THEN '✅ HAS POLICIES'
        ELSE '⚠️ RLS DISABLED'
    END as "Status"
FROM pg_tables t
LEFT JOIN (
    SELECT 
        tablename,
        COUNT(*) as policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND 'anon' = ANY(roles)
    GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
AND t.tablename IN ('users', 'processes', 'candidates', 'app_settings')
ORDER BY t.tablename;

