-- Resultados de pruebas psicológicas por candidato (Barsit, inteligencia figurativa, personalidad).
-- Ejecutar en Supabase antes de usar el enlace público de pruebas.

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS assessment_results JSONB DEFAULT NULL;

COMMENT ON COLUMN candidates.assessment_results IS
'Resultados de pruebas aplicadas al candidato: respuestas, puntajes y perfil D-I-S-C.';

CREATE INDEX IF NOT EXISTS idx_candidates_assessment_results
ON candidates USING GIN (assessment_results)
WHERE assessment_results IS NOT NULL;
