# Configuración del Backend para Google Drive

Esta guía te ayudará a configurar el backend necesario para la integración con Google Drive.

## 📋 Requisitos Previos

1. **Node.js** 18+ instalado
2. **Cuenta de Google** con espacio disponible en Drive
3. **Acceso a Google Cloud Console**

## 🔧 Paso 1: Configurar Google Cloud Console

### 1.1 Crear o Seleccionar Proyecto

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Si no tienes un proyecto, haz clic en **"Select a project"** → **"New Project"**
3. Nombra el proyecto (ej: "ATS Pro File Storage")
4. Haz clic en **"Create"**

### 1.2 Habilitar Google Drive API

1. En el menú lateral, ve a **"APIs & Services"** → **"Library"**
2. Busca **"Google Drive API"**
3. Haz clic en el resultado y luego en **"Enable"**
4. Espera a que se habilite (puede tomar unos segundos)

### 1.3 Configurar Pantalla de Consentimiento OAuth

1. Ve a **"APIs & Services"** → **"OAuth consent screen"**
2. Selecciona el tipo de usuario:
   - **External** (para usuarios de Gmail normales)
   - **Internal** (solo si tienes Google Workspace)
3. Haz clic en **"Create"**
4. Completa el formulario:
   - **App name**: `ATS Pro` (o el nombre que prefieras)
   - **User support email**: Tu email
   - **Developer contact information**: Tu email
5. Haz clic en **"Save and Continue"**
6. En **"Scopes"**, haz clic en **"Add or Remove Scopes"**
7. Busca y agrega estos scopes:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive.metadata.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
8. Haz clic en **"Update"** y luego **"Save and Continue"**
9. En **"Test users"** (si elegiste External):
   - Haz clic en **"Add Users"**
   - Agrega tu email (y los emails de otros usuarios que quieras que prueben)
   - Haz clic en **"Add"**
10. Haz clic en **"Save and Continue"** hasta completar

### 1.4 Crear Credenciales OAuth 2.0

1. Ve a **"APIs & Services"** → **"Credentials"**
2. Haz clic en **"+ Create Credentials"** → **"OAuth client ID"**
3. Si es la primera vez, te pedirá configurar la pantalla de consentimiento (ya lo hiciste en el paso anterior)
4. Selecciona **"Web application"** como tipo de aplicación
5. Completa el formulario:
   - **Name**: `ATS Pro Backend` (o el nombre que prefieras)
   - **Authorized JavaScript origins**: 
     - `http://localhost:5000` (para desarrollo)
     - `https://tu-dominio.com` (para producción, si aplica)
   - **Authorized redirect URIs**:
     - `http://localhost:5000/api/auth/google/callback` (para desarrollo)
     - `https://tu-dominio.com/api/auth/google/callback` (para producción, si aplica)
6. Haz clic en **"Create"**
7. **IMPORTANTE**: Se mostrará un modal con tus credenciales:
   - **Client ID**: Cópialo (lo necesitarás)
   - **Client Secret**: Cópialo (lo necesitarás)
   - ⚠️ **Guarda estos valores de forma segura, no los compartas**

## 🔧 Paso 2: Configurar el Backend

### 2.1 Instalar Dependencias

```bash
cd backend
npm install
```

### 2.2 Configurar Variables de Entorno

1. Copia el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```

2. Edita el archivo `.env` y completa los valores:

```env
# Puerto del servidor
PORT=5000

# URL del frontend (debe coincidir con donde corre tu app React)
FRONTEND_URL=http://localhost:5173

# Google OAuth 2.0 Credentials (obtenidos en el Paso 1.4)
GOOGLE_CLIENT_ID=tu_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui

# URL de redirección (debe coincidir con la configurada en Google Cloud Console)
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Secret para sesiones (genera uno aleatorio, puedes usar: openssl rand -hex 32)
SESSION_SECRET=tu_secret_super_secreto_aqui_cambiar_en_produccion
```

**Ejemplo de valores reales:**
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### 2.3 Iniciar el Backend

**Modo desarrollo (con auto-reload):**
```bash
npm run dev
```

**Modo producción:**
```bash
npm start
```

Deberías ver:
```
🚀 Servidor backend corriendo en http://localhost:5000
📡 Frontend URL: http://localhost:5173
🔐 Google OAuth Redirect URI: http://localhost:5000/api/auth/google/callback

