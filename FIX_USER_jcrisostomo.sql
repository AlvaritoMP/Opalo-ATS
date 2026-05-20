-- Usuario: jcrisostomo@opaloservicios.com
-- Ejecutar en Supabase → SQL Editor (después de MIGRATION_FIX_USERS_*)
-- Cambia name, role y password_hash si hace falta.

INSERT INTO public.users (
    id,
    name,
    email,
    role,
    password_hash,
    app_name,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),
    'J. Crisostomo',  -- Ajusta el nombre
    'jcrisostomo@opaloservicios.com',
    'viewer',         -- admin | recruiter | client | viewer
    'CAMBIAR_PASSWORD',  -- Contraseña inicial (texto plano, como el resto de usuarios)
    'Opalo ATS',
    now(),
    now()
)
ON CONFLICT (email) DO UPDATE SET
    app_name = 'Opalo ATS',
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    updated_at = now();

-- Verificar
SELECT id, name, email, role, app_name, created_at
FROM public.users
WHERE email = 'jcrisostomo@opaloservicios.com';
