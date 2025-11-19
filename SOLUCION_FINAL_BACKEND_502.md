# 🔧 Solución Final: Error 502 en Backend

## 🔴 Problema

El backend sigue dando error 502, lo que significa que Caddy no puede conectarse al servidor Node.js.

## ✅ Solución Paso a Paso

### Paso 1: Configurar Comandos en Easypanel

En Easypanel, ve a tu app **backend** → Sección **"Build"**:

1. **Install Command**:
   ```
   cd backend && npm ci
   ```

2. **Build Command**:
   (Dejar vacío - no necesitamos build para el backend)

3. **Start Command**:
   ```
   cd backend && node src/server.js
   ```

4. Haz clic en **"Save"** (botón verde en la sección Build)

### Paso 2: Verificar Build Path

En la sección **"Source"**:
- **Build Path**: Dejar como `/` (raíz) o probar `/backend` si lo acepta

### Paso 3: Verificar Variables de Entorno

En **"Environment Variables"**, verifica que tengas:

```env
PORT=5000
FRONTEND_URL=https://opalo-atsalfaoro.bouasv.easypanel.host
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
SESSION_SECRET=tu_secret_aleatorio
```

### Paso 4: Redeploy

1. Haz clic en el botón verde **"Deploy"** en la parte superior
2. Espera a que termine el build
3. Verifica los logs

### Paso 5: Verificar Logs

En los logs del backend, deberías ver:

```
🚀 Servidor backend corriendo en http://0.0.0.0:5000
📡 Frontend URL: https://opalo-atsalfaoro.bouasv.easypanel.host
✅ Backend listo para recibir peticiones
```

**NO deberías ver**:
- `npm run build`
- Referencias a `vite`
- Referencias a `/app/dist`

### Paso 6: Probar

1. Abre: `https://opalo-ats-backend.bouasv.easypanel.host/health`
2. Deberías ver: `{"status":"ok",...}`

---

## 🆘 Si Sigue Sin Funcionar

### Opción A: Usar Dockerfile

Si Nixpacks sigue sin funcionar, podemos usar Dockerfile:

1. En Easypanel, en la sección **"Build"**, selecciona **"Dockerfile"** en lugar de Nixpacks
2. El Dockerfile ya está creado en `backend/Dockerfile`
3. Haz redeploy

### Opción B: Verificar Logs Detallados

1. En Easypanel, ve a los logs del backend
2. Busca errores específicos:
   - `Error: Cannot find module`
   - `Error: Missing required parameter`
   - `Error: EADDRINUSE`
3. Comparte el error específico para ayudarte mejor

---

## 📝 Checklist

- [ ] Install Command configurado: `cd backend && npm ci`
- [ ] Start Command configurado: `cd backend && node src/server.js`
- [ ] Variables de entorno configuradas
- [ ] Redeploy hecho
- [ ] Logs muestran "Servidor backend corriendo"
- [ ] `/health` responde correctamente

---

## 💡 Nota

El problema es que Nixpacks está detectando el `Caddyfile` del frontend y ejecutando el build del frontend en lugar del servidor Node.js del backend. Al configurar los comandos manualmente con `cd backend &&`, forzamos a que se ejecuten dentro de la carpeta backend.

