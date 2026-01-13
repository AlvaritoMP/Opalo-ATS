-- Corregir app_name de procesos que no tienen o tienen app_name incorrecto
-- Este script actualiza los procesos para que tengan app_name = 'Opalo ATS'
-- Ejecuta este script en Supabase SQL Editor

-- IMPORTANTE: Este script solo afecta procesos que NO tienen app_name o tienen un app_name diferente
-- NO afecta procesos de otras aplicaciones que ya tengan su app_name correcto

-- 1. Ver qué procesos se van a actualizar (ANTES de actualizar)
SELECT 
    id,
    title,
    app_name as app_name_actual,
    'Opalo ATS' as app_name_nuevo,
    created_at
FROM processes
WHERE app_name IS NULL OR app_name != 'Opalo ATS'
ORDER BY created_at DESC;

-- 2. Actualizar procesos sin app_name o con app_name incorrecto
-- Solo actualiza si app_name es NULL o diferente de 'Opalo ATS'
UPDATE processes
SET app_name = 'Opalo ATS'
WHERE app_name IS NULL OR app_name != 'Opalo ATS';

-- 3. Verificar el resultado
SELECT 
    id,
    title,
    app_name,
    created_at,
    CASE 
        WHEN app_name = 'Opalo ATS' THEN '✅ Corregido'
        ELSE '❌ Aún necesita corrección'
    END as estado
FROM processes
ORDER BY created_at DESC;

-- 4. Contar procesos por app_name (después de la corrección)
SELECT 
    COALESCE(app_name, 'NULL') as app_name,
    COUNT(*) as cantidad
FROM processes
GROUP BY app_name
ORDER BY cantidad DESC;
