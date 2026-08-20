-- ============================================
-- Identidad transversal: Nombres / Apellido Paterno / Apellido Materno
--
-- candidates.name queda como nombre completo DERIVADO
-- (nombres + apellido_paterno + apellido_materno).
-- DNI ya existía como candidates.dni.
--
-- INSTRUCCIONES:
-- 1. Supabase → SQL Editor
-- 2. Pegar y ejecutar este script completo
-- 3. Es seguro reejecutarlo (IF NOT EXISTS / backfill idempotente)
-- ============================================

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS nombres TEXT,
ADD COLUMN IF NOT EXISTS apellido_paterno TEXT,
ADD COLUMN IF NOT EXISTS apellido_materno TEXT;

COMMENT ON COLUMN candidates.nombres IS 'Nombres de pila (sin apellidos). Campo de sistema transversal.';
COMMENT ON COLUMN candidates.apellido_paterno IS 'Apellido paterno. Campo de sistema transversal.';
COMMENT ON COLUMN candidates.apellido_materno IS 'Apellido materno. Campo de sistema transversal; puede ir vacío.';
COMMENT ON COLUMN candidates.name IS 'Nombre completo derivado: nombres + apellido_paterno + apellido_materno.';
COMMENT ON COLUMN candidates.dni IS 'DNI / documento de identidad. Campo de sistema transversal.';

CREATE OR REPLACE FUNCTION opalo_split_pe_full_name(full_name text)
RETURNS TABLE(nombres text, apellido_paterno text, apellido_materno text)
LANGUAGE plpgsql
AS $$
DECLARE
    cleaned text;
    tokens text[];
    n int;
BEGIN
    cleaned := btrim(regexp_replace(coalesce(full_name, ''), '\s+', ' ', 'g'));
    IF cleaned IS NULL OR cleaned = '' THEN
        RETURN;
    END IF;
    tokens := regexp_split_to_array(cleaned, '\s+');
    n := coalesce(array_length(tokens, 1), 0);
    IF n = 0 THEN
        RETURN;
    ELSIF n = 1 THEN
        nombres := tokens[1];
    ELSIF n = 2 THEN
        nombres := tokens[1];
        apellido_paterno := tokens[2];
    ELSE
        nombres := array_to_string(tokens[1:n-2], ' ');
        apellido_paterno := tokens[n-1];
        apellido_materno := tokens[n];
    END IF;
    RETURN NEXT;
END;
$$;

