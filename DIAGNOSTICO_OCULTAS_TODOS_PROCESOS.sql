-- DIAGNOSTICO: procesos masivos con pocas columnas ocultas (posible config dañada)
-- Ejecutar en PRODUCCION. Copia el resultado completo.

SELECT
    id,
    title,
    jsonb_array_length(COALESCE(bulk_config->'columnOrder', '[]'::jsonb)) AS en_orden,
    jsonb_array_length(COALESCE(bulk_config->'customColumns', '[]'::jsonb)) AS custom,
    jsonb_array_length(COALESCE(bulk_config->'hiddenColumns', '[]'::jsonb)) AS ocultas,
    bulk_config->'hiddenColumns' AS lista_ocultas
FROM processes
WHERE is_bulk_process = true
  AND app_name = 'Opalo ATS'
ORDER BY title;

-- Si "ocultas" es 0 o muy bajo en procesos que antes tenian columnas ocultas,
-- el bulk_config se corrompio al abrir el proceso tras el deploy.
