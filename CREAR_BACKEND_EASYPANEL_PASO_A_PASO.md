# 🚀 Crear Backend en Easypanel - Paso a Paso

## ❌ Problema Actual

Cuando accedes a `https://opalo-atsopalo-backend.bouasv.easypanel.host/health`, te redirige a la app en lugar de mostrar el JSON.

Esto significa que **el backend no existe o no está configurado correctamente** en Easypanel.

---

## ✅ Solución: Crear Backend en Easypanel

### Paso 1: Crear Nuevo Servicio

1. Ve a tu panel de **Easypanel**
2. Haz clic en **"+ Service"** o **"Nuevo Servicio"**
3. Selecciona **"App"** o **"Aplicación"**

### Paso 2: Configurar el Servicio

Configura estos valores:

#### Información Básica
- **Name**: `opalo-atsopalo-backend`
- **Source**: Tu repositorio Git (el mismo que el frontend)
- **Branch**: `main` (o la rama que uses)

#### Configuración de Build
- **Root Directory**: `Opalo-ATS/backend` ⚠️ **IMPORTANTE**
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Port**: `5000`

#### Node.js Version
- **Node Version**: `20`** (o la versión que tengas configurada)

### Paso 3: Configurar Variables de Entorno

Después de crear el servicio, ve a **Environment Variables** y agrega:

```
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://opalo-atsopalo.bouasv.easypanel.host
GOOGLE_CLIENT_ID=968572483416-v3dju424jrbae7b85u7fb7jurskfmh15.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
```

**⚠️ IMPORTANTE**: 
- `GOOGLE_REDIRECT_URI` necesitará la URL real del backend
- Si es la primera vez, puedes poner un placeholder y actualizarlo después del primer deploy

### Paso 4: Deploy

1. Haz clic en **"Deploy"** o **"Start"**
2. Espera a que termine el build
3. **Anota la URL** que te da Easypanel

### Paso 5: Actualizar GOOGLE_REDIRECT_URI

Después del primer deploy:

1. Obtén la URL del backend (ej: `https://opalo-atsopalo-backend.bouasv.easypanel.host`)
2. Ve a **Environment Variables** del backend
3. Actualiza `GOOGLE_REDIRECT_URI`:
   ```
   https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
   ```
4. Haz **Redeploy** para aplicar los cambios

### Paso 6: Verificar que Funciona

1. Abre en el navegador:
   ```
   https://opalo-atsopalo-backend.bouasv.easypanel.host/health
   ```

2. Deberías ver:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-...",
     "service": "Opalo ATS Backend - Google Drive API"
   }
   ```

3. Ve a los **Logs** del backend
4. Deberías ver:
   ```
   🚀 Servidor backend corriendo en http://0.0.0.0:5000
   📡 Frontend URL: https://opalo-atsopalo.bouasv.easypanel.host
   ✅ Backend listo para recibir peticiones
   ```

---

## 🔧 Configurar Frontend para Usar el Backend

Después de que el backend esté funcionando:

1. Ve a tu app **frontend** en Easypanel
2. Ve a **Environment Variables**
3. Agrega o actualiza:
   - **Nombre**: `VITE_API_URL`
   - **Valor**: `https://opalo-atsopalo-backend.bouasv.easypanel.host`
   - **Scope**: **Build-time** ⚠️
4. Haz **Redeploy** del frontend

---

## 📋 Checklist Completo

- [ ] Backend creado en Easypanel
- [ ] Root Directory configurado: `Opalo-ATS/backend`
- [ ] Build Command: `npm install`
- [ ] Start Command: `npm start`
- [ ] Port: `5000`
- [ ] Variables de entorno configuradas
- [ ] Backend desplegado y corriendo
- [ ] `/health` endpoint funciona
- [ ] `GOOGLE_REDIRECT_URI` actualizado con URL real
- [ ] `VITE_API_URL` configurado en frontend
- [ ] Frontend reconstruido

---

## 🎯 Resultado Esperado

Después de completar todos los pasos:

1. ✅ Backend accesible en `https://opalo-atsopalo-backend.bouasv.easypanel.host`
2. ✅ `/health` responde con JSON
3. ✅ Frontend puede conectarse al backend
4. ✅ Google Drive OAuth funciona correctamente

