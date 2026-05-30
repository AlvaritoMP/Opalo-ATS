-- =============================================================================
-- RESTAURAR layout de tabla de un proceso masivo (Operarios de limpieza, etc.)
-- Ejecutar en Supabase SQL Editor.
--
-- Contexto: si solo se ve la columna "Acciones", bulk_config suele tener
-- hiddenColumns con todo oculto o customColumns corruptos por aliases históricos.
-- =============================================================================

-- 1) Localizar el proceso
SELECT id, title, is_bulk_process, updated_at,
       jsonb_array_length(COALESCE(bulk_config->'customColumns', '[]'::jsonb)) AS num_custom_cols,
       jsonb_array_length(COALESCE(bulk_config->'hiddenColumns', '[]'::jsonb)) AS num_hidden,
       jsonb_array_length(COALESCE(bulk_config->'columnOrder', '[]'::jsonb)) AS num_order
FROM processes
WHERE is_bulk_process = true
  AND title ILIKE '%limpieza%'
ORDER BY updated_at DESC;

-- 2) Ver historial de cambios alrededor del 30-may ~14:54 (hora Perú UTC-5 → 19:54 UTC)
-- Sustituya :process_id por el id del paso 1
/*
SELECT created_at, action_type, field_name, old_value, new_value, details
FROM bulk_process_activity_log
WHERE process_id = ':process_id'
  AND created_at >= '2026-05-30 19:50:00+00'
  AND created_at <= '2026-05-30 20:10:00+00'
ORDER BY created_at;
*/

-- 3) Inspeccionar bulk_config actual (fragmentos clave)
/*
SELECT
  bulk_config->'customColumns' AS custom_columns,
  bulk_config->'columnOrder' AS column_order,
  bulk_config->'hiddenColumns' AS hidden_columns,
  bulk_config->'columnKeyAliases' AS column_key_aliases
FROM processes
WHERE id = ':process_id';
*/

-- 4) Reparación segura: mostrar todas las columnas y depurar aliases huérfanos
-- Conserva customColumns y columnOrder; solo limpia lo que rompe la vista.
/*
UPDATE processes
SET bulk_config = bulk_config
  || jsonb_build_object('hiddenColumns', '[]'::jsonb)
  || jsonb_build_object(
       'columnKeyAliases',
       COALESCE(
         (
           SELECT jsonb_object_agg(e.key, e.value)
           FROM jsonb_each_text(COALESCE(bulk_config->'columnKeyAliases', '{}'::jsonb)) AS e(key, value)
           WHERE e.key IN (
             SELECT jsonb_array_elements(COALESCE(bulk_config->'customColumns', '[]'::jsonb))->>'id'
           )
         ),
         '{}'::jsonb
       )
     )
WHERE id = ':process_id';
*/

-- 5) Verificar candidatos: nombre y email viven en la tabla candidates (no en bulk_config)
/*
SELECT id, name, email, phone,
       bulk_column_values IS NOT NULL AS tiene_columnas_custom,
       jsonb_object_keys(bulk_column_values) AS claves_custom
FROM candidates
WHERE process_id = ':process_id'
  AND archived = false
  AND discarded = false
LIMIT 5;
*/
