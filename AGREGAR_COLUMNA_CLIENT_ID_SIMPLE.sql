-- Agregar columna client_id a processes (versión simple sin DO block)
-- Este script es más compatible con editores SQL que tienen problemas con DO $$
-- Ejecuta este script en Supabase SQL Editor

-- Verificar primero si la columna existe
-- Si ejecutas esto y no hay error, la columna ya existe
-- Si hay error "column already exists", la columna ya existe (ignora el error)

-- Agregar la columna client_id (si no existe)
ALTER TABLE processes 
ADD COLUMN IF NOT EXISTS client_id UUID;

-- Si la tabla clients existe, agregar la foreign key (si no existe)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clients'
    ) THEN
        -- Verificar si la constraint ya existe antes de agregarla
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND table_name = 'processes' 
            AND constraint_name = 'processes_client_id_fkey'
        ) THEN
            ALTER TABLE processes
            ADD CONSTRAINT processes_client_id_fkey 
            FOREIGN KEY (client_id) 
            REFERENCES clients(id) 
            ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Crear índice para mejorar performance (si no existe)
CREATE INDEX IF NOT EXISTS idx_processes_client_id ON processes(client_id);

-- Verificar el resultado
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'processes'
AND column_name = 'client_id';
