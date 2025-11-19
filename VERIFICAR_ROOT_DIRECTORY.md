# ⚠️ IMPORTANTE: Verificar Root Directory en Easypanel

## 🔴 Problema Actual

El backend está sirviendo el frontend (login de la app) en lugar del servidor Node.js. Esto significa que el **Root Directory** no está configurado correctamente en Easypanel.

## ✅ Solución

### Paso 1: Verificar Root Directory

1. Ve a tu app **backend** en Easypanel
2. Ve a la sección de configuración
3. Busca **"Root Directory"** o **"Working Directory"**
4. **DEBE ser exactamente**:
   ```
   backend
   ```
   - Sin barra al final (`/`)
   - Sin espacios
   - Solo la palabra `backend`

### Paso 2: Si NO Está Configurado

1. Edita la configuración de la app backend
2. Busca el campo **"Root Directory"**
3. Escribe: `backend`
4. Guarda los cambios

### Paso 3: Redeploy

1. Después de cambiar el Root Directory, haz clic en **"Redeploy"** o **"Rebuild"**
2. Espera a que termine el build
3. Verifica los logs

### Paso 4: Verificar Logs

En los logs del backend, deberías ver:
```
🚀 Servidor backend corriendo en http://0.0.0.0:5000
📡 Frontend URL: https://opalo-atsalfaoro.bouasv.easypanel.host
✅ Backend listo para recibir peticiones
```

**NO deberías ver**:
- Referencias a `vite build`
- Referencias a `/app/dist`
- Referencias a archivos del frontend

### Paso 5: Probar

1. Abre: `https://opalo-ats-backend.bouasv.easypanel.host/health`
2. Deberías ver:
   ```json
   {
     "status": "ok",
     "timestamp": "...",
     "service": "ATS Pro Backend - Google Drive API"
   }
   ```

---

## 🔍 Cómo Verificar en Easypanel

En la configuración de tu app backend, busca:

- **Source/Repository**: `https://github.com/AlvaritoMP/Opalopy.git`
- **Branch**: `main`
- **Root Directory**: `backend` ⚠️ **ESTE ES EL MÁS IMPORTANTE**
- **Build Method**: `Nixpacks`
- **Port**: `5000` (en variables de entorno)

---

## 📝 Nota

Si el Root Directory no está configurado como `backend`, Nixpacks usará la raíz del proyecto, que tiene el `Caddyfile` del frontend, y por eso sirve el frontend en lugar del backend.

---

## 🆘 Si Sigue Sin Funcionar

1. **Elimina la app backend** en Easypanel
2. **Crea una nueva app** desde cero
3. Configura:
   - **Source**: `https://github.com/AlvaritoMP/Opalopy.git`
   - **Branch**: `main`
   - **Root Directory**: `backend` ⚠️ **MUY IMPORTANTE**
   - **Build Method**: `Nixpacks`
4. **Variables de entorno**:
   ```
   PORT=5000
   FRONTEND_URL=https://opalo-atsalfaoro.bouasv.easypanel.host
   GOOGLE_CLIENT_ID=tu_client_id
   GOOGLE_CLIENT_SECRET=tu_client_secret
   SESSION_SECRET=tu_secret
   ```
5. **Deploy**

