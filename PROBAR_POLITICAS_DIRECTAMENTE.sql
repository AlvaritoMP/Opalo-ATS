-- Probar las políticas RLS directamente
-- Ejecuta este script en Supabase SQL Editor

-- ============================================
-- 1. VERIFICAR POLÍTICAS CREADAS PARA ANON
-- ============================================

SELECT 
    tablename,
    policyname,
    roles,
    cmd,
    qual as "USING clause"
FROM pg_policies
WHERE schemaname = 'public'
AND 'anon' = ANY(roles)
AND tablename = 'users'
ORDER BY policyname;

-- ============================================
-- 2. PROBAR QUERY COMO ROL ANON
-- ============================================

-- Simular query como rol anon
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
-- 3. VERIFICAR DATOS EXISTENTES
-- ============================================

-- Ver qué datos hay de Opalo ATS
SELECT 
    id,
    name,
    email,
    app_name
FROM public.users
WHERE app_name = 'Opalo ATS';

-- ============================================
-- 4. PROBAR CON DIFERENTES FORMATOS DE app_name
-- ============================================

-- Ver todos los valores únicos de app_name en users
SELECT DISTINCT app_name, COUNT(*) 
FROM public.users 
GROUP BY app_name;

-- Ver si hay espacios o caracteres especiales
SELECT 
    id,
    name,
    email,
    app_name,
    LENGTH(app_name) as "Length",
    ASCII(SUBSTRING(app_name, 1, 1)) as "First Char ASCII"
FROM public.users
WHERE app_name LIKE '%Opalo%ATS%';

-- ============================================
-- 5. VERIFICAR SI HAY PROBLEMAS CON LA CONDICIÓN
-- ============================================

-- Probar la condición exacta de la política
SELECT 
    id,
    name,
    email,
    app_name,
    CASE 
        WHEN app_name = 'Opalo ATS' THEN 'MATCH'
        ELSE 'NO MATCH'
    END as "Match Status"
FROM public.users;

