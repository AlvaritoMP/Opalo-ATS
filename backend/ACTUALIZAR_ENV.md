# 📝 Actualizar Archivo .env Existente

## ⚠️ Nota

El archivo `.env` está protegido por `.gitignore` y no se puede editar automáticamente por seguridad. Debes actualizarlo manualmente.

---

## 🔍 Verificar Contenido Actual

Abre el archivo `Opalo-ATS/backend/.env` y verifica que tenga estas variables:

```env
GOOGLE_CLIENT_ID=tu_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:3001
PORT=5000
NODE_ENV=development
```

---

## ✅ Si el Archivo Ya Tiene las Credenciales

Si el archivo ya tiene `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`, solo verifica que:

1. **`FRONTEND_URL`** sea `http://localhost:3001` (puerto 3001, no 3000)
2. **`GOOGLE_REDIRECT_URI`** sea `http://localhost:5000/api/auth/google/callback`

Si estos valores son correctos, **no necesitas hacer nada más**.

---

## 🔧 Si Necesitas Actualizar

### Actualizar FRONTEND_URL

Si `FRONTEND_URL` está en puerto 3000 o 5173, cámbialo a:

```env
FRONTEND_URL=http://localhost:3001
```

### Agregar Variables Faltantes

Si falta alguna variable, agrégalas al final del archivo:

```env
# Si falta GOOGLE_REDIRECT_URI
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Si falta PORT
PORT=5000

# Si falta NODE_ENV
NODE_ENV=development
```

---

## 📋 Checklist

- [ ] `GOOGLE_CLIENT_ID` está presente y correcto
- [ ] `GOOGLE_CLIENT_SECRET` está presente y correcto
- [ ] `GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback`
- [ ] `FRONTEND_URL=http://localhost:3001` (puerto 3001, no 3000)
- [ ] `PORT=5000`
- [ ] `NODE_ENV=development`

---

## 🚀 Después de Actualizar

1. **Guarda el archivo**
2. **Reinicia el backend**:
   ```bash
   cd Opalo-ATS/backend
   npm run dev
   ```
3. **Verifica que veas**:
   ```
   🔐 Google OAuth Redirect URI: http://localhost:5000/api/auth/google/callback
   📡 Frontend URL: http://localhost:3001
   ```

---

## ❓ ¿Por Qué No Se Puede Editar Automáticamente?

Los archivos `.env` están en `.gitignore` y están protegidos para:
- ✅ Evitar que se suban accidentalmente a Git
- ✅ Proteger credenciales sensibles
- ✅ Prevenir modificaciones automáticas no deseadas

Por eso debes editarlos manualmente.

