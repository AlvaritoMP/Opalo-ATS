# 🔧 Configurar Variables de Entorno del Backend en Easypanel

## ⚠️ Importante: Frontend vs Backend

Las variables que tienes ahora son para el **FRONTEND**:
- `VITE_SUPABASE_URL` → Para el frontend
- `VITE_SUPABASE_ANON_KEY` → Para el frontend
- `VITE_API_URL` → Para el frontend

El **BACKEND** necesita sus propias variables (sin `VITE_`):
- `SUPABASE_URL` → Para el backend
- `SUPABASE_SERVICE_KEY` → Para el backend (⚠️ NO es ANON_KEY, es SERVICE_KEY)
- Y otras variables específicas del backend

## 📋 Paso 1: Encontrar tu App del Backend en Easypanel

1. Ve a tu proyecto en **Easypanel**
2. Busca la app del **backend** (probablemente se llama algo como):
   - `opalo-atsopalo-backend`
   - `ats-backend`
   - `backend`
   - O similar

**Si NO tienes una app del backend separada**, significa que el backend está en la misma app que el frontend, lo cual no es lo ideal. En ese caso, necesitarías crear una app separada para el backend.

## 📋 Paso 2: Agregar Variables de Entorno al Backend

En la app del backend en Easypanel, ve a **"Environment Variables"** o **"Variables de Entorno"** y agrega:

### Variables Obligatorias para el Webhook de Tally:

```env
SUPABASE_URL=https://afhiiplxqtodqxvmswor.supabase.co
SUPABASE_SERVICE_KEY=tu-service-role-key-aqui
```

**⚠️ IMPORTANTE**: 
- `SUPABASE_URL` es la misma que `VITE_SUPABASE_URL` pero **sin el prefijo `VITE_`**
- `SUPABASE_SERVICE_KEY` es **DIFERENTE** de `VITE_SUPABASE_ANON_KEY`
  - `ANON_KEY` = Para el frontend (tiene restricciones RLS)
  - `SERVICE_KEY` = Para el backend (bypass RLS, puede crear candidatos)

### Cómo Obtener el SERVICE_KEY:

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard/project/afhiiplxqtodqxvmswor
2. Ve a **Settings** → **API**
3. Busca la sección **"Project API keys"**
4. Busca **"service_role" key** (⚠️ Es secreto, no lo expongas en el frontend)
5. Cópialo y pégalo en `SUPABASE_SERVICE_KEY`

### Variables que Probablemente Ya Tienes (para Google Drive):

```env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://tu-frontend-url.com
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
```

## 📋 Paso 3: Resumen de Variables Completas del Backend

Tu backend debería tener estas variables en Easypanel:

```env
# Puerto del servidor
PORT=5000

# Entorno
NODE_ENV=production

# Supabase (para webhooks de Tally)
SUPABASE_URL=https://afhiiplxqtodqxvmswor.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (tu service role key)

# Frontend
FRONTEND_URL=https://tu-frontend-url.com

# Google OAuth (si usas Google Drive)
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
```

## 🔍 Paso 4: Verificar que el Backend Existe

Si no encuentras una app del backend en Easypanel:

1. **Opción A**: El backend está en la misma app que el frontend
   - En ese caso, agrega las variables al mismo lugar donde están las `VITE_*`
   - Pero esto no es ideal porque el frontend y backend deberían estar separados

2. **Opción B**: Necesitas crear una app del backend
   - Ve a **"New App"** o **"Nueva Aplicación"** en Easypanel
   - Configura:
     - **Name**: `opalo-atsopalo-backend`
     - **Source**: Tu repositorio Git
     - **Root Directory**: `Opalo-ATS/backend`
     - **Port**: `5000`
   - Agrega todas las variables de entorno de arriba

## ✅ Paso 5: Verificar que Funciona

Después de agregar las variables:

1. Haz **Redeploy** del backend en Easypanel
2. Verifica los logs del backend
3. Prueba el endpoint de health:
   ```bash
   curl https://opalo-atsopalo-backend.bouasv.easypanel.host/health
   ```

## 🎯 Resumen Rápido

**Lo que necesitas hacer:**
1. ✅ Encontrar la app del backend en Easypanel
2. ✅ Agrega `SUPABASE_URL` (sin VITE_)
3. ✅ Agrega `SUPABASE_SERVICE_KEY` (obtener de Supabase Settings → API)
4. ✅ Haz redeploy

**Variables del Frontend (ya las tienes):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`

**Variables del Backend (necesitas agregar):**
- `SUPABASE_URL` (mismo valor que VITE_SUPABASE_URL pero sin VITE_)
- `SUPABASE_SERVICE_KEY` (diferente de VITE_SUPABASE_ANON_KEY)

## 🐛 Solución de Problemas

### No encuentro la app del backend

**Solución**: 
- Busca en Easypanel por "backend" o "api"
- O verifica si hay una app con la URL `opalo-atsopalo-backend.bouasv.easypanel.host`
- Si no existe, necesitas crearla (ver Opción B arriba)

### No sé dónde obtener el SERVICE_KEY

**Solución**:
1. Ve a: https://supabase.com/dashboard/project/afhiiplxqtodqxvmswor/settings/api
2. Busca **"service_role"** en la sección de API keys
3. Haz clic en el ícono de "eye" o "show" para verlo
4. Cópialo

### El backend no funciona después de agregar las variables

**Solución**:
- Verifica que las variables no tengan espacios extra
- Verifica que `SUPABASE_SERVICE_KEY` sea el service_role key, no el anon key
- Revisa los logs del backend en Easypanel para ver errores específicos
