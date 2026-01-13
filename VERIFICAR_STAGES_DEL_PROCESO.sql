-- Verificar stages del proceso de Opalo ATS
-- Ejecuta este script para ver si el proceso tiene stages
SELECT 
    s.id,
    s.process_id,
    s.name,
    s.order_index,
    s.app_name
FROM stages s
INNER JOIN processes p ON s.process_id = p.id
WHERE p.app_name = 'Opalo ATS'
ORDER BY s.order_index;
