# Google Drive con Supabase: Configuración de URLs

## 🎯 Dos Opciones para Google Drive

Tienes dos opciones para integrar Google Drive:

### Opción 1: Backend Node.js en Easypanel (Recomendado)
- Usa el backend que creamos (`backend/` folder)
- Se despliega como una app separada en Easypanel
- Más control y fácil de mantener

### Opción 2: Supabase Edge Functions
- Usa funciones serverless de Supabase
- Más integrado con tu stack actual
- Requiere configurar Edge Functions

---

## 📍 Opción 1: Backend Node.js en Easypanel

### URLs de Redirección para Google Cloud Console

Cuando despliegas el backend en Easypanel, obtienes una URL como:
- `https://backend-abc123.easypanel.host`
- O tu dominio personalizado: `https://api.tu-dominio.com`

### Configuración en Google Cloud Console:

**Authorized JavaScript origins:**
```
https://tu-backend-url.easypanel.host
```
(Reemplaza con la URL real que te da Easypanel)

**Authorized redirect URIs:**
```
https://tu-backend-url.easypanel.host/api/auth/google/callback
```
(Reemplaza con la URL real + `/api/auth/google/callback`)

### Ejemplo Real:

Si Easypanel te da: `https://backend-xyz789.easypanel.host`

Entonces en Google Cloud Console pones:
- **JavaScript origins**: `https://backend-xyz789.easypanel.host`
- **Redirect URIs**: `https://backend-xyz789.easypanel.host/api/auth/google/callback`

### Para Desarrollo Local:

También agrega:
- **JavaScript origins**: `http://localhost:5000`
- **Redirect URIs**: `http://localhost:5000/api/auth/google/callback`

---

## 📍 Opción 2: Supabase Edge Functions

Si prefieres usar Supabase Edge Functions en lugar del backend Node.js:

### URLs de Redirección:

Supabase Edge Functions tienen URLs como:
- `https://tu-proyecto-id.supabase.co/functions/v1/google-drive-auth`

### Configuración en Google Cloud Console:

**Authorized JavaScript origins:**
```
https://tu-proyecto-id.supabase.co
```

**Authorized redirect URIs:**
```
https://tu-proyecto-id.supabase.co/functions/v1/google-drive-auth/callback
```

### Nota:
Esta opción requiere crear Edge Functions en Supabase, lo cual es más complejo.

---

## ✅ Recomendación: Opción 1 (Backend Node.js)

**Ventajas:**
- ✅ Ya está implementado y listo
- ✅ Más fácil de mantener
- ✅ Separación de responsabilidades
- ✅ Fácil de debuggear

**Pasos:**
1. Despliega el backend en Easypanel (como app separada)
2. Obtén la URL que te da Easypanel
3. Usa esa URL en Google Cloud Console

---

## 🔍 Cómo Obtener la URL Correcta

### Paso 1: Desplegar Backend en Easypanel

1. Crea nueva app en Easypanel
2. Root Directory: `backend`
3. Despliega
4. **Anota la URL** que te da Easypanel

### Paso 2: Verificar que Funciona

Abre en tu navegador:
```
https://tu-backend-url.easypanel.host/health
```

Deberías ver:
```json
{
  "status": "ok",
  "service": "ATS Pro Backend - Google Drive API"
}
```

### Paso 3: Configurar en Google Cloud

Usa esa URL exacta en Google Cloud Console.

---

## 📝 Resumen de URLs

### Para Desarrollo:
```
http://localhost:5000/api/auth/google/callback
```

### Para Producción (Easypanel):
```
https://tu-backend-url.easypanel.host/api/auth/google/callback
```

**⚠️ IMPORTANTE**: 
- Reemplaza `tu-backend-url.easypanel.host` con la URL REAL que te da Easypanel
- La URL debe incluir `https://` y la ruta completa `/api/auth/google/callback`
- Debe coincidir EXACTAMENTE entre Google Cloud y tu backend

---

## 🆘 ¿No Sabes Qué URL Usar?

1. **Primero despliega el backend** en Easypanel
2. **Anota la URL** que te da
3. **Luego configura** Google Cloud Console con esa URL
4. **Actualiza** las variables de entorno en Easypanel

**Orden correcto:**
1. Desplegar backend → Obtener URL
2. Configurar Google Cloud con esa URL
3. Actualizar variables de entorno

