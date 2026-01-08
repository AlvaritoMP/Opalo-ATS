# 🔐 Solución Detallada: Login Funciona en Localhost pero No en Producción

## ❌ Problema

- ✅ Login funciona en localhost con `admin@opaloats.com` / `admin123`
- ❌ Login NO funciona en producción con las mismas credenciales
- ✅ Contraseña actualizada a `admin123` en la base de datos

## 🔍 Posibles Causas

### 1. Problema con `app_name`

El login filtra por `app_name = 'Opalo ATS'`. Si el usuario en producción tiene:
- `app_name = NULL`
- `app_name = 'Opalopy'`
- `app_name` diferente

El login no encontrará el usuario.

### 2. Problema con la Contraseña

Aunque actualizaste la contraseña, puede haber:
- Espacios extra en la contraseña
- Caracteres especiales codificados diferente
- La contraseña no se guardó correctamente

### 3. Problema con el Email

Puede haber diferencias en:
- Mayúsculas/minúsculas
- Espacios extra
- El email no coincide exactamente

---

## 🔧 Solución Paso a Paso

### Paso 1: Diagnosticar el Problema

Ejecuta en Supabase SQL Editor el script `DIAGNOSTICO_LOGIN_PRODUCCION.sql`:

```sql
-- Verificar usuario específico
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
    END as password_match
FROM public.users 
WHERE email = 'admin@opaloats.com';
```

**Verifica**:
- ✅ `app_name` debe ser exactamente `'Opalo ATS'` (case-sensitive)
- ✅ `password_hash` debe ser exactamente `'admin123'`
- ✅ `password_length` debe ser `8` (longitud de 'admin123')

### Paso 2: Corregir `app_name` si es Necesario

Si `app_name` es `NULL` o diferente:

```sql
UPDATE public.users 
SET app_name = 'Opalo ATS'
WHERE email = 'admin@opaloats.com';
```

### Paso 3: Corregir Contraseña si es Necesario

Si la contraseña no coincide exactamente:

```sql
-- Limpiar y establecer contraseña exacta
UPDATE public.users 
SET password_hash = 'admin123'
WHERE email = 'admin@opaloats.com' AND app_name = 'Opalo ATS';
```

### Paso 4: Verificar que Todo Esté Correcto

```sql
SELECT 
    id,
    name,
    email,
    role,
    app_name,
    password_hash,
    CASE 
        WHEN app_name = 'Opalo ATS' AND password_hash = 'admin123' THEN '✅ Todo correcto'
        WHEN app_name != 'Opalo ATS' THEN '❌ app_name incorrecto: ' || app_name
        WHEN password_hash != 'admin123' THEN '❌ password_hash incorrecto'
        ELSE '⚠️ Revisar'
    END as status
FROM public.users 
WHERE email = 'admin@opaloats.com';
```

Debería mostrar: `✅ Todo correcto`

---

## 🐛 Debugging en el Navegador

### Paso 1: Abrir Consola del Navegador

1. Abre la app en producción
2. Presiona `F12` para abrir DevTools
3. Ve a la pestaña **Console**

### Paso 2: Intentar Login y Ver Errores

1. Intenta iniciar sesión con `admin@opaloats.com` / `admin123`
2. Busca en la consola:
   - Errores de red (requests a Supabase)
   - Mensajes de login
   - Errores de autenticación

### Paso 3: Verificar Request a Supabase

En la pestaña **Network**:
1. Busca requests a `supabase.co/rest/v1/users`
2. Verifica la respuesta:
   - ¿Retorna el usuario?
   - ¿Qué tiene en `app_name`?
   - ¿Qué tiene en `password_hash`?

---

## ✅ Solución Completa (Script Todo-en-Uno)

Ejecuta este script completo en Supabase SQL Editor:

