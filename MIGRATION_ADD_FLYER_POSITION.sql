-- ============================================
-- MIGRACIÓN: Agregar columna flyer_position
-- ============================================
-- 
-- Este script agrega la columna flyer_position a la tabla processes
-- para habilitar la funcionalidad de ajuste de posición de imagen.
--
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase (https://supabase.com)
-- 2. Abre el SQL Editor
-- 3. Copia y pega este script completo
-- 4. Ejecuta el script (botón "Run")
--
-- ============================================

ALTER TABLE processes 
ADD COLUMN IF NOT EXISTS flyer_position TEXT;

-- La columna almacenará valores como:
--   - "50% 50%" (centro)
--   - "50% 0%" (arriba)
--   - "50% 100%" (abajo)
--   - "center center" (centro, valor por defecto)
-- Estos valores se usan directamente en CSS background-position

COMMENT ON COLUMN processes.flyer_position IS 'Posición del background de la imagen del flyer (formato CSS: "x% y%" o "center center"). Permite ajustar qué parte de la imagen se muestra en el resumen del proceso.';

-- Verificar que la columna se creó correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'processes' AND column_name = 'flyer_position';