✅ Backend listo para recibir peticiones
```

## 🔧 Paso 3: Configurar el Frontend

### 3.1 Actualizar Variable de Entorno del Frontend

En el archivo `.env.local` del proyecto principal (raíz), agrega:

```env
VITE_API_URL=http://localhost:5000
```

### 3.2 Verificar que el Frontend Esté Corriendo

Asegúrate de que tu aplicación React esté corriendo en `http://localhost:5173` (o la URL que configuraste):

```bash
npm run dev
```

## ✅ Paso 4: Probar la Conexión

1. **Inicia el backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Inicia el frontend** (en otra terminal):
   ```bash
   npm run dev
   ```

3. **En el navegador:**
   - Ve a `http://localhost:5173`
   - Inicia sesión
   - Ve a **Settings** → **Almacenamiento de Archivos**
   - Haz clic en **"Conectar con Google Drive"**
   - Se abrirá una ventana popup de Google
   - Autoriza la aplicación
   - La ventana se cerrará automáticamente
   - Deberías ver "Conectado" en verde

## 🚀 Paso 5: Desplegar a Producción

### 5.1 Actualizar Google Cloud Console

1. Ve a **"APIs & Services"** → **"Credentials"**
2. Edita tu OAuth Client ID
3. Agrega en **"Authorized JavaScript origins"**:
   - `https://tu-dominio-backend.com`
4. Agrega en **"Authorized redirect URIs"**:
   - `https://tu-dominio-backend.com/api/auth/google/callback`
5. Guarda los cambios

### 5.2 Actualizar Variables de Entorno

En producción, actualiza el `.env` del backend:

```env
PORT=5000
FRONTEND_URL=https://tu-dominio-frontend.com
GOOGLE_CLIENT_ID=tu_client_id_produccion
GOOGLE_CLIENT_SECRET=tu_client_secret_produccion
GOOGLE_REDIRECT_URI=https://tu-dominio-backend.com/api/auth/google/callback
SESSION_SECRET=secret_super_seguro_produccion
```

### 5.3 Desplegar Backend

Puedes desplegar el backend en:
- **Heroku**
- **Railway**
- **Render**
- **DigitalOcean**
- **AWS**
- **Cualquier servicio que soporte Node.js**

**Ejemplo con Railway:**
1. Conecta tu repositorio
2. Selecciona la carpeta `backend`
3. Configura las variables de entorno
4. Railway detectará automáticamente Node.js y ejecutará `npm start`

## 🔒 Seguridad

1. **Nunca compartas** tu `GOOGLE_CLIENT_SECRET`
2. **No subas** el archivo `.env` a Git (ya está en `.gitignore`)
3. **Usa HTTPS** en producción
4. **Genera un SESSION_SECRET** fuerte y único para producción
5. **Limita los scopes** a solo lo necesario (ya configurado)

## 🐛 Solución de Problemas

### Error: "redirect_uri_mismatch"
- Verifica que la URL en `GOOGLE_REDIRECT_URI` coincida exactamente con la configurada en Google Cloud Console
- Asegúrate de incluir `http://` o `https://` según corresponda

### Error: "invalid_client"
- Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` sean correctos
- Asegúrate de copiar los valores completos sin espacios

### El popup se cierra pero no se conecta
- Abre la consola del navegador (F12) y revisa errores
- Verifica que `FRONTEND_URL` en el backend coincida con la URL donde corre tu frontend
- Verifica que CORS esté configurado correctamente

### Error: "access_denied"
- Verifica que tu email esté en la lista de "Test users" en Google Cloud Console
- Si la app está en modo "Testing", solo los usuarios de prueba pueden acceder

## 📝 Notas Importantes

- **Límites de Google Drive API**: 1,000 requests/100 segundos por usuario
- **Tamaño máximo de archivo**: 5TB (pero limita a 10-50MB para CVs en tu app)
- **Tokens**: Los access tokens expiran después de 1 hora. El refresh token se usa para obtener nuevos access tokens automáticamente.
- **Carpeta raíz**: Se crea automáticamente una carpeta "ATS Pro" en Google Drive del usuario

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs del backend en la terminal
2. Revisa la consola del navegador (F12)
3. Verifica que todas las variables de entorno estén configuradas correctamente
4. Asegúrate de que el backend esté corriendo antes de intentar conectar

