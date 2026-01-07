# 🔧 Configurar Google Drive para Opalo ATS

## ❌ Problema Actual

La app muestra este mensaje:
> "Para conectar Google Drive, necesitas configurar un backend que maneje la autenticación OAuth2."

Esto significa que el **backend no tiene las credenciales de Google OAuth configuradas**.

---

## ✅ Solución: Configurar Credenciales de Google OAuth

### Paso 1: Verificar que el Backend Esté Corriendo

Abre una terminal y ejecuta:

```bash
cd Opalo-ATS/backend
npm run dev
```

Deberías ver:
```
🚀 Servidor backend corriendo en http://0.0.0.0:5000
```

**Si el backend no está corriendo, la conexión con Google Drive NO funcionará.**

---

### Paso 2: Obtener Credenciales de Google Cloud Console

#### 2.1 Ir a Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona el proyecto de **Opalopy** (o crea uno nuevo para Opalo ATS)

#### 2.2 Habilitar Google Drive API

1. Ve a **APIs & Services** → **Library**
2. Busca "Google Drive API"
3. Haz clic en **Enable** (si no está habilitada)

#### 2.3 Crear Credenciales OAuth 2.0

1. Ve a **APIs & Services** → **Credentials**
2. Haz clic en **Create Credentials** → **OAuth client ID**
3. Si es la primera vez, configura la pantalla de consentimiento:
   - **Tipo**: External (o Internal si tienes Google Workspace)
   - **Nombre de la app**: "Opalo ATS"
   - **Email de soporte**: tu email
   - **Scopes**: Agrega estos scopes:
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/userinfo.email`
   - **Usuarios de prueba**: Agrega tu email (para testing)
4. **Tipo de aplicación**: Web application
5. **Nombre**: "Opalo ATS Backend"
6. **Authorized redirect URIs**: 
   - `http://localhost:5000/api/auth/google/callback` (desarrollo local)
   - Si tienes producción, agrega también: `https://tu-dominio.com/api/auth/google/callback`
7. Haz clic en **Create**
8. **Copia las credenciales**:
   - **Client ID** (ej: `123456789-abcdefg.apps.googleusercontent.com`)
   - **Client Secret** (ej: `GOCSPX-abcdefghijklmnopqrstuvwxyz`)

---

### Paso 3: Configurar Variables de Entorno

#### 3.1 Crear archivo `.env` en el backend

Crea el archivo `Opalo-ATS/backend/.env` con este contenido:

```env
# Google OAuth2 Credentials
GOOGLE_CLIENT_ID=tu_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui

# Redirect URI para OAuth callback
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Frontend URL (para CORS y redirecciones)
FRONTEND_URL=http://localhost:3001

# Puerto del servidor backend
PORT=5000

# Entorno
NODE_ENV=development
```

**Reemplaza** `tu_client_id_aqui` y `tu_client_secret_aqui` con las credenciales que copiaste de Google Cloud Console.

#### 3.2 Si Ya Tienes Credenciales de Opalopy

Si ya tienes credenciales de Google OAuth configuradas para Opalopy, puedes:

**Opción A: Usar las mismas credenciales** (más simple)
- Copia el `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` de `Opalopy/backend/.env`
- Pégales en `Opalo-ATS/backend/.env`
- Asegúrate de que el `GOOGLE_REDIRECT_URI` incluya `http://localhost:5000/api/auth/google/callback` en Google Cloud Console

**Opción B: Crear credenciales nuevas** (más seguro para separar apps)
- Crea nuevas credenciales OAuth 2.0 en Google Cloud Console
- Usa un nombre diferente (ej: "Opalo ATS Backend")
- Configura el redirect URI para Opalo ATS

---

### Paso 4: Reiniciar el Backend

Después de crear/editar el archivo `.env`:

1. **Detén el backend** (Ctrl+C en la terminal donde corre)
2. **Reinícialo**:
   ```bash
   cd Opalo-ATS/backend
   npm run dev
   ```

