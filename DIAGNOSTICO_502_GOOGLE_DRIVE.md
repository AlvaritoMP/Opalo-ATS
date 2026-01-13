# 🔍 Diagnóstico: Error 502 al Conectar Google Drive

## ❌ Problema

Error 502 cuando intentas conectar Google Drive. El popup muestra:
```
Failed to load resource: the server responded with a status of 502
```

---

## 🔍 Verificaciones Necesarias

### 1. Verificar Logs del Backend en EasyPanel

**Paso 1: Ver Logs**

1. En EasyPanel, ve a `opalo/atsopalo-backend`
2. Ve a la pestaña **"Logs"**
3. **Comparte los últimos logs** (especialmente cuando intentas conectar Google Drive)

**✅ Logs Correctos (Node.js corriendo):**
```
> opalo-ats-backend@1.0.0 start
> node src/server.js

🚀 Servidor backend corriendo en http://0.0.0.0:5000
📡 Frontend URL: https://opalo-atsopalo.bouasv.easypanel.host
🔐 Google OAuth Redirect URI: https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
✅ Backend listo para recibir peticiones
```

**❌ Logs Incorrectos (Nginx corriendo):**
```
nginx/1.29.4
using the "epoll" event method
start worker processes
```

### 2. Verificar Endpoint de OAuth

El backend debe tener la ruta `/api/auth/google/drive` (no `/api/auth/google`).

**Verificar en el código:**
- Ruta en backend: `/api/auth/google/drive` ✅
- Frontend debe llamar a: `https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/drive`

### 3. Verificar Configuración de Dominio

1. En EasyPanel, ve a `opalo/atsopalo-backend` > **Domains**
2. **Verifica** que el puerto sea **5000**:
   - **Port**: `5000` ✅
   - **NO** debe ser `80` o `443`

### 4. Verificar Variables de Entorno

En EasyPanel, ve a `opalo/atsopalo-backend` > **Environment** y verifica:

```
PORT=5000
NODE_ENV=production
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
FRONTEND_URL=https://opalo-atsopalo.bouasv.easypanel.host
```

### 5. Probar Endpoint Directamente

Abre en tu navegador:
```
https://opalo-atsopalo-backend.bouasv.easypanel.host/health
```

**✅ Debe retornar:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "service": "Opalo ATS Backend - Google Drive API"
}
```

**❌ Si retorna 502 o error:**
- El backend no está corriendo correctamente
- Verifica los logs

---

## ✅ Soluciones

### Solución 1: Backend Corriendo Nginx (INCORRECTO)

Si los logs muestran Nginx en lugar de Node.js:

1. **Verifica Build Path** en EasyPanel:
   - Ve a `opalo/atsopalo-backend` > **Source**
   - **Build Path**: `Opalo-ATS/backend` ✅
   - **File**: `Dockerfile` ✅

2. **Redeploy** el servicio:
   - Haz clic en **"Redeploy"**
   - Espera a que termine el build
   - Verifica los logs de nuevo

### Solución 2: Puerto Incorrecto en Dominio

Si el dominio está configurado para puerto `80` o `443`:

1. En EasyPanel, ve a `opalo/atsopalo-backend` > **Domains**
2. **Cambia** el puerto a `5000`
3. **Guarda** los cambios
4. **Redeploy** el servicio

### Solución 3: Endpoint Incorrecto

Verifica que el frontend esté llamando al endpoint correcto:

- **Correcto**: `https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/drive`
- **Incorrecto**: `https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google`

---

## 📋 Checklist de Diagnóstico

- [ ] Logs muestran Node.js corriendo (no Nginx)
- [ ] Endpoint `/health` funciona y retorna JSON
- [ ] Dominio configurado para puerto `5000`
- [ ] Variables de entorno configuradas correctamente
- [ ] Frontend llama a `/api/auth/google/drive` (no `/api/auth/google`)

---

## 🎯 Próximos Pasos

1. **Comparte los logs** del backend cuando intentas conectar Google Drive
2. **Verifica** que el endpoint `/health` funcione
3. **Verifica** la configuración del dominio (puerto 5000)
4. **Redeploy** si es necesario

---

## 💡 Nota

El error 502 generalmente significa que:
- El servicio backend no está corriendo
- El servicio está corriendo pero no está escuchando en el puerto correcto
- Hay un problema de configuración de dominio/puerto

La causa más común es que EasyPanel está usando el Dockerfile del frontend (Nginx) en lugar del Dockerfile del backend (Node.js).


