-- Verificar si el candidato fue creado en Supabase
-- ID del candidato según logs: cb44814c-6023-4ac9-8e6e-35de08d0663c

-- 1. Buscar el candidato por ID
SELECT 
    id,
    name,
    email,
    process_id,
    stage_id,
    app_name,
    source,
    created_at
FROM candidates
WHERE id = 'cb44814c-6023-4ac9-8e6e-35de08d0663c';

-- 2. Buscar candidatos recientes del proceso
SELECT 
    c.id,
    c.name,
    c.email,
    c.process_id,
    c.stage_id,
    c.app_name,
    c.source,
    c.created_at,
    p.title as proceso_titulo
FROM candidates c
LEFT JOIN processes p ON c.process_id = p.id
WHERE c.process_id = '94ad69bf-8f14-4c7d-b70d-c871a2d40346'
ORDER BY c.created_at DESC
LIMIT 10;

-- 3. Buscar candidatos creados en las últimas 2 horas
SELECT 
    c.id,
    c.name,
    c.email,
    c.process_id,
    c.stage_id,
    c.app_name,
    c.source,
    c.created_at,
    p.title as proceso_titulo
FROM candidates c
LEFT JOIN processes p ON c.process_id = p.id
WHERE c.app_name = 'Opalo ATS'
  AND c.created_at >= NOW() - INTERVAL '2 hours'
ORDER BY c.created_at DESC;

-- 4. Verificar el historial del candidato
SELECT 
    ch.id,
    ch.candidate_id,
    ch.stage_id,
    ch.moved_at,
    ch.moved_by,
    ch.app_name,
    s.name as etapa_nombre
FROM candidate_history ch
LEFT JOIN stages s ON ch.stage_id = s.id
WHERE ch.candidate_id = 'cb44814c-6023-4ac9-8e6e-35de08d0663c'
ORDER BY ch.moved_at DESC;
