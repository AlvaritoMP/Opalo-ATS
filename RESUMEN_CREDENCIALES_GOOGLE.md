# 📋 Resumen: Qué Obtener de Google Cloud y Dónde Ponerlo

## 🎯 Valores que Necesitas Obtener

### 1. Client ID
- **Dónde obtenerlo**: Google Cloud Console → APIs & Services → Credentials → Tu OAuth Client ID
- **Formato**: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
- **Dónde ponerlo**: 
  - `backend/.env` → `GOOGLE_CLIENT_ID=...`
  - Easypanel Backend → Variable de entorno `GOOGLE_CLIENT_ID`

### 2. Client Secret
- **Dónde obtenerlo**: Google Cloud Console → APIs & Services → Credentials → Tu OAuth Client ID
- **Formato**: `GOCSPX-abcdefghijklmnopqrstuvwxyz`
- **Dónde ponerlo**: 
  - `backend/.env` → `GOOGLE_CLIENT_SECRET=...`
  - Easypanel Backend → Variable de entorno `GOOGLE_CLIENT_SECRET`
- **⚠️ IMPORTANTE**: Nunca lo compartas ni lo subas a Git

### 3. URLs de Redirección
- **Dónde configurarlas**: Google Cloud Console → APIs & Services → Credentials → Tu OAuth Client ID → Authorized redirect URIs
- **Valores a agregar**:
  - Desarrollo: `http://localhost:5000/api/auth/google/callback`
  - Producción: `https://tu-dominio-backend.com/api/auth/google/callback`

## 📍 Ubicaciones en Google Cloud Console

### Paso 1: Acceder
1. Ve a: https://console.cloud.google.com/
2. Selecciona tu proyecto

### Paso 2: Habilitar API
- **Ruta**: APIs & Services → Library
- **Buscar**: "Google Drive API"
- **Acción**: Enable

### Paso 3: Configurar OAuth
- **Ruta**: APIs & Services → OAuth consent screen
- **Configurar**: App name, scopes, test users

### Paso 4: Crear Credenciales
- **Ruta**: APIs & Services → Credentials
- **Acción**: Create Credentials → OAuth client ID
- **Tipo**: Web application
- **Obtener**: Client ID y Client Secret

## 📝 Plantilla de .env para Backend

```env
# Puerto
PORT=5000

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Google OAuth (OBTENER DE GOOGLE CLOUD CONSOLE)
GOOGLE_CLIENT_ID=TU_CLIENT_ID_AQUI
GOOGLE_CLIENT_SECRET=TU_CLIENT_SECRET_AQUI

# Redirect URI (debe coincidir con Google Cloud Console)
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Session Secret (genera uno aleatorio)
SESSION_SECRET=GENERA_UN_SECRET_ALEATORIO_AQUI
```

## 🔗 Enlaces Rápidos

- **Google Cloud Console**: https://console.cloud.google.com/
- **APIs & Services**: https://console.cloud.google.com/apis
- **Credentials**: https://console.cloud.google.com/apis/credentials
- **OAuth Consent Screen**: https://console.cloud.google.com/apis/credentials/consent

## ⚠️ Recordatorios Importantes

1. ✅ **Client Secret**: Nunca lo compartas, está en variables de entorno
2. ✅ **Redirect URI**: Debe coincidir EXACTAMENTE entre Google Cloud y tu backend
3. ✅ **Test Users**: Si la app está en modo "Testing", solo usuarios de prueba pueden acceder
4. ✅ **HTTPS**: En producción, usa siempre HTTPS
5. ✅ **Scopes**: Solo solicita los permisos necesarios

