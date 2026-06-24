-- LISTA de procesos masivos en el proyecto BACKUP (backup opaloats)
-- Ejecutar en backup opaloats. Usa esta lista para restaurar cada proceso en produccion.

SELECT
    id,
    title,
    jsonb_array_length(COALESCE(bulk_config->'columnOrder', '[]'::jsonb)) AS en_orden,
    jsonb_array_length(COALESCE(bulk_config->'hiddenColumns', '[]'::jsonb)) AS ocultas
FROM processes
WHERE is_bulk_process = true
  AND app_name = 'Opalo ATS'
ORDER BY title;

-- Para cada proceso con pocas "ocultas" en produccion:
-- 1. En backup opaloats: SELECT bulk_config FROM processes WHERE id = 'EL_ID';
-- 2. En produccion: UPDATE processes SET bulk_config = $$ ... $$::jsonb WHERE id = 'EL_ID';
-- (Igual que hiciste con Molitalia en PASO_2)
