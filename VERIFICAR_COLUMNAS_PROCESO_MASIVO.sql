-- Verificar columnas y datos de un proceso masivo (ej. Molitalia)
-- Ejecutar en Supabase SQL Editor

-- 1) Columnas definidas en bulk_config
SELECT
    p.id,
    p.title,
    jsonb_array_length(COALESCE(p.bulk_config->'customColumns', '[]'::jsonb)) AS num_columnas_definidas,
    p.bulk_config->'customColumns' AS columnas,
    p.bulk_config->'columnKeyAliases' AS aliases,
    p.bulk_config->'hiddenColumns' AS ocultas,
    p.bulk_config->'columnOrder' AS orden
FROM processes p
WHERE p.is_bulk_process = true
  AND p.app_name = 'Opalo ATS'
  AND (
    p.title ILIKE '%molitalia%'
    OR p.title ILIKE '%auxiliares de producción%'
  )
ORDER BY p.created_at DESC;

-- 2) Claves reales guardadas en candidatos (muestra qué datos existen aunque falte la definición)
SELECT DISTINCT key AS clave_en_bulk_column_values
FROM processes p
JOIN candidates c ON c.process_id = p.id
CROSS JOIN LATERAL jsonb_object_keys(COALESCE(c.bulk_column_values, '{}'::jsonb)) AS key
WHERE p.is_bulk_process = true
  AND p.app_name = 'Opalo ATS'
  AND p.title ILIKE '%molitalia%'
ORDER BY key;

-- 3) Candidatos con pocas claves vs muchas (detectar pérdida parcial)
SELECT
    c.name,
    jsonb_object_keys(COALESCE(c.bulk_column_values, '{}'::jsonb)) AS claves,
    c.created_at
FROM candidates c
WHERE c.process_id = (
    SELECT id FROM processes
    WHERE title ILIKE '%molitalia%'
      AND is_bulk_process = true
      AND app_name = 'Opalo ATS'
    ORDER BY created_at DESC
    LIMIT 1
)
ORDER BY c.created_at DESC
LIMIT 20;
