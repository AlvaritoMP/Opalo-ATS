-- ¿Siguen los DATOS de columnas personalizadas (Whatsapp, Ap Paterno, etc.) en candidatos?
-- Proceso Molitalia: bdff73e0-616b-405a-9721-92b8516f0625

-- 1) ¿Qué claves hay en bulk_column_values? (si aparecen, los datos NO se borraron)
SELECT
    key AS clave_guardada,
    COUNT(*) AS candidatos_con_dato
FROM candidates c
CROSS JOIN LATERAL jsonb_object_keys(COALESCE(c.bulk_column_values, '{}'::jsonb)) AS key
WHERE c.process_id = 'bdff73e0-616b-405a-9721-92b8516f0625'
  AND c.app_name = 'Opalo ATS'
GROUP BY key
ORDER BY candidatos_con_dato DESC, key;

-- 2) Muestra de datos en columna custom Whatsapp (id en bulk_config)
SELECT
    c.name,
    c.bulk_column_values->'33b6240e-039a-4c1a-9342-e99ecd1db649' AS whatsapp_custom,
    c.bulk_column_values->'__name__whatsapp' AS whatsapp_por_nombre
FROM candidates c
WHERE c.process_id = 'bdff73e0-616b-405a-9721-92b8516f0625'
  AND c.app_name = 'Opalo ATS'
  AND (
    c.bulk_column_values ? '33b6240e-039a-4c1a-9342-e99ecd1db649'
    OR c.bulk_column_values ? '__name__whatsapp'
  )
ORDER BY c.name
LIMIT 15;

-- 3) ¿Cuántos candidatos tienen bulk_column_values vacío vs con datos?
SELECT
    COUNT(*) FILTER (
        WHERE bulk_column_values IS NULL
          OR bulk_column_values = '{}'::jsonb
    ) AS sin_datos_bulk,
    COUNT(*) FILTER (
        WHERE bulk_column_values IS NOT NULL
          AND bulk_column_values <> '{}'::jsonb
    ) AS con_datos_bulk,
    COUNT(*) AS total
FROM candidates
WHERE process_id = 'bdff73e0-616b-405a-9721-92b8516f0625'
  AND app_name = 'Opalo ATS';

-- 4) Columnas custom definidas hoy en bulk_config (deben incluir Whatsapp)
SELECT
    elem->>'id' AS id,
    elem->>'name' AS nombre,
    elem->>'type' AS tipo
FROM processes p
CROSS JOIN LATERAL jsonb_array_elements(p.bulk_config->'customColumns') AS elem
WHERE p.id = 'bdff73e0-616b-405a-9721-92b8516f0625';
