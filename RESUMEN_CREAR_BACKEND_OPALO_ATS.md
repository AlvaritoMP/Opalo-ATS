# 📝 Resumen: Crear Backend de Opalo ATS en EasyPanel

## 🎯 Objetivo

Crear un **backend separado** para Opalo ATS en EasyPanel (más simple que modificar el backend de Opalopy).

---

## ✅ Pasos Rápidos

### 1. Crear Servicio en EasyPanel

- **Tipo**: From Git
- **Repo**: `https://github.com/AlvaritoMP/Opalo-ATS.git`
- **Root Directory**: `Opalo-ATS/backend`
- **Port**: `5000`
- **Start Command**: `node src/server.js`

### 2. Variables de Entorno

```env
PORT=5000
NODE_ENV=production
GOOGLE_CLIENT_ID=968572483416-v3dju424jrbae7b85u7fb7jurskfmh15.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://URL_DEL_BACKEND/api/auth/google/callback
FRONTEND_URL=https://URL_DEL_FRONTEND_OPALO_ATS
```

### 3. Deploy y Actualizar

1. Deploy el backend
2. Anota la URL que te da EasyPanel
3. Actualiza `GOOGLE_REDIRECT_URI` con la URL real
4. Actualiza `VITE_API_URL` en el frontend
5. Actualiza Google Cloud Console

---

## 📋 Archivos Necesarios

El backend ya está listo en:
- `Opalo-ATS/backend/package.json`
- `Opalo-ATS/backend/src/server.js`
- `Opalo-ATS/backend/src/routes/auth.js`
- `Opalo-ATS/backend/src/config/googleDrive.js`

**No necesitas crear nada nuevo**, solo desplegarlo.

---

## 🎯 Ventajas de Backend Separado

- ✅ **Más simple**: No necesitas modificar el backend de Opalopy
- ✅ **Independiente**: Cada app tiene su propio backend
- ✅ **Fácil de mantener**: Cambios en uno no afectan al otro
- ✅ **Escalable**: Puedes escalar cada backend por separado

---

## 📝 Notas

- El backend de Opalo ATS ya está **completamente funcional**
- Solo necesitas **desplegarlo** en EasyPanel
- Las credenciales de Google OAuth son las **mismas** (pueden compartirse)

