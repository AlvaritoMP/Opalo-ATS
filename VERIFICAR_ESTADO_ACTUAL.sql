-- ============================================
-- VERIFICAR ESTADO ACTUAL DE LA BASE DE DATOS
-- ============================================
-- Ejecuta esto primero para ver qué cambios se hicieron realmente

-- 1. Verificar si existen columnas app_name
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE column_name = 'app_name'
ORDER BY table_name;

-- 2. Verificar si existen índices relacionados
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE indexname LIKE '%app_name%'
ORDER BY tablename;

-- 3. Verificar estructura básica de tablas principales
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('users', 'processes', 'candidates')
  AND column_name IN ('id', 'name', 'email', 'app_name')
ORDER BY table_name, column_name;

-- 4. Contar registros en tablas principales (para verificar que no se perdieron datos)
SELECT 
    'users' as tabla,
    COUNT(*) as total_registros
FROM users
UNION ALL
SELECT 'processes', COUNT(*) FROM processes
UNION ALL
SELECT 'candidates', COUNT(*) FROM candidates;

