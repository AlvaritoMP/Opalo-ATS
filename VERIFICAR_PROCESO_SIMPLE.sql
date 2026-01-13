-- Verificar el proceso de Opalo ATS (versión simple - ejecuta solo esta query)
-- Nota: client_id puede no existir, por eso se verifica primero
SELECT 
    id,
    title,
    app_name,
    status,
    created_at
FROM processes
WHERE app_name = 'Opalo ATS'
ORDER BY created_at DESC;
