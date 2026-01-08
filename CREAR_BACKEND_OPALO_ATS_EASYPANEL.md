# 🚀 Crear Backend de Opalo ATS en EasyPanel

## ✅ Opción Más Simple: Backend Separado

Vamos a crear un **nuevo servicio** en EasyPanel para el backend de Opalo ATS.

---

## 📋 Paso 1: Crear Nuevo Servicio en EasyPanel

### 1.1. Ir a EasyPanel

1. Abre EasyPanel en tu navegador
2. Ve a tu proyecto/servidor

### 1.2. Crear Nueva Aplicación

1. Haz clic en **"New App"** o **"Nueva Aplicación"**
2. Selecciona **"From Git"** o **"Desde Git"**
3. Conecta el repositorio: `https://github.com/AlvaritoMP/Opalo-ATS.git`
4. Rama: `main`

### 1.3. Configuración del Servicio

**Configuración básica**:
- **Name**: `opalo-ats-backend` (o el nombre que prefieras)
- **Root Directory**: `Opalo-ATS/backend`
- **Build Method**: `Nixpacks` (o `Dockerfile` si prefieres)
- **Port**: `5000`

**Build Command** (si está disponible):
```bash
npm ci --production
```

**Start Command**:
```bash
node src/server.js
```

**Working Directory**: `/app/Opalo-ATS/backend`

---

## 📋 Paso 2: Configurar Variables de Entorno

En la sección **"Environment Variables"** del nuevo servicio, agrega:

### Variables Obligatorias

```env
PORT=5000
NODE_ENV=production
GOOGLE_CLIENT_ID=968572483416-v3dju424jrbae7b85u7fb7jurskfmh15.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://TU_BACKEND_URL/api/auth/google/callback
FRONTEND_URL=https://TU_FRONTEND_URL_OPALO_ATS
```

**⚠️ IMPORTANTE**: 
- Reemplaza `TU_BACKEND_URL` con la URL que EasyPanel te dé para este backend
- Reemplaza `TU_FRONTEND_URL_OPALO_ATS` con la URL de tu frontend de Opalo ATS

### Variables Opcionales (si las necesitas)

```env
FRONTEND_URL_OPALOPY=https://url-de-opalopy.com
FRONTEND_URL_OPALO_ATS=https://url-de-opalo-ats.com
```

---

## 📋 Paso 3: Deploy

1. Haz clic en **"Deploy"** o **"Save"**
2. Espera a que termine el build
3. **Anota la URL** que EasyPanel te da para el backend (ej: `https://opalo-ats-backend-abc123.easypanel.host`)

---

## 📋 Paso 4: Actualizar Variables con URL Real

Después del deploy, EasyPanel te dará una URL. Actualiza las variables:

1. Ve a **Environment Variables** del backend
2. Actualiza `GOOGLE_REDIRECT_URI`:
   ```
   GOOGLE_REDIRECT_URI=https://opalo-ats-backend-abc123.easypanel.host/api/auth/google/callback
   ```
3. Haz clic en **"Save"**
4. Haz **"Redeploy"** para aplicar los cambios

---

## 📋 Paso 5: Actualizar Frontend de Opalo ATS

1. Ve al servicio del **frontend de Opalo ATS** en EasyPanel
2. Ve a **Environment Variables**
3. Actualiza `VITE_API_URL`:
   ```
   VITE_API_URL=https://opalo-ats-backend-abc123.easypanel.host
   ```
4. **Marca como "Build-time"** ⚠️
5. Haz **"Rebuild"** del frontend

---

## 📋 Paso 6: Configurar Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en tu **OAuth 2.0 Client ID**

### Authorized JavaScript origins

Agrega la URL del backend:
```
https://opalo-ats-backend-abc123.easypanel.host
```

### Authorized redirect URIs

Agrega:
```
https://opalo-ats-backend-abc123.easypanel.host/api/auth/google/callback
```

---

## ✅ Verificación

### Verificar Backend

1. Abre en el navegador: `https://opalo-ats-backend-abc123.easypanel.host/health`
2. Deberías ver: `{"status":"ok",...}`

### Verificar Frontend

1. Abre la app de Opalo ATS
2. Ve a **Settings** → **Almacenamiento de Archivos**
3. Haz clic en **"Conectar con Google Drive"**
4. Debería funcionar correctamente

---

## 🎯 Resumen de URLs

Después de configurar todo:

- **Backend**: `https://opalo-ats-backend-abc123.easypanel.host`
- **Frontend**: `https://opalo-ats-frontend-xyz789.easypanel.host`
- **Health Check**: `https://opalo-ats-backend-abc123.easypanel.host/health`

---

## ✅ Checklist

- [ ] Servicio backend creado en EasyPanel
- [ ] Root Directory: `Opalo-ATS/backend`
- [ ] Variables de entorno configuradas
- [ ] Deploy completado
- [ ] URL del backend anotada
- [ ] `GOOGLE_REDIRECT_URI` actualizado con URL real
- [ ] `VITE_API_URL` actualizado en frontend
- [ ] Frontend rebuild ejecutado
- [ ] Google Cloud Console actualizado
- [ ] Health check funciona
- [ ] Google Drive funciona en la app

---

## 🐛 Troubleshooting

### Error: "Cannot find module"

**Solución**: Verifica que el **Root Directory** sea `Opalo-ATS/backend`

### Error: "Port already in use"

**Solución**: Verifica que el **Port** esté configurado como `5000` y que no haya otro servicio usando ese puerto

### Error: "CORS blocked"

**Solución**: Verifica que `FRONTEND_URL` tenga la URL correcta del frontend de Opalo ATS

### Error: "redirect_uri_mismatch"

**Solución**: 
- Verifica que `GOOGLE_REDIRECT_URI` en el backend coincida exactamente con la URL en Google Cloud Console
- Asegúrate de que ambas URLs terminen en `/api/auth/google/callback`

