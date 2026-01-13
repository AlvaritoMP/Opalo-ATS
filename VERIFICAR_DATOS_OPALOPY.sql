-- Verificar cuántos registros tienen app_name = 'Opalopy' en cada tabla
-- Ejecuta este script para ver qué se va a actualizar

-- Lista de tablas que típicamente tienen app_name
SELECT 'users' as tabla, COUNT(*) as registros_opalopy
FROM users WHERE app_name = 'Opalopy'
UNION ALL
SELECT 'processes', COUNT(*) FROM processes WHERE app_name = 'Opalopy'
UNION ALL
SELECT 'candidates', COUNT(*) FROM candidates WHERE app_name = 'Opalopy'
UNION ALL
SELECT 'stages', COUNT(*) FROM stages WHERE app_name = 'Opalopy'
UNION ALL
SELECT 'document_categories', COUNT(*) FROM document_categories WHERE app_name = 'Opalopy'
UNION ALL
SELECT 'attachments', COUNT(*) FROM attachments WHERE app_name = 'Opalopy'
UNION ALL
SELECT 'candidate_history', COUNT(*) FROM candidate_history WHERE app_name = 'Opalopy'
UNION ALL
SELECT 'post_its', COUNT(*) FROM post_its WHERE app_name = 'Opalopy'
UNION ALL
SELECT 'comments', COUNT(*) FROM comments WHERE app_name = 'Opalopy'
UNION ALL
SELECT 'interview_events', COUNT(*) FROM interview_events WHERE app_name = 'Opalopy'
UNION ALL
SELECT 'form_integrations', COUNT(*) FROM form_integrations WHERE app_name = 'Opalopy'
UNION ALL
SELECT 'app_settings', COUNT(*) FROM app_settings WHERE app_name = 'Opalopy'
ORDER BY tabla;
