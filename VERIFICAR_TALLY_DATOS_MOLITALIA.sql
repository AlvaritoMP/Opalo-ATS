-- Verificación Tally → Supabase (proceso Molitalia)
-- Ejecutar en Supabase SQL Editor

-- 1) Integración y mapeo guardado
SELECT
    id,
    form_name,
    platform,
    webhook_url,
    field_mapping,
    process_id,
    created_at
FROM form_integrations
WHERE process_id = (
    SELECT id FROM processes
    WHERE title ILIKE '%Molitalia%'
    LIMIT 1
);

-- 2) Candidatos recientes del proceso (últimos 7 días)
SELECT
    c.id,
    c.name,
    c.dni,
    c.source,
    c.province,
    c.district,
    c.age,
    c.bulk_column_values,
    c.created_at
FROM candidates c
WHERE c.process_id = (
    SELECT id FROM processes
    WHERE title ILIKE '%Molitalia%'
    LIMIT 1
)
AND c.created_at >= NOW() - INTERVAL '7 days'
ORDER BY c.created_at DESC;

-- 3) Comparar: candidatos con bulk casi vacío vs completos
SELECT
    c.name,
    c.source,
    jsonb_object_keys(c.bulk_column_values) AS bulk_keys,
    c.created_at
FROM candidates c
WHERE c.process_id = (
    SELECT id FROM processes
    WHERE title ILIKE '%Molitalia%'
    LIMIT 1
)
AND c.name ILIKE 'Luis%'
ORDER BY c.created_at DESC;

-- 4) Columnas custom del proceso (IDs que debe usar el webhook)
SELECT
    p.title,
    p.is_bulk_process,
    jsonb_array_elements(p.bulk_config->'customColumns') AS col
FROM processes p
WHERE p.title ILIKE '%Molitalia%'
LIMIT 1;
