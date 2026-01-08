-- Script de Diagnóstico para Login en Producción
-- Ejecuta este script en Supabase SQL Editor para diagnosticar el problema

-- 1. Verificar usuarios de Opalo ATS
SELECT 
    id,
    name,
    email,
    role,
    app_name,
    password_hash,
    LENGTH(password_hash) as password_length,
    created_at
FROM public.users 
WHERE app_name = 'Opalo ATS'
ORDER BY created_at DESC;

-- 2. Verificar usuario específico por email
SELECT 
    id,
    name,
    email,
    role,
    app_name,
    password_hash,
    LENGTH(password_hash) as password_length,
    CASE 
        WHEN password_hash = 'admin123' THEN '✅ Coincide'
        ELSE '❌ No coincide'
    END as password_match,
    created_at
FROM public.users 
WHERE email = 'admin@opaloats.com';

-- 3. Verificar si hay usuarios con app_name NULL o diferente
SELECT 
    id,
    name,
    email,
    role,
    app_name,
    CASE 
        WHEN app_name IS NULL THEN '⚠️ NULL'
        WHEN app_name != 'Opalo ATS' THEN '⚠️ Diferente: ' || app_name
        ELSE '✅ Correcto'
    END as app_name_status,
    created_at
FROM public.users 
WHERE email = 'admin@opaloats.com';

-- 4. Verificar todos los usuarios (para debugging)
SELECT 
    id,
    name,
    email,
    role,
    app_name,
    created_at
FROM public.users 
ORDER BY created_at DESC
LIMIT 10;

