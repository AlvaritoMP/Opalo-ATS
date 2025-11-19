# 🔐 Configuración Correcta de Google Cloud Console para OAuth

## ⚠️ IMPORTANTE: URLs que DEBES configurar

Para que el OAuth funcione correctamente con popup, necesitas configurar **TANTO el backend COMO el frontend** en Google Cloud Console.

## 📋 Paso 1: Ir a Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **"APIs & Services"** → **"Credentials"**
4. Haz clic en tu **OAuth 2.0 Client ID** (o créalo si no existe)

## 📋 Paso 2: Configurar Authorized JavaScript origins

En **"Authorized JavaScript origins"**, agrega **AMBAS URLs**:

### Para Desarrollo Local:
```
http://localhost:5000
http://localhost:5173
```

### Para Producción (Easypanel):
```
https://opalo-ats-backend.bouasv.easypanel.host
https://opalo-atsalfaoro.bouasv.easypanel.host
```

**Explicación:**
- `opalo-ats-backend.bouasv.easypanel.host` → Backend (donde se procesa el OAuth)
- `opalo-atsalfaoro.bouasv.easypanel.host` → Frontend (donde se abre el popup)

## 📋 Paso 3: Configurar Authorized redirect URIs

En **"Authorized redirect URIs"**, agrega **SOLO la URL del backend**:

### Para Desarrollo Local:
```
http://localhost:5000/api/auth/google/callback
```

### Para Producción (Easypanel):
```
https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/callback
```

**Explicación:**
- Solo el backend necesita estar aquí porque Google redirige al callback del backend
- El backend luego redirige al frontend con los parámetros

## 📋 Resumen de URLs para tu caso específico

### Authorized JavaScript origins:
```
https://opalo-ats-backend.bouasv.easypanel.host
https://opalo-atsalfaoro.bouasv.easypanel.host
```

### Authorized redirect URIs:
```
https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/callback
```

## ✅ Después de configurar

1. Haz clic en **"Save"** en Google Cloud Console
2. Espera unos segundos para que los cambios se propaguen
3. Prueba la conexión de nuevo en tu app

## 🔍 Verificar que está configurado correctamente

1. Ve a Google Cloud Console → Credentials
2. Haz clic en tu OAuth 2.0 Client ID
3. Verifica que veas:
   - ✅ `https://opalo-ats-backend.bouasv.easypanel.host` en JavaScript origins
   - ✅ `https://opalo-atsalfaoro.bouasv.easypanel.host` en JavaScript origins
   - ✅ `https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/callback` en Redirect URIs

## ⚠️ Nota importante

Si solo tienes el backend configurado, el popup puede fallar porque Google bloquea las solicitudes OAuth que no vienen de un origen autorizado. El frontend necesita estar en los JavaScript origins porque es desde donde se abre el popup.

