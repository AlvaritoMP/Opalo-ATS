-- ============================================
-- SCRIPT: Mover candidatos de ejemplo a proceso masivo
-- ============================================
-- 
-- Este script:
-- 1. Identifica los candidatos de ejemplo (con score_ia o metadata_ia)
-- 2. Los desasocia del proceso "Head of Administration" (o cualquier proceso no masivo)
-- 3. Crea un nuevo proceso masivo
-- 4. Asocia los candidatos al nuevo proceso masivo
--
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase (https://supabase.com)
-- 2. Abre el SQL Editor
-- 3. Copia y pega este script completo
-- 4. Ejecuta el script (botón "Run")
-- ============================================

DO $$
DECLARE
    app_name_val TEXT := 'Opalo ATS';
    proceso_masivo_id UUID;
    etapa_inicial_id UUID;
    etapa_revision_id UUID;
    etapa_entrevista_id UUID;
    etapa_final_id UUID;
    etapa_oferta_id UUID;
    candidatos_afectados INTEGER;
BEGIN
    -- 1. Crear el proceso masivo
    proceso_masivo_id := gen_random_uuid();
    
    INSERT INTO processes (
        id,
        title,
        description,
        status,
        vacancies,
        app_name,
        is_bulk_process,
        created_at
    ) VALUES (
        proceso_masivo_id,
        'Reclutamiento Masivo - Desarrolladores Full Stack',
        'Proceso masivo para reclutamiento de desarrolladores. Optimizado para procesar grandes volúmenes de candidatos.',
        'en_proceso',
        10,
        app_name_val,
        true, -- Marcar como proceso masivo
        NOW()
    );
    
    RAISE NOTICE '✅ Proceso masivo creado: %', proceso_masivo_id;
    
    -- 2. Crear las etapas del proceso masivo
    etapa_inicial_id := gen_random_uuid();
    etapa_revision_id := gen_random_uuid();
    etapa_entrevista_id := gen_random_uuid();
    etapa_final_id := gen_random_uuid();
    etapa_oferta_id := gen_random_uuid();
    
    INSERT INTO stages (id, process_id, name, order_index, app_name) VALUES
        (etapa_inicial_id, proceso_masivo_id, 'Postulación Inicial', 0, app_name_val),
        (etapa_revision_id, proceso_masivo_id, 'Revisión de CV', 1, app_name_val),
        (etapa_entrevista_id, proceso_masivo_id, 'Entrevista Técnica', 2, app_name_val),
        (etapa_final_id, proceso_masivo_id, 'Entrevista Final', 3, app_name_val),
        (etapa_oferta_id, proceso_masivo_id, 'Oferta', 4, app_name_val);
    
    RAISE NOTICE '✅ Etapas del proceso masivo creadas';
    
    -- 3. Identificar y mover candidatos de ejemplo
    -- Candidatos que tienen score_ia o metadata_ia (son los de ejemplo)
    -- Y que están en procesos NO masivos (is_bulk_process = false o NULL)
    
    -- Primero, obtener los candidatos de ejemplo con un número de fila para distribuirlos
    WITH candidatos_ejemplo AS (
        SELECT 
            c.id,
            ROW_NUMBER() OVER (ORDER BY c.created_at) as rn,
            COUNT(*) OVER () as total
        FROM candidates c
        WHERE c.app_name = app_name_val
          AND (c.score_ia IS NOT NULL OR c.metadata_ia IS NOT NULL)
          AND c.process_id IN (
              SELECT id 
              FROM processes 
              WHERE app_name = app_name_val 
                AND (is_bulk_process = false OR is_bulk_process IS NULL)
          )
    )
    UPDATE candidates c
    SET 
        process_id = proceso_masivo_id,
        stage_id = CASE 
            -- Distribuir candidatos en diferentes etapas para ejemplo
            -- 30% en Postulación Inicial
            WHEN ce.rn <= ce.total * 0.3 THEN etapa_inicial_id
            -- 30% en Revisión de CV
            WHEN ce.rn <= ce.total * 0.6 THEN etapa_revision_id
            -- 20% en Entrevista Técnica
            WHEN ce.rn <= ce.total * 0.8 THEN etapa_entrevista_id
            -- 15% en Entrevista Final
            WHEN ce.rn <= ce.total * 0.95 THEN etapa_final_id
            -- 5% en Oferta
            ELSE etapa_oferta_id
        END
    FROM candidatos_ejemplo ce
    WHERE c.id = ce.id;
    
    GET DIAGNOSTICS candidatos_afectados = ROW_COUNT;
    
    RAISE NOTICE '✅ % candidatos movidos al proceso masivo', candidatos_afectados;
    
    -- 4. Verificar resultado
    SELECT COUNT(*) INTO candidatos_afectados
    FROM candidates
    WHERE app_name = app_name_val
      AND process_id = proceso_masivo_id;
    
    RAISE NOTICE '✅ Verificación: % candidatos ahora en el proceso masivo', candidatos_afectados;
    
    -- Mostrar resumen
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMEN:';
    RAISE NOTICE '  - Proceso masivo creado: %', proceso_masivo_id;
    RAISE NOTICE '  - Candidatos movidos: %', candidatos_afectados;
    RAISE NOTICE '========================================';
    
END $$;

-- Verificar el resultado
SELECT 
    p.id as proceso_id,
    p.title as proceso_titulo,
    p.is_bulk_process,
    COUNT(c.id) as total_candidatos
FROM processes p
LEFT JOIN candidates c ON c.process_id = p.id AND c.app_name = 'Opalo ATS'
WHERE p.app_name = 'Opalo ATS'
  AND (p.is_bulk_process = true OR c.score_ia IS NOT NULL OR c.metadata_ia IS NOT NULL)
GROUP BY p.id, p.title, p.is_bulk_process
ORDER BY p.is_bulk_process DESC, p.created_at DESC;
