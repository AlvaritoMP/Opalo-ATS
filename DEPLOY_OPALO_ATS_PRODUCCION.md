# 🚀 Deploy de Opalo ATS a Producción

## 📋 Checklist Pre-Deployment

### 1. Verificar Cambios Locales

```powershell
git status
```

Asegúrate de que todos los cambios importantes estén commiteados:
- ✅ Backend completo (`Opalo-ATS/backend/`)
- ✅ `public/google-drive-callback.html`
- ✅ Correcciones en `lib/googleDrive.ts`
- ✅ Configuraciones actualizadas

---

## 📤 Paso 1: Commit y Push de Cambios

### 1.1. Agregar todos los cambios

```powershell
cd C:\Users\alvar\Opaloats
git add .
```

### 1.2. Hacer commit

```powershell
git commit -m "Completar integración Google Drive - Backend y popup corregido"
```

### 1.3. Push al repositorio

```powershell
git push origin main
```

**Verifica** que el push sea exitoso y que todos los archivos estén en GitHub.

---

## 🖥️ Paso 2: Configurar Deployment en EasyPanel

### 2.1. Frontend (Opalo ATS)

1. **Ve a EasyPanel** → Tu proyecto → Opalo ATS
2. **Configuración del servicio**:
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `caddy run --config /app/Caddyfile --adapter caddyfile`
   - **Working Directory**: `/app`

3. **Variables de Entorno (Build-time)**:
   ```
   VITE_SUPABASE_URL=https://afhiiplxqtodqxvmswor.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU
   VITE_API_URL=https://TU_BACKEND_URL/api
   ```
   
   **⚠️ IMPORTANTE**: Reemplaza `TU_BACKEND_URL` con la URL real de tu backend en producción.

4. **Variables de Entorno (Runtime)** (si es necesario):
   - Generalmente no se necesitan para el frontend

### 2.2. Backend (Opalo ATS Backend)

1. **Crear nuevo servicio en EasyPanel**:
   - **Nombre**: `opalo-ats-backend`
   - **Tipo**: Node.js

2. **Configuración**:
   - **Build Command**: `cd backend && npm ci`
   - **Start Command**: `cd backend && npm start`
   - **Working Directory**: `/app`
   - **Port**: `5000` (o el que configures)

3. **Variables de Entorno**:
   ```
   PORT=5000
   NODE_ENV=production
   GOOGLE_CLIENT_ID=TU_GOOGLE_CLIENT_ID_AQUI
   GOOGLE_CLIENT_SECRET=TU_GOOGLE_CLIENT_SECRET_AQUI
   GOOGLE_REDIRECT_URI=https://TU_BACKEND_URL/api/auth/google/callback
   FRONTEND_URL=https://TU_FRONTEND_URL
   ```
   
   **⚠️ IMPORTANTE**: 
   - Reemplaza `TU_BACKEND_URL` con la URL real del backend
   - Reemplaza `TU_FRONTEND_URL` con la URL real del frontend

---

## 🔐 Paso 3: Configurar Google Cloud Console para Producción

### 3.1. Agregar URLs de Producción

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en tu **OAuth 2.0 Client ID**

### 3.2. Authorized JavaScript origins

Agrega:
```
https://TU_BACKEND_URL
https://TU_FRONTEND_URL
```

### 3.3. Authorized redirect URIs

Agrega:
```
https://TU_BACKEND_URL/api/auth/google/callback
```

**Ejemplo** (si tu backend es `opalo-ats-backend.bouasv.easypanel.host`):
```
https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/callback
```

---

## 🌐 Paso 4: Obtener URLs de Producción

### 4.1. URL del Backend

Después de crear el servicio backend en EasyPanel, obtendrás una URL como:
```
https://opalo-ats-backend.bouasv.easypanel.host
```

### 4.2. URL del Frontend

Tu frontend ya debería tener una URL como:
```
https://opalo-atsalfaoro.bouasv.easypanel.host
```

