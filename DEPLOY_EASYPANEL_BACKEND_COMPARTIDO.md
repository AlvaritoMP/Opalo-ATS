# 🚀 Deploy Opalo ATS en EasyPanel (Backend Compartido)

## ✅ Respuesta Rápida

**NO necesitas crear otro backend**. El backend de Opalopy puede servir a ambas apps (Opalopy y Opalo ATS).

---

## 🎯 Opción Recomendada: Usar el Backend Existente de Opalopy

### ¿Por qué funciona?

El backend que creamos está diseñado para servir múltiples apps:
- ✅ CORS configurado para múltiples orígenes
- ✅ Crea carpetas diferentes para cada app ("ATS Pro" vs "Opalo ATS")
- ✅ Mismo código OAuth funciona para ambas

---

## 📋 Paso 1: Actualizar el Backend de Opalopy

### 1.1. Verificar que el Backend Tiene el Código Actualizado

El backend de Opalopy debe tener:
- ✅ Código actualizado con soporte multi-app
- ✅ CORS configurado para múltiples orígenes
- ✅ Función `getOrCreateRootFolder` que acepta nombre de carpeta

**Si el backend de Opalopy NO tiene el código actualizado**, necesitas:

1. **Opción A: Actualizar desde el repo de Opalopy** (si ya tiene los cambios)
   ```bash
   # En el servidor, ve al directorio del backend de Opalopy
   cd /ruta/al/backend/opelopy
   git pull origin main
   npm ci
   # Reiniciar el servicio
   ```

2. **Opción B: Copiar código del nuevo backend** (si Opalopy no tiene los cambios)
   - Copia `Opalo-ATS/backend/src/routes/auth.js` → Backend de Opalopy
   - Copia `Opalo-ATS/backend/src/config/googleDrive.js` → Backend de Opalopy
   - Actualiza `package.json` si es necesario

### 1.2. Actualizar Variables de Entorno del Backend

En EasyPanel, ve al servicio del backend de Opalopy y actualiza las variables de entorno:

**Variables actuales** (mantener):
```
PORT=5000
NODE_ENV=production
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=https://backend-opalopy.tu-dominio.com/api/auth/google/callback
FRONTEND_URL=https://opalopy.tu-dominio.com
```

**Agregar nuevas variables** (para soportar Opalo ATS):
```
FRONTEND_URL_OPALOPY=https://opalopy.tu-dominio.com
FRONTEND_URL_OPALO_ATS=https://opalo-ats.tu-dominio.com
```

**O mejor aún**, actualiza `FRONTEND_URL` para que sea el principal y agrega las específicas:
```
FRONTEND_URL=https://opalopy.tu-dominio.com
FRONTEND_URL_OPALOPY=https://opalopy.tu-dominio.com
FRONTEND_URL_OPALO_ATS=https://opalo-ats.tu-dominio.com
```

### 1.3. Verificar CORS en el Backend

Asegúrate de que `server.js` del backend tenga CORS configurado para múltiples orígenes:

```javascript
const allowedOrigins = [
    'http://localhost:3000',  // Opalopy desarrollo
    'http://localhost:3001',  // Opalo ATS desarrollo
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_OPALOPY,
    process.env.FRONTEND_URL_OPALO_ATS,
].filter(Boolean);
```

Si no lo tiene, actualiza el código del backend.

### 1.4. Reiniciar el Backend

En EasyPanel:
1. Ve al servicio del backend de Opalopy
2. Haz clic en **"Rebuild"** o **"Redeploy"**
3. Espera a que termine

---

## 📋 Paso 2: Crear Frontend de Opalo ATS en EasyPanel

### 2.1. Crear Nueva Aplicación

1. En EasyPanel, haz clic en **"New App"** o **"Nueva Aplicación"**
2. Selecciona **"From Git"** o **"Desde Git"**
3. Conecta el repositorio: `https://github.com/AlvaritoMP/Opalo-ATS.git`
4. Rama: `main`

### 2.2. Configuración del Build

- **Build Method**: Nixpacks (o Static si está disponible)
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `caddy run --config /app/Caddyfile --adapter caddyfile`
- **Working Directory**: `/app` (raíz del proyecto)

### 2.3. Variables de Entorno (Build-time) ⚠️ CRÍTICO

Agrega estas variables y marca como **"Build-time"**:

```
VITE_SUPABASE_URL=https://afhiiplxqtodqxvmswor.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU
VITE_API_URL=https://backend-opalopy.tu-dominio.com
```

**⚠️ IMPORTANTE**: 
- `VITE_API_URL` debe apuntar al **backend de Opalopy** (el mismo que usa Opalopy)
- Todas las variables deben estar marcadas como **"Build-time"**

### 2.4. Deploy

1. Haz clic en **"Deploy"** o **"Save"**
2. Espera a que termine el build
3. Anota la URL que te da EasyPanel (ej: `https://opalo-ats-abc123.easypanel.host`)

---

## 📋 Paso 3: Actualizar Backend con URL del Nuevo Frontend

### 3.1. Obtener URL del Frontend de Opalo ATS

