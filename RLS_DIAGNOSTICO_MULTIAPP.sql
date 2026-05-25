-- =============================================================================
-- Diagnóstico multi-app — Opalo ATS + Opalopy (solo lectura)
-- =============================================================================

-- 1. Filas por tenant (principal)
SELECT 'users' AS tabla, COALESCE(app_name, '(NULL)') AS app_name, COUNT(*) AS filas
FROM public.users GROUP BY 2
UNION ALL
SELECT 'processes', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.processes GROUP BY 2
UNION ALL
SELECT 'candidates', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.candidates GROUP BY 2
UNION ALL
SELECT 'form_integrations', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.form_integrations GROUP BY 2
UNION ALL
SELECT 'app_settings', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.app_settings GROUP BY 2
ORDER BY tabla, app_name;

-- 2. Políticas RLS por tabla y tenant
SELECT
    tablename,
    COUNT(*) FILTER (WHERE policyname LIKE '%\_opalo_ats' ESCAPE '\') AS opalo_ats,
    COUNT(*) FILTER (WHERE policyname LIKE '%\_opalopy' ESCAPE '\') AS opalopy,
    COUNT(*) AS total_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'processes', 'candidates', 'app_settings', 'form_integrations'
  )
GROUP BY tablename
ORDER BY tablename;

-- 3. Procesos masivos por tenant
SELECT COALESCE(app_name, '(NULL)') AS app_name, COUNT(*) AS procesos_masivos
FROM public.processes
WHERE is_bulk_process = true
GROUP BY 1;

-- 4. Integraciones Tally por tenant
SELECT COALESCE(app_name, '(NULL)') AS app_name, COUNT(*) AS integraciones
FROM public.form_integrations
GROUP BY 1;
