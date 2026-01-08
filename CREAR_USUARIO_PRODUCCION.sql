-- Crear usuario Super Admin para Opalo ATS en Producción
-- Ejecutar este script en Supabase SQL Editor

-- Verificar usuarios existentes primero
SELECT id, name, email, role, app_name, created_at 
FROM public.users 
WHERE app_name = 'Opalo ATS' OR email = 'admin@opaloats.com'
ORDER BY created_at DESC;

-- Crear usuario Super Admin para Opalo ATS
INSERT INTO public.users (
    id, 
    name, 
    email, 
    role, 
    password_hash, 
    created_at, 
    avatar_url, 
    permissions, 
    visible_sections, 
    app_name
)
VALUES (
    gen_random_uuid(), 
    'Super Admin', 
    'admin@opaloats.com', 
    'admin', 
    'admin123',  -- ⚠️ Cambia esta contraseña después del primer login
    now(), 
    NULL, 
    NULL, 
    '["dashboard", "processes", "archived", "candidates", "forms", "letters", "calendar", "reports", "compare", "bulk-import", "users", "settings"]'::jsonb,
    'Opalo ATS'
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    app_name = 'Opalo ATS',
    visible_sections = EXCLUDED.visible_sections,
    updated_at = now();

-- Verificar que se creó correctamente
SELECT id, name, email, role, app_name, created_at 
FROM public.users 
WHERE email = 'admin@opaloats.com' AND app_name = 'Opalo ATS';

