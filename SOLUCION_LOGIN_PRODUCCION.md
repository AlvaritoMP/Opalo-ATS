# 🔐 Solución: No Puedo Iniciar Sesión en Producción

## ❌ Problema

La app está desplegada en producción pero:
- No puedes iniciar sesión
- El usuario creado en localhost no funciona
- No tienes credenciales de acceso

## 🔍 Causa

El usuario creado en localhost probablemente:
- Tiene `app_name = 'Opalo ATS'` (correcto)
- Pero puede haber un problema con la contraseña o el filtro de `app_name`
- O el usuario no existe en la base de datos

---

## ✅ Solución: Crear Usuario en Producción

### Opción 1: Crear Usuario desde Supabase SQL Editor (Recomendado)

1. **Ve a Supabase Dashboard**:
   - Abre: https://supabase.com/dashboard
   - Selecciona tu proyecto
   - Ve a **SQL Editor**

2. **Ejecuta el Script**:
   - Copia el contenido de `CREAR_USUARIO_PRODUCCION.sql`
   - Pégalo en el SQL Editor
   - Haz clic en **"Run"** o **"Ejecutar"**

3. **Verifica que se Creó**:
   - Deberías ver el usuario en los resultados
   - Email: `admin@opaloats.com`
   - Role: `admin`
   - App Name: `Opalo ATS`

4. **Credenciales de Acceso**:
   - **Email**: `admin@opaloats.com`
   - **Password**: `admin123`
   - ⚠️ **IMPORTANTE**: Cambia esta contraseña después del primer login

---

### Opción 2: Verificar Usuario Existente

Si ya existe un usuario pero no funciona:

1. **Verificar usuarios existentes**:
   ```sql
   SELECT id, name, email, role, app_name, password_hash 
   FROM public.users 
   WHERE app_name = 'Opalo ATS';
   ```

2. **Si el usuario existe pero tiene `app_name` incorrecto**:
   ```sql
   UPDATE public.users 
   SET app_name = 'Opalo ATS'
   WHERE email = 'admin@opaloats.com';
   ```

3. **Si el usuario existe pero la contraseña no funciona**:
   ```sql
   UPDATE public.users 
   SET password_hash = 'admin123'
   WHERE email = 'admin@opaloats.com' AND app_name = 'Opalo ATS';
   ```

---

## 🔍 Diagnóstico: Verificar el Problema

### Paso 1: Verificar Usuarios en Supabase

Ejecuta en Supabase SQL Editor:

```sql
-- Ver todos los usuarios de Opalo ATS
SELECT id, name, email, role, app_name, created_at 
FROM public.users 
WHERE app_name = 'Opalo ATS'
ORDER BY created_at DESC;

-- Ver todos los usuarios (sin filtro)
SELECT id, name, email, role, app_name, created_at 
FROM public.users 
ORDER BY created_at DESC;
```

### Paso 2: Verificar Login en la App

1. Abre la app en producción
2. Intenta iniciar sesión con:
   - Email: `admin@opaloats.com`
   - Password: `admin123`
3. Abre la consola del navegador (F12)
4. Busca errores relacionados con login

### Paso 3: Verificar Filtro de app_name

El login debe filtrar por `app_name = 'Opalo ATS'`. Verifica que:

1. El usuario tenga `app_name = 'Opalo ATS'`
2. El código de login esté filtrando correctamente

---

## 🐛 Problemas Comunes

### Error: "Usuario no encontrado"

**Causa**: El usuario no existe o tiene `app_name` diferente

**Solución**: Ejecuta `CREAR_USUARIO_PRODUCCION.sql`

### Error: "Contraseña incorrecta"

**Causa**: La contraseña en la BD no coincide

**Solución**: 
```sql
UPDATE public.users 
SET password_hash = 'admin123'
WHERE email = 'admin@opaloats.com' AND app_name = 'Opalo ATS';
```

### Error: "app_name no coincide"

**Causa**: El usuario tiene `app_name = NULL` o diferente

**Solución**:
```sql
UPDATE public.users 
SET app_name = 'Opalo ATS'
WHERE email = 'admin@opaloats.com';
```

---

## ✅ Checklist

- [ ] Usuario creado en Supabase con `app_name = 'Opalo ATS'`
- [ ] Email: `admin@opaloats.com`
- [ ] Password: `admin123`
- [ ] Verificado en SQL Editor que el usuario existe
- [ ] Intentado login en producción
- [ ] Revisado consola del navegador para errores
- [ ] Cambiado contraseña después del primer login

---

## 🔒 Seguridad: Cambiar Contraseña Después del Primer Login

**IMPORTANTE**: Después de iniciar sesión exitosamente:

1. Ve a **Settings** → **Usuarios**
2. Edita tu usuario
3. Cambia la contraseña a una segura
4. O crea un nuevo usuario con contraseña segura y elimina el admin por defecto

---

## 📝 Script Completo para Copiar y Pegar

```sql
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
    password_hash = EXCLUDED.password_hash,
    app_name = 'Opalo ATS',
    visible_sections = EXCLUDED.visible_sections,
    updated_at = now();
```

---

## 🎯 Resumen

1. **Ejecuta el script SQL** en Supabase para crear el usuario
2. **Usa las credenciales**: `admin@opaloats.com` / `admin123`
3. **Cambia la contraseña** después del primer login
4. **Verifica** que el usuario tenga `app_name = 'Opalo ATS'`

