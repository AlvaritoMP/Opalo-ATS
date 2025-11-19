# ATS Pro Backend - Google Drive Integration

Backend API para manejar la autenticación OAuth2 con Google Drive.

## 🚀 Inicio Rápido

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   # Edita .env con tus credenciales de Google
   ```

3. **Iniciar servidor:**
   ```bash
   npm run dev  # Modo desarrollo
   # o
   npm start    # Modo producción
   ```

## 📚 Documentación Completa

Ver `GOOGLE_DRIVE_BACKEND_SETUP.md` para instrucciones detalladas sobre:
- Cómo obtener credenciales de Google Cloud Console
- Configuración paso a paso
- Despliegue a producción
- Solución de problemas

## 🔌 Endpoints

### `GET /health`
Health check del servidor.

### `GET /api/auth/google/drive`
Inicia el flujo de autenticación OAuth2. Redirige a Google.

### `GET /api/auth/google/callback`
Callback después de la autenticación. Google redirige aquí.

### `POST /api/auth/google/refresh`
Refresca el access token usando el refresh token.

## 🔒 Variables de Entorno

Ver `.env.example` para la lista completa de variables requeridas.

## 📦 Dependencias

- `express`: Framework web
- `cors`: Manejo de CORS
- `dotenv`: Variables de entorno
- `googleapis`: SDK de Google APIs

