# 🔧 Solución: Popup Redirige a la App en Lugar de Iniciar OAuth

## ❌ Problema

Cuando haces clic en "Conectar con Google Drive":
- El popup se abre pero redirige de vuelta a la app
- No inicia el proceso OAuth con Google
- No muestra la selección de carpetas

---

## 🔍 Causa

El problema es que `VITE_API_URL` **no está configurado** en producción, o está configurado incorrectamente.

El código intenta abrir:
```
${API_BASE_URL}/api/auth/google/drive
```

Si `VITE_API_URL` no está configurado, usa `http://localhost:5000` por defecto, lo que causa que el popup intente ir a localhost y falle.

---

## ✅ Solución Paso a Paso

### Paso 1: Verificar URL del Backend

1. Ve a tu **backend** en Easypanel
2. Anota la URL (debería ser algo como):
   ```
   https://opalo-atsopalo-backend.bouasv.easypanel.host
   ```
3. Verifica que el backend esté **corriendo** (status: Running)

### Paso 2: Probar Backend Directamente

Abre en el navegador:
```
https://opalo-atsopalo-backend.bouasv.easypanel.host/health
```

Deberías ver una respuesta JSON:
```json
{
  "status": "ok",
  "timestamp": "...",
  "service": "Opalo ATS Backend - Google Drive API"
}
```

Si no funciona, el backend no está accesible.

### Paso 3: Configurar VITE_API_URL en Frontend

1. Ve a tu app **frontend** en Easypanel
2. Ve a **Environment Variables**
3. **Agrega o actualiza**:
   - **Nombre**: `VITE_API_URL`
   - **Valor**: `https://opalo-atsopalo-backend.bouasv.easypanel.host`
   - **Scope**: **Build-time** ⚠️ (CRÍTICO: debe ser Build-time, no Runtime)

**⚠️ IMPORTANTE**:
- NO incluyas `/api` al final
- Debe ser `https://` (no `http://`)
- Debe estar marcada como **"Build-time"**

### Paso 4: Verificar Redirect URI en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** > **Credentials**
4. Haz clic en tu **OAuth 2.0 Client ID**
5. En **Authorized redirect URIs**, verifica que esté:
   ```
   https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
   ```
6. Si no está, **agrégalo** y guarda

### Paso 5: Reconstruir Frontend

**CRÍTICO**: Después de agregar `VITE_API_URL`, debes hacer **rebuild**:

1. En Easypanel, ve a tu app frontend
2. Haz clic en **"Redeploy"** o **"Rebuild"**
3. Espera a que termine el build completamente
4. Prueba de nuevo

---

## 🔍 Verificación

Después de aplicar la solución:

1. Abre la app en producción
2. Presiona `F12` > **Console**
3. Ve a **Settings** → **Almacenamiento de Archivos**
4. Haz clic en **"Conectar con Google Drive"**
5. En la consola, busca el log: `🔗 URL de autenticación:`
6. **Debe mostrar**:
   ```
   https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/drive
   ```
   **NO** debe ser `http://localhost:5000`

7. El popup debería:
   - ✅ Abrir
   - ✅ Redirigir a Google (no a la app)
   - ✅ Mostrar pantalla de autorización de Google
   - ✅ Después de autorizar, mostrar selección de carpetas

---

## 🐛 Si Aún No Funciona

### Verificar Backend Logs

1. Ve a tu backend en Easypanel
2. Ve a **Logs**
3. Intenta conectar Google Drive
4. Deberías ver logs como:
   ```
   🔗 Redirigiendo a Google OAuth para: https://opalo-atsopalo.bouasv.easypanel.host
   ```

### Verificar Variables del Backend

En el backend, verifica que estas variables estén configuradas:

```
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://opalo-atsopalo.bouasv.easypanel.host
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_REDIRECT_URI=https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
```

---

## 📋 Checklist Completo

- [ ] Backend está corriendo y accesible
- [ ] `/health` endpoint funciona
- [ ] `VITE_API_URL` configurado en frontend como "Build-time"
- [ ] Valor: `https://opalo-atsopalo-backend.bouasv.easypanel.host`
- [ ] Redirect URI configurado en Google Cloud Console
- [ ] Frontend reconstruido después de agregar variable
- [ ] Consola muestra URL correcta (no localhost)
- [ ] Popup redirige a Google (no a la app)

---

## 🎯 Resultado Esperado

Después de aplicar la solución:

1. ✅ El popup abre correctamente
2. ✅ Redirige a Google OAuth
3. ✅ Muestra pantalla de autorización
4. ✅ Después de autorizar, muestra selección de carpetas
5. ✅ Se conecta exitosamente a Google Drive

