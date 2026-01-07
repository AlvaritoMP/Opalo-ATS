# 📝 Crear Archivo .env Manualmente

## ⚠️ Importante

El archivo `.env` no se puede crear automáticamente por seguridad. Debes crearlo manualmente.

---

## 📋 Pasos

### 1. Crear el Archivo

Crea un archivo llamado `.env` en la carpeta `Opalo-ATS/backend/`

### 2. Copiar este Contenido

Copia y pega este contenido en el archivo `.env`:

```env
# Google OAuth2 Credentials
# Copiadas desde el servidor de producción de Opalopy
GOOGLE_CLIENT_ID=tu_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui

# Redirect URI para OAuth callback
# Para desarrollo local de Opalo ATS:
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Frontend URL (para CORS y redirecciones)
# IMPORTANTE: Opalo ATS corre en puerto 3001 en desarrollo local
FRONTEND_URL=http://localhost:3001

# Puerto del servidor backend
PORT=5000

# Entorno
NODE_ENV=development
```

### 3. Guardar el Archivo

Guarda el archivo como `.env` (sin extensión, solo el nombre `.env`)

---

## ✅ Verificación

Después de crear el archivo, verifica que:

1. El archivo esté en: `Opalo-ATS/backend/.env`
2. Contenga las 6 variables de entorno
3. No tenga espacios extra antes o después de los `=`
4. No tenga comillas alrededor de los valores

---

## 🚀 Siguiente Paso

Después de crear el `.env`:

1. Reinicia el backend: `cd Opalo-ATS/backend && npm run dev`
2. Verifica que veas: `🔐 Google OAuth Redirect URI: http://localhost:5000/api/auth/google/callback`
3. Configura Google Cloud Console (ver `CONFIGURAR_GOOGLE_CLOUD_CONSOLE.md`)

