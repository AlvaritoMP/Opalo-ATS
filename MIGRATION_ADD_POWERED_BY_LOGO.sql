-- Migración: Agregar columna powered_by_logo_url a app_settings
-- Ejecutar en Supabase SQL Editor

-- Agregar columna para el logo "POWERED BY"
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS powered_by_logo_url TEXT;

-- Verificar que la columna se creó correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'app_settings' 
  AND column_name = 'powered_by_logo_url';

