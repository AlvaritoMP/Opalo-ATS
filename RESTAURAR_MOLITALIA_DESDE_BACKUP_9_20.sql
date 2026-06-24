-- =============================================================================
-- RESTAURAR SOLO bulk_config DE MOLITALIA (backup 24-Jun 9:20 AM)
-- NO toca candidatos, ni otros procesos, ni el resto de la fila del proceso.
-- =============================================================================

-- PASO A — En el proyecto/clon del backup (9:20 AM), ejecuta y COPIA el resultado:
--
-- SELECT bulk_config
-- FROM processes
-- WHERE id = 'bdff73e0-616b-405a-9721-92b8516f0625'
--   AND app_name = 'Opalo ATS';

-- PASO B — En PRODUCCIÓN (proyecto actual), ANTES de cambiar nada, guarda copia de hoy:
SELECT
    id,
    title,
    bulk_config AS bulk_config_actual_por_si_acaso
FROM processes
WHERE id = 'bdff73e0-616b-405a-9721-92b8516f0625'
  AND app_name = 'Opalo ATS';

-- PASO C — En PRODUCCIÓN, pega el JSON del backup entre $$ ... $$ y ejecuta:

/*
UPDATE processes
SET bulk_config = $$
PEGAR_AQUI_EL_JSON_COMPLETO_DEL_BACKUP_9_20
$$::jsonb
WHERE id = 'bdff73e0-616b-405a-9721-92b8516f0625'
  AND app_name = 'Opalo ATS';
*/

-- PASO D — Verificar que volvió la config de esta mañana:

SELECT
    title,
    jsonb_array_length(COALESCE(bulk_config->'customColumns', '[]'::jsonb)) AS columnas_custom,
    jsonb_array_length(COALESCE(bulk_config->'columnOrder', '[]'::jsonb)) AS columnas_en_orden,
    jsonb_array_length(COALESCE(bulk_config->'idealProfile'->'criteria', '[]'::jsonb)) AS criterios_perfil,
    jsonb_array_length(COALESCE(bulk_config->'quickReplies', '[]'::jsonb)) AS respuestas_rapidas,
    jsonb_array_length(COALESCE(bulk_config->'infoPins', '[]'::jsonb)) AS referencias,
    bulk_config->'idealProfile'->'enabled' AS perfil_ideal_activo
FROM processes
WHERE id = 'bdff73e0-616b-405a-9721-92b8516f0625';

-- Los candidatos y bulk_column_values NO se modifican con este UPDATE.
-- Candidatos nuevos después de las 9:20 conservan sus filas; solo se restaura
-- cómo se muestra y configura la tabla (orden, perfil ideal, respuestas, etc.).
