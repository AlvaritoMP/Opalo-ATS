-- Actualizar registro de app_settings para Opalo ATS
-- IMPORTANTE: La tabla tiene un constraint que solo permite un registro con ID específico
-- El ID debe ser: 00000000-0000-0000-0000-000000000000
-- Este script actualiza ese único registro
-- Ejecuta este script en Supabase SQL Editor

-- Verificar qué registro existe
SELECT id, app_name, currency_symbol FROM app_settings;

-- Actualizar el único registro (debe tener el ID específico del constraint)
UPDATE app_settings
SET 
    app_name = 'Opalo ATS',
    currency_symbol = COALESCE(currency_symbol, '$'),
    database_config = COALESCE(database_config, '{"apiUrl": "", "apiToken": ""}'::jsonb),
    file_storage_config = COALESCE(file_storage_config, '{"provider": "None", "connected": false}'::jsonb),
    custom_labels = COALESCE(custom_labels, '{}'::jsonb),
    logo_url = COALESCE(logo_url, '')
WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;

-- Si no existe el registro (raro, pero posible), crearlo con el ID correcto
INSERT INTO app_settings (
    id,
    app_name,
    currency_symbol,
    logo_url,
    database_config,
    file_storage_config,
    custom_labels
)
SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Opalo ATS',
    '$',
    '',
    '{"apiUrl": "", "apiToken": ""}'::jsonb,
    '{"provider": "None", "connected": false}'::jsonb,
    '{}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM app_settings WHERE id = '00000000-0000-0000-0000-000000000000'::uuid
);

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
