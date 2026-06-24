-- Restaurar orden de columnas Molitalia (bulk_config sin columnOrder)
-- Proceso: Auxiliares de Producción - Molitalia - Los Olivos
-- Ejecutar en Supabase SQL Editor

UPDATE processes
SET bulk_config = bulk_config || jsonb_build_object(
    'columnOrder',
    jsonb_build_array('name')
    || COALESCE(
        (
            SELECT jsonb_agg('custom_' || (elem->>'id') ORDER BY ord)
            FROM jsonb_array_elements(bulk_config->'customColumns') WITH ORDINALITY AS t(elem, ord)
        ),
        '[]'::jsonb
    )
    || jsonb_build_array(
        'dni', 'email', 'contactEmail', 'scoreIa', 'profileMatch', 'status', 'phone',
        'contactPhone', 'contactWhatsapp', 'contactLastUser',
        'fidelizPhone', 'fidelizWhatsapp', 'fidelizEmail',
        'source', 'registrationOrigin', 'province', 'district',
        'createdAt', 'nextInterview', 'schedule', 'stage', 'hiredStageUser'
    ),
    'hiddenColumns',
    jsonb_build_array('fidelizPhone', 'fidelizWhatsapp', 'fidelizEmail'),
    'pinnedColumns',
    jsonb_build_array('name')
)
WHERE id = 'bdff73e0-616b-405a-9721-92b8516f0625'
  AND app_name = 'Opalo ATS';

-- Verificar
SELECT
    title,
    jsonb_array_length(bulk_config->'columnOrder') AS columnas_en_orden,
    bulk_config->'hiddenColumns' AS ocultas,
    bulk_config->'pinnedColumns' AS fijadas
FROM processes
WHERE id = 'bdff73e0-616b-405a-9721-92b8516f0625';
