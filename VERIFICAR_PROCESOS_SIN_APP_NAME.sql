-- Verificar procesos que no tienen app_name o tienen app_name incorrecto
-- Ejecuta este script en Supabase SQL Editor

-- 1. Ver todos los procesos y su app_name
SELECT 
    id,
    title,
    app_name,
    created_at,
    CASE 
        WHEN app_name IS NULL THEN '❌ SIN app_name'
        WHEN app_name != 'Opalo ATS' THEN '⚠️ app_name incorrecto: ' || app_name
        ELSE '✅ OK'
    END as estado
FROM processes
ORDER BY created_at DESC;

-- 2. Contar procesos por app_name
SELECT 
    COALESCE(app_name, 'NULL') as app_name,
    COUNT(*) as cantidad
FROM processes
GROUP BY app_name
ORDER BY cantidad DESC;

-- 3. Ver procesos que necesitan corrección (sin app_name o con app_name incorrecto)
SELECT 
    id,
    title,
    app_name,
    created_at
FROM processes
WHERE app_name IS NULL OR app_name != 'Opalo ATS'
ORDER BY created_at DESC;
