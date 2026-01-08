# 🔍 Verificar Backend en Easypanel

## ❌ Problema

Cuando accedes a `https://opalo-atsopalo-backend.bouasv.easypanel.host/health`, te redirige a la app en lugar de mostrar el JSON del endpoint.

Esto indica que:
- El backend no está corriendo
- El backend no está configurado correctamente
- El backend no está accesible en esa URL

---

## ✅ Pasos para Verificar

### Paso 1: Verificar que el Backend Existe en Easypanel

1. Ve a tu panel de Easypanel
2. Busca un servicio llamado **"opalo-atsopalo-backend"** o similar
3. Si **NO existe**, necesitas crearlo primero

### Paso 2: Verificar Estado del Backend

Si el backend existe:

1. Haz clic en el servicio del backend
2. Verifica el **Status**:
   - ✅ **Running** = Está corriendo
   - ❌ **Stopped** = Está detenido
   - ⚠️ **Error** = Hay un error

### Paso 3: Verificar Logs del Backend

1. En el servicio del backend, ve a la pestaña **Logs**
2. Busca mensajes como:
   - `🚀 Servidor backend corriendo en http://0.0.0.0:5000`
   - Errores de conexión
   - Errores de variables de entorno

### Paso 4: Verificar Variables de Entorno del Backend

En el servicio del backend, verifica que estas variables estén configuradas:

```
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://opalo-atsopalo.bouasv.easypanel.host
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_REDIRECT_URI=https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
```

---

## 🔧 Si el Backend NO Existe

Necesitas crear el backend en Easypanel. Sigue estos pasos:

### Opción A: Crear Backend desde Cero

1. En Easypanel, haz clic en **"+ Service"** o **"Nuevo Servicio"**
2. Selecciona **"App"** o **"Aplicación"**
3. Configura:
   - **Name**: `opalo-atsopalo-backend`
   - **Source**: Tu repositorio Git
   - **Branch**: `main` (o la rama que uses)
   - **Root Directory**: `Opalo-ATS/backend` ⚠️ IMPORTANTE

### Opción B: Usar Dockerfile (Si Existe)

Si tienes un `Dockerfile` en `Opalo-ATS/backend/`:

1. Easypanel debería detectarlo automáticamente
2. Si no, configura:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Port**: `5000`

### Paso 5: Configurar Variables de Entorno

Después de crear el backend, agrega estas variables:

```
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://opalo-atsopalo.bouasv.easypanel.host
GOOGLE_CLIENT_ID=968572483416-v3dju424jrbae7b85u7fb7jurskfmh15.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
```

**⚠️ IMPORTANTE**: 
- Reemplaza `GOOGLE_REDIRECT_URI` con la URL real del backend (la obtendrás después del primer deploy)
- Si es la primera vez, puedes poner un placeholder y actualizarlo después

### Paso 6: Deploy y Obtener URL

1. Haz clic en **"Deploy"** o **"Start"**
2. Espera a que termine el build
3. **Anota la URL** que te da Easypanel (debería ser `https://opalo-atsopalo-backend.bouasv.easypanel.host`)

---

## 🔍 Verificación Después de Crear/Configurar

### 1. Verificar que el Backend Está Corriendo

1. Ve a los **Logs** del backend
2. Deberías ver:
   ```
   🚀 Servidor backend corriendo en http://0.0.0.0:5000
   📡 Frontend URL: https://opalo-atsopalo.bouasv.easypanel.host
   ```

### 2. Probar el Endpoint /health

Abre en el navegador:
```
https://opalo-atsopalo-backend.bouasv.easypanel.host/health
```

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "service": "Opalo ATS Backend - Google Drive API"
}
```

### 3. Si Aún No Funciona

- Verifica que el **puerto** esté configurado como `5000`
- Verifica que el **Root Directory** sea `Opalo-ATS/backend`
- Verifica los **logs** para ver errores
- Verifica que las **variables de entorno** estén correctas

---

## 📋 Checklist

- [ ] Backend existe en Easypanel
- [ ] Backend está corriendo (Status: Running)
- [ ] Variables de entorno configuradas
- [ ] Logs muestran que el servidor está corriendo
- [ ] `/health` endpoint responde con JSON
- [ ] URL del backend anotada para configurar `VITE_API_URL`

