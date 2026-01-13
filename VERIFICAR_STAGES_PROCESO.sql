-- Verificar si el proceso tiene stages (ejecuta solo esta query)
SELECT 
    p.id as proceso_id,
    p.title as proceso_titulo,
    COUNT(s.id) as cantidad_stages
FROM processes p
LEFT JOIN stages s ON s.process_id = p.id AND s.app_name = 'Opalo ATS'
WHERE p.app_name = 'Opalo ATS'
GROUP BY p.id, p.title;
