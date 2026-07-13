-- ============================================
-- MIGRACIÓN: Resaltado de candidatos trasladados
-- ============================================
-- Marca filas que llegan por traslado entre procesos
-- hasta que se edite o borre alguna columna del registro.
--
-- INSTRUCCIONES:
-- 1. Supabase → SQL Editor
-- 2. Ejecutar este script completo
-- ============================================

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS transfer_pending_review BOOLEAN;

COMMENT ON COLUMN candidates.transfer_pending_review IS
'TRUE si el candidato llegó por traslado desde otro proceso y aún no se ha editado/borrado ninguna columna en el destino. Se usa para resaltar la fila en la tabla masiva.';

CREATE INDEX IF NOT EXISTS idx_candidates_transfer_pending_review
ON candidates (process_id, transfer_pending_review)
WHERE transfer_pending_review = TRUE;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'candidates'
  AND column_name = 'transfer_pending_review';
