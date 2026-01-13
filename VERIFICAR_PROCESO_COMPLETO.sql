-- Verificar el proceso de Opalo ATS con todos los campos disponibles
-- Este script funciona incluso si client_id no existe
SELECT 
    id,
    title,
    app_name,
    status,
    vacancies,
    created_at
FROM processes
WHERE app_name = 'Opalo ATS'
ORDER BY created_at DESC;
