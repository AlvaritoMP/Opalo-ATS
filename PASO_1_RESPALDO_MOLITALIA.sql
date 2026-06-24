-- PASO 1 de 3: Respaldo de la config ACTUAL en PRODUCCION (por si acaso)
-- Proyecto: Supabase de PRODUCCION (el que usa opalo-atsopalo.bouasv.easypanel.host)
-- Accion: ejecuta este archivo completo y guarda el resultado en un archivo de texto en tu PC.

SELECT id, title, app_name, bulk_config
FROM processes
WHERE id = 'bdff73e0-616b-405a-9721-92b8516f0625';
