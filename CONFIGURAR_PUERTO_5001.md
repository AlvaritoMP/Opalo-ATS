# 🔧 Configurar Backend en Puerto 5001

## 🎯 Situación

El puerto 5000 está ocupado y no se puede liberar. Se ha configurado el backend de Opalo ATS para usar el puerto 5001.

---

## ✅ Cambios Realizados

1. **Backend configurado** para usar puerto 5001 por defecto
2. **`.env.local` actualizado** (si existe) para usar `http://localhost:5001`

---

## 📋 Pasos para Completar la Configuración

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

### Paso 2: Actualizar `.env.local` (Frontend)

Abre `Opalo-ATS/.env.local` y asegúrate de que tenga:

```env
VITE_API_URL=http://localhost:5001
```

**IMPORTANTE**: Puerto 5001, no 5000

### Paso 3: Actualizar Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials
3. Edita tu OAuth Client ID
4. En "Authorized redirect URIs", agrega:
   ```
   http://localhost:5001/api/auth/google/callback
   ```
5. Guarda los cambios

**IMPORTANTE**: Agrega el Redirect URI con puerto 5001

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

1. **Backend corriendo**: `http://localhost:5001/health` responde
2. **Frontend configurado**: `.env.local` tiene `VITE_API_URL=http://localhost:5001`
3. **Google Cloud Console**: Tiene `http://localhost:5001/api/auth/google/callback`
4. **Conexión funciona**: Al hacer clic en "Conectar con Google Drive", funciona

---

## 📝 Resumen de URLs

- **Frontend**: `http://localhost:3001`
- **Backend**: `http://localhost:5001`
- **Health Check**: `http://localhost:5001/health`
- **OAuth Init**: `http://localhost:5001/api/auth/google/drive`
- **OAuth Callback**: `http://localhost:5001/api/auth/google/callback`

---

## 🆘 Si Algo No Funciona

1. **Verifica que el puerto 5001 esté libre**:
   ```powershell
   Get-NetTCPConnection -LocalPort 5001
   ```

2. **Verifica que `.env.local` tenga el puerto correcto**:
   ```env
   VITE_API_URL=http://localhost:5001
   ```

3. **Verifica que `backend/.env` tenga el puerto correcto**:
   ```env
   PORT=5001
   GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback
   ```

4. **Reinicia ambos** (frontend y backend) después de cambiar los puertos

