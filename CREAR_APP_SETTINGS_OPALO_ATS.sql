-- Actualizar o crear registro de app_settings para Opalo ATS
-- IMPORTANTE: La tabla tiene un constraint que solo permite una fila
-- Por eso actualizamos el registro existente en lugar de crear uno nuevo
-- Ejecuta este script en Supabase SQL Editor

-- Verificar qué registros existen
SELECT id, app_name, currency_symbol FROM app_settings;

-- Actualizar el registro existente (o el único registro si hay constraint)
-- Si no existe app_name o es diferente, actualizarlo a 'Opalo ATS'
UPDATE app_settings
SET 
    app_name = 'Opalo ATS',
    currency_symbol = COALESCE(currency_symbol, '$'),
    database_config = COALESCE(database_config, '{"apiUrl": "", "apiToken": ""}'::jsonb),
    file_storage_config = COALESCE(file_storage_config, '{"provider": "None", "connected": false}'::jsonb),
    custom_labels = COALESCE(custom_labels, '{}'::jsonb),
    logo_url = COALESCE(logo_url, '')
WHERE app_name IS NULL 
   OR app_name != 'Opalo ATS'
   OR app_name = 'Opalopy';

-- Si no se actualizó ninguna fila (no existe registro), intentar crear
-- Nota: Esto puede fallar si hay un constraint que impide múltiples filas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM app_settings WHERE app_name = 'Opalo ATS') THEN
        -- Intentar insertar solo si realmente no existe
        INSERT INTO app_settings (
            app_name,
            currency_symbol,
            logo_url,
            database_config,
            file_storage_config,
            custom_labels
        ) VALUES (
            'Opalo ATS',
            '$',
            '',
            '{"apiUrl": "", "apiToken": ""}'::jsonb,
            '{"provider": "None", "connected": false}'::jsonb,
            '{}'::jsonb
        ) ON CONFLICT DO NOTHING;
    END IF;
END $$;

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
FROM app_settings
WHERE app_name = 'Opalo ATS';
