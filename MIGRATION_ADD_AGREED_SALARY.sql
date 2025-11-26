-- ============================================
-- MIGRACIÓN: Agregar columna agreed_salary a candidates
-- ============================================
-- 
-- Este script agrega la columna agreed_salary a la tabla candidates
-- para habilitar la funcionalidad de "Salario Acordado".
--
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase (https://supabase.com)
-- 2. Abre el SQL Editor
-- 3. Copia y pega este script completo
-- 4. Ejecuta el script (botón "Run")
--
-- ============================================

-- Agregar columna agreed_salary a la tabla candidates
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS agreed_salary TEXT;

-- Comentario descriptivo para la columna
COMMENT ON COLUMN candidates.agreed_salary IS 'Salario acordado con el candidato. Puede incluir símbolos de moneda y formateo.';

-- Verificar que la columna se creó correctamente
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'candidates' 
  AND column_name = 'agreed_salary';

