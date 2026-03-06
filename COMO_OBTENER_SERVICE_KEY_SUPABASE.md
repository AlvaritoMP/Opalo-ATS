# 🔑 Cómo Obtener el Service Key de Supabase

## 📋 Pasos Detallados

### Paso 1: Ir a la Configuración de API

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto (el que tiene la URL `afhiiplxqtodqxvmswor.supabase.co`)
3. En el menú lateral izquierdo, haz clic en **"Settings"** (⚙️ Configuración)
4. Luego haz clic en **"API"** (dentro de Settings)

### Paso 2: Encontrar el Service Role Key

En la página de API, verás varias secciones:

#### Sección 1: "Project URL"
- Aquí está tu URL del proyecto
- No es lo que necesitas

#### Sección 2: "Project API keys" ⭐ **AQUÍ ESTÁ**
Esta sección tiene varias claves:

1. **`anon` `public`** 
   - Esta es la clave pública (la que ya tienes como `VITE_SUPABASE_ANON_KEY`)
   - ⚠️ NO es la que necesitas

2. **`service_role` `secret`** ⭐ **ESTA ES LA QUE NECESITAS**
   - Esta es la clave secreta del servicio
   - Tiene un ícono de "ojo" 👁️ o "mostrar" al lado
   - Está marcada como **"secret"** (secreta)

### Paso 3: Mostrar y Copiar el Service Key

1. Busca la fila que dice **`service_role`** con el tipo **`secret`**
2. Haz clic en el ícono de **"ojo"** 👁️ o **"mostrar"** (puede estar oculto por defecto)
3. Se mostrará el key completo (es muy largo, empieza con `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
4. Haz clic en el ícono de **"copiar"** 📋 al lado del key
5. O selecciona todo el texto y cópialo (Ctrl+C)

### Paso 4: Verificar que es el Correcto

El Service Key debería:
- ✅ Empezar con `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`
- ✅ Ser muy largo (mucho más largo que el anon key)
- ✅ Estar marcado como **`service_role`** y **`secret`**
- ✅ Tener un botón de "ocultar" después de mostrarlo

## 🎯 Ubicación Exacta en la Interfaz

```
Supabase Dashboard
├── Tu Proyecto
    └── Settings (⚙️) (menú lateral izquierdo)
        └── API (dentro de Settings)
            └── Project API keys
                ├── anon public ← NO esta
                └── service_role secret ← ✅ ESTA ES
```

## 📸 Descripción Visual

En la página de API, verás algo así:

```
┌─────────────────────────────────────────┐
│ Project API keys                         │
├─────────────────────────────────────────┤
│ anon          public    [👁️] [📋]      │
│ service_role  secret    [👁️] [📋]  ← AQUÍ
└─────────────────────────────────────────┘
```

Haz clic en el 👁️ de la fila `service_role` para mostrarlo.

## ⚠️ Importante

- **NO** uses el `anon` key (el público)
- **SÍ** usa el `service_role` key (el secreto)
- El `service_role` key es **muy largo** (mucho más que el anon key)
- **NUNCA** lo expongas en el frontend o en código público
- Solo úsalo en el backend (servidor)

## 🔍 Si No Lo Ves

### Opción 1: Está Oculto por Seguridad

- Por defecto, el `service_role` key puede estar oculto
- Busca un botón o ícono de "mostrar" o "reveal" 👁️
- Haz clic en él para revelar el key

### Opción 2: Necesitas Permisos

- Asegúrate de estar logueado como **owner** o **admin** del proyecto
- Si no tienes permisos, pide al dueño del proyecto que te lo comparta

### Opción 3: URL Directa

Puedes ir directamente a:
```
https://supabase.com/dashboard/project/afhiiplxqtodqxvmswor/settings/api
```

Reemplaza `afhiiplxqtodqxvmswor` con tu project ID si es diferente.

## ✅ Verificación

Después de copiar el key, debería verse así en Easypanel:

```env
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg2ODgxNiwiZXhwIjoyMDc4NDQ0ODE2fQ.XXXXXXXXXXXXX
```

**Nota**: El key real será diferente, pero debería ser muy largo y empezar con `eyJ...`

## 🆘 Si Aún No Lo Encuentras

1. **Verifica que estás en el proyecto correcto**
   - Debe ser el que tiene `afhiiplxqtodqxvmswor` en la URL

2. **Verifica que tienes permisos**
   - Debes ser owner o admin del proyecto

3. **Busca en otra ubicación**
   - A veces aparece en "Project Settings" → "API" → "Keys"

4. **Contacta al dueño del proyecto**
   - Si no eres el dueño, pídele que te comparta el service_role key

## 📝 Nota de Seguridad

⚠️ **IMPORTANTE**: El `service_role` key tiene **acceso completo** a tu base de datos, sin restricciones de RLS (Row Level Security). 

- ✅ Úsalo SOLO en el backend (servidor)
- ❌ NUNCA lo pongas en el frontend
- ❌ NUNCA lo commitees a Git
- ❌ NUNCA lo compartas públicamente

Es por eso que está marcado como "secret" y puede estar oculto por defecto.