Deberías ver:
```
🚀 Servidor backend corriendo en http://0.0.0.0:5000
🔐 Google OAuth Redirect URI: http://localhost:5000/api/auth/google/callback
✅ Backend listo para recibir peticiones
```

**Si ves un error sobre `GOOGLE_CLIENT_ID` o `GOOGLE_CLIENT_SECRET`, verifica que el archivo `.env` esté correctamente configurado.**

---

### Paso 5: Probar la Conexión

1. **Abre la app** en `http://localhost:3001`
2. Ve a **Settings** → **Almacenamiento de Archivos**
3. Haz clic en **"Conectar con Google Drive"**
4. Debería:
   - Abrir una ventana popup
   - Redirigirte a Google para autorizar
   - Pedirte permisos para acceder a Google Drive
   - Redirigirte de vuelta a la app
   - Mostrar "Conectado" con tu email de Google

---

## 🔍 Verificación

### Verificar que el Backend Esté Corriendo

Abre en el navegador:
```
http://localhost:5000/health
```

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "service": "Opalo ATS Backend - Google Drive API"
}
```

### Verificar Variables de Entorno

En la terminal del backend, deberías ver al iniciar:
```
🔐 Google OAuth Redirect URI: http://localhost:5000/api/auth/google/callback
```

Si ves `⚠️ NOTA: GOOGLE_REDIRECT_URI no está configurada`, significa que el archivo `.env` no se está cargando correctamente.

---

## ❌ Errores Comunes

### Error 1: "Backend no responde"

**Solución**: Asegúrate de que el backend esté corriendo:
```bash
cd Opalo-ATS/backend
npm run dev
```

### Error 2: "redirect_uri_mismatch"

**Solución**: 
1. Ve a Google Cloud Console → Credentials
2. Edita tu OAuth 2.0 Client ID
3. Asegúrate de que `http://localhost:5000/api/auth/google/callback` esté en "Authorized redirect URIs"

### Error 3: "invalid_client"

**Solución**: 
1. Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén correctos en `.env`
2. Asegúrate de que no haya espacios extra o comillas
3. Reinicia el backend después de editar `.env`

### Error 4: "CORS error"

**Solución**: 
1. Verifica que `FRONTEND_URL=http://localhost:3001` esté en `.env`
2. Asegúrate de que el frontend esté corriendo en el puerto 3001
3. Reinicia el backend

---

## 📝 Notas Importantes

1. **El archivo `.env` NO debe subirse a Git** (ya está en `.gitignore`)
2. **Cada app (Opalo ATS y Opalopy) puede usar las mismas credenciales** o credenciales diferentes
3. **En producción**, actualiza `GOOGLE_REDIRECT_URI` con la URL real de tu backend
4. **El backend debe estar corriendo** para que Google Drive funcione

---

## ✅ Checklist

- [ ] Backend corriendo en puerto 5000
- [ ] Google Drive API habilitada en Google Cloud Console
- [ ] Credenciales OAuth 2.0 creadas
- [ ] Redirect URI configurado: `http://localhost:5000/api/auth/google/callback`
- [ ] Archivo `.env` creado en `Opalo-ATS/backend/.env`
- [ ] `GOOGLE_CLIENT_ID` configurado
- [ ] `GOOGLE_CLIENT_SECRET` configurado
- [ ] `GOOGLE_REDIRECT_URI` configurado
- [ ] `FRONTEND_URL=http://localhost:3001` configurado
- [ ] Backend reiniciado después de editar `.env`
- [ ] Health check funciona: `http://localhost:5000/health`
- [ ] Conexión con Google Drive funciona en la app

---

## 🆘 Si Aún No Funciona

1. **Revisa la consola del navegador** (F12) para ver errores
2. **Revisa la terminal del backend** para ver errores
3. **Verifica que el backend responda**: `http://localhost:5000/health`
4. **Verifica que el frontend esté en el puerto correcto**: `http://localhost:3001`
5. **Comparte los errores** que veas para diagnosticar

