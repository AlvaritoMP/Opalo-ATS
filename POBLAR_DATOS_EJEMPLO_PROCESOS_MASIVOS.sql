-- ============================================
-- Script para poblar datos de ejemplo
-- para la sección "Procesos Masivos"
-- ============================================
-- 
-- Este script crea:
-- - Las columnas score_ia y metadata_ia si no existen
-- - 1 proceso de ejemplo con etapas
-- - 20 candidatos de ejemplo con diferentes estados
-- - Algunos con score_ia y metadata_ia para probar tooltips
--
-- INSTRUCCIONES:
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. El script creará automáticamente las columnas necesarias
-- 3. Si no tienes procesos, el script creará uno
-- ============================================

-- PRIMERO: Crear las columnas de IA si no existen
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS metadata_ia TEXT,
ADD COLUMN IF NOT EXISTS score_ia NUMERIC(5, 2);

-- Comentarios descriptivos para las columnas
COMMENT ON COLUMN candidates.metadata_ia IS 'Resumen/metadata generado por IA (OpenAI) para el candidato. Se muestra en tooltip en la vista de Procesos Masivos.';
COMMENT ON COLUMN candidates.score_ia IS 'Score/puntuación generado por IA para el candidato. Valor numérico entre 0 y 100.';

-- Crear índice para búsquedas por score_ia (opcional, para ordenamiento rápido)
CREATE INDEX IF NOT EXISTS idx_candidates_score_ia ON candidates(score_ia DESC) WHERE score_ia IS NOT NULL;

-- Primero, verificar si hay procesos existentes
DO $$
DECLARE
    proceso_ejemplo_id UUID;
    etapa_inicial_id UUID;
    etapa_revision_id UUID;
    etapa_entrevista_id UUID;
    etapa_final_id UUID;
    etapa_oferta_id UUID;
    app_name_val TEXT := 'Opalo ATS';
    nuevo_proceso_id UUID;
