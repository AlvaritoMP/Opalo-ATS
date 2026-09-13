-- Vincula usuarios del ATS con cuentas existentes de Mattermost (mismo email).
-- No crea usuarios en Mattermost. Ejecutar en el SQL Editor de Supabase.
--
-- Después, en Mattermost (System Console):
-- 1. Integrations → Enable OAuth 2.0 Service Provider = true
-- 2. Integrations → OAuth 2.0 Applications → Add:
--    Name: Opalo ATS
--    Callback URL: https://TU-BACKEND/api/auth/mattermost/callback
--    Trusted: Yes
-- 3. Copia Client ID y Secret al backend (EasyPanel):
--    MATTERMOST_URL=https://opalo-mattermost.bouasv.easypanel.host
--    MATTERMOST_OAUTH_CLIENT_ID=...
--    MATTERMOST_OAUTH_CLIENT_SECRET=...
--    MATTERMOST_OAUTH_REDIRECT_URI=https://TU-BACKEND/api/auth/mattermost/callback
--    MATTERMOST_BOT_TOKEN=  (opcional: token de admin para vincular emails)
-- 4. Reinicia el backend.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS mattermost_user_id TEXT,
    ADD COLUMN IF NOT EXISTS mattermost_username TEXT;

CREATE INDEX IF NOT EXISTS idx_users_mattermost_user_id
    ON users (mattermost_user_id)
    WHERE mattermost_user_id IS NOT NULL;

COMMENT ON COLUMN users.mattermost_user_id IS 'ID del usuario en Mattermost autoalojado (vinculado por email, sin duplicar cuentas)';
COMMENT ON COLUMN users.mattermost_username IS 'Username de Mattermost para deep links / DMs';
