# ✅ Configuración Final - Google Drive Integration

## 📍 Tu Configuración

- **Backend URL**: `https://opalo-ats-backend.bouasv.easypanel.host`
- **Frontend URL**: `https://opalo-atsalfaoro.bouasv.easypanel.host`
- **OAuth Redirect URI**: `https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/callback`

---

## Paso 1: Verificar que el Backend Funciona ✅

Abre en tu navegador:
```
https://opalo-ats-backend.bouasv.easypanel.host/health
```

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "...",
  "service": "ATS Pro Backend - Google Drive API"
}
```

✅ Si ves esto, el backend está funcionando.

---

## Paso 2: (Opcional) Agregar GOOGLE_REDIRECT_URI

Aunque el backend funciona sin esta variable, es recomendable agregarla:

1. Ve a tu app **backend** en Easypanel
2. **Environment Variables**
3. **Agrega**:
   ```
   GOOGLE_REDIRECT_URI=https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/callback
   ```
4. **Redeploy** el backend

---

## Paso 3: Actualizar Google Cloud Console 🔐

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Haz clic en tu **OAuth Client ID** (el que creaste para Google Drive)
4. En **"Authorized JavaScript origins"**, agrega:
   ```
   https://opalo-ats-backend.bouasv.easypanel.host
   ```
   (Sin `/api/...` al final)
5. En **"Authorized redirect URIs"**, agrega:
   ```
   https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/callback
   ```
6. Haz clic en **"Save"**

**⚠️ IMPORTANTE**: 
- Las URLs deben ser exactamente como están arriba
- Debe ser `https://` (no `http://`)
- Sin barra al final (excepto en el callback que termina en `/callback`)

---

## Paso 4: Configurar Frontend 🎨

1. Ve a tu app **frontend** en Easypanel
2. **Environment Variables**
3. **Agrega** esta variable:
   ```
   VITE_API_URL=https://opalo-ats-backend.bouasv.easypanel.host
   ```
   (Sin `/api` al final, solo la URL base)
4. **Rebuild** el frontend (muy importante - haz clic en "Redeploy" o "Rebuild")

**⚠️ CRÍTICO**: Después de agregar `VITE_API_URL`, debes hacer **rebuild** porque Vite inyecta estas variables durante el build.

---

## Paso 5: Probar la Conexión 🧪

1. Abre tu aplicación frontend:
   ```
   https://opalo-atsalfaoro.bouasv.easypanel.host
   ```
2. Inicia sesión
3. Ve a **Settings** (Configuración)
4. Busca la sección **"Almacenamiento de Archivos"** o **"Google Drive"**
5. Haz clic en **"Conectar con Google Drive"**
6. Debería abrir una ventana popup de Google para autorizar
7. Autoriza la aplicación
8. La ventana se cerrará automáticamente
9. Deberías ver "Conectado" o el estado de conexión en la app

---

## ✅ Checklist Final

- [ ] Backend responde en `/health`
- [ ] (Opcional) `GOOGLE_REDIRECT_URI` agregada y redeploy hecho
- [ ] Google Cloud Console actualizado con las URLs correctas
- [ ] `VITE_API_URL` configurado en el frontend
- [ ] Frontend rebuild hecho después de agregar `VITE_API_URL`
- [ ] Conexión con Google Drive probada y funcionando

---

## 🆘 Troubleshooting

### El backend no responde en `/health`
- Verifica los logs en Easypanel
- Verifica que el puerto sea `5000` en las variables de entorno
- Verifica que las variables de entorno estén correctas

### Error al conectar Google Drive - "redirect_uri_mismatch"
- Verifica que la URL en Google Cloud Console sea exactamente:
  - `https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/callback`
- Sin barra al final, con `https://`, y con `/api/auth/google/callback` al final
- Verifica que hayas guardado los cambios en Google Cloud Console

### Error al conectar - "localhost:5000"
- Verifica que `VITE_API_URL` esté configurado en el frontend
- Verifica que el frontend haya sido rebuild después de agregar `VITE_API_URL`
- Abre la consola del navegador (F12) y verifica que no haya errores

### La ventana popup no se abre
- Verifica que el bloqueador de popups esté deshabilitado
- Revisa la consola del navegador (F12) para ver errores

---

## 📝 Resumen de URLs

| Propósito | URL |
|-----------|-----|
| Backend Health Check | `https://opalo-ats-backend.bouasv.easypanel.host/health` |
| OAuth Init | `https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/drive` |
| OAuth Callback | `https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/callback` |
| Frontend | `https://opalo-atsalfaoro.bouasv.easypanel.host` |

---

¡Listo! 🚀 Sigue los pasos en orden y deberías tener Google Drive funcionando.