BEGIN
    -- Buscar un proceso existente con stages
    SELECT p.id INTO proceso_ejemplo_id
    FROM processes p
    WHERE p.app_name = app_name_val
      AND EXISTS (SELECT 1 FROM stages s WHERE s.process_id = p.id AND s.app_name = app_name_val)
    LIMIT 1;
    
    -- Si no hay procesos con stages, crear uno nuevo
    IF proceso_ejemplo_id IS NULL THEN
        nuevo_proceso_id := gen_random_uuid();
        
        -- Crear el proceso MASIVO
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
            nuevo_proceso_id,
            'Reclutamiento Masivo - Desarrolladores Full Stack',
            'Proceso masivo para reclutamiento de desarrolladores. Optimizado para procesar grandes volúmenes de candidatos.',
            'en_proceso',
            10,
            app_name_val,
            true, -- Marcar como proceso masivo
            NOW()
        );
        
        -- Crear las etapas del proceso
        INSERT INTO stages (id, process_id, name, order_index, app_name) VALUES
            (gen_random_uuid(), nuevo_proceso_id, 'Postulación Inicial', 0, app_name_val),
            (gen_random_uuid(), nuevo_proceso_id, 'Revisión de CV', 1, app_name_val),
            (gen_random_uuid(), nuevo_proceso_id, 'Entrevista Técnica', 2, app_name_val),
            (gen_random_uuid(), nuevo_proceso_id, 'Entrevista Final', 3, app_name_val),
            (gen_random_uuid(), nuevo_proceso_id, 'Oferta', 4, app_name_val);
        
        proceso_ejemplo_id := nuevo_proceso_id;
        RAISE NOTICE '✅ Proceso creado: %', proceso_ejemplo_id;
    ELSE
        RAISE NOTICE '✅ Usando proceso existente: %', proceso_ejemplo_id;
    END IF;
    
    -- Obtener IDs de las etapas del proceso
    SELECT id INTO etapa_inicial_id
    FROM stages
    WHERE process_id = proceso_ejemplo_id 
      AND app_name = app_name_val
      AND order_index = 0
    LIMIT 1;
    
    SELECT id INTO etapa_revision_id
    FROM stages
    WHERE process_id = proceso_ejemplo_id 
      AND app_name = app_name_val
      AND order_index = 1
    LIMIT 1;
    
    SELECT id INTO etapa_entrevista_id
    FROM stages
    WHERE process_id = proceso_ejemplo_id 
      AND app_name = app_name_val
      AND order_index = 2
    LIMIT 1;
    
    SELECT id INTO etapa_final_id
    FROM stages
    WHERE process_id = proceso_ejemplo_id 
      AND app_name = app_name_val
      AND order_index = 3
    LIMIT 1;
    
    SELECT id INTO etapa_oferta_id
    FROM stages
    WHERE process_id = proceso_ejemplo_id 
      AND app_name = app_name_val
      AND order_index = 4
    LIMIT 1;
    
    -- Si no hay suficientes etapas, usar la primera disponible
    IF etapa_inicial_id IS NULL THEN
        SELECT id INTO etapa_inicial_id
        FROM stages
        WHERE process_id = proceso_ejemplo_id 
          AND app_name = app_name_val
        ORDER BY order_index
        LIMIT 1;
    END IF;
    
    IF etapa_revision_id IS NULL THEN etapa_revision_id := etapa_inicial_id; END IF;
    IF etapa_entrevista_id IS NULL THEN etapa_entrevista_id := etapa_inicial_id; END IF;
    IF etapa_final_id IS NULL THEN etapa_final_id := etapa_inicial_id; END IF;
    IF etapa_oferta_id IS NULL THEN etapa_oferta_id := etapa_inicial_id; END IF;
    
    -- Crear candidatos de ejemplo
    -- Candidatos con diferentes scores y metadata
    INSERT INTO candidates (
        id,
        name,
        email,
        phone,
        process_id,
        stage_id,
        score_ia,
        metadata_ia,
        description,
        app_name,
        archived,
        discarded,
        created_at
    ) VALUES
    -- Candidatos con score alto y metadata completa
    (
        gen_random_uuid(),
        'Carlos Mendoza',
        'carlos.mendoza@example.com',
        '+51 987 654 321',
        proceso_ejemplo_id,
        etapa_inicial_id,
        92.5,
        'Candidato con excelente perfil. Más de 8 años de experiencia en desarrollo full stack. Dominio sólido de React, Node.js, TypeScript y bases de datos PostgreSQL. Ha liderado equipos de desarrollo y tiene experiencia en arquitectura de microservicios. Buenas habilidades de comunicación y trabajo en equipo.',
        'Desarrollador con amplia experiencia en tecnologías modernas.',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '5 days'
    ),
    (
        gen_random_uuid(),
        'Ana García',
        'ana.garcia@example.com',
        '+51 987 654 322',
        proceso_ejemplo_id,
        etapa_revision_id,
        88.0,
        'Perfil muy sólido. 6 años de experiencia en desarrollo frontend y backend. Especializada en React y Node.js. Conocimientos en Docker, Kubernetes y CI/CD. Proactiva y con buena capacidad de aprendizaje.',
        'Desarrolladora full stack con experiencia en DevOps.',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '4 days'
    ),
    (
        gen_random_uuid(),
        'Luis Rodríguez',
        'luis.rodriguez@example.com',
        '+51 987 654 323',
        proceso_ejemplo_id,
        etapa_entrevista_id,
        85.5,
        'Buen candidato con 5 años de experiencia. Conocimientos sólidos en JavaScript, React y Node.js. Experiencia trabajando en equipos ágiles. Algunas áreas de mejora en arquitectura de sistemas escalables.',
        'Desarrollador con experiencia en metodologías ágiles.',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '3 days'
    ),
    (
        gen_random_uuid(),
        'María López',
        'maria.lopez@example.com',
        '+51 987 654 324',
        proceso_ejemplo_id,
        etapa_final_id,
        90.0,
        'Excelente candidata. 7 años de experiencia en desarrollo full stack. Experta en React, TypeScript, Node.js y bases de datos. Ha trabajado en proyectos de gran escala. Excelentes habilidades técnicas y de liderazgo.',
        'Desarrolladora senior con experiencia en proyectos enterprise.',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '2 days'
    ),
    -- Candidatos con score medio
    (
        gen_random_uuid(),
        'Pedro Sánchez',
        'pedro.sanchez@example.com',
        '+51 987 654 325',
        proceso_ejemplo_id,
        etapa_inicial_id,
        75.0,
        'Candidato con 4 años de experiencia. Conocimientos básicos en React y Node.js. Necesita más experiencia en arquitectura de sistemas y mejores prácticas de desarrollo.',
        'Desarrollador con experiencia intermedia.',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '6 days'
    ),
    (
        gen_random_uuid(),
        'Laura Martínez',
        'laura.martinez@example.com',
        '+51 987 654 326',
        proceso_ejemplo_id,
        etapa_revision_id,
        78.5,
        'Perfil interesante. 3 años de experiencia principalmente en frontend con React. Conocimientos básicos en backend. Buena actitud y disposición para aprender.',
        'Desarrolladora frontend con interés en full stack.',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '5 days'
    ),
    (
        gen_random_uuid(),
        'Roberto Fernández',
        'roberto.fernandez@example.com',
        '+51 987 654 327',
        proceso_ejemplo_id,
        etapa_inicial_id,
        72.0,
        'Candidato junior con 2 años de experiencia. Conocimientos básicos en JavaScript y React. Necesita más experiencia y mentoría para crecer en el rol.',
        'Desarrollador junior con potencial de crecimiento.',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '7 days'
    ),
    (
        gen_random_uuid(),
        'Carmen Torres',
        'carmen.torres@example.com',
        '+51 987 654 328',
        proceso_ejemplo_id,
        etapa_revision_id,
        80.0,
        'Buen perfil. 5 años de experiencia en desarrollo. Conocimientos sólidos en React y Node.js. Experiencia trabajando en startups. Buenas habilidades de comunicación.',
        'Desarrolladora con experiencia en entornos dinámicos.',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '4 days'
    ),
    -- Candidatos sin score_ia (para probar diferentes estados)
    (
        gen_random_uuid(),
        'Diego Ramírez',
        'diego.ramirez@example.com',
        '+51 987 654 329',
        proceso_ejemplo_id,
        etapa_inicial_id,
        NULL,
        NULL,
        'Desarrollador - evaluación pendiente',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '1 day'
    ),
    (
        gen_random_uuid(),
        'Sofía Herrera',
        'sofia.herrera@example.com',
        '+51 987 654 330',
        proceso_ejemplo_id,
        etapa_inicial_id,
        NULL,
        NULL,
        'Desarrolladora - evaluación pendiente',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '2 hours'
    ),
    (
        gen_random_uuid(),
        'Javier Morales',
        'javier.morales@example.com',
        '+51 987 654 331',
        proceso_ejemplo_id,
        etapa_revision_id,
        82.0,
        'Candidato con buen perfil técnico. 4 años de experiencia en desarrollo full stack. Conocimientos en React, Node.js y bases de datos. Buena capacidad de resolución de problemas.',
        'Desarrollador con habilidades técnicas sólidas.',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '3 days'
    ),
    (
        gen_random_uuid(),
        'Patricia Vargas',
        'patricia.vargas@example.com',
        '+51 987 654 332',
        proceso_ejemplo_id,
        etapa_entrevista_id,
        87.5,
        'Excelente candidata. 6 años de experiencia en desarrollo. Especializada en React y arquitectura de frontend. Experiencia liderando proyectos y trabajando con equipos distribuidos.',
        'Desarrolladora senior con experiencia en liderazgo técnico.',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '2 days'
    ),
    (
        gen_random_uuid(),
        'Fernando Castro',
        'fernando.castro@example.com',
        '+51 987 654 333',
        proceso_ejemplo_id,
        etapa_inicial_id,
        70.0,
        'Candidato junior. 1 año de experiencia en desarrollo web. Conocimientos básicos en HTML, CSS, JavaScript y React. Necesita más experiencia pero muestra buena actitud.',
        'Desarrollador junior con potencial.',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '6 days'
    ),
    (
        gen_random_uuid(),
        'Gabriela Ruiz',
        'gabriela.ruiz@example.com',
        '+51 987 654 334',
        proceso_ejemplo_id,
        etapa_revision_id,
        83.5,
        'Buen perfil. 5 años de experiencia en desarrollo. Conocimientos en React, Vue.js y Node.js. Experiencia en proyectos de e-commerce. Buena capacidad de trabajo en equipo.',
        'Desarrolladora con experiencia en e-commerce.',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '4 days'
    ),
    (
        gen_random_uuid(),
        'Ricardo Paredes',
        'ricardo.paredes@example.com',
        '+51 987 654 335',
        proceso_ejemplo_id,
        etapa_entrevista_id,
        79.0,
        'Candidato con experiencia intermedia. 4 años desarrollando aplicaciones web. Conocimientos en React, Node.js y MongoDB. Algunas áreas de mejora en mejores prácticas.',
        'Desarrollador con experiencia en stack MERN.',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '3 days'
    ),
    (
        gen_random_uuid(),
        'Valeria Jiménez',
        'valeria.jimenez@example.com',
        '+51 987 654 336',
        proceso_ejemplo_id,
        etapa_final_id,
        91.0,
        'Excelente candidata. 8 años de experiencia en desarrollo full stack. Experta en React, TypeScript, Node.js, PostgreSQL y arquitectura de microservicios. Ha liderado equipos y tiene experiencia en startups y empresas grandes.',
        'Desarrolladora senior con amplia experiencia técnica y de liderazgo.',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '1 day'
    ),
    (
        gen_random_uuid(),
        'Andrés Gutiérrez',
        'andres.gutierrez@example.com',
        '+51 987 654 337',
        proceso_ejemplo_id,
        etapa_inicial_id,
        76.5,
        'Candidato con 3 años de experiencia. Conocimientos en React y Node.js. Experiencia trabajando en proyectos pequeños y medianos. Buena actitud y disposición para aprender nuevas tecnologías.',
        'Desarrollador con experiencia en proyectos de mediana escala.',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '5 days'
    ),
    (
        gen_random_uuid(),
        'Natalia Díaz',
        'natalia.diaz@example.com',
        '+51 987 654 338',
        proceso_ejemplo_id,
        etapa_revision_id,
        84.0,
        'Buen perfil. 5 años de experiencia en desarrollo. Conocimientos sólidos en React, Node.js y bases de datos. Experiencia en proyectos de fintech. Buena capacidad de análisis y resolución de problemas.',
        'Desarrolladora con experiencia en fintech.',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '4 days'
    ),
    (
        gen_random_uuid(),
        'Miguel Ángel Soto',
        'miguel.soto@example.com',
        '+51 987 654 339',
        proceso_ejemplo_id,
        etapa_inicial_id,
        NULL,
        'Candidato recién postulado. Pendiente de evaluación inicial por IA.',
        'Desarrollador - evaluación pendiente',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '30 minutes'
    ),
    (
        gen_random_uuid(),
        'Elena Moreno',
        'elena.moreno@example.com',
        '+51 987 654 340',
        proceso_ejemplo_id,
        etapa_entrevista_id,
        86.5,
        'Excelente candidata. 6 años de experiencia en desarrollo full stack. Especializada en React, TypeScript y Node.js. Experiencia en proyectos de alta complejidad. Excelentes habilidades técnicas y de comunicación.',
        'Desarrolladora senior con experiencia en proyectos complejos.',
        app_name_val,
        false,
        false,
        NOW() - INTERVAL '2 days'
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Candidatos de ejemplo creados exitosamente';
    RAISE NOTICE '📊 Total de candidatos en el proceso: %', (SELECT COUNT(*) FROM candidates WHERE process_id = proceso_ejemplo_id AND app_name = app_name_val);
    
END $$;

-- Verificar los datos creados
SELECT 
    c.id,
    c.name,
    c.phone,
    c.score_ia,
    CASE 
        WHEN c.metadata_ia IS NOT NULL THEN LEFT(c.metadata_ia, 50) || '...'
        ELSE 'Sin metadata'
    END as metadata_preview,
    s.name as stage_name,
    c.created_at
FROM candidates c
JOIN stages s ON c.stage_id = s.id
WHERE c.app_name = 'Opalo ATS'
  AND c.archived = false
  AND c.discarded = false
ORDER BY c.created_at DESC
LIMIT 25;
