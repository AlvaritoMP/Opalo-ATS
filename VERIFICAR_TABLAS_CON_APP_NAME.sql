-- Verificar todas las tablas que tienen la columna app_name
-- Ejecuta este script para ver qué tablas necesitan actualización

SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'app_name'
ORDER BY table_name;
