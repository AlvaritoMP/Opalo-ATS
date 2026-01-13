-- Agregar columna client_id a processes (si no existe)
-- Este script es seguro y solo agrega la columna si no existe
-- Ejecuta este script en Supabase SQL Editor

-- Verificar si la columna existe antes de agregarla
DO $$
BEGIN
    -- Verificar si la columna client_id existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'processes' 
        AND column_name = 'client_id'
    ) THEN
        -- Agregar la columna client_id
        ALTER TABLE processes 
        ADD COLUMN client_id UUID;
        
        -- Si la tabla clients existe, agregar la foreign key
        IF EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'clients'
        ) THEN
            -- Agregar foreign key constraint
            ALTER TABLE processes
            ADD CONSTRAINT processes_client_id_fkey 
            FOREIGN KEY (client_id) 
            REFERENCES clients(id) 
            ON DELETE SET NULL;
        END IF;
        
        -- Crear índice para mejorar performance
        CREATE INDEX IF NOT EXISTS idx_processes_client_id ON processes(client_id);
        
        RAISE NOTICE 'Columna client_id agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna client_id ya existe';
    END IF;
END $$;

-- Verificar el resultado
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'processes'
AND column_name = 'client_id';
