-- =============================================================================
-- Auditoría app_name en TODAS las tablas (BD compartida Opalo ATS + Opalopy)
-- Solo lectura. Ejecutar en Supabase SQL Editor.
-- =============================================================================

-- 1. Resumen por tabla y tenant
SELECT 'users' AS tabla, COALESCE(app_name, '(NULL)') AS app_name, COUNT(*) AS filas
FROM public.users GROUP BY 2
UNION ALL
SELECT 'processes', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.processes GROUP BY 2
UNION ALL
SELECT 'candidates', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.candidates GROUP BY 2
UNION ALL
SELECT 'stages', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.stages GROUP BY 2
UNION ALL
SELECT 'document_categories', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.document_categories GROUP BY 2
UNION ALL
SELECT 'attachments', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.attachments GROUP BY 2
UNION ALL
SELECT 'candidate_history', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.candidate_history GROUP BY 2
UNION ALL
SELECT 'post_its', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.post_its GROUP BY 2
UNION ALL
SELECT 'comments', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.comments GROUP BY 2
UNION ALL
SELECT 'interview_events', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.interview_events GROUP BY 2
UNION ALL
SELECT 'form_integrations', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.form_integrations GROUP BY 2
UNION ALL
SELECT 'app_settings', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.app_settings GROUP BY 2
UNION ALL
SELECT 'clients', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.clients GROUP BY 2
UNION ALL
SELECT 'bulk_process_activity_log', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.bulk_process_activity_log GROUP BY 2
ORDER BY tabla, app_name;

-- 2. ¿Existe ALGUNA fila Opalopy / ATS Pro en toda la BD?
SELECT tenant, SUM(filas) AS total_filas FROM (
    SELECT COALESCE(app_name, '(NULL)') AS tenant, COUNT(*) AS filas FROM public.users GROUP BY 1
    UNION ALL SELECT COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.processes GROUP BY 1
    UNION ALL SELECT COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.candidates GROUP BY 1
    UNION ALL SELECT COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.form_integrations GROUP BY 1
) x
GROUP BY tenant
ORDER BY tenant;

-- 3. Procesos masivos: ¿solo Opalo ATS o también Opalopy?
SELECT COALESCE(app_name, '(NULL)') AS app_name,
       COUNT(*) FILTER (WHERE is_bulk_process = true) AS masivos,
       COUNT(*) AS total_procesos
FROM public.processes
GROUP BY 1;

-- 4. Muestra de procesos Opalopy/ATS Pro (si existen)
SELECT id, title, app_name, is_bulk_process, created_at
FROM public.processes
WHERE app_name IN ('Opalopy', 'ATS Pro')
ORDER BY created_at DESC
LIMIT 20;

-- 5. Muestra de procesos Opalo ATS (referencia)
SELECT id, title, app_name, is_bulk_process, created_at
FROM public.processes
WHERE app_name = 'Opalo ATS'
ORDER BY created_at DESC
LIMIT 10;
