-- Verificar todos los registros en app_settings
-- Ejecuta este script en Supabase SQL Editor

-- Ver todos los registros
SELECT 
    id,
    app_name,
    currency_symbol,
    logo_url IS NOT NULL as tiene_logo,
    created_at,
    updated_at
FROM app_settings
ORDER BY created_at DESC;

-- Verificar el constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'app_settings'::regclass
AND contype = 'c';
