# Opalo ATS Backend - Google Drive Integration

Backend API para manejar la autenticación OAuth2 de Google Drive para Opalo ATS.

## Configuración

1. Copia `.env.example` a `.env` (si existe) o crea `.env` manualmente
2. Agrega tus credenciales de Google OAuth:

```env
PORT=5000
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:3001
NODE_ENV=development
```

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Producción

```bash
npm start
```

## Endpoints

- `GET /health` - Health check
- `GET /api/auth/google/drive` - Inicia el flujo OAuth
- `GET /api/auth/google/callback` - Callback de OAuth
- `POST /api/auth/google/refresh` - Refrescar token de acceso