-- Backfill desde claves estables de bulk_column_values y columnas custom del proceso
UPDATE candidates c
SET
    nombres = COALESCE(
        NULLIF(btrim(c.nombres), ''),
        NULLIF(btrim(c.bulk_column_values ->> '__name__nombres'), ''),
        NULLIF(btrim(c.bulk_column_values ->> '__name__nombre'), ''),
        (
            SELECT NULLIF(btrim(c.bulk_column_values ->> (col ->> 'id')), '')
            FROM jsonb_array_elements(COALESCE(p.bulk_config -> 'customColumns', '[]'::jsonb)) col
            WHERE lower(regexp_replace(
                translate(col ->> 'name', 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'),
                '\s+', ' ', 'g'
            )) IN ('nombres', 'nombre')
               OR (col ->> 'reportNamePart') = 'given_names'
            LIMIT 1
        )
    ),
    apellido_paterno = COALESCE(
        NULLIF(btrim(c.apellido_paterno), ''),
        NULLIF(btrim(c.bulk_column_values ->> '__name__apellido paterno'), ''),
        NULLIF(btrim(c.bulk_column_values ->> '__name__ap paterno'), ''),
        NULLIF(btrim(c.bulk_column_values ->> '__name__ap. paterno'), ''),
        (
            SELECT NULLIF(btrim(c.bulk_column_values ->> (col ->> 'id')), '')
            FROM jsonb_array_elements(COALESCE(p.bulk_config -> 'customColumns', '[]'::jsonb)) col
            WHERE (col ->> 'reportNamePart') = 'paternal_surname'
               OR lower(regexp_replace(
                    translate(col ->> 'name', 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'),
                    '\s+', ' ', 'g'
               )) IN ('apellido paterno', 'ap paterno', 'ap. paterno', 'ape. paterno', 'paterno', 'primer apellido')
            LIMIT 1
        )
    ),
    apellido_materno = COALESCE(
        NULLIF(btrim(c.apellido_materno), ''),
        NULLIF(btrim(c.bulk_column_values ->> '__name__apellido materno'), ''),
        NULLIF(btrim(c.bulk_column_values ->> '__name__ap materno'), ''),
        NULLIF(btrim(c.bulk_column_values ->> '__name__ap. materno'), ''),
        (
            SELECT NULLIF(btrim(c.bulk_column_values ->> (col ->> 'id')), '')
            FROM jsonb_array_elements(COALESCE(p.bulk_config -> 'customColumns', '[]'::jsonb)) col
            WHERE (col ->> 'reportNamePart') = 'maternal_surname'
               OR lower(regexp_replace(
                    translate(col ->> 'name', 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'),
                    '\s+', ' ', 'g'
               )) IN ('apellido materno', 'ap materno', 'ap. materno', 'ape. materno', 'materno', 'segundo apellido')
            LIMIT 1
        )
    )
FROM processes p
WHERE p.id = c.process_id;

-- Procesos masivos sin partes estructuradas: name histórico = solo nombres de pila
UPDATE candidates c
SET nombres = NULLIF(btrim(c.name), '')
FROM processes p
WHERE p.id = c.process_id
  AND COALESCE(p.is_bulk_process, false) = true
  AND NULLIF(btrim(c.nombres), '') IS NULL
  AND NULLIF(btrim(c.apellido_paterno), '') IS NULL
  AND NULLIF(btrim(c.apellido_materno), '') IS NULL
  AND NULLIF(btrim(c.name), '') IS NOT NULL;

-- Procesos normales (y resto) sin partes: partir name con heurística PE
WITH split AS (
    SELECT
        c.id,
        s.nombres,
        s.apellido_paterno,
        s.apellido_materno
    FROM candidates c
    JOIN processes p ON p.id = c.process_id
    CROSS JOIN LATERAL opalo_split_pe_full_name(c.name) AS s
    WHERE COALESCE(p.is_bulk_process, false) = false
      AND NULLIF(btrim(c.nombres), '') IS NULL
      AND NULLIF(btrim(c.name), '') IS NOT NULL
)
UPDATE candidates c
SET
    nombres = COALESCE(NULLIF(btrim(c.nombres), ''), split.nombres),
    apellido_paterno = COALESCE(NULLIF(btrim(c.apellido_paterno), ''), split.apellido_paterno),
    apellido_materno = COALESCE(NULLIF(btrim(c.apellido_materno), ''), split.apellido_materno)
FROM split
WHERE split.id = c.id;

-- Candidatos huérfanos (sin proceso) o procesos ya sin flag: partir name si sigue vacío
WITH split AS (
    SELECT
        c.id,
        s.nombres,
        s.apellido_paterno,
        s.apellido_materno
    FROM candidates c
    CROSS JOIN LATERAL opalo_split_pe_full_name(c.name) AS s
    WHERE NULLIF(btrim(c.nombres), '') IS NULL
      AND NULLIF(btrim(c.name), '') IS NOT NULL
)
UPDATE candidates c
SET
    nombres = COALESCE(NULLIF(btrim(c.nombres), ''), split.nombres),
    apellido_paterno = COALESCE(NULLIF(btrim(c.apellido_paterno), ''), split.apellido_paterno),
    apellido_materno = COALESCE(NULLIF(btrim(c.apellido_materno), ''), split.apellido_materno)
FROM split
WHERE split.id = c.id;

-- Recalcular nombre completo derivado cuando hay al menos una parte
UPDATE candidates
SET name = btrim(concat_ws(
    ' ',
    NULLIF(btrim(nombres), ''),
    NULLIF(btrim(apellido_paterno), ''),
    NULLIF(btrim(apellido_materno), '')
))
WHERE NULLIF(btrim(concat_ws(
    ' ',
    NULLIF(btrim(nombres), ''),
    NULLIF(btrim(apellido_paterno), ''),
    NULLIF(btrim(apellido_materno), '')
)), '') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_dni_app
    ON candidates (app_name, dni)
    WHERE dni IS NOT NULL AND dni <> '';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'candidates'
  AND column_name IN ('name', 'nombres', 'apellido_paterno', 'apellido_materno', 'dni')
ORDER BY column_name;
