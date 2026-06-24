-- Estado actual del bulk_config (Molitalia / Auxiliares producción)
SELECT
    p.id,
    p.title,
    jsonb_array_length(COALESCE(p.bulk_config->'customColumns', '[]'::jsonb)) AS columnas_custom,
    jsonb_array_length(COALESCE(p.bulk_config->'quickReplies', '[]'::jsonb)) AS respuestas_rapidas,
    jsonb_array_length(COALESCE(p.bulk_config->'infoPins', '[]'::jsonb)) AS referencias,
    p.bulk_config->'idealProfile'->'enabled' AS perfil_ideal_activo,
    jsonb_array_length(COALESCE(p.bulk_config->'idealProfile'->'criteria', '[]'::jsonb)) AS criterios_perfil,
    jsonb_array_length(COALESCE(p.bulk_config->'columnOrder', '[]'::jsonb)) AS columnas_en_orden,
    p.bulk_config->'columnOrder' AS orden_columnas,
    p.bulk_config->'hiddenColumns' AS ocultas,
    p.bulk_config->'customColumns' AS columnas,
    p.bulk_config AS bulk_config_completo
FROM processes p
WHERE p.is_bulk_process = true
  AND p.app_name = 'Opalo ATS'
  AND (
    p.title ILIKE '%molitalia%'
    OR p.title ILIKE '%auxiliares de producción%'
  )
ORDER BY p.created_at DESC;

-- Si bulk_config_completo está incompleto: Supabase Dashboard → Database → Backups → Point in Time Recovery
-- Restaurar solo la fila de processes o el campo bulk_config desde antes del incidente.