```sql
-- Script completo para asegurar que el usuario esté correcto
BEGIN;

-- 1. Verificar estado actual
SELECT 'Estado ANTES de la corrección:' as paso;
SELECT id, name, email, role, app_name, password_hash 
FROM public.users 
WHERE email = 'admin@opaloats.com';

-- 2. Actualizar app_name si es necesario
UPDATE public.users 
SET app_name = 'Opalo ATS'
WHERE email = 'admin@opaloats.com' AND (app_name IS NULL OR app_name != 'Opalo ATS');

-- 3. Actualizar contraseña exactamente
UPDATE public.users 
SET password_hash = 'admin123',
    updated_at = now()
WHERE email = 'admin@opaloats.com' AND app_name = 'Opalo ATS';

-- 4. Si no existe, crear el usuario
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
SELECT 
    gen_random_uuid(), 
    'Super Admin', 
    'admin@opaloats.com', 
    'admin', 
    'admin123',
    now(), 
    NULL, 
    NULL, 
    '["dashboard", "processes", "archived", "candidates", "forms", "letters", "calendar", "reports", "compare", "bulk-import", "users", "settings"]'::jsonb,
    'Opalo ATS'
WHERE NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE email = 'admin@opaloats.com' AND app_name = 'Opalo ATS'
);

-- 5. Verificar estado DESPUÉS
SELECT 'Estado DESPUÉS de la corrección:' as paso;
SELECT 
    id, 
    name, 
    email, 
    role, 
    app_name, 
    password_hash,
    CASE 
        WHEN app_name = 'Opalo ATS' AND password_hash = 'admin123' THEN '✅ CORRECTO - Debe funcionar'
        ELSE '❌ INCORRECTO - Revisar'
    END as status
FROM public.users 
WHERE email = 'admin@opaloats.com';

COMMIT;
```

---

## 🔍 Verificación Final

Después de ejecutar el script:

1. **Verifica en Supabase**:
   ```sql
   SELECT email, app_name, password_hash 
   FROM public.users 
   WHERE email = 'admin@opaloats.com';
   ```
   
   Debe mostrar:
   - `email`: `admin@opaloats.com`
   - `app_name`: `Opalo ATS` (exactamente, case-sensitive)
   - `password_hash`: `admin123` (exactamente)

2. **Intenta login en producción**:
   - Email: `admin@opaloats.com`
   - Password: `admin123`

3. **Si aún no funciona**, revisa la consola del navegador para ver qué error específico aparece.

---

## 🐛 Problemas Específicos y Soluciones

### Problema: "Usuario no encontrado"

**Causa**: `app_name` no coincide

**Solución**:
```sql
UPDATE public.users 
SET app_name = 'Opalo ATS'
WHERE email = 'admin@opaloats.com';
```

### Problema: "Contraseña incorrecta"

**Causa**: `password_hash` no coincide exactamente

**Solución**:
```sql
-- Limpiar espacios y establecer exactamente
UPDATE public.users 
SET password_hash = TRIM('admin123')
WHERE email = 'admin@opaloats.com' AND app_name = 'Opalo ATS';
```

### Problema: Login funciona pero luego se desconecta

**Causa**: Problema con `setCurrentUser` o localStorage

**Solución**: Revisa la consola del navegador para errores específicos.

---

## 📝 Notas Importantes

1. **Case-sensitive**: `'Opalo ATS'` debe ser exactamente así (O mayúscula, ATS mayúsculas)
2. **Sin espacios**: La contraseña `'admin123'` no debe tener espacios al inicio o final
3. **Mismo email**: El email debe ser exactamente `'admin@opaloats.com'` (sin espacios)

---

## ✅ Checklist de Verificación

- [ ] Ejecutado script de diagnóstico
- [ ] `app_name` es exactamente `'Opalo ATS'`
- [ ] `password_hash` es exactamente `'admin123'`
- [ ] Usuario existe en la base de datos
- [ ] Intentado login en producción
- [ ] Revisado consola del navegador
- [ ] Verificado requests a Supabase en Network tab

