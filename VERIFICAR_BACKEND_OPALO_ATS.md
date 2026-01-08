# 🔍 Verificar Backend de Opalo ATS

## 📋 Variables de Entorno del Backend de Opalo ATS

El backend de Opalo ATS debería tener estas variables (según lo que configuramos):

```env
PORT=5000
NODE_ENV=production
GOOGLE_CLIENT_ID=968572483416-v3dju424jrbae7b85u7fb7jurskfmh15.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
FRONTEND_URL=https://opalo-atsopalo.bouasv.easypanel.host
```

---

## ⚠️ Nota Importante

**El backend NO afecta la conexión a Supabase**. Supabase se conecta directamente desde el frontend.

El backend solo se usa para:
- Google Drive OAuth
- Manejo de tokens de Google Drive

---

## 🔍 Comparación con Backend de Opalopy

El backend de Opalopy que compartiste tiene:
- ✅ `PORT=5000` - Correcto
- ✅ `FRONTEND_URL` - URL de Opalopy
- ✅ `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` - Correctos
- ❌ **NO tiene `GOOGLE_REDIRECT_URI`** - Esto podría causar problemas con Google Drive

---

## ✅ Verificar Backend de Opalo ATS

En EasyPanel, verifica que el backend de Opalo ATS tenga:

1. **`GOOGLE_REDIRECT_URI`** con el path completo:
   ```
   https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
   ```

2. **`FRONTEND_URL`** apuntando a Opalo ATS:
   ```
   https://opalo-atsopalo.bouasv.easypanel.host
   ```

---

## 🎯 Problema Actual

El problema que estamos resolviendo es **conexión a Supabase** (error 401), que:
- ✅ NO depende del backend
- ✅ Se conecta directamente desde el frontend
- ✅ El problema es CORS o configuración de Supabase

---

## 📋 Checklist del Backend (Para Google Drive)

Aunque no afecta Supabase, verifica que el backend tenga:

- [ ] `GOOGLE_REDIRECT_URI` configurado (con path completo)
- [ ] `FRONTEND_URL` apuntando a Opalo ATS
- [ ] `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` correctos
- [ ] Health check funciona: `https://opalo-atsopalo-backend.bouasv.easypanel.host/health`

---

## 🎯 Resumen

**Para el problema de Supabase (401)**:
- El backend NO es relevante
- El problema es CORS en Supabase
- Necesitas agregar la URL de producción en Supabase Dashboard

**Para Google Drive**:
- El backend debe tener `GOOGLE_REDIRECT_URI` configurado
- Debe apuntar al frontend correcto

