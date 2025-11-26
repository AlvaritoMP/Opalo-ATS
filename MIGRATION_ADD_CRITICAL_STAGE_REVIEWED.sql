-- ============================================
-- MIGRACIÓN: Agregar columna critical_stage_reviewed_at a candidates
-- ============================================
-- 
-- Este script agrega la columna critical_stage_reviewed_at a la tabla candidates
-- para rastrear cuándo un usuario ha revisado un candidato en etapa crítica.
-- Esto permite que las alertas solo se muestren hasta que alguien revise el candidato.
--
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase (https://supabase.com)
-- 2. Abre el SQL Editor
-- 3. Copia y pega este script completo
-- 4. Ejecuta el script (botón "Run")
--
-- ============================================

-- Agregar columna critical_stage_reviewed_at a la tabla candidates
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS critical_stage_reviewed_at TIMESTAMPTZ;

-- Comentario descriptivo para la columna
COMMENT ON COLUMN candidates.critical_stage_reviewed_at IS 'Fecha en que un usuario revisó el candidato mientras estaba en una etapa crítica. Cuando es NULL, indica que el candidato en etapa crítica no ha sido revisado aún y debe mostrarse una alerta. Se resetea a NULL cuando el candidato se mueve a una nueva etapa crítica.';

-- Verificar que la columna se creó correctamente
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'candidates' 
  AND column_name = 'critical_stage_reviewed_at';

