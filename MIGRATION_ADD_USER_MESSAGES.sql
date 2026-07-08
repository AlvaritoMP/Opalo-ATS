-- ============================================
-- MIGRACIÓN: Mensajería instantánea entre usuarios
-- ============================================
-- INSTRUCCIONES:
-- 1. Supabase → SQL Editor
-- 2. Ejecutar este script completo
-- ============================================

CREATE TABLE IF NOT EXISTS user_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    app_name TEXT NOT NULL DEFAULT 'Opalo ATS'
);

COMMENT ON TABLE user_messages IS
'Mensajes directos entre usuarios del ATS (mensajería instantánea interna).';

CREATE INDEX IF NOT EXISTS idx_user_messages_recipient_created
ON user_messages (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_messages_sender_created
ON user_messages (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_messages_app_name
ON user_messages (app_name);

-- Habilitar Realtime (ejecutar en Supabase si la tabla no aparece en Realtime)
-- ALTER PUBLICATION supabase_realtime ADD TABLE user_messages;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_messages'
ORDER BY ordinal_position;
