-- Ficha de datos complementaria (formulario público por DNI, sin autenticación).
-- No altera etapas ni columnas del proceso de selección.

ALTER TABLE public.candidates
    ADD COLUMN IF NOT EXISTS complementary_data jsonb;

ALTER TABLE public.candidates
    ADD COLUMN IF NOT EXISTS complementary_filled_at timestamptz;

COMMENT ON COLUMN public.candidates.complementary_data IS
    'Datos de ficha complementaria llenados por el candidato (JSON). No reemplaza el pipeline.';

COMMENT ON COLUMN public.candidates.complementary_filled_at IS
    'Última vez que el candidato envió la ficha complementaria pública.';