Después del deploy, EasyPanel te dará una URL como:
```
https://opalo-ats-abc123.easypanel.host
```

### 3.2. Actualizar Variables del Backend

En el servicio del backend de Opalopy, actualiza:

```
FRONTEND_URL_OPALO_ATS=https://opalo-ats-abc123.easypanel.host
```

O si prefieres usar un dominio personalizado:
```
FRONTEND_URL_OPALO_ATS=https://opalo-ats.tu-dominio.com
```

### 3.3. Reiniciar Backend

1. Ve al servicio del backend de Opalopy
2. Haz clic en **"Rebuild"** o **"Redeploy"**

---

## 🔐 Paso 4: Configurar Google Cloud Console

### 4.1. Agregar URL del Nuevo Frontend

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en tu **OAuth 2.0 Client ID**

### 4.2. Authorized JavaScript origins

Agrega la nueva URL del frontend:
```
https://opalo-ats-abc123.easypanel.host
```

O si usas dominio personalizado:
```
https://opalo-ats.tu-dominio.com
```

**NO necesitas agregar otra redirect URI** porque el backend es el mismo.

### 4.3. Guardar Cambios

Haz clic en **"Save"** y espera unos minutos para que se propaguen.

---

## ✅ Paso 5: Verificación

### 5.1. Verificar Backend

```bash
curl https://backend-opalopy.tu-dominio.com/health
# Debería responder: {"status":"ok",...}
```

### 5.2. Verificar Frontend

Abre en el navegador:
```
https://opalo-ats-abc123.easypanel.host
```

Debería cargar la aplicación.

### 5.3. Verificar Google Drive

1. Abre la app de Opalo ATS
2. Inicia sesión
3. Ve a **Settings** → **Almacenamiento de Archivos**
4. Haz clic en **"Conectar con Google Drive"**
5. Debería funcionar correctamente

---

## 🎯 Resumen de Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    EASYPANEL                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │  Opalopy Frontend │      │ Opalo ATS Frontend│      │
│  │                   │      │                   │      │
│  │  opalopy.com      │      │  opalo-ats.com   │      │
│  └────────┬──────────┘      └────────┬─────────┘      │
│           │                          │                 │
│           │                          │                 │
│           └──────────┬───────────────┘                 │
│                      │                                 │
│                      ▼                                 │
│           ┌──────────────────┐                        │
│           │ Backend Compartido│                        │
│           │  (Opalopy Backend)│                        │
│           │                  │                        │
│           │  api.opalopy.com │                        │
│           └────────┬─────────┘                        │
│                    │                                  │
│                    ▼                                  │
│           ┌──────────────────┐                        │
│           │  Google Drive API│                        │
│           └──────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

**Un solo backend** sirve a ambas apps:
- Opalopy → Carpeta "ATS Pro" en Google Drive
- Opalo ATS → Carpeta "Opalo ATS" en Google Drive

---

## 🐛 Troubleshooting

### Error: "CORS error" en Opalo ATS

**Solución**: Verifica que el backend tenga `FRONTEND_URL_OPALO_ATS` en las variables de entorno y que esté en la lista de `allowedOrigins`.

### Error: "redirect_uri_mismatch"

**Solución**: 
- Verifica que `GOOGLE_REDIRECT_URI` en el backend sea correcto
- Verifica que Google Cloud Console tenga la URL del callback del backend
- **NO necesitas agregar otra redirect URI** porque el backend es el mismo

### Opalo ATS crea carpeta "ATS Pro" en lugar de "Opalo ATS"

**Solución**: Verifica que el backend tenga el código actualizado de `getOrCreateRootFolder` que acepta el nombre de carpeta como parámetro.

---

## ✅ Checklist Final

- [ ] Backend de Opalopy actualizado con código multi-app
- [ ] Variables de entorno del backend actualizadas (`FRONTEND_URL_OPALO_ATS`)
- [ ] CORS configurado para múltiples orígenes
- [ ] Frontend de Opalo ATS creado en EasyPanel
- [ ] Variables de entorno del frontend configuradas (`VITE_API_URL` apunta al backend de Opalopy)
- [ ] Google Cloud Console actualizado con URL del nuevo frontend
- [ ] Backend reiniciado
- [ ] Frontend deployado
- [ ] Google Drive funciona en Opalo ATS

---

## 🎯 Ventajas de Usar el Backend Compartido

- ✅ **Menos recursos**: Un solo backend en lugar de dos
- ✅ **Más simple**: Menos servicios que gestionar
- ✅ **Mismo código**: Mantenimiento más fácil
- ✅ **Mismas credenciales**: Google OAuth compartido
- ✅ **Separación de datos**: Cada app tiene su propia carpeta en Google Drive

---

## 📝 Notas Importantes

1. **El backend es compartido**, pero cada app tiene su propia carpeta en Google Drive
2. **Las credenciales de Google OAuth son las mismas** para ambas apps
3. **Solo necesitas crear el frontend** de Opalo ATS en EasyPanel
4. **El backend debe estar actualizado** con el código que soporta múltiples apps

