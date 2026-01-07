# 📋 Pasos Finales: Configurar Puerto 5001

## ✅ Cambios Ya Realizados

- [x] Backend configurado para usar puerto 5001 por defecto
- [x] Frontend configurado para usar puerto 5001 por defecto

---

## 📝 Pasos que Debes Hacer

### Paso 1: Actualizar `backend/.env`

Abre `Opalo-ATS/backend/.env` y asegúrate de que tenga:

```env
PORT=5001
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback
FRONTEND_URL=http://localhost:3001
NODE_ENV=development
```

**IMPORTANTE**: 
- `PORT=5001` (no 5000)
- `GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback` (puerto 5001)

### Paso 2: Crear `.env.local` en la Raíz

Crea el archivo `Opalo-ATS/.env.local` con:

```env
VITE_API_URL=http://localhost:5001
```

Si ya tienes credenciales de Supabase, agrégalas también:

```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
VITE_API_URL=http://localhost:5001
```

### Paso 3: Actualizar Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials
3. Edita tu OAuth Client ID
4. En "Authorized redirect URIs", agrega:
   ```
   http://localhost:5001/api/auth/google/callback
   ```
5. Guarda los cambios

### Paso 4: Iniciar el Backend

```bash
cd Opalo-ATS\backend
npm run dev
```

Deberías ver:
```
🚀 Servidor backend corriendo en http://0.0.0.0:5001
🔐 Google OAuth Redirect URI: http://localhost:5001/api/auth/google/callback
✅ Backend listo para recibir peticiones
```

### Paso 5: Reiniciar el Frontend

1. Presiona `Ctrl+C` en la terminal del frontend
2. Ejecuta: `npm run dev`
3. Debería iniciar en `http://localhost:3001`

---

## ✅ Verificación

1. **Backend**: `http://localhost:5001/health` responde
2. **Frontend**: `http://localhost:3001` carga
3. **Google Drive**: Al hacer clic en "Conectar", funciona

---

## 📝 Resumen de URLs

- **Frontend**: `http://localhost:3001`
- **Backend**: `http://localhost:5001`
- **Health Check**: `http://localhost:5001/health`
- **OAuth Callback**: `http://localhost:5001/api/auth/google/callback`

