-- Verificar el proceso de Opalo ATS (versión simple - ejecuta solo esta query)
SELECT 
    id,
    title,
    app_name,
    client_id,
    status,
    created_at
FROM processes
WHERE app_name = 'Opalo ATS'
ORDER BY created_at DESC;
