-- Agregar columna client_id a processes (versión rápida y simple)
-- Ejecuta este script en Supabase SQL Editor

-- Agregar la columna si no existe
ALTER TABLE processes 
ADD COLUMN IF NOT EXISTS client_id UUID;

-- Crear índice para mejorar performance (si no existe)
CREATE INDEX IF NOT EXISTS idx_processes_client_id ON processes(client_id);

-- Verificar que se agregó correctamente
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'processes'
AND column_name = 'client_id';
