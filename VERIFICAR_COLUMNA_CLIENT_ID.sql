-- Verificar si la columna client_id existe en la tabla processes
-- Ejecuta este script en Supabase SQL Editor

-- 1. Verificar si la columna client_id existe
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'processes'
AND column_name = 'client_id';

-- 2. Si la columna existe, ver su contenido
SELECT 
    id,
    title,
    app_name,
    client_id,
    CASE 
        WHEN client_id IS NULL THEN 'Sin cliente'
        ELSE 'Con cliente: ' || client_id::text
    END as estado_cliente
FROM processes
WHERE app_name = 'Opalo ATS';

-- 3. Verificar si la tabla clients existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'clients'
) as tabla_clients_existe;

-- 4. Si la columna client_id NO existe, ejecutar esto para crearla:
-- ALTER TABLE processes ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
