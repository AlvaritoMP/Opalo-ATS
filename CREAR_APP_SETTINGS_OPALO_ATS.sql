-- Crear registro de app_settings para Opalo ATS si no existe
-- Ejecuta este script en Supabase SQL Editor

-- Verificar si existe
SELECT * FROM app_settings WHERE app_name = 'Opalo ATS';

-- Si no existe, crear uno con valores por defecto
INSERT INTO app_settings (
    app_name,
    currency_symbol,
    logo_url,
    database_config,
    file_storage_config,
    custom_labels
)
SELECT 
    'Opalo ATS',
    '$',
    '',
    '{"apiUrl": "", "apiToken": ""}'::jsonb,
    '{"provider": "None", "connected": false}'::jsonb,
    '{}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM app_settings WHERE app_name = 'Opalo ATS'
);

-- Verificar que se creó
SELECT * FROM app_settings WHERE app_name = 'Opalo ATS';
