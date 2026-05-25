-- =============================================================================

-- Verificación RLS — BD compartida Opalo ATS + Opalopy

-- =============================================================================



-- 1. Políticas por tabla y tenant (esperado: ≥ 4 opalo_ats y ≥ 4 opalopy)

SELECT

    t.tablename,

    t.rowsecurity AS rls_enabled,

    COALESCE(p.opalo_ats, 0) AS politicas_opalo_ats,

    COALESCE(p.opalopy, 0) AS politicas_opalopy,

    CASE

        WHEN NOT EXISTS (

            SELECT 1 FROM information_schema.tables

            WHERE table_schema = 'public' AND table_name = t.tablename

        ) THEN '— no existe'

        WHEN NOT t.rowsecurity THEN '❌ RLS deshabilitado'

        WHEN COALESCE(p.opalo_ats, 0) < 4 THEN '❌ Faltan políticas Opalo ATS'

        WHEN COALESCE(p.opalopy, 0) < 4 THEN '❌ Faltan políticas Opalopy'

        ELSE '✅ OK'

    END AS status

FROM pg_tables t

LEFT JOIN (

    SELECT

        tablename,

        COUNT(*) FILTER (WHERE policyname LIKE '%\_opalo_ats' ESCAPE '\') AS opalo_ats,

        COUNT(*) FILTER (WHERE policyname LIKE '%\_opalopy' ESCAPE '\') AS opalopy

    FROM pg_policies

    WHERE schemaname = 'public'

    GROUP BY tablename

) p ON p.tablename = t.tablename

WHERE t.schemaname = 'public'

  AND t.tablename IN (

    'users', 'processes', 'candidates', 'stages', 'document_categories',

    'attachments', 'candidate_history', 'post_its', 'comments',

    'interview_events', 'form_integrations', 'app_settings', 'clients',

    'bulk_process_activity_log'

  )

ORDER BY status DESC, t.tablename;



-- 2. Distribución de datos por tenant (NORMAL ver Opalopy y Opalo ATS)

SELECT 'users' AS tbl, COALESCE(app_name, '(NULL)') AS app_name, COUNT(*) AS filas

FROM public.users GROUP BY 2

UNION ALL

SELECT 'processes', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.processes GROUP BY 2

UNION ALL

SELECT 'candidates', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.candidates GROUP BY 2

UNION ALL

SELECT 'app_settings', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.app_settings GROUP BY 2

ORDER BY tbl, app_name;



-- 3. Resumen Opalo ATS (lo que ve esta app)

SELECT 'users' AS tbl, COUNT(*) AS filas_opalo_ats

FROM public.users WHERE app_name = 'Opalo ATS'

UNION ALL

SELECT 'processes', COUNT(*) FROM public.processes WHERE app_name = 'Opalo ATS'

UNION ALL

SELECT 'candidates', COUNT(*) FROM public.candidates WHERE app_name = 'Opalo ATS'

UNION ALL

SELECT 'form_integrations', COUNT(*) FROM public.form_integrations WHERE app_name = 'Opalo ATS';



-- 4. GRANTs anon (esperado: 4 por tabla existente)

SELECT

    table_name,

    COUNT(DISTINCT privilege_type) AS anon_grants

FROM information_schema.role_table_grants

WHERE table_schema = 'public'

  AND grantee = 'anon'

  AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')

  AND table_name IN ('users', 'processes', 'candidates', 'app_settings')

GROUP BY table_name

ORDER BY table_name;


