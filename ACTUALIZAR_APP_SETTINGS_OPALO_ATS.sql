-- Actualizar el registro existente de app_settings para Opalo ATS
-- Este script actualiza el registro existente en lugar de crear uno nuevo
-- Ejecuta este script en Supabase SQL Editor

-- Primero ver qué registros existen
SELECT id, app_name FROM app_settings;

-- Opción 1: Si hay un registro sin app_name, actualizarlo
UPDATE app_settings
SET 
    app_name = 'Opalo ATS',
    currency_symbol = COALESCE(currency_symbol, '$'),
    database_config = COALESCE(database_config, '{"apiUrl": "", "apiToken": ""}'::jsonb),
    file_storage_config = COALESCE(file_storage_config, '{"provider": "None", "connected": false}'::jsonb),
    custom_labels = COALESCE(custom_labels, '{}'::jsonb)
WHERE app_name IS NULL OR app_name != 'Opalo ATS'
LIMIT 1;

-- Opción 2: Si el registro ya tiene app_name diferente, actualizarlo
-- (Descomenta esta línea si la opción 1 no funcionó)
-- UPDATE app_settings
-- SET app_name = 'Opalo ATS'
-- WHERE app_name != 'Opalo ATS' OR app_name IS NULL
-- LIMIT 1;

-- Verificar el resultado
SELECT 
    id,
    app_name,
    currency_symbol,
    logo_url IS NOT NULL as tiene_logo
FROM app_settings;
