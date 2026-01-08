-- Verificar estado de la API key anon en Supabase
-- Ejecuta este script en Supabase SQL Editor

-- ============================================
-- 1. VERIFICAR SI LA API KEY ESTÁ DESHABILITADA
-- ============================================
-- Nota: Esto requiere acceso a la tabla de configuración de Supabase
-- Si no puedes ejecutar esto, verifica manualmente en Settings > API

-- ============================================
-- 2. PROBAR QUERY DIRECTA COMO ANON
-- ============================================

-- Simular una query como rol anon
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
-- 3. VERIFICAR POLÍTICAS Y SUS CONDICIONES
-- ============================================

SELECT 
    tablename,
    policyname,
    roles,
    cmd,
    qual as "USING clause",
    with_check as "WITH CHECK clause"
FROM pg_policies
WHERE schemaname = 'public'
AND 'anon' = ANY(roles)
AND tablename = 'users'
ORDER BY policyname;

