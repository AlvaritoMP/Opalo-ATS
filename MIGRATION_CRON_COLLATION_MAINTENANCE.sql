-- Mantenimiento automático de collation version (Supabase)
-- Ejecutar en SQL Editor. Si falla el paso 1, habilitar pg_cron desde:
-- Dashboard → Integrations → Cron → Enable

-- Paso 1: activar pg_cron (crea el schema "cron")
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Paso 2: función idempotente (REFRESH seguro; compara antes/después)
CREATE OR REPLACE FUNCTION public.refresh_collation_if_needed()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  db_name text := current_database();
  before_version text;
  after_version text;
BEGIN
  SELECT datcollversion INTO before_version
  FROM pg_database
  WHERE datname = db_name;

  EXECUTE format('ALTER DATABASE %I REFRESH COLLATION VERSION', db_name);

  SELECT datcollversion INTO after_version
  FROM pg_database
  WHERE datname = db_name;

  IF before_version IS DISTINCT FROM after_version THEN
    RETURN format(
      'Refreshed: %s → %s',
      COALESCE(before_version, 'null'),
      COALESCE(after_version, 'null')
    );
  END IF;

  RETURN format('OK: %s (no change)', COALESCE(after_version, 'null'));
END;
$$;

-- Paso 3: job semanal (domingo 04:00 UTC) — reemplaza si ya existe
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'refresh-collation-if-needed';

SELECT cron.schedule(
  'refresh-collation-if-needed',
  '0 4 * * 0',
  $$SELECT public.refresh_collation_if_needed();$$
);

-- Verificación
SELECT datname, datcollversion FROM pg_database WHERE datname = current_database();
SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname = 'refresh-collation-if-needed';
