# Configuración del Proyecto Opalo ATS

Este documento te guiará para configurar el proyecto Opalo ATS después de clonarlo.

## Prerrequisitos

- Node.js >= 20.0.0
- npm >= 10.0.0

## Instalación de Dependencias

Las dependencias ya han sido instaladas. Si necesitas reinstalarlas:

```bash
# Frontend
npm install

# Backend
cd backend
npm install
cd ..
```

## Configuración de Variables de Entorno

### Frontend (.env.local)

Crea un archivo `.env.local` en la raíz del proyecto con el siguiente contenido:

```env
# API Key de Google Gemini
GEMINI_API_KEY=tu_gemini_api_key_aqui

# URL de Supabase (debes crear tu propia instancia de Supabase)
VITE_SUPABASE_URL=

# Anon Key de Supabase (obtén esta key desde tu proyecto de Supabase)
VITE_SUPABASE_ANON_KEY=

# URL del backend API (para desarrollo local usar http://localhost:5000)
VITE_API_URL=http://localhost:5000
```

### Backend (.env)

Crea un archivo `.env` en la carpeta `backend/` con el siguiente contenido:

```env
# Puerto del servidor (por defecto 5000)
PORT=5000

# URL del frontend (para CORS y redirecciones)
FRONTEND_URL=http://localhost:5173

# Credenciales de Google OAuth2 para Google Drive
# Obtén estas credenciales en: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=tu_google_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_google_client_secret_aqui

# URI de redirección de Google OAuth
# Para desarrollo local: http://localhost:5000/api/auth/google/callback
# Para producción: https://tu-dominio.com/api/auth/google/callback
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

## Cómo Obtener las Credenciales

### Google Gemini API Key

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea una nueva API key
3. Copia la key y pégala en `GEMINI_API_KEY`

### Google OAuth Credentials

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google Drive
4. Ve a "Credenciales" > "Crear credenciales" > "ID de cliente OAuth 2.0"
5. Configura la pantalla de consentimiento OAuth
6. Agrega la URI de redirección: `http://localhost:5000/api/auth/google/callback`
7. Copia el Client ID y Client Secret a las variables de entorno del backend

## Ejecutar el Proyecto

### Desarrollo

**Frontend:**
```bash
npm run dev
```
El frontend estará disponible en `http://localhost:3000`

**Backend:**
```bash
cd backend
npm run dev
```
El backend estará disponible en `http://localhost:5000`

### Producción

**Frontend:**
```bash
npm run build
npm run preview
```

**Backend:**
```bash
cd backend
npm start
```

## Estructura del Proyecto

```
Opalo-ATS/
├── backend/          # Servidor Express para Google Drive API
├── components/      # Componentes React
├── lib/              # Utilidades y servicios
├── src/              # Código fuente principal
└── ...
```

## Notas Importantes

- **IMPORTANTE**: Esta es una nueva instancia de Opalo ATS sin datos. Debes configurar tu propia base de datos de Supabase.
- Asegúrate de tener las credenciales de Google OAuth configuradas antes de usar la funcionalidad de Google Drive
- El proyecto usa Supabase como base de datos. Debes crear tu propio proyecto en Supabase y configurar las credenciales
- La aplicación comenzará completamente vacía, sin procesos, candidatos ni usuarios. Deberás crear todo desde cero.
- Para producción, actualiza las URLs en las variables de entorno

