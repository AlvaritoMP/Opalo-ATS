# ⚡ Inicio Rápido: Google Drive en 5 Pasos

## 🎯 Pasos Rápidos

### 1️⃣ Obtener Credenciales (5 min)
1. Ve a: https://console.cloud.google.com/
2. Crea proyecto → Habilita "Google Drive API"
3. OAuth consent screen → Configura app
4. Credentials → Crea OAuth Client ID (tipo: Web application)
5. **Copia**: Client ID y Client Secret

### 2️⃣ Configurar Backend Local (2 min)
```bash
cd backend
npm install
# Crea .env con tus credenciales (ver .env.example)
npm run dev
```

### 3️⃣ Desplegar Backend en Easypanel (10 min)
1. Nueva App → Root Directory: `backend`
2. Variables de entorno:
   - `GOOGLE_CLIENT_ID=tu_client_id`
   - `GOOGLE_CLIENT_SECRET=tu_client_secret`
   - `GOOGLE_REDIRECT_URI=https://tu-backend.com/api/auth/google/callback`
   - `FRONTEND_URL=https://tu-frontend.com`
3. Deploy

### 4️⃣ Actualizar Google Cloud (2 min)
1. Edita tu OAuth Client ID
2. Agrega redirect URI de producción:
   - `https://tu-backend.com/api/auth/google/callback`

### 5️⃣ Actualizar Frontend (2 min)
1. En Easypanel Frontend → Variables de entorno
2. Agrega: `VITE_API_URL=https://tu-backend.com`
3. Redeploy

## ✅ Listo!

Ahora puedes conectar Google Drive desde Settings en tu app.

---

📚 **Para más detalles**: Ver `DEPLOY_GOOGLE_DRIVE.md`

