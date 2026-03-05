-- Script para verificar si los webhooks de Tally están llegando a Supabase
-- Ejecutar en Supabase SQL Editor
-- 
-- INSTRUCCIONES:
-- 1. Ejecuta las consultas en orden (1, 2, 3, 4, 5, 6)
-- 2. La consulta 1 te mostrará los IDs de tus integraciones
-- 3. Si necesitas ver datos de una integración específica, usa las consultas 4b o 6b
--    (descomenta y reemplaza el UUID con el ID real de la consulta 1)

-- ============================================
-- 1. Ver todas las integraciones de formularios configuradas
-- ============================================
-- IMPORTANTE: Anota el 'id' y 'process_id' de tu integración para usar en otras consultas
SELECT 
    id,
    platform,
    form_name,
    form_id_or_url,
    process_id,
    webhook_url,
    app_name,
    created_at
FROM form_integrations
ORDER BY created_at DESC;

-- 2. Ver candidatos creados recientemente (últimas 24 horas)
-- Estos podrían ser candidatos creados desde Tally
SELECT 
    id,
    name,
    email,
    phone,
    process_id,
    stage_id,
    source,
    app_name,
    created_at
FROM candidates
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 3. Ver candidatos con source = 'Tally' o que contenga el nombre del formulario
SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.process_id,
    c.source,
    c.app_name,
    c.created_at,
    p.title as process_title
FROM candidates c
LEFT JOIN processes p ON c.process_id = p.id
WHERE c.source ILIKE '%Tally%' 
   OR c.source IN (SELECT form_name FROM form_integrations)
ORDER BY c.created_at DESC;

-- 4. Ver candidatos en TODOS los procesos vinculados a integraciones
-- Esta consulta muestra candidatos de todos los procesos que tienen integraciones configuradas
SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.stage_id,
    c.source,
    c.created_at,
    s.name as stage_name,
    p.title as process_title,
    fi.form_name as integration_form_name
FROM candidates c
LEFT JOIN stages s ON c.stage_id = s.id
LEFT JOIN processes p ON c.process_id = p.id
LEFT JOIN form_integrations fi ON c.process_id = fi.process_id AND c.app_name = fi.app_name
WHERE c.process_id IN (SELECT DISTINCT process_id FROM form_integrations)
ORDER BY c.created_at DESC;

-- 4b. Ver candidatos en un proceso específico (usa el ID de la consulta 1)
-- Ejemplo: WHERE c.process_id = '123e4567-e89b-12d3-a456-426614174000'
-- Descomenta y reemplaza el UUID de abajo con el process_id de tu integración:
/*
SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.stage_id,
    c.source,
    c.created_at,
    s.name as stage_name,
    p.title as process_title
FROM candidates c
LEFT JOIN stages s ON c.stage_id = s.id
LEFT JOIN processes p ON c.process_id = p.id
WHERE c.process_id = '123e4567-e89b-12d3-a456-426614174000'  -- Reemplaza con el process_id de la consulta 1
ORDER BY c.created_at DESC;
*/

-- 5. Ver el historial de candidatos creados recientemente
-- Nota: moved_by es UUID (referencia a usuario), no texto, por lo que buscamos candidatos
-- que fueron creados recientemente y tienen source relacionado con Tally
SELECT 
    ch.candidate_id,
    c.name as candidate_name,
    c.email,
    c.source,
    ch.stage_id,
    s.name as stage_name,
    ch.moved_at,
    ch.moved_by,
    ch.app_name,
    u.email as moved_by_user_email
FROM candidate_history ch
LEFT JOIN candidates c ON ch.candidate_id = c.id
LEFT JOIN stages s ON ch.stage_id = s.id
LEFT JOIN users u ON ch.moved_by = u.id
WHERE ch.moved_at >= NOW() - INTERVAL '24 hours'
  AND (
    -- Buscar candidatos con source relacionado con Tally o nombres de formularios
    c.source ILIKE '%Tally%' 
    OR c.source IN (SELECT form_name FROM form_integrations)
    -- O candidatos creados en procesos que tienen integraciones
    OR c.process_id IN (SELECT DISTINCT process_id FROM form_integrations)
  )
ORDER BY ch.moved_at DESC;

-- 6. Ver detalles completos de todas las integraciones (incluyendo field_mapping)
SELECT 
    id,
    platform,
    form_name,
    form_id_or_url,
    process_id,
    webhook_url,
    field_mapping,
    app_name,
    created_at,
    -- Mostrar también información del proceso vinculado
    (SELECT title FROM processes WHERE id = form_integrations.process_id AND app_name = form_integrations.app_name) as process_title,
    -- Contar candidatos creados para esta integración
    (SELECT COUNT(*) FROM candidates 
     WHERE process_id = form_integrations.process_id 
       AND app_name = form_integrations.app_name
       AND (source = form_integrations.form_name OR source ILIKE '%Tally%')) as candidates_count
FROM form_integrations
ORDER BY created_at DESC;

-- 6b. Ver detalles de una integración específica (usa el ID de la consulta 1)
-- Ejemplo: WHERE id = '123e4567-e89b-12d3-a456-426614174000'
-- Descomenta y reemplaza el UUID de abajo con el id de tu integración:
/*
SELECT 
    id,
    platform,
    form_name,
    form_id_or_url,
    process_id,
    webhook_url,
    field_mapping,
    app_name,
    created_at
FROM form_integrations
WHERE id = '123e4567-e89b-12d3-a456-426614174000';  -- Reemplaza con el id de la consulta 1
*/