### 4.3. Actualizar Variables de Entorno

Una vez que tengas las URLs reales:

1. **Frontend** → Variables de Entorno:
   ```
   VITE_API_URL=https://opalo-ats-backend.bouasv.easypanel.host
   ```

2. **Backend** → Variables de Entorno:
   ```
   GOOGLE_REDIRECT_URI=https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/callback
   FRONTEND_URL=https://opalo-atsalfaoro.bouasv.easypanel.host
   ```

3. **Google Cloud Console**:
   - Agrega ambas URLs en "Authorized JavaScript origins"
   - Agrega la URL del callback en "Authorized redirect URIs"

---

## 🔄 Paso 5: Rebuild y Deploy

### 5.1. Frontend

1. En EasyPanel, ve a tu servicio frontend
2. Haz clic en **"Rebuild"** o **"Redeploy"**
3. Espera a que termine el build

### 5.2. Backend

1. En EasyPanel, ve a tu servicio backend
2. Haz clic en **"Rebuild"** o **"Redeploy"**
3. Espera a que termine el build

### 5.3. Verificar

1. **Backend Health Check**:
   ```
   https://TU_BACKEND_URL/health
   ```
   Debería responder: `{"status":"ok",...}`

2. **Frontend**:
   ```
   https://TU_FRONTEND_URL
   ```
   Debería cargar la app

---

## ✅ Paso 6: Probar Google Drive en Producción

1. Abre la app en producción
2. Inicia sesión
3. Ve a **Settings** → **Almacenamiento de Archivos**
4. Haz clic en **"Conectar con Google Drive"**
5. Debería:
   - Abrir popup
   - Redirigir a Google
   - Después de autorizar, cerrarse automáticamente
   - Mostrar "Conectado" en la app

---

## 🐛 Troubleshooting

### Error: "CORS error"

**Solución**: Verifica que el backend tenga CORS configurado para la URL del frontend.

En `Opalo-ATS/backend/src/server.js`, asegúrate de que `allowedOrigins` incluya tu URL de producción.

### Error: "redirect_uri_mismatch"

**Solución**: 
1. Verifica que `GOOGLE_REDIRECT_URI` en el backend sea exactamente igual a la URL en Google Cloud Console
2. Verifica que no haya espacios o caracteres extra
3. Espera unos minutos después de actualizar Google Cloud Console

### Error: "Backend no responde"

**Solución**:
1. Verifica que el backend esté corriendo en EasyPanel
2. Verifica que el puerto esté configurado correctamente
3. Verifica los logs del backend en EasyPanel

### Error: "Missing required parameter: client_id"

**Solución**:
1. Verifica que `GOOGLE_CLIENT_ID` esté en las variables de entorno del backend
2. Verifica que no haya espacios extra
3. Rebuild el backend después de cambiar variables

---

## 📝 Resumen de URLs Necesarias

Antes de empezar, asegúrate de tener:

- ✅ URL del frontend en producción
- ✅ URL del backend en producción (o créalo primero)
- ✅ Credenciales de Google OAuth (ya las tienes)

---

## 🎯 Orden de Ejecución Recomendado

1. ✅ Commit y push de cambios
2. ✅ Crear servicio backend en EasyPanel
3. ✅ Obtener URL del backend
4. ✅ Configurar variables de entorno del backend
5. ✅ Configurar variables de entorno del frontend
6. ✅ Actualizar Google Cloud Console
7. ✅ Rebuild ambos servicios
8. ✅ Probar Google Drive en producción

---

## ✅ Checklist Final

- [ ] Cambios commiteados y pusheados
- [ ] Servicio backend creado en EasyPanel
- [ ] Variables de entorno del backend configuradas
- [ ] Variables de entorno del frontend configuradas
- [ ] Google Cloud Console actualizado con URLs de producción
- [ ] Backend rebuild y funcionando
- [ ] Frontend rebuild y funcionando
- [ ] Google Drive probado en producción

