-- Ejecuta esto en PRODUCCION si el PASO 3 mostro "No rows" en la primera consulta.
-- Copia TODO el archivo, Run una vez, y enviame el resultado completo.

SELECT
    id,
    title,
    app_name,
    jsonb_array_length(COALESCE(bulk_config->'columnOrder', '[]'::jsonb)) AS columnas_en_orden,
    jsonb_array_length(COALESCE(bulk_config->'customColumns', '[]'::jsonb)) AS columnas_custom,
    jsonb_array_length(COALESCE(bulk_config->'idealProfile'->'criteria', '[]'::jsonb)) AS criterios_perfil,
    bulk_config->'idealProfile'->'enabled' AS perfil_ideal_activo,
    jsonb_array_length(COALESCE(bulk_config->'quickReplies', '[]'::jsonb)) AS respuestas_rapidas
FROM processes
WHERE id = 'bdff73e0-616b-405a-9721-92b8516f0625';
