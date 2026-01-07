-- ============================================
-- REVERTIR CAMBIOS: Eliminar columnas app_name
-- ============================================
-- Este script elimina todas las columnas app_name que se hayan agregado
-- Ejecuta esto si quieres volver al estado original

-- IMPORTANTE: Esto eliminará la columna app_name de todas las tablas
-- Si ya tienes datos con app_name, se perderán

-- Eliminar índices primero (si existen)
DROP INDEX IF EXISTS idx_users_app_name;
DROP INDEX IF EXISTS idx_processes_app_name;
DROP INDEX IF EXISTS idx_candidates_app_name;
DROP INDEX IF EXISTS idx_stages_app_name;
DROP INDEX IF EXISTS idx_document_categories_app_name;
DROP INDEX IF EXISTS idx_attachments_app_name;
DROP INDEX IF EXISTS idx_candidate_history_app_name;
DROP INDEX IF EXISTS idx_post_its_app_name;
DROP INDEX IF EXISTS idx_comments_app_name;
DROP INDEX IF EXISTS idx_interview_events_app_name;
DROP INDEX IF EXISTS idx_form_integrations_app_name;
DROP INDEX IF EXISTS idx_app_settings_app_name;

-- Eliminar columnas app_name
ALTER TABLE users DROP COLUMN IF EXISTS app_name;
ALTER TABLE processes DROP COLUMN IF EXISTS app_name;
ALTER TABLE candidates DROP COLUMN IF EXISTS app_name;
ALTER TABLE stages DROP COLUMN IF EXISTS app_name;
ALTER TABLE document_categories DROP COLUMN IF EXISTS app_name;
ALTER TABLE attachments DROP COLUMN IF EXISTS app_name;
ALTER TABLE candidate_history DROP COLUMN IF EXISTS app_name;
ALTER TABLE post_its DROP COLUMN IF EXISTS app_name;
ALTER TABLE comments DROP COLUMN IF EXISTS app_name;
ALTER TABLE interview_events DROP COLUMN IF EXISTS app_name;
ALTER TABLE form_integrations DROP COLUMN IF EXISTS app_name;
ALTER TABLE app_settings DROP COLUMN IF EXISTS app_name;

-- Verificar que se eliminaron
SELECT 
    table_name,
    column_name
FROM information_schema.columns 
WHERE column_name = 'app_name'
ORDER BY table_name;

-- Si no devuelve resultados, todas las columnas se eliminaron correctamente

