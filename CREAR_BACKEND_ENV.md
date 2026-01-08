# 📝 Crear backend/.env para Google Drive

## 🎯 Ubicación

**Archivo**: `Opalo-ATS/backend/.env`

## 📋 Contenido Necesario

Crea el archivo `Opalo-ATS/backend/.env` con el siguiente contenido:

```env
PORT=5000
GOOGLE_CLIENT_ID=TU_GOOGLE_CLIENT_ID_AQUI
GOOGLE_CLIENT_SECRET=TU_GOOGLE_CLIENT_SECRET_AQUI
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:3001
NODE_ENV=development
```

## ⚠️ IMPORTANTE

**NO hagas commit de este archivo** - Está en `.gitignore` por seguridad.

## 📝 Pasos

1. Ve a `Opalo-ATS/backend/`
2. Crea el archivo `.env`
3. Copia el contenido de arriba
4. Guarda el archivo

## ✅ Verificación

Después de crear el archivo, inicia el backend:

```powershell
cd Opalo-ATS\backend
npm install
npm run dev
```

Deberías ver:
```
🚀 Servidor backend corriendo en http://0.0.0.0:5000
🔐 Google OAuth Redirect URI: http://localhost:5000/api/auth/google/callback
✅ Backend listo para recibir peticiones
```


