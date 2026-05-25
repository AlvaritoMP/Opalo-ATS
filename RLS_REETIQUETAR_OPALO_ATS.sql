-- =============================================================================
-- Re-etiquetar SOLO filas concretas de Opalo ATS (BD compartida)
-- =============================================================================
--
-- Cuándo usar: procesos/candidatos creados en Opalo ATS pero guardados como
-- app_name = 'Opalopy' por error (migración antigua). NUNCA en bloque.
--
-- INSTRUCCIONES:
--   1. Ejecutar la sección DIAGNÓSTICO.
--   2. Copiar los UUID confirmados a las listas de abajo.
--   3. Descomentar y ejecutar UPDATE solo si estás seguro.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- DIAGNÓSTICO: procesos masivos Opalo ATS (ajusta el filtro si hace falta)
-- ---------------------------------------------------------------------------
SELECT id, title, app_name, is_bulk_process, created_at
FROM public.processes
WHERE app_name IS DISTINCT FROM 'Opalo ATS'
ORDER BY created_at DESC
LIMIT 50;

-- Candidatos de un proceso concreto (reemplaza el UUID):
-- SELECT id, name, app_name, process_id FROM public.candidates
-- WHERE process_id = 'bdff73e0-616b-405a-9721-92b8516f0625';

-- ---------------------------------------------------------------------------
-- RE-ETIQUETAR (descomenta y pon IDs reales — ejecutar en orden)
-- ---------------------------------------------------------------------------

/*
-- 1) Procesos Opalo ATS mal etiquetados
UPDATE public.processes
SET app_name = 'Opalo ATS'
WHERE id IN (
    -- 'uuid-proceso-1',
    -- 'uuid-proceso-2'
)
  AND app_name IS DISTINCT FROM 'Opalo ATS';

-- 2) Candidatos de esos procesos
UPDATE public.candidates c
SET app_name = 'Opalo ATS'
FROM public.processes p
WHERE c.process_id = p.id
  AND p.app_name = 'Opalo ATS'
  AND c.app_name IS DISTINCT FROM 'Opalo ATS'
  AND c.process_id IN (
    -- 'uuid-proceso-1'
  );

-- 3) Tablas hijas (heredan del candidato/proceso ya corregido)
UPDATE public.stages s SET app_name = p.app_name
FROM public.processes p WHERE s.process_id = p.id AND s.app_name IS DISTINCT FROM p.app_name;

UPDATE public.document_categories dc SET app_name = p.app_name
FROM public.processes p WHERE dc.process_id = p.id AND dc.app_name IS DISTINCT FROM p.app_name;

UPDATE public.candidate_history ch SET app_name = c.app_name
FROM public.candidates c WHERE ch.candidate_id = c.id AND ch.app_name IS DISTINCT FROM c.app_name;

UPDATE public.post_its pi SET app_name = c.app_name
FROM public.candidates c WHERE pi.candidate_id = c.id AND pi.app_name IS DISTINCT FROM c.app_name;

UPDATE public.comments co SET app_name = c.app_name
FROM public.candidates c WHERE co.candidate_id = c.id AND co.app_name IS DISTINCT FROM c.app_name;

UPDATE public.interview_events ie SET app_name = c.app_name
FROM public.candidates c WHERE ie.candidate_id = c.id AND ie.app_name IS DISTINCT FROM c.app_name;

UPDATE public.attachments a SET app_name = COALESCE(p.app_name, c.app_name)
FROM public.processes p, public.candidates c
WHERE (a.process_id = p.id OR a.candidate_id = c.id)
  AND a.app_name IS DISTINCT FROM COALESCE(p.app_name, c.app_name);
*/

-- ---------------------------------------------------------------------------
-- NO cambiar DEFAULT global a 'Opalo ATS' en BD compartida (afectaría Opalopy).
-- Cada app debe enviar app_name en INSERT desde su código (APP_NAME).
-- ---------------------------------------------------------------------------
