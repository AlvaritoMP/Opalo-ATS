-- Script para crear el primer usuario Super Admin en Opalo ATS
-- Ejecuta este script en el SQL Editor de Supabase

-- IMPORTANTE: Cambia el email y password antes de ejecutar
-- El password se almacena en texto plano (cambiar por hash si es necesario)

INSERT INTO users (
    id,
    name,
    email,
    role,
    password_hash,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(), -- Genera un UUID único
    'Super Admin', -- Nombre del usuario
    'admin@opaloats.com', -- CAMBIA ESTE EMAIL
    'admin', -- Rol: admin, recruiter, client, viewer
    'admin123', -- CAMBIA ESTA CONTRASEÑA (se almacena en texto plano)
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING; -- Evita duplicados si el email ya existe

-- Verificar que se creó correctamente
SELECT id, name, email, role, created_at 
FROM users 
WHERE email = 'admin@opaloats.com';

