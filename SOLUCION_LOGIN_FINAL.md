# 🔐 Solución Final: No Puedo Ingresar con Usuario y Password

## ❌ Problema

No puedes ingresar con usuario y password en producción, aunque las variables de entorno están configuradas.

---

## 🔧 Corrección Inmediata: GOOGLE_REDIRECT_URI

**Tu `GOOGLE_REDIRECT_URI` está incompleto**. Debe incluir el path completo:

**❌ Incorrecto** (actual):
```
GOOGLE_REDIRECT_URI=https://opalo-atsopalo-backend.bouasv.easypanel.host
```

**✅ Correcto**:
```
GOOGLE_REDIRECT_URI=https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
```

**Acción**: Actualiza esta variable en el backend y haz redeploy.

---

## 🔍 Verificar Usuario en Supabase

El problema más probable es que **el usuario no existe** o tiene `app_name` incorrecto.

### Paso 1: Ejecutar Script de Verificación

Ve a **Supabase SQL Editor** y ejecuta:

```sql
-- Verificar usuarios de Opalo ATS
SELECT 
    id,
    name,
    email,
    role,
    app_name,
    password_hash,
    CASE 
        WHEN app_name = 'Opalo ATS' THEN '✅ app_name correcto'
        WHEN app_name IS NULL THEN '❌ app_name es NULL'
        ELSE '❌ app_name incorrecto: ' || app_name
    END as app_name_status,
    CASE 
        WHEN password_hash = 'admin123' THEN '✅ password correcto'
        ELSE '❌ password diferente'
    END as password_status
FROM public.users 
WHERE email = 'admin@opaloats.com' OR app_name = 'Opalo ATS'
ORDER BY created_at DESC;
```

### Paso 2: Si el Usuario No Existe o Está Incorrecto

Ejecuta este script para crear/corregir el usuario:

```sql
-- Crear o actualizar usuario para Opalo ATS
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
    'admin123',
    now(), 
    NULL, 
    NULL, 
    '["dashboard", "processes", "archived", "candidates", "forms", "letters", "calendar", "reports", "compare", "bulk-import", "users", "settings"]'::jsonb,
    'Opalo ATS'
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    password_hash = 'admin123',
    app_name = 'Opalo ATS',
    visible_sections = EXCLUDED.visible_sections,
    updated_at = now();

-- Verificar que se creó/actualizó correctamente
SELECT 
    email,
    app_name,
    password_hash,
    CASE 
        WHEN app_name = 'Opalo ATS' AND password_hash = 'admin123' THEN '✅ TODO CORRECTO'
        WHEN app_name != 'Opalo ATS' THEN '❌ app_name incorrecto'
        WHEN password_hash != 'admin123' THEN '❌ password incorrecto'
        ELSE '⚠️ Revisar'
    END as status
FROM public.users 
WHERE email = 'admin@opaloats.com';
```

**Credenciales**:
- **Email**: `admin@opaloats.com`
- **Password**: `admin123`

---

## 🔍 Verificar en el Navegador

### Paso 1: Abrir Consola del Navegador

1. Abre la app en producción
2. Presiona `F12` para abrir DevTools
3. Ve a la pestaña **Console**

### Paso 2: Intentar Login

1. Intenta iniciar sesión con:
   - Email: `admin@opaloats.com`
   - Password: `admin123`
2. Observa los mensajes en la consola

### Paso 3: Verificar Requests a Supabase

1. Ve a la pestaña **Network**
2. Busca requests a `supabase.co/rest/v1/users`
3. Verifica:
   - **Status code**: Debe ser `200` (no `401`)
   - **Response**: Debe contener el usuario

---

## 🐛 Problemas Comunes y Soluciones

### Error: "Invalid API key" (401)

**Causa**: Variables de Supabase no están en el build

**Solución**:
1. Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén marcadas como **"Build-time"**
2. Haz **rebuild** del frontend (obligatorio)

### Error: "Usuario no encontrado"

**Causa**: Usuario no existe o `app_name` incorrecto

**Solución**: Ejecuta el script SQL de arriba para crear/corregir el usuario

### Error: "Contraseña incorrecta"

**Causa**: `password_hash` no coincide

**Solución**: 
```sql
UPDATE public.users 
SET password_hash = 'admin123'
WHERE email = 'admin@opaloats.com' AND app_name = 'Opalo ATS';
```

### Login funciona pero luego se desconecta

**Causa**: Problema con localStorage o sesión

**Solución**: 
1. Limpia el localStorage del navegador
2. Intenta login de nuevo

---

## ✅ Checklist Completo

- [ ] `GOOGLE_REDIRECT_URI` corregido (con `/api/auth/google/callback`)
- [ ] Usuario existe en Supabase con `app_name = 'Opalo ATS'`
- [ ] `password_hash` es `'admin123'`
- [ ] Variables de Supabase marcadas como "Build-time"
- [ ] Frontend rebuild ejecutado después de configurar variables
- [ ] Intentado login con `admin@opaloats.com` / `admin123`
- [ ] Revisado consola del navegador para errores
- [ ] Verificado requests a Supabase en Network tab

---

## 📝 Resumen de Acciones

1. **Corregir `GOOGLE_REDIRECT_URI`** en el backend:
   ```
   https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
   ```

2. **Ejecutar script SQL** en Supabase para crear/corregir usuario

3. **Verificar variables del frontend**:
   - `VITE_SUPABASE_URL` ✅
   - `VITE_SUPABASE_ANON_KEY` ✅
   - Ambas marcadas como **"Build-time"** ✅

4. **Hacer rebuild del frontend** si cambiaste variables

5. **Intentar login** con `admin@opaloats.com` / `admin123`

---

## 🎯 Si Aún No Funciona

Comparte:
1. **Mensajes de error** de la consola del navegador
2. **Status code** de los requests a Supabase (en Network tab)
3. **Resultado del script SQL** de verificación

Con esa información podré ayudarte mejor.

