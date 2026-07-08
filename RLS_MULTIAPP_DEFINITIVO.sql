-- =============================================================================

-- RLS MULTI-APP — Opalo ATS + Opalopy (base de datos COMPARTIDA)

-- =============================================================================

--

-- ARQUITECTURA (ver RLS_POLITICA.md):

--   • Una sola BD, misma clave anon, dos (o más) apps hermanas.

--   • Aislamiento por columna app_name en cada fila.

--   • Opalo ATS  → app_name = 'Opalo ATS'

--   • Opalopy    → app_name IN ('Opalopy', 'ATS Pro')

--   • Este script NO borra políticas de otros tenants ni mueve datos.

--   • Solo (re)crea políticas con sufijo _opalo_ats o _opalopy.

--

-- EJECUTAR: Supabase → SQL Editor → todo el archivo.

-- LUEGO: RLS_VERIFICAR.sql

-- =============================================================================



-- ---------------------------------------------------------------------------

-- Helper: políticas de un tenant en una tabla (idempotente)

-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.opalo_ensure_tenant_rls(

    p_table TEXT,

    p_suffix TEXT,

    p_using_expr TEXT,

    p_check_expr TEXT

) RETURNS VOID

LANGUAGE plpgsql

AS $$

DECLARE

    pol RECORD;

BEGIN

    IF NOT EXISTS (

        SELECT 1 FROM information_schema.tables

        WHERE table_schema = 'public' AND table_name = p_table

    ) THEN

        RAISE NOTICE 'Tabla public.% no existe — omitida', p_table;

        RETURN;

    END IF;



    -- Solo eliminar políticas de ESTE tenant (nunca las del otro)

    FOR pol IN

        SELECT policyname FROM pg_policies

        WHERE schemaname = 'public'

          AND tablename = p_table

          AND (

              policyname LIKE '%\_' || p_suffix ESCAPE '\'

              OR policyname LIKE 'anon\_%\_' || p_suffix ESCAPE '\'

          )

    LOOP

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, p_table);

    END LOOP;



    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table);



    EXECUTE format(

        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR SELECT TO public USING (%s)',

        p_table || '_public_select_' || p_suffix, p_table, p_using_expr

    );

    EXECUTE format(

        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR INSERT TO public WITH CHECK (%s)',

        p_table || '_public_insert_' || p_suffix, p_table, p_check_expr

    );

    EXECUTE format(

        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR UPDATE TO public USING (%s) WITH CHECK (%s)',

        p_table || '_public_update_' || p_suffix, p_table, p_using_expr, p_check_expr

    );

    EXECUTE format(

        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR DELETE TO public USING (%s)',

        p_table || '_public_delete_' || p_suffix, p_table, p_using_expr

    );



    EXECUTE format(

        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO anon, authenticated, service_role',

        p_table

    );



    RAISE NOTICE 'RLS tenant % en public.%', p_suffix, p_table;

END;

$$;



-- ---------------------------------------------------------------------------

-- Aplicar a todas las tablas de la app

-- ---------------------------------------------------------------------------

DO $$

DECLARE

    t TEXT;

    tables TEXT[] := ARRAY[

        'users', 'processes', 'candidates', 'stages', 'document_categories',

        'attachments', 'candidate_history', 'post_its', 'comments',

        'interview_events', 'form_integrations', 'app_settings', 'clients',

        'bulk_process_activity_log', 'user_messages'

    ];

BEGIN

    FOREACH t IN ARRAY tables LOOP

        PERFORM public.opalo_ensure_tenant_rls(

            t,

            'opalo_ats',

            'app_name = ''Opalo ATS''',

            'app_name = ''Opalo ATS'''

        );

        PERFORM public.opalo_ensure_tenant_rls(

            t,

            'opalopy',

            'app_name IN (''Opalopy'', ''ATS Pro'')',

            'app_name IN (''Opalopy'', ''ATS Pro'')'

        );

    END LOOP;

END $$;



GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;



NOTIFY pgrst, 'reload schema';



-- ---------------------------------------------------------------------------

-- Verificación: cada tabla debe tener ≥ 8 políticas (4 Opalo ATS + 4 Opalopy)

-- ---------------------------------------------------------------------------

SELECT

    t.tablename,

    t.rowsecurity AS rls_on,

    COALESCE(p.opalo_ats, 0) AS politicas_opalo_ats,

    COALESCE(p.opalopy, 0) AS politicas_opalopy,

    CASE

        WHEN NOT t.rowsecurity THEN '❌ RLS OFF'

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

    'bulk_process_activity_log', 'user_messages'

  )

ORDER BY t.tablename;



-- Distribución de datos por tenant (normal tener filas en ambos)

SELECT 'users' AS tabla, COALESCE(app_name, '(NULL)') AS app_name, COUNT(*) AS filas

FROM public.users GROUP BY 2

UNION ALL

SELECT 'processes', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.processes GROUP BY 2

UNION ALL

SELECT 'candidates', COALESCE(app_name, '(NULL)'), COUNT(*) FROM public.candidates GROUP BY 2

ORDER BY tabla, app_name;


