-- =============================================================================
-- Fix: error 409 al crear usuarios (correo duplicado entre apps / tenants)
--
-- Síntoma: POST /users devuelve 409 Conflict al crear usuario en Opalo ATS.
-- Causa: UNIQUE solo en email (compartido con Opalopy u otras instancias).
-- Solución: unicidad por (email, app_name).
--
-- Ejecutar en Supabase → SQL Editor (una vez).
-- =============================================================================

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'users'
          AND c.contype = 'u'
          AND pg_get_constraintdef(c.oid) ILIKE '%email%'
          AND pg_get_constraintdef(c.oid) NOT ILIKE '%app_name%'
    LOOP
        EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I', r.conname);
        RAISE NOTICE 'Dropped constraint %', r.conname;
    END LOOP;
END $$;

DROP INDEX IF EXISTS public.users_email_key;
DROP INDEX IF EXISTS public.idx_users_email_unique;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_app_name_unique
    ON public.users (lower(trim(email)), COALESCE(app_name, ''));

COMMENT ON INDEX public.users_email_app_name_unique IS
    'Permite el mismo email en distintas apps (Opalo ATS, Opalopy, etc.)';

NOTIFY pgrst, 'reload schema';

-- Verificación
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'users' AND indexname = 'users_email_app_name_unique';
