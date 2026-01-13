-- Actualizar el registro existente de app_settings para Opalo ATS
-- IMPORTANTE: La tabla tiene un constraint que solo permite un registro con ID específico
-- Este script actualiza ese único registro
-- Ejecuta este script en Supabase SQL Editor

-- Primero ver qué registro existe
SELECT id, app_name, currency_symbol FROM app_settings;

-- Actualizar el único registro (debe tener id = '00000000-0000-0000-0000-000000000000')
UPDATE app_settings
SET 
    app_name = 'Opalo ATS',
    currency_symbol = COALESCE(currency_symbol, '$'),
    database_config = COALESCE(database_config, '{"apiUrl": "", "apiToken": ""}'::jsonb),
    file_storage_config = COALESCE(file_storage_config, '{"provider": "None", "connected": false}'::jsonb),
    custom_labels = COALESCE(custom_labels, '{}'::jsonb),
    logo_url = COALESCE(logo_url, '')
WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;

-- Verificar el resultado
SELECT 
    id,
    app_name,
    currency_symbol,
    logo_url IS NOT NULL as tiene_logo,
    CASE 
        WHEN google_drive_config IS NOT NULL THEN 'Tiene config'
        ELSE 'Sin config'
    END as google_drive
FROM app_settings;
