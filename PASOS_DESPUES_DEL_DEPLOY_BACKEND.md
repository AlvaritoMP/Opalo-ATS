# ✅ Pasos Después del Deploy del Backend

## 🎉 ¡Backend Desplegado!

Ahora sigue estos pasos para completar la configuración:

---

## Paso 1: Obtener la URL del Backend

1. En Easypanel, ve a tu app **backend**
2. **Anota la URL** que te da Easypanel
   - Ejemplo: `https://backend-abc123.easypanel.host`
   - O si tienes dominio personalizado: `https://api.tu-dominio.com`

**📝 Anota esta URL aquí: `___________________________`**

---

## Paso 2: Verificar que el Backend Funciona

1. Abre en tu navegador: `https://url-del-backend/health`
2. Deberías ver:
   ```json
   {
     "status": "ok",
     "timestamp": "...",
     "service": "ATS Pro Backend - Google Drive API"
   }
   ```

✅ Si ves esto, el backend está funcionando correctamente.

---

## Paso 3: (Opcional) Agregar GOOGLE_REDIRECT_URI

Aunque el backend funciona sin esta variable, es recomendable agregarla:

1. Ve a **Environment Variables** del backend en Easypanel
2. **Agrega**:
   ```
   GOOGLE_REDIRECT_URI=https://url-del-backend/api/auth/google/callback
   ```
   (Reemplaza `url-del-backend` con la URL real que anotaste)
3. **Redeploy** el backend

---

## Paso 4: Actualizar Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Haz clic en tu **OAuth Client ID**
4. En **"Authorized JavaScript origins"**, agrega:
   - `https://url-del-backend` (sin `/api/...`)
   - Ejemplo: `https://backend-abc123.easypanel.host`
5. En **"Authorized redirect URIs"**, agrega:
   - `https://url-del-backend/api/auth/google/callback`
   - Ejemplo: `https://backend-abc123.easypanel.host/api/auth/google/callback`
6. Haz clic en **"Save"**

---

## Paso 5: Configurar Frontend

1. Ve a tu app **frontend** en Easypanel
2. **Environment Variables**
3. **Agrega**:
   ```
   VITE_API_URL=https://url-del-backend
   ```
   (Reemplaza con la URL real del backend, sin `/api` al final)
4. **Rebuild** el frontend (muy importante)

---

## Paso 6: Probar la Conexión

1. Abre tu aplicación frontend: `https://opalo-atsalfaoro.bouasv.easypanel.host`
2. Ve a **Settings** → **Almacenamiento de Archivos**
3. Haz clic en **"Conectar con Google Drive"**
4. Debería abrir una ventana de Google para autorizar
5. Después de autorizar, deberías ver "Conectado" en la app

---

## ✅ Checklist Final

- [ ] Backend desplegado y funcionando (`/health` responde)
- [ ] URL del backend anotada
- [ ] (Opcional) `GOOGLE_REDIRECT_URI` agregada y redeploy hecho
- [ ] Google Cloud Console actualizado con URLs del backend
- [ ] `VITE_API_URL` configurado en el frontend
- [ ] Frontend rebuild hecho
- [ ] Conexión con Google Drive probada y funcionando

---

## 🆘 Si Algo No Funciona

### El backend no responde en `/health`
- Verifica los logs en Easypanel
- Verifica que el puerto sea `5000`
- Verifica que las variables de entorno estén correctas

### Error al conectar Google Drive
- Verifica que `VITE_API_URL` esté configurado en el frontend
- Verifica que el frontend haya sido rebuild después de agregar `VITE_API_URL`
- Verifica que Google Cloud Console tenga las URLs correctas
- Revisa la consola del navegador (F12) para ver errores

### Error "redirect_uri_mismatch"
- Verifica que la URL en Google Cloud Console sea exactamente igual a la del backend
- Debe ser: `https://url-del-backend/api/auth/google/callback`
- Sin barra al final, con `https://`, y con `/api/auth/google/callback` al final

---

## 📝 Resumen de URLs

**Backend URL**: `https://url-del-backend`  
**Backend Health**: `https://url-del-backend/health`  
**OAuth Redirect**: `https://url-del-backend/api/auth/google/callback`  
**Frontend URL**: `https://opalo-atsalfaoro.bouasv.easypanel.host`

---

¡Listo! 🚀

