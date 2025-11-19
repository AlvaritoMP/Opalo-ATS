# 🔗 URLs de Redirección para Google Cloud Console

## 🎯 Entendiendo la Arquitectura

Tu aplicación tiene **dos backends diferentes**:

1. **Supabase** → Base de datos (PostgreSQL)
   - URL: `https://afhiiplxqtodqxvmswor.supabase.co`
   - Se usa para: Guardar datos (procesos, candidatos, usuarios)

2. **Backend Node.js** (el que creamos) → Google Drive OAuth
   - URL: La que te da Easypanel (ej: `https://backend-abc123.easypanel.host`)
   - Se usa para: Autenticación OAuth2 con Google Drive

**⚠️ IMPORTANTE**: Para Google Drive, NO uses la URL de Supabase. Usa la URL del backend Node.js que despliegues en Easypanel.

---

## 📍 URLs para Google Cloud Console

### Para Desarrollo Local:

**Authorized JavaScript origins:**
```
http://localhost:5000
```

**Authorized redirect URIs:**
```
http://localhost:5000/api/auth/google/callback
```

### Para Producción (Easypanel):

**Paso 1**: Despliega el backend en Easypanel
- Crea nueva app
- Root Directory: `backend`
- Deploy

**Paso 2**: Obtén la URL que te da Easypanel
- Ejemplo: `https://backend-abc123xyz.easypanel.host`
- O si tienes dominio: `https://api.tu-dominio.com`

**Paso 3**: Usa esa URL en Google Cloud Console

**Authorized JavaScript origins:**
```
https://backend-abc123xyz.easypanel.host
```
(Reemplaza con la URL real que te dio Easypanel)

**Authorized redirect URIs:**
```
https://backend-abc123xyz.easypanel.host/api/auth/google/callback
```
(URL + `/api/auth/google/callback`)

---

## 🔍 Ejemplo Completo

### Escenario: Backend desplegado en Easypanel

**URL que te da Easypanel:**
```
https://backend-xyz789.easypanel.host
```

**En Google Cloud Console, configura:**

1. **Authorized JavaScript origins:**
   ```
   http://localhost:5000
   https://backend-xyz789.easypanel.host
   ```

2. **Authorized redirect URIs:**
   ```
   http://localhost:5000/api/auth/google/callback
   https://backend-xyz789.easypanel.host/api/auth/google/callback
   ```

**En Easypanel Backend, variables de entorno:**
```
GOOGLE_REDIRECT_URI=https://backend-xyz789.easypanel.host/api/auth/google/callback
FRONTEND_URL=https://tu-frontend.easypanel.host
```

**En Easypanel Frontend, variables de entorno:**
```
VITE_API_URL=https://backend-xyz789.easypanel.host
```

---

## ❌ NO Usar Estas URLs

### ❌ URL de Supabase (INCORRECTO):
```
https://afhiiplxqtodqxvmswor.supabase.co/api/auth/google/callback
```
**Por qué no**: Supabase es solo para la base de datos, no maneja OAuth de Google Drive.

### ❌ URL del Frontend (INCORRECTO):
```
https://tu-frontend.easypanel.host/api/auth/google/callback
```
**Por qué no**: El frontend no puede manejar OAuth, necesita el backend.

---

## ✅ URL Correcta

### ✅ URL del Backend Node.js (CORRECTO):
```
https://tu-backend-url.easypanel.host/api/auth/google/callback
```
**Por qué sí**: El backend Node.js que creamos maneja OAuth2.

---

## 📝 Resumen Visual

```
┌─────────────────┐
│   Frontend      │  (React App)
│  Easypanel      │  → Usa: VITE_API_URL=https://backend-xyz.easypanel.host
└────────┬────────┘
         │
         │ HTTP Request
         ▼
┌─────────────────┐
│   Backend       │  (Node.js - Google Drive OAuth)
│  Easypanel      │  → URL: https://backend-xyz.easypanel.host
│                 │  → Esta es la URL para Google Cloud Console
└────────┬────────┘
         │
         │ OAuth2
         ▼
┌─────────────────┐
│  Google Cloud   │  → Redirect URI: https://backend-xyz.easypanel.host/api/auth/google/callback
│  OAuth          │
└─────────────────┘

┌─────────────────┐
│   Supabase      │  (Base de datos - SEPARADO)
│                 │  → URL: https://afhiiplxqtodqxvmswor.supabase.co
│                 │  → NO se usa para Google Drive OAuth
└─────────────────┘
```

---

## 🎯 Pasos en Orden

1. **Despliega el backend** en Easypanel (carpeta `backend/`)
2. **Anota la URL** que te da Easypanel
3. **Configura Google Cloud Console** con esa URL
4. **Configura variables de entorno** en Easypanel con esa URL

---

## 🔍 Cómo Verificar

### Verificar Backend:
Abre en tu navegador:
```
https://tu-backend-url.easypanel.host/health
```

Deberías ver:
```json
{
  "status": "ok",
  "service": "ATS Pro Backend - Google Drive API"
}
```

Si ves esto, esa es la URL correcta para usar en Google Cloud Console.

---

## ⚠️ Recordatorios

- ✅ Usa la URL del **backend Node.js** (no Supabase)
- ✅ La URL debe incluir `https://` (no `http://` en producción)
- ✅ La URL debe incluir la ruta completa `/api/auth/google/callback`
- ✅ La URL debe ser EXACTAMENTE igual en Google Cloud y en Easypanel

