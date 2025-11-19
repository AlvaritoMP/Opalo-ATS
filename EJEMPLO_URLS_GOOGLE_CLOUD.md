# 📋 Ejemplos de URLs para Google Cloud Console

## 🎯 Escenario: Backend en Easypanel

### Ejemplo 1: URL de Easypanel (Subdominio)

**URL que te da Easypanel:**
```
https://backend-abc123xyz.easypanel.host
```

**En Google Cloud Console, configura:**

**Authorized JavaScript origins:**
```
https://backend-abc123xyz.easypanel.host
```

**Authorized redirect URIs:**
```
https://backend-abc123xyz.easypanel.host/api/auth/google/callback
```

**En Easypanel Backend, variables de entorno:**
```
GOOGLE_REDIRECT_URI=https://backend-abc123xyz.easypanel.host/api/auth/google/callback
```

---

### Ejemplo 2: Dominio Personalizado

**Si configuraste un dominio personalizado:**
```
https://api.tuempresa.com
```

**En Google Cloud Console, configura:**

**Authorized JavaScript origins:**
```
https://api.tuempresa.com
```

**Authorized redirect URIs:**
```
https://api.tuempresa.com/api/auth/google/callback
```

**En Easypanel Backend, variables de entorno:**
```
GOOGLE_REDIRECT_URI=https://api.tuempresa.com/api/auth/google/callback
```

---

## 🔍 Cómo Encontrar tu URL

### Paso 1: Desplegar Backend
1. Crea nueva app en Easypanel
2. Root Directory: `backend`
3. Deploy

### Paso 2: Ver URL Asignada
Easypanel te mostrará una URL como:
- `https://backend-xxxxx.easypanel.host`
- O tu dominio personalizado si lo configuraste

### Paso 3: Verificar que Funciona
Abre en tu navegador:
```
https://tu-backend-url/health
```

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "service": "ATS Pro Backend - Google Drive API"
}
```

### Paso 4: Usar esa URL
- Copia la URL EXACTA
- Úsala en Google Cloud Console
- Úsala en las variables de entorno de Easypanel

---

## ⚠️ Errores Comunes

### ❌ Error: "redirect_uri_mismatch"

**Causa**: Las URLs no coinciden exactamente.

**Solución**:
1. Verifica que la URL en Google Cloud Console sea EXACTAMENTE igual a `GOOGLE_REDIRECT_URI` en Easypanel
2. Asegúrate de incluir `https://` (no `http://`)
3. Asegúrate de incluir la ruta completa `/api/auth/google/callback`
4. No incluyas espacios ni caracteres extra

**Ejemplo Correcto:**
```
https://backend-abc123.easypanel.host/api/auth/google/callback
```

**Ejemplos Incorrectos:**
```
❌ http://backend-abc123.easypanel.host/api/auth/google/callback  (http en lugar de https)
❌ https://backend-abc123.easypanel.host  (falta /api/auth/google/callback)
❌ https://backend-abc123.easypanel.host/callback  (ruta incorrecta)
❌ backend-abc123.easypanel.host/api/auth/google/callback  (falta https://)
```

---

## 📝 Checklist

Antes de probar la conexión, verifica:

- [ ] ✅ Backend desplegado en Easypanel
- [ ] ✅ URL del backend anotada
- [ ] ✅ URL agregada en Google Cloud Console (JavaScript origins)
- [ ] ✅ URL + `/api/auth/google/callback` agregada en Google Cloud Console (Redirect URIs)
- [ ] ✅ `GOOGLE_REDIRECT_URI` en Easypanel coincide EXACTAMENTE con Google Cloud
- [ ] ✅ Backend responde en `/health`
- [ ] ✅ Todas las URLs usan `https://` (no `http://`)

---

## 🆘 ¿Aún con Problemas?

1. **Copia la URL exacta** de Easypanel
2. **Pégala en Google Cloud Console** (tanto en origins como en redirect URIs)
3. **Agrega `/api/auth/google/callback`** al final de la redirect URI
4. **Usa la misma URL** en `GOOGLE_REDIRECT_URI` en Easypanel
5. **Espera 1-2 minutos** después de guardar en Google Cloud (puede tardar en propagarse)

