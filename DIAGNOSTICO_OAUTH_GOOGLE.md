# 🔍 Diagnóstico: OAuth Google Drive No Redirige

## 🔴 Problema

Al hacer clic en "Conectar con Google Drive", se abre una ventana pero no redirige a Google para autorizar.

## ✅ Solución

### Paso 1: Verificar Variables de Entorno del Backend

El backend necesita estas variables para funcionar:

1. Ve a tu app **backend** en Easypanel
2. **Environment Variables**
3. Verifica que tengas:

```env
PORT=5000
FRONTEND_URL=https://opalo-atsalfaoro.bouasv.easypanel.host
GOOGLE_CLIENT_ID=tu_client_id_de_google_cloud
GOOGLE_CLIENT_SECRET=tu_client_secret_de_google_cloud
SESSION_SECRET=tu_secret_aleatorio
```

**⚠️ IMPORTANTE**: 
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` son **obligatorios**
- Si no están configurados, el backend no puede redirigir a Google

### Paso 2: Verificar los Logs del Backend

1. En Easypanel, ve a tu app **backend**
2. Abre la sección **"Logs"** o **"Console"**
3. Busca errores relacionados con:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `OAuth2Client`
   - `generateAuthUrl`

### Paso 3: Probar el Endpoint Directamente

Abre en tu navegador:
```
https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/drive
```

**Comportamiento esperado**:
- Debería redirigir automáticamente a Google (página de autorización)
- URL debería cambiar a: `https://accounts.google.com/...`

**Si NO redirige**:
- Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén configurados
- Revisa los logs del backend para ver el error exacto

### Paso 4: Verificar Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Verifica que tengas un **OAuth 2.0 Client ID** creado
4. Verifica que tenga estos valores:
   - **Client ID**: Debe coincidir con `GOOGLE_CLIENT_ID` en Easypanel
   - **Client Secret**: Debe coincidir con `GOOGLE_CLIENT_SECRET` en Easypanel

### Paso 5: Verificar que la API de Google Drive Esté Habilitada

1. En Google Cloud Console, ve a **APIs & Services** → **Library**
2. Busca **"Google Drive API"**
3. Verifica que esté **habilitada** (debe decir "API enabled")

---

## 🐛 Errores Comunes

### Error: "Missing required parameter: client_id"
- **Causa**: `GOOGLE_CLIENT_ID` no está configurado
- **Solución**: Agrega `GOOGLE_CLIENT_ID` en las variables de entorno del backend

### Error: "Missing required parameter: client_secret"
- **Causa**: `GOOGLE_CLIENT_SECRET` no está configurado
- **Solución**: Agrega `GOOGLE_CLIENT_SECRET` en las variables de entorno del backend

### Error: "redirect_uri_mismatch"
- **Causa**: La URL de redirect no está configurada en Google Cloud Console
- **Solución**: Agrega `https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/callback` en Google Cloud Console

### La página se queda en blanco o muestra un error
- **Causa**: El backend tiene un error
- **Solución**: Revisa los logs del backend en Easypanel

---

## ✅ Checklist de Verificación

- [ ] `GOOGLE_CLIENT_ID` configurado en variables de entorno del backend
- [ ] `GOOGLE_CLIENT_SECRET` configurado en variables de entorno del backend
- [ ] `FRONTEND_URL` configurado correctamente
- [ ] Google Drive API habilitada en Google Cloud Console
- [ ] OAuth Client ID creado en Google Cloud Console
- [ ] Redirect URI agregado en Google Cloud Console
- [ ] Backend redeploy después de agregar variables de entorno

---

## 🔧 Próximos Pasos

1. **Verifica las variables de entorno** del backend
2. **Revisa los logs** del backend para ver errores específicos
3. **Prueba el endpoint** directamente en el navegador
4. **Comparte el error** que ves (si hay alguno) para ayudarte mejor

---

## 📝 Nota

Si el endpoint `/api/auth/google/drive` no redirige a Google, el problema más común es que faltan `GOOGLE_CLIENT_ID` o `GOOGLE_CLIENT_SECRET` en las variables de entorno del backend.

