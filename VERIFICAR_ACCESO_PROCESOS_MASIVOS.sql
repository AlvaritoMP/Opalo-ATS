-- Diagnóstico: qué procesos masivos ve cada usuario de Opalo ATS
-- Ejecutar en Supabase → SQL Editor (solo lectura)

-- 1. Procesos masivos en la BD (deberían ser 5 con app_name = 'Opalo ATS')
SELECT id, title, app_name, is_bulk_process, client_id, created_at
FROM processes
WHERE app_name = 'Opalo ATS' AND is_bulk_process = true
ORDER BY created_at DESC;

-- 2. Cliente asociado a cada proceso masivo
SELECT p.title AS proceso, c.razon_social AS cliente, p.client_id
FROM processes p
LEFT JOIN clients c ON c.id = p.client_id
WHERE p.app_name = 'Opalo ATS' AND p.is_bulk_process = true
ORDER BY p.created_at DESC;

-- 3. Usuarios Opalo ATS y restricción de clientes
SELECT
    u.email,
    u.name,
    u.role,
    u.allowed_client_ids,
    CASE
        WHEN u.allowed_client_ids IS NULL THEN 'Ve TODOS los procesos masivos'
        WHEN cardinality(u.allowed_client_ids) = 0 THEN 'Ve TODOS (array vacío)'
        ELSE 'Restringido a ' || cardinality(u.allowed_client_ids) || ' cliente(s)'
    END AS acceso
FROM users u
WHERE u.app_name = 'Opalo ATS'
ORDER BY u.email;

-- 4. Simulación: procesos masivos visibles por cada usuario restringido
SELECT
    u.email,
    p.title AS proceso_visible,
    c.razon_social AS cliente
FROM users u
CROSS JOIN processes p
LEFT JOIN clients c ON c.id = p.client_id
WHERE u.app_name = 'Opalo ATS'
  AND p.app_name = 'Opalo ATS'
  AND p.is_bulk_process = true
  AND (
      u.allowed_client_ids IS NULL
      OR cardinality(u.allowed_client_ids) = 0
      OR p.client_id = ANY(u.allowed_client_ids)
  )
ORDER BY u.email, p.title;

-- 5. CORRECCIÓN (descomentar y ajustar email si hace falta):
-- Quitar restricción → el usuario ve todos los procesos masivos de Opalo ATS
-- UPDATE users
-- SET allowed_client_ids = NULL, updated_at = now()
-- WHERE app_name = 'Opalo ATS' AND email = 'usuario@ejemplo.com';
