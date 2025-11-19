# Guía Completa: Configuración de Google Drive para ATS Pro

Esta guía te llevará paso a paso para configurar completamente la integración con Google Drive.

## 📋 Resumen

La integración con Google Drive permite:
- ✅ Almacenar documentos de candidatos en Google Drive
- ✅ Organizar documentos por proceso en carpetas separadas
- ✅ Acceder a documentos desde cualquier lugar
- ✅ No depender de almacenamiento local del navegador

## 🎯 Pasos a Seguir

### 1️⃣ Configurar Google Cloud Console (15 minutos)

**Objetivo**: Obtener las credenciales OAuth2 necesarias.

**Sigue la guía detallada**: `GOOGLE_DRIVE_BACKEND_SETUP.md` - Sección "Paso 1"

**Resumen rápido:**
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto nuevo
3. Habilita "Google Drive API"
4. Configura la pantalla de consentimiento OAuth
5. Crea credenciales OAuth 2.0 (tipo: Web application)
6. **Copia el Client ID y Client Secret** (los necesitarás)

### 2️⃣ Configurar el Backend (10 minutos)

**Objetivo**: Tener el servidor backend corriendo.

**Sigue la guía detallada**: `GOOGLE_DRIVE_BACKEND_SETUP.md` - Sección "Paso 2"

**Resumen rápido:**
```bash
# 1. Ir a la carpeta backend
cd backend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales de Google

# 4. Iniciar servidor
npm run dev
```

**Variables importantes en `.env`:**
- `GOOGLE_CLIENT_ID`: Tu Client ID de Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: Tu Client Secret de Google Cloud Console
- `FRONTEND_URL`: URL donde corre tu app React (ej: http://localhost:5173)

### 3️⃣ Configurar el Frontend (2 minutos)

**Objetivo**: Conectar el frontend con el backend.

1. En la raíz del proyecto, crea/edita `.env.local`:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

2. Reinicia el servidor de desarrollo del frontend:
   ```bash
   npm run dev
   ```

### 4️⃣ Probar la Conexión (5 minutos)

1. **Abre tu aplicación** en el navegador (ej: http://localhost:5173)
2. **Inicia sesión**
3. Ve a **Settings** → **Almacenamiento de Archivos**
4. Haz clic en **"Conectar con Google Drive"**
5. Se abrirá una ventana popup de Google
6. **Autoriza la aplicación** (selecciona tu cuenta de Google)
7. La ventana se cerrará automáticamente
8. Deberías ver **"Conectado"** en verde ✅

### 5️⃣ Configurar Carpetas por Proceso (Opcional)

1. Ve a **Procesos** → Crea o edita un proceso
2. En la sección **"Carpeta de Google Drive"**:
   - Haz clic en **"Seleccionar carpeta"**
   - Elige una carpeta existente o crea una nueva
3. Guarda el proceso

**Ahora**, cuando subas documentos de candidatos en ese proceso, se guardarán automáticamente en la carpeta de Google Drive configurada.

## 🔍 Verificación

### ✅ Backend Funcionando

Abre en tu navegador: `http://localhost:5000/health`

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "service": "ATS Pro Backend - Google Drive API"
}
```

### ✅ Frontend Conectado

1. En Settings → Almacenamiento de Archivos
2. Deberías ver el botón "Conectar con Google Drive"
3. Al hacer clic, debería abrirse un popup de Google

### ✅ Google Drive Conectado

1. Después de autorizar, deberías ver:
   - ✅ Estado: "Conectado"
   - ✅ Tu email de Google
   - ✅ Botón "Desconectar"

## 🐛 Problemas Comunes

### ❌ "redirect_uri_mismatch"

**Causa**: La URL de redirección no coincide.

**Solución**:
1. Ve a Google Cloud Console → Credentials
2. Edita tu OAuth Client ID
3. Verifica que "Authorized redirect URIs" incluya exactamente:
   - `http://localhost:5000/api/auth/google/callback`
4. Verifica que en `backend/.env` tengas:
   - `GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback`

### ❌ "invalid_client"

**Causa**: Credenciales incorrectas.

**Solución**:
1. Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `backend/.env` sean correctos
2. Asegúrate de copiar los valores completos sin espacios
3. No incluyas comillas alrededor de los valores

### ❌ El popup se cierra pero no conecta

**Causa**: Problema de comunicación entre frontend y backend.

**Solución**:
1. Verifica que el backend esté corriendo (`http://localhost:5000/health`)
2. Abre la consola del navegador (F12) y revisa errores
3. Verifica que `VITE_API_URL` en `.env.local` sea `http://localhost:5000`
4. Verifica que `FRONTEND_URL` en `backend/.env` sea `http://localhost:5173` (o tu URL)

### ❌ "access_denied"

**Causa**: Tu email no está en la lista de usuarios de prueba.

**Solución**:
1. Ve a Google Cloud Console → OAuth consent screen
2. En "Test users", agrega tu email
3. Vuelve a intentar conectar

## 📚 Archivos de Documentación

- **`GOOGLE_DRIVE_BACKEND_SETUP.md`**: Guía detallada del backend
- **`GOOGLE_DRIVE_SETUP.md`**: Documentación técnica (referencia)
- **`backend/README.md`**: Documentación del backend

## 🚀 Próximos Pasos

Una vez configurado:

1. **Configura carpetas por proceso** para organizar mejor los documentos
2. **Sube documentos de prueba** para verificar que se guarden en Google Drive
3. **Revisa tu Google Drive** - deberías ver una carpeta "ATS Pro" con tus archivos

## 💡 Tips

- **Organización**: Crea una carpeta por proceso para mantener los documentos organizados
- **Nombres de archivos**: Los archivos se nombran automáticamente como `[NombreCandidato]_[NombreArchivo]`
- **Acceso**: Los archivos se guardan en tu Google Drive personal, solo tú puedes acceder
- **Backup**: Google Drive hace backup automático de tus archivos

## 🆘 ¿Necesitas Ayuda?

1. Revisa los logs del backend en la terminal
2. Revisa la consola del navegador (F12)
3. Verifica que todas las variables de entorno estén configuradas
4. Consulta `GOOGLE_DRIVE_BACKEND_SETUP.md` para más detalles

