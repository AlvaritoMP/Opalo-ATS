-- ¿Qué procesos masivos perdieron configuración hoy?
-- Ejecutar en Supabase SQL Editor

SELECT
    p.id,
    p.title,
    jsonb_array_length(COALESCE(p.bulk_config->'customColumns', '[]'::jsonb)) AS columnas_custom,
    jsonb_array_length(COALESCE(p.bulk_config->'columnOrder', '[]'::jsonb)) AS tiene_orden,
    jsonb_array_length(COALESCE(p.bulk_config->'idealProfile'->'criteria', '[]'::jsonb)) AS criterios_perfil,
    jsonb_array_length(COALESCE(p.bulk_config->'quickReplies', '[]'::jsonb)) AS respuestas_rapidas,
    jsonb_array_length(COALESCE(p.bulk_config->'infoPins', '[]'::jsonb)) AS referencias,
    CASE
        WHEN p.bulk_config->'columnOrder' IS NULL
          OR jsonb_array_length(COALESCE(p.bulk_config->'columnOrder', '[]'::jsonb)) = 0
        THEN 'SIN ORDEN'
        ELSE 'ok'
    END AS estado_orden,
    CASE
        WHEN (p.bulk_config->'idealProfile'->'criteria') IS NOT NULL
          AND jsonb_array_length(COALESCE(p.bulk_config->'idealProfile'->'criteria', '[]'::jsonb)) > 0
        THEN 'ok'
        ELSE 'SIN PERFIL'
    END AS estado_perfil
FROM processes p
WHERE p.is_bulk_process = true
  AND p.app_name = 'Opalo ATS'
ORDER BY p.title;
