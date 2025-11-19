# Guía Completa: Desplegar Google Drive en Producción

Esta guía te llevará paso a paso para desplegar la integración de Google Drive en tu servidor de Easypanel.

## 📋 Índice

1. [Obtener Credenciales de Google Cloud](#1-obtener-credenciales-de-google-cloud)
2. [Configurar Backend Localmente](#2-configurar-backend-localmente)
3. [Desplegar Backend en Easypanel](#3-desplegar-backend-en-easypanel)
4. [Actualizar Frontend en Easypanel](#4-actualizar-frontend-en-easypanel)
5. [Probar en Producción](#5-probar-en-producción)

---

## 1. Obtener Credenciales de Google Cloud

### Paso 1.1: Acceder a Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Inicia sesión con tu cuenta de Google

### Paso 1.2: Crear o Seleccionar Proyecto

1. En la parte superior, haz clic en el selector de proyectos
2. Si ya tienes un proyecto, selecciónalo
3. Si no, haz clic en **"New Project"**:
   - **Project name**: `ATS Pro File Storage` (o el nombre que prefieras)
   - Haz clic en **"Create"**
   - Espera unos segundos a que se cree

### Paso 1.3: Habilitar Google Drive API

1. En el menú lateral izquierdo, ve a **"APIs & Services"** → **"Library"**
2. En el buscador, escribe: `Google Drive API`
3. Haz clic en **"Google Drive API"**
4. Haz clic en el botón azul **"Enable"**
5. Espera a que se habilite (puede tomar unos segundos)

### Paso 1.4: Configurar Pantalla de Consentimiento OAuth

1. En el menú lateral, ve a **"APIs & Services"** → **"OAuth consent screen"**
2. Selecciona el tipo de usuario:
   - **External** (para usuarios de Gmail normales) - Recomendado
   - **Internal** (solo si tienes Google Workspace)
3. Haz clic en **"Create"**

4. **Paso 1 - App information:**
   - **App name**: `ATS Pro`
   - **User support email**: Tu email
   - **App logo**: (Opcional) Puedes subir un logo
   - **App domain**: (Opcional) Tu dominio si lo tienes
   - **Developer contact information**: Tu email
   - Haz clic en **"Save and Continue"**

5. **Paso 2 - Scopes:**
   - Haz clic en **"Add or Remove Scopes"**
   - Busca y marca estos scopes:
     - ✅ `https://www.googleapis.com/auth/drive.file`
     - ✅ `https://www.googleapis.com/auth/drive.metadata.readonly`
     - ✅ `https://www.googleapis.com/auth/userinfo.email`
     - ✅ `https://www.googleapis.com/auth/userinfo.profile`
   - Haz clic en **"Update"**
   - Haz clic en **"Save and Continue"**

6. **Paso 3 - Test users:**
   - Si elegiste "External", agrega usuarios de prueba:
     - Haz clic en **"Add Users"**
     - Ingresa tu email (y otros emails que quieras que prueben)
     - Haz clic en **"Add"**
   - Haz clic en **"Save and Continue"**

7. **Paso 4 - Summary:**
   - Revisa la información
   - Haz clic en **"Back to Dashboard"**

### Paso 1.5: Crear Credenciales OAuth 2.0

1. En el menú lateral, ve a **"APIs & Services"** → **"Credentials"**
2. Haz clic en **"+ Create Credentials"** → **"OAuth client ID"**
3. Si es la primera vez, te pedirá configurar la pantalla de consentimiento (ya lo hiciste)

4. **Application type**: Selecciona **"Web application"**

5. **Name**: `ATS Pro Backend` (o el nombre que prefieras)

6. **Authorized JavaScript origins**:
   - Haz clic en **"+ Add URI"**
   - Agrega: `http://localhost:5000` (para desarrollo local)
   - **Para producción**: Primero despliega el backend en Easypanel, obtén la URL, y luego agrega:
     - `https://tu-backend-url.easypanel.host` (reemplaza con la URL real que te da Easypanel)
     - O si tienes dominio personalizado: `https://api.tu-dominio.com`

7. **Authorized redirect URIs**:
   - Haz clic en **"+ Add URI"**
   - Agrega: `http://localhost:5000/api/auth/google/callback` (para desarrollo)
   - **Para producción**: Agrega la URL de tu backend + `/api/auth/google/callback`:
     - `https://tu-backend-url.easypanel.host/api/auth/google/callback` (reemplaza con la URL real)
     - O si tienes dominio personalizado: `https://api.tu-dominio.com/api/auth/google/callback`

   **⚠️ IMPORTANTE**: 
   - La URL debe coincidir EXACTAMENTE con la que uses en `GOOGLE_REDIRECT_URI` del backend
   - Debe incluir `https://` y la ruta completa `/api/auth/google/callback`
   - Si aún no sabes la URL de producción, puedes agregarla después (ver Paso 3.5)

8. Haz clic en **"Create"**

9. **⚠️ IMPORTANTE - Guarda estas credenciales:**
   - Se mostrará un modal con:
     - **Your Client ID**: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
     - **Your Client Secret**: `GOCSPX-abcdefghijklmnopqrstuvwxyz`
   - **Copia estos valores** y guárdalos en un lugar seguro
   - Haz clic en **"OK"**

### ✅ Resumen de lo que obtuviste:

- ✅ **Client ID**: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
- ✅ **Client Secret**: `GOCSPX-abcdefghijklmnopqrstuvwxyz`
- ✅ **Project ID**: (visible en la parte superior de la consola)

---

## 2. Configurar Backend Localmente

### Paso 2.1: Instalar Dependencias del Backend

```bash
cd backend
npm install
```

### Paso 2.2: Crear Archivo .env

1. En la carpeta `backend`, crea un archivo llamado `.env`
2. Copia el contenido de `.env.example` y completa los valores:

```env
# Puerto del servidor
PORT=5000

# URL del frontend (para desarrollo local)
FRONTEND_URL=http://localhost:5173

# Google OAuth 2.0 Credentials (obtenidos en el Paso 1.5)
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz

# URL de redirección (debe coincidir con la configurada en Google Cloud)
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Secret para sesiones (genera uno aleatorio)
# Puedes usar: openssl rand -hex 32
# O generar uno en: https://randomkeygen.com/
SESSION_SECRET=tu_secret_super_secreto_aqui_cambiar_en_produccion
```

**Ejemplo con valores reales:**
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=987654321-zyxwvutsrqponmlkj.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-1234567890abcdefghijklmnop
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### Paso 2.3: Probar Backend Localmente

```bash
# En la carpeta backend
npm run dev
```

Deberías ver:
```
🚀 Servidor backend corriendo en http://localhost:5000
📡 Frontend URL: http://localhost:5173
🔐 Google OAuth Redirect URI: http://localhost:5000/api/auth/google/callback

✅ Backend listo para recibir peticiones
```

### Paso 2.4: Probar Health Check

Abre en tu navegador: `http://localhost:5000/health`

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "service": "ATS Pro Backend - Google Drive API"
}
```

---

## 3. Desplegar Backend en Easypanel

### Paso 3.1: Preparar Repositorio

1. Asegúrate de que todos los archivos estén en Git:
   ```bash
   git add .
   git commit -m "Add Google Drive backend integration"
   git push
   ```

### Paso 3.2: Crear Nueva Aplicación en Easypanel

1. Inicia sesión en tu panel de Easypanel
2. Ve a tu proyecto
3. Haz clic en **"New Service"** o **"Nuevo Servicio"**
4. Selecciona **"App"** o **"Aplicación"**

### Paso 3.3: Configurar la Aplicación Backend

1. **Source**:
   - **Repository**: Selecciona tu repositorio de GitHub/GitLab
   - **Branch**: `main` (o la rama que uses)
   - **Root Directory**: `backend` (IMPORTANTE: especifica la carpeta backend)

2. **Build**:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Port**: `5000`

3. **Environment Variables** (Variables de Entorno):
   Haz clic en **"Environment Variables"** y agrega:

   ```
   PORT=5000
   FRONTEND_URL=https://tu-dominio-frontend.com
   GOOGLE_CLIENT_ID=tu_client_id_de_google
   GOOGLE_CLIENT_SECRET=tu_client_secret_de_google
   GOOGLE_REDIRECT_URI=https://tu-dominio-backend.com/api/auth/google/callback
   SESSION_SECRET=tu_secret_super_secreto_produccion
   ```

   **⚠️ IMPORTANTE**: 
   - Reemplaza `tu-dominio-backend.com` con el dominio real que Easypanel te asigne
   - Reemplaza `tu-dominio-frontend.com` con el dominio de tu frontend
   - Usa los valores reales de `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` que obtuviste

4. Haz clic en **"Deploy"** o **"Desplegar"**

### Paso 3.4: Obtener URL del Backend

1. Una vez desplegado, Easypanel te dará una URL
2. **Anota esta URL** (ej: `https://backend-abc123.easypanel.host` o `https://api.tu-dominio.com`)
3. Esta será tu `GOOGLE_REDIRECT_URI`
4. **Verifica que funciona**: Abre `https://tu-backend-url/health` en tu navegador
   - Deberías ver: `{"status":"ok",...}`

### Paso 3.5: Actualizar Google Cloud Console con URL de Producción

**⚠️ IMPORTANTE**: Si no agregaste la URL de producción en el Paso 1.5, hazlo ahora:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. **"APIs & Services"** → **"Credentials"**
3. Haz clic en tu OAuth Client ID para editarlo
4. En **"Authorized JavaScript origins"**, agrega:
   - `https://tu-backend-url.easypanel.host` (la URL EXACTA que te dio Easypanel)
   - Ejemplo: `https://backend-abc123.easypanel.host`
5. En **"Authorized redirect URIs"**, agrega:
   - `https://tu-backend-url.easypanel.host/api/auth/google/callback` (URL + `/api/auth/google/callback`)
   - Ejemplo: `https://backend-abc123.easypanel.host/api/auth/google/callback`
6. Haz clic en **"Save"**

**✅ Verificación**: 
- La URL debe ser EXACTAMENTE igual a la que pusiste en `GOOGLE_REDIRECT_URI` en Easypanel
- Debe incluir `https://` (no `http://`)
- Debe incluir la ruta completa `/api/auth/google/callback`

### Paso 3.6: Actualizar Variables de Entorno en Easypanel

1. Ve a tu aplicación backend en Easypanel
2. Ve a **"Environment Variables"**
3. Actualiza `GOOGLE_REDIRECT_URI` con la URL real:
   ```
   GOOGLE_REDIRECT_URI=https://tu-dominio-backend.com/api/auth/google/callback
   ```
4. Haz clic en **"Save"** o **"Redeploy"**

---

## 4. Actualizar Frontend en Easypanel

### Paso 4.1: Actualizar Variable de Entorno del Frontend

**⚠️ CRÍTICO**: Esta variable es necesaria para que el frontend sepa a dónde conectarse.

1. Ve a tu aplicación **frontend** en Easypanel
2. Ve a **"Environment Variables"** o **"Variables de Entorno"**
3. **Agrega esta variable** (si no existe):
   ```
   VITE_API_URL=https://tu-backend-url.easypanel.host
   ```
   
   **Ejemplo:**
   ```
   VITE_API_URL=https://backend-abc123.easypanel.host
   ```
   
   **⚠️ IMPORTANTE**: 
   - Reemplaza `tu-backend-url.easypanel.host` con la URL **REAL** de tu backend (la que obtuviste en el Paso 3.4)
   - NO incluyas `/api` al final, solo la URL base
   - Debe ser `https://` (no `http://`)
   - Esta es la URL del **backend Node.js**, NO de Supabase

### Paso 4.2: Hacer Rebuild del Frontend

**⚠️ OBLIGATORIO**: Después de agregar `VITE_API_URL`, debes hacer **rebuild** porque Vite inyecta estas variables durante el build:

1. En Easypanel, ve a tu aplicación frontend
2. Haz clic en **"Redeploy"** o **"Rebuild"**
3. Espera a que termine el build (puede tomar varios minutos)

**Sin este paso, el frontend seguirá usando `localhost:5000`**

---

## 5. Probar en Producción

### Paso 5.1: Verificar Backend

1. Abre en tu navegador: `https://tu-dominio-backend.com/health`
2. Deberías ver:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-...",
     "service": "ATS Pro Backend - Google Drive API"
   }
   ```

### Paso 5.2: Probar Conexión de Google Drive

1. Abre tu aplicación frontend en producción
2. Inicia sesión
3. Ve a **Settings** → **Almacenamiento de Archivos**
4. Haz clic en **"Conectar con Google Drive"**
5. Se abrirá un popup de Google
6. Autoriza la aplicación
7. Deberías ver "Conectado" en verde ✅

---

## 🔒 Checklist de Seguridad

- [ ] ✅ `GOOGLE_CLIENT_SECRET` está en variables de entorno (nunca en código)
- [ ] ✅ `SESSION_SECRET` es único y fuerte
- [ ] ✅ URLs de producción configuradas en Google Cloud Console
- [ ] ✅ HTTPS habilitado en producción
- [ ] ✅ Variables de entorno no están en Git (verificado con `.gitignore`)

---

## 🐛 Solución de Problemas

### Error: "redirect_uri_mismatch"

**Causa**: La URL de redirección no coincide.

**Solución**:
1. Verifica que `GOOGLE_REDIRECT_URI` en Easypanel sea exactamente igual a la configurada en Google Cloud Console
2. Asegúrate de incluir `https://` y la ruta completa `/api/auth/google/callback`

### Error: "invalid_client"

**Causa**: Credenciales incorrectas.

**Solución**:
1. Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` sean correctos
2. Asegúrate de copiar los valores completos sin espacios

### El backend no inicia

**Causa**: Falta alguna variable de entorno.

**Solución**:
1. Revisa los logs en Easypanel
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de que el `Root Directory` esté configurado como `backend`

### El frontend no puede conectar con el backend

**Causa**: CORS o URL incorrecta.

**Solución**:
1. Verifica que `VITE_API_URL` en el frontend sea la URL correcta del backend
2. Verifica que `FRONTEND_URL` en el backend sea la URL correcta del frontend
3. Revisa los logs del backend para errores de CORS

---

## 📝 Resumen de URLs Necesarias

### Para Google Cloud Console:
- **Authorized JavaScript origins**: 
  - `http://localhost:5000` (desarrollo)
  - `https://tu-dominio-backend.com` (producción)
  
- **Authorized redirect URIs**:
  - `http://localhost:5000/api/auth/google/callback` (desarrollo)
  - `https://tu-dominio-backend.com/api/auth/google/callback` (producción)

### Para Easypanel Backend:
- `PORT=5000`
- `FRONTEND_URL=https://tu-dominio-frontend.com`
- `GOOGLE_CLIENT_ID=tu_client_id`
- `GOOGLE_CLIENT_SECRET=tu_client_secret`
- `GOOGLE_REDIRECT_URI=https://tu-dominio-backend.com/api/auth/google/callback`
- `SESSION_SECRET=tu_secret_seguro`

### Para Easypanel Frontend:
- `VITE_API_URL=https://tu-dominio-backend.com`

---

## ✅ Verificación Final

Después de completar todos los pasos:

1. ✅ Backend responde en `/health`
2. ✅ Frontend puede conectar con Google Drive
3. ✅ Se puede autorizar la aplicación
4. ✅ Los archivos se suben a Google Drive correctamente

¡Listo! Tu integración de Google Drive está funcionando en producción. 🎉

