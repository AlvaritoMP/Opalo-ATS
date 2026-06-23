-- ============================================
-- MIGRACIÓN: Seguimiento de fidelización (teléfono, WhatsApp, correo)
-- ============================================
-- Réplica del semáforo de contactología principal, independiente por candidato.
-- Ejecutar en Supabase → SQL Editor
-- ============================================

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS fideliz_phone_status TEXT NOT NULL DEFAULT 'por_contactar',
ADD COLUMN IF NOT EXISTS fideliz_phone_attempt_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fideliz_phone_last_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fideliz_phone_last_user_name TEXT,
ADD COLUMN IF NOT EXISTS fideliz_whatsapp_status TEXT NOT NULL DEFAULT 'por_contactar',
ADD COLUMN IF NOT EXISTS fideliz_whatsapp_attempt_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fideliz_whatsapp_last_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fideliz_whatsapp_last_user_name TEXT,
ADD COLUMN IF NOT EXISTS fideliz_email_status TEXT NOT NULL DEFAULT 'por_contactar',
ADD COLUMN IF NOT EXISTS fideliz_email_attempt_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fideliz_email_last_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fideliz_email_last_user_name TEXT;

COMMENT ON COLUMN candidates.fideliz_phone_status IS
'Semáforo de fidelización (llamadas): por_contactar | en_intento | interesado | no_interesado | inubicable';

-- Historial: distinguir contactología principal vs fidelización
ALTER TABLE candidate_contact_attempts
ADD COLUMN IF NOT EXISTS tracking_scope TEXT NOT NULL DEFAULT 'contact';

ALTER TABLE candidate_contact_attempts DROP CONSTRAINT IF EXISTS candidate_contact_attempts_tracking_scope_check;
ALTER TABLE candidate_contact_attempts ADD CONSTRAINT candidate_contact_attempts_tracking_scope_check
    CHECK (tracking_scope IN ('contact', 'fidelization'));

CREATE INDEX IF NOT EXISTS idx_contact_attempts_scope_candidate
ON candidate_contact_attempts (candidate_id, tracking_scope, created_at DESC);

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'candidates'
  AND column_name LIKE 'fideliz_%'
ORDER BY column_name;
