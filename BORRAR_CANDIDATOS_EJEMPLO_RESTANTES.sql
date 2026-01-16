-- ============================================
-- SCRIPT: Borrar candidatos de ejemplo restantes
-- ============================================
-- 
-- Este script borra los candidatos de ejemplo que quedaron
-- en procesos no masivos (como "Head of Administration")
--
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase (https://supabase.com)
-- 2. Abre el SQL Editor
-- 3. Copia y pega este script completo
-- 4. Ejecuta el script (botón "Run")
-- ============================================

-- Borrar candidatos de ejemplo que están en procesos NO masivos
DELETE FROM candidates
WHERE app_name = 'Opalo ATS'
  AND (score_ia IS NOT NULL OR metadata_ia IS NOT NULL)
  AND process_id IN (
      SELECT id 
      FROM processes 
      WHERE app_name = 'Opalo ATS' 
        AND (is_bulk_process = false OR is_bulk_process IS NULL)
  );

-- Verificar cuántos se borraron
SELECT 
    COUNT(*) as candidatos_borrados
FROM candidates
WHERE app_name = 'Opalo ATS'
  AND (score_ia IS NOT NULL OR metadata_ia IS NOT NULL)
  AND process_id IN (
      SELECT id 
      FROM processes 
      WHERE app_name = 'Opalo ATS' 
        AND (is_bulk_process = false OR is_bulk_process IS NULL)
  );

-- Mostrar resumen de candidatos por proceso
SELECT 
    p.title as proceso,
    p.is_bulk_process,
    COUNT(c.id) as total_candidatos
FROM processes p
LEFT JOIN candidates c ON c.process_id = p.id AND c.app_name = 'Opalo ATS'
WHERE p.app_name = 'Opalo ATS'
GROUP BY p.id, p.title, p.is_bulk_process
ORDER BY p.is_bulk_process DESC, p.created_at DESC;
