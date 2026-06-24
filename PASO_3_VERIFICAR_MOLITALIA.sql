-- PASO 3 de 3: Verificar que Molitalia quedo restaurada
-- Proyecto: Supabase de PRODUCCION
-- Accion: ejecuta este archivo completo. Luego abre la app y recarga con Ctrl+F5.

SELECT
    title,
    jsonb_array_length(COALESCE(bulk_config->'columnOrder', '[]'::jsonb)) AS columnas_en_orden,
    jsonb_array_length(COALESCE(bulk_config->'customColumns', '[]'::jsonb)) AS columnas_custom,
    jsonb_array_length(COALESCE(bulk_config->'idealProfile'->'criteria', '[]'::jsonb)) AS criterios_perfil,
    bulk_config->'idealProfile'->'enabled' AS perfil_ideal_activo,
    jsonb_array_length(COALESCE(bulk_config->'quickReplies', '[]'::jsonb)) AS respuestas_rapidas
FROM processes
WHERE id = 'bdff73e0-616b-405a-9721-92b8516f0625';

-- Resultado esperado:
-- columnas_en_orden = 40
-- columnas_custom = 21
-- criterios_perfil = 21
-- perfil_ideal_activo = true
-- respuestas_rapidas = 3

SELECT elem->>'name' AS nombre_columna_whatsapp
FROM processes p,
     jsonb_array_elements(p.bulk_config->'customColumns') elem
WHERE p.id = 'bdff73e0-616b-405a-9721-92b8516f0625'
  AND (elem->>'name') ILIKE '%whatsapp%';

-- Resultado esperado: dos filas -> "Numero de Whatsapp" y "whatsapp"
