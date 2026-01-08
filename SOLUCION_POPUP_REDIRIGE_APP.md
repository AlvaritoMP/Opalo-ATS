# 🔧 Solución: Popup Redirige a la App en Lugar de Iniciar OAuth

## ❌ Problema

Cuando haces clic en "Conectar con Google Drive":
- El popup se abre pero redirige de vuelta a la app
- No inicia el proceso OAuth con Google
- No muestra la selección de carpetas

---

## 🔍 Causa

El problema es que `VITE_API_URL` no está configurado correctamente en producción, o el backend no está accesible.

El código intenta abrir:
```
${API_BASE_URL}/api/auth/google/drive
```

Si `VITE_API_URL` no está configurado, usa `http://localhost:5000` por defecto, lo que causa que el popup intente ir a localhost y falle.

---

## ✅ Solución

### Paso 1: Verificar Variables en Easypanel

1. Ve a tu app en **Easypanel**
2. Ve a **Environment Variables**
3. Verifica que exista:
   - `VITE_API_URL` con el valor: `https://opalo-atsopalo-backend.bouasv.easypanel.host`
   - Debe estar marcada como **"Build-time"** (no "Runtime")

### Paso 2: Verificar Backend Está Corriendo

1. Ve a tu backend en Easypanel
2. Verifica que esté **corriendo** (status: Running)
3. Prueba acceder directamente: `https://opalo-atsopalo-backend.bouasv.easypanel.host/health`
4. Deberías ver una respuesta JSON con `status: 'ok'`

### Paso 3: Verificar Redirect URI en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** > **Credentials**
4. Haz clic en tu OAuth 2.0 Client ID
5. En **Authorized redirect URIs**, verifica que esté:
   ```
   https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
   ```
6. Si no está, agrégalo y guarda

### Paso 4: Reconstruir Frontend

1. En Easypanel, ve a tu app frontend
2. Haz clic en **"Redeploy"** o **"Rebuild"**
3. Espera a que termine el build
4. Prueba de nuevo

---

## 🔍 Verificación

Después de aplicar la solución:

1. Abre la app en producción
2. Ve a **Settings** → **Almacenamiento de Archivos**
3. Haz clic en **"Conectar con Google Drive"**
4. Debería:
   - ✅ Abrir popup
   - ✅ Redirigir a Google (no a la app)
   - ✅ Mostrar pantalla de autorización de Google
   - ✅ Después de autorizar, mostrar selección de carpetas

---

## 🐛 Si Aún No Funciona

### Verificar en Consola

1. Abre DevTools (F12)
2. Ve a **Console**
3. Haz clic en "Conectar con Google Drive"
4. Busca el log: `🔗 URL de autenticación:`
5. Verifica que la URL sea:
   ```
   https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/drive
   ```
   **NO** debe ser `http://localhost:5000`

### Verificar Backend Logs

1. Ve a tu backend en Easypanel
2. Ve a **Logs**
3. Intenta conectar Google Drive
4. Deberías ver logs como:
   ```
   🔗 Redirigiendo a Google OAuth para: https://opalo-atsopalo.bouasv.easypanel.host
   ```

---

## 📋 Checklist

- [ ] `VITE_API_URL` configurado en Easypanel como "Build-time"
- [ ] Valor: `https://opalo-atsopalo-backend.bouasv.easypanel.host`
- [ ] Backend está corriendo y accesible
- [ ] Redirect URI configurado en Google Cloud Console
- [ ] Frontend reconstruido después de agregar variable
- [ ] Popup redirige a Google (no a la app)

