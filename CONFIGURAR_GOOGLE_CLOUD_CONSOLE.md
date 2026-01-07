# 🔧 Configurar Google Cloud Console para Opalo ATS

## 📋 Situación Actual

Tienes las credenciales de Google OAuth configuradas para Opalopy en producción, pero necesitas:
1. ✅ Agregar Redirect URI para desarrollo local de Opalo ATS
2. ✅ Preparar para cuando subas Opalo ATS a producción

---

## 🎯 Paso 1: Actualizar Google Cloud Console

### 1.1 Acceder a la Configuración

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona el proyecto donde está configurado "Web client 1"
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en **"Web client 1"** (tu OAuth 2.0 Client ID)

### 1.2 Agregar Redirect URI para Desarrollo Local

En la sección **"Authorized redirect URIs"**, verifica que esté:

**URIs que DEBEN estar:**
- ✅ `http://localhost:5000/api/auth/google/callback` (desarrollo local de Opalo ATS)
- ✅ `http://localhost:3000/api/auth/google/callback` (desarrollo local de Opalopy - ya existe)
- ✅ `https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/callback` (producción de Opalopy - ya existe)

**Si falta `http://localhost:5000/api/auth/google/callback`:**

1. Haz clic en **"+ ADD URI"** en la sección "Authorized redirect URIs"
2. Agrega: `http://localhost:5000/api/auth/google/callback`
3. Haz clic en **"SAVE"** (arriba a la derecha)

### 1.3 (Opcional) Agregar JavaScript Origins para Desarrollo Local

En la sección **"Authorized JavaScript origins"**, puedes agregar:
- `http://localhost:5000` (para desarrollo local del backend)
- `http://localhost:3001` (para desarrollo local del frontend de Opalo ATS)

**Nota**: Esto es opcional, pero puede ayudar con algunos errores de CORS.

---

## 🎯 Paso 2: Configurar para Producción (Cuando Subas Opalo ATS)

Cuando subas Opalo ATS a producción, necesitarás:

### 2.1 Obtener la URL del Backend de Producción

Cuando despliegues Opalo ATS en producción, obtendrás una URL como:
- `https://opalo-ats-backend-prod.easypanel.host` (ejemplo)

### 2.2 Agregar Redirect URI de Producción

1. Ve a Google Cloud Console → **Credentials** → **"Web client 1"**
2. En **"Authorized redirect URIs"**, agrega:
   - `https://TU-BACKEND-URL/api/auth/google/callback`
   - Ejemplo: `https://opalo-ats-backend-prod.easypanel.host/api/auth/google/callback`
3. Haz clic en **"SAVE"**

### 2.3 Agregar JavaScript Origins de Producción

En **"Authorized JavaScript origins"**, agrega:
- `https://TU-BACKEND-URL` (sin `/api/...`)
- `https://TU-FRONTEND-URL` (URL del frontend de Opalo ATS)

---

## 📝 Resumen de URIs Necesarias

### Desarrollo Local

| App | Backend URL | Redirect URI |
|-----|-------------|--------------|
| Opalopy | `http://localhost:5000` | `http://localhost:3000/api/auth/google/callback` |
| Opalo ATS | `http://localhost:5000` | `http://localhost:5000/api/auth/google/callback` |

**Nota**: Ambas apps pueden usar el mismo backend en desarrollo local (puerto 5000), pero con diferentes Redirect URIs.

### Producción

| App | Backend URL | Redirect URI |
|-----|-------------|--------------|
| Opalopy | `https://opalo-ats-backend.bouasv.easypanel.host` | `https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/callback` |
| Opalo ATS | `https://TU-BACKEND-URL` | `https://TU-BACKEND-URL/api/auth/google/callback` |

---

## ✅ Checklist

### Para Desarrollo Local (Ahora)

- [ ] Agregado `http://localhost:5000/api/auth/google/callback` en Google Cloud Console
- [ ] Archivo `.env` creado en `Opalo-ATS/backend/.env` con las credenciales
- [ ] `FRONTEND_URL=http://localhost:3001` configurado en `.env`
- [ ] Backend reiniciado después de crear `.env`
- [ ] Probada la conexión con Google Drive en Opalo ATS local

### Para Producción (Cuando Subas Opalo ATS)

- [ ] Backend de Opalo ATS desplegado en producción
- [ ] URL del backend obtenida
- [ ] Redirect URI de producción agregada en Google Cloud Console
- [ ] JavaScript origins de producción agregadas
- [ ] Variables de entorno configuradas en el servidor de producción:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI` (URL de producción)
  - `FRONTEND_URL` (URL del frontend de producción)
- [ ] Probada la conexión con Google Drive en Opalo ATS en producción

---

## 🔍 Verificación

### Verificar que el Redirect URI Esté Configurado

1. Ve a Google Cloud Console → **Credentials** → **"Web client 1"**
2. En **"Authorized redirect URIs"**, verifica que esté:
   - `http://localhost:5000/api/auth/google/callback` ✅
3. Si no está, agrégalo y guarda

### Verificar que el Backend Funcione

1. Inicia el backend:
   ```bash
   cd Opalo-ATS/backend
   npm run dev
   ```

2. Deberías ver:
   ```
   🚀 Servidor backend corriendo en http://0.0.0.0:5000
   🔐 Google OAuth Redirect URI: http://localhost:5000/api/auth/google/callback
   ✅ Backend listo para recibir peticiones
   ```

3. Prueba el health check:
   ```
   http://localhost:5000/health
   ```

---

## 🆘 Errores Comunes

### Error: "redirect_uri_mismatch"

**Causa**: El Redirect URI en Google Cloud Console no coincide con el que usa el backend.

**Solución**:
1. Verifica que `http://localhost:5000/api/auth/google/callback` esté en Google Cloud Console
2. Verifica que `GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback` esté en `.env`
3. Reinicia el backend después de cambiar `.env`

### Error: "invalid_client"

**Causa**: El Client ID o Client Secret son incorrectos.

**Solución**:
1. Verifica que las credenciales en `.env` sean correctas
2. Verifica que no haya espacios extra o comillas
3. Reinicia el backend

---

## 📝 Notas Importantes

1. **Las mismas credenciales pueden usarse** para Opalopy y Opalo ATS
2. **Cada app creará su propia carpeta raíz** en Google Drive:
   - Opalopy → "Opalopy" o "ATS Pro"
   - Opalo ATS → "Opalo ATS"
3. **En desarrollo local**, ambas apps pueden usar el mismo backend (puerto 5000) con diferentes Redirect URIs
4. **En producción**, cada app debería tener su propio backend con su propia URL

---

## 🚀 Siguiente Paso

Después de configurar Google Cloud Console:

1. **Reinicia el backend** de Opalo ATS
2. **Prueba la conexión** con Google Drive en la app
3. **Cuando subas a producción**, agrega el Redirect URI de producción en Google Cloud Console

