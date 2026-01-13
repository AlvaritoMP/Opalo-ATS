# 🔍 Verificar Backend - Error 502

## ❌ Problema

Error 502 al conectar Google Drive. El backend no está respondiendo.

---

## ✅ Verificaciones Inmediatas

### 1. Verificar Logs del Backend

**En EasyPanel:**

1. Ve a `opalo/atsopalo-backend`
2. Ve a la pestaña **"Logs"**
3. **Comparte los últimos logs** (especialmente cuando intentas conectar Google Drive)

**✅ Logs Correctos (Node.js):**
```
> opalo-ats-backend@1.0.0 start
> node src/server.js

🚀 Servidor backend corriendo en http://0.0.0.0:5000
📡 Frontend URL: https://opalo-atsopalo.bouasv.easypanel.host
🔐 Google OAuth Redirect URI: https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
✅ Backend listo para recibir peticiones
```

**❌ Logs Incorrectos (Nginx):**
```
nginx/1.29.4
using the "epoll" event method
start worker processes
```

### 2. Probar Endpoint /health

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

### 3. Verificar Configuración de Dominio

1. En EasyPanel, ve a `opalo/atsopalo-backend` > **Domains**
2. **Verifica** que el puerto sea **5000**:
   - **Port**: `5000` ✅
   - **NO** debe ser `80` o `443`

### 4. Verificar Build Path

1. En EasyPanel, ve a `opalo/atsopalo-backend` > **Source**
2. **Verifica**:
   - **Build Path**: `Opalo-ATS/backend` ✅
   - **File**: `Dockerfile` ✅
   - **Build**: `Dockerfile` (seleccionado) ✅

---

## 🔧 Soluciones

### Solución 1: Backend Corriendo Nginx (INCORRECTO)

Si los logs muestran Nginx:

1. **Verifica Build Path**:
   - Ve a `opalo/atsopalo-backend` > **Source**
   - **Build Path**: `Opalo-ATS/backend` ✅
   - **File**: `Dockerfile` ✅

2. **Redeploy**:
   - Haz clic en **"Redeploy"**
   - Espera a que termine el build
   - Verifica los logs de nuevo

### Solución 2: Puerto Incorrecto

Si el dominio está en puerto `80` o `443`:

1. En EasyPanel, ve a `opalo/atsopalo-backend` > **Domains**
2. **Cambia** el puerto a `5000`
3. **Guarda** los cambios
4. **Redeploy** el servicio

### Solución 3: Variables de Entorno Faltantes

Verifica que estas variables estén configuradas:

```
PORT=5000
NODE_ENV=production
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
FRONTEND_URL=https://opalo-atsopalo.bouasv.easypanel.host
```

---

## 📋 Checklist

- [ ] Logs muestran Node.js corriendo (no Nginx)
- [ ] Endpoint `/health` funciona y retorna JSON
- [ ] Dominio configurado para puerto `5000`
- [ ] Build Path configurado como `Opalo-ATS/backend`
- [ ] Variables de entorno configuradas correctamente

---

## 🎯 Próximos Pasos

1. **Comparte los logs** del backend
2. **Prueba** el endpoint `/health` en tu navegador
3. **Verifica** la configuración del dominio (puerto 5000)
4. **Redeploy** si es necesario

---

## 💡 Nota

El error 502 generalmente significa que:
- El servicio backend no está corriendo
- El servicio está corriendo pero no está escuchando en el puerto correcto
- Hay un problema de configuración de dominio/puerto

La causa más común es que EasyPanel está usando el Dockerfile del frontend (Nginx) en lugar del Dockerfile del backend (Node.js).


