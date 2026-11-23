-- Quién pesa en ESTE proyecto de Supabase (ATS Alfa Oro / Opalo ATS).
-- Solo lectura. El resultado es una sola tabla.
-- OpsFlow y sus commercial_quotes no están aquí: si no aparece esa tabla,
-- esos logs no suman al egress de este proyecto.

DROP TABLE IF EXISTS egress_diag;
CREATE TEMP TABLE egress_diag (
    section text,
    detail text,
    bytes bigint,
    calls bigint,
    rows bigint
);

INSERT INTO egress_diag (section, detail, bytes, rows)
SELECT '1_tamano_public',
       c.relname,
       pg_total_relation_size(c.oid),
       GREATEST(c.reltuples, 0)::bigint
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relkind = 'r'
 ORDER BY pg_total_relation_size(c.oid) DESC
 LIMIT 25;

INSERT INTO egress_diag (section, detail, bytes, rows)
SELECT '0_proyecto',
       current_database()
           || ' | commercial_quotes='
           || CASE
                WHEN to_regclass('public.commercial_quotes') IS NULL THEN 'NO EXISTE'
                ELSE 'existe'
              END,
       0,
       0;

DO $counts$
DECLARE
    rec record;
    n bigint;
BEGIN
    FOR rec IN
        SELECT c.table_name
          FROM information_schema.columns c
          JOIN information_schema.tables t
            ON t.table_schema = c.table_schema
           AND t.table_name = c.table_name
         WHERE c.table_schema = 'public'
           AND c.column_name = 'app_name'
           AND t.table_type = 'BASE TABLE'
         ORDER BY c.table_name
    LOOP
        EXECUTE format(
            'SELECT count(*) FROM public.%I',
            rec.table_name
        ) INTO n;

        EXECUTE format(
            $q$
            INSERT INTO egress_diag (section, detail, bytes, rows)
            SELECT '2_filas_por_app',
                   %L || ' | ' || COALESCE(app_name, '(null)'),
                   0,
                   count(*)
              FROM public.%I
             GROUP BY app_name
            $q$,
            rec.table_name,
            rec.table_name
        );
    END LOOP;
END
$counts$;

DO $stats$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        INSERT INTO egress_diag (section, detail, bytes, calls, rows)
        SELECT '3_sql_mas_llamado',
               left(regexp_replace(query, '\s+', ' ', 'g'), 180),
               total_exec_time::bigint,
               calls,
               rows
          FROM pg_stat_statements
         WHERE query ILIKE '%public.%'
           AND query NOT ILIKE '%pg_stat_statements%'
           AND query NOT ILIKE '%egress_diag%'
         ORDER BY rows DESC
         LIMIT 20;
    ELSE
        INSERT INTO egress_diag (section, detail, bytes, rows)
        VALUES (
            '3_sql_mas_llamado',
            'pg_stat_statements no está activo: el desglose de llamadas no está disponible',
            0,
            0
        );
    END IF;
END
$stats$;

SELECT section,
       detail,
       pg_size_pretty(bytes) AS size_or_ms,
       calls,
       rows
  FROM egress_diag
 ORDER BY section, rows DESC NULLS LAST, bytes DESC;
