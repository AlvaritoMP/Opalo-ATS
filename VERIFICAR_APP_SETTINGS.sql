-- Verificar el estado de app_settings para Opalo ATS
-- Ejecuta este script en Supabase SQL Editor

-- 1. Ver si existe un registro de settings para Opalo ATS
SELECT 
    id,
    app_name,
    currency_symbol,
    logo_url IS NOT NULL as tiene_logo,
    CASE 
        WHEN google_drive_config IS NOT NULL THEN 'Tiene config'
        ELSE 'Sin config'
    END as google_drive,
    CASE 
        WHEN provinces IS NOT NULL THEN array_length(provinces, 1)
        ELSE 0
    END as cantidad_provincias,
    CASE 
        WHEN districts IS NOT NULL THEN 'Tiene distritos'
        ELSE 'Sin distritos'
    END as distritos
FROM app_settings
WHERE app_name = 'Opalo ATS';

-- 2. Ver todos los registros de app_settings
SELECT 
    app_name,
    COUNT(*) as cantidad
FROM app_settings
GROUP BY app_name;

-- 3. Verificar políticas RLS en app_settings
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'app_settings'
ORDER BY policyname;
