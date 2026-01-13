-- Diagnóstico completo del proceso que no aparece
-- Ejecuta este script en Supabase SQL Editor

-- 1. Verificar el proceso específico
SELECT 
    id,
    title,
    app_name,
    client_id,
    status,
    created_at,
    CASE 
        WHEN app_name = 'Opalo ATS' THEN '✅ app_name correcto'
        ELSE '❌ app_name incorrecto: ' || app_name
    END as estado_app_name,
    CASE 
        WHEN client_id IS NULL THEN 'ℹ️ Sin cliente (OK)'
        ELSE '✅ Con cliente: ' || client_id::text
    END as estado_cliente
FROM processes
WHERE app_name = 'Opalo ATS'
ORDER BY created_at DESC;

-- 2. Verificar si el proceso tiene stages
SELECT 
    p.id as proceso_id,
    p.title as proceso_titulo,
    COUNT(s.id) as cantidad_stages
FROM processes p
LEFT JOIN stages s ON s.process_id = p.id AND s.app_name = 'Opalo ATS'
WHERE p.app_name = 'Opalo ATS'
GROUP BY p.id, p.title;

-- 3. Verificar si el proceso tiene document_categories
SELECT 
    p.id as proceso_id,
    p.title as proceso_titulo,
    COUNT(dc.id) as cantidad_categorias
FROM processes p
LEFT JOIN document_categories dc ON dc.process_id = p.id AND dc.app_name = 'Opalo ATS'
WHERE p.app_name = 'Opalo ATS'
GROUP BY p.id, p.title;

-- 4. Verificar políticas RLS en processes
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'processes'
ORDER BY policyname;

-- 5. Probar la query exacta que usa la aplicación
SELECT 
    id, 
    title, 
    description, 
    salary_range, 
    experience_level, 
    seniority, 
    flyer_url, 
    flyer_position, 
    service_order_code, 
    start_date, 
    end_date, 
    status, 
    vacancies, 
    google_drive_folder_id, 
    google_drive_folder_name, 
    published_date, 
    need_identified_date, 
    client_id, 
    created_at
FROM processes
WHERE app_name = 'Opalo ATS'
ORDER BY created_at DESC
LIMIT 200;
