-- Verificar el proceso específico de Opalo ATS
-- Ejecuta este script en Supabase SQL Editor

-- 1. Ver el proceso de Opalo ATS
SELECT 
    id,
    title,
    app_name,
    client_id,
    created_at,
    status,
    vacancies
FROM processes
WHERE app_name = 'Opalo ATS'
ORDER BY created_at DESC;

-- 2. Verificar si la tabla clients existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'clients'
) as tabla_clients_existe;

-- 3. Verificar si el proceso tiene client_id y si ese cliente existe
SELECT 
    p.id as proceso_id,
    p.title as proceso_titulo,
    p.client_id,
    c.id as cliente_id,
    c.razon_social,
    c.ruc
FROM processes p
LEFT JOIN clients c ON p.client_id = c.id
WHERE p.app_name = 'Opalo ATS';

-- 4. Verificar si hay errores de foreign key
-- Si client_id no es NULL pero el cliente no existe, habrá un problema
SELECT 
    p.id,
    p.title,
    p.client_id,
    CASE 
        WHEN p.client_id IS NOT NULL AND c.id IS NULL THEN '❌ client_id apunta a cliente inexistente'
        WHEN p.client_id IS NOT NULL AND c.id IS NOT NULL THEN '✅ client_id válido'
        WHEN p.client_id IS NULL THEN 'ℹ️ Sin cliente asignado'
    END as estado_cliente
FROM processes p
LEFT JOIN clients c ON p.client_id = c.id
WHERE p.app_name = 'Opalo ATS';
