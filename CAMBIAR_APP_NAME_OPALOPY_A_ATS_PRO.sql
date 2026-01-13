-- Cambiar app_name de 'Opalopy' a 'ATS Pro' en todas las tablas
-- IMPORTANTE: Este script solo actualiza registros con app_name = 'Opalopy'
-- NO afecta registros con app_name = 'Opalo ATS' u otros valores
-- Ejecuta este script en Supabase SQL Editor

-- Verificar primero qué se va a actualizar (ejecuta VERIFICAR_DATOS_OPALOPY.sql antes)

BEGIN;

-- Actualizar users
UPDATE users 
SET app_name = 'ATS Pro' 
WHERE app_name = 'Opalopy';

-- Actualizar processes
UPDATE processes 
SET app_name = 'ATS Pro' 
WHERE app_name = 'Opalopy';

-- Actualizar candidates
UPDATE candidates 
SET app_name = 'ATS Pro' 
WHERE app_name = 'Opalopy';

-- Actualizar stages
UPDATE stages 
SET app_name = 'ATS Pro' 
WHERE app_name = 'Opalopy';

-- Actualizar document_categories
UPDATE document_categories 
SET app_name = 'ATS Pro' 
WHERE app_name = 'Opalopy';

-- Actualizar attachments
UPDATE attachments 
SET app_name = 'ATS Pro' 
WHERE app_name = 'Opalopy';

-- Actualizar candidate_history
UPDATE candidate_history 
SET app_name = 'ATS Pro' 
WHERE app_name = 'Opalopy';

-- Actualizar post_its
UPDATE post_its 
SET app_name = 'ATS Pro' 
WHERE app_name = 'Opalopy';

-- Actualizar comments
UPDATE comments 
SET app_name = 'ATS Pro' 
WHERE app_name = 'Opalopy';

-- Actualizar interview_events
UPDATE interview_events 
SET app_name = 'ATS Pro' 
WHERE app_name = 'Opalopy';

-- Actualizar form_integrations
UPDATE form_integrations 
SET app_name = 'ATS Pro' 
WHERE app_name = 'Opalopy';

-- Actualizar app_settings
UPDATE app_settings 
SET app_name = 'ATS Pro' 
WHERE app_name = 'Opalopy';

-- Actualizar clients (si existe la tabla)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clients'
    ) THEN
        UPDATE clients 
        SET app_name = 'ATS Pro' 
        WHERE app_name = 'Opalopy';
    END IF;
END $$;

COMMIT;

-- Verificar el resultado
SELECT 'users' as tabla, COUNT(*) as registros_ats_pro
FROM users WHERE app_name = 'ATS Pro'
UNION ALL
SELECT 'processes', COUNT(*) FROM processes WHERE app_name = 'ATS Pro'
UNION ALL
SELECT 'candidates', COUNT(*) FROM candidates WHERE app_name = 'ATS Pro'
UNION ALL
SELECT 'stages', COUNT(*) FROM stages WHERE app_name = 'ATS Pro'
UNION ALL
SELECT 'document_categories', COUNT(*) FROM document_categories WHERE app_name = 'ATS Pro'
UNION ALL
SELECT 'attachments', COUNT(*) FROM attachments WHERE app_name = 'ATS Pro'
UNION ALL
SELECT 'candidate_history', COUNT(*) FROM candidate_history WHERE app_name = 'ATS Pro'
UNION ALL
SELECT 'post_its', COUNT(*) FROM post_its WHERE app_name = 'ATS Pro'
UNION ALL
SELECT 'comments', COUNT(*) FROM comments WHERE app_name = 'ATS Pro'
UNION ALL
SELECT 'interview_events', COUNT(*) FROM interview_events WHERE app_name = 'ATS Pro'
UNION ALL
SELECT 'form_integrations', COUNT(*) FROM form_integrations WHERE app_name = 'ATS Pro'
UNION ALL
SELECT 'app_settings', COUNT(*) FROM app_settings WHERE app_name = 'ATS Pro'
ORDER BY tabla;
