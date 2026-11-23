-- Blindaje atómico de commercial_quotes.code (unique commercial_quotes_code_key).
-- Ejecutar en el SQL Editor de Supabase (proyecto ATS Alfa Oro).
-- El trigger asigna el siguiente código solo si NEW.code llega NULL o vacío.
-- El cliente debe dejar de calcular el correlativo (SELECT último + 1) y omitir `code` en el INSERT.

BEGIN;

DO $migration$
DECLARE
    code_type text;
    max_n bigint := 0;
BEGIN
    SELECT c.data_type
      INTO code_type
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.table_name = 'commercial_quotes'
       AND c.column_name = 'code';

    IF code_type IS NULL THEN
        RAISE EXCEPTION
            'No existe public.commercial_quotes.code. Confirme que está en el proyecto ATS Alfa Oro antes de continuar.';
    END IF;

    CREATE SEQUENCE IF NOT EXISTS public.commercial_quotes_code_seq AS bigint;

    IF code_type IN ('smallint', 'integer', 'bigint', 'numeric') THEN
        EXECUTE 'SELECT COALESCE(MAX(code), 0) FROM public.commercial_quotes' INTO max_n;
    ELSE
        EXECUTE $q$
            SELECT COALESCE(MAX((regexp_match(btrim(code::text), '([0-9]+)\s*$'))[1]::bigint), 0)
              FROM public.commercial_quotes
             WHERE code IS NOT NULL
               AND btrim(code::text) <> ''
               AND btrim(code::text) ~ '[0-9]'
        $q$ INTO max_n;
    END IF;

    IF max_n > 0 THEN
        PERFORM setval('public.commercial_quotes_code_seq', max_n, true);
    ELSE
        PERFORM setval('public.commercial_quotes_code_seq', 1, false);
    END IF;
END
$migration$;

CREATE OR REPLACE FUNCTION public.commercial_quotes_assign_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    code_type text;
    nxt bigint;
    prefix text := '';
    width integer := 0;
    sample text;
BEGIN
    IF NEW.code IS NOT NULL AND btrim(NEW.code::text) <> '' THEN
        RETURN NEW;
    END IF;

    SELECT c.data_type
      INTO code_type
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.table_name = 'commercial_quotes'
       AND c.column_name = 'code';

    nxt := nextval('public.commercial_quotes_code_seq');

    IF code_type IN ('smallint', 'integer', 'bigint', 'numeric') THEN
        NEW.code := nxt;
        RETURN NEW;
    END IF;

    SELECT btrim(code::text)
      INTO sample
      FROM public.commercial_quotes
     WHERE code IS NOT NULL
       AND btrim(code::text) ~ '[0-9]'
     ORDER BY (regexp_match(btrim(code::text), '([0-9]+)\s*$'))[1]::bigint DESC NULLS LAST
     LIMIT 1;

    IF sample IS NOT NULL THEN
        prefix := COALESCE(substring(sample FROM '^(.*?)[0-9]+\s*$'), '');
        width := COALESCE(length((regexp_match(sample, '([0-9]+)\s*$'))[1]), 0);
    END IF;

    IF width > 0 THEN
        NEW.code := prefix || lpad(nxt::text, width, '0');
    ELSIF prefix <> '' THEN
        NEW.code := prefix || nxt::text;
    ELSE
        NEW.code := nxt::text;
    END IF;

    RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS commercial_quotes_assign_code ON public.commercial_quotes;

CREATE TRIGGER commercial_quotes_assign_code
    BEFORE INSERT ON public.commercial_quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.commercial_quotes_assign_code();

REVOKE ALL ON FUNCTION public.commercial_quotes_assign_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commercial_quotes_assign_code() TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.commercial_quotes_code_seq TO anon, authenticated, service_role;

COMMIT;
