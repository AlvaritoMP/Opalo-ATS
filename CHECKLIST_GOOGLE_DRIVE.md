# ✅ Checklist: Configurar Google Drive para Opalo ATS

## 🎯 Objetivo

Verificar que Opalo ATS tenga la misma funcionalidad de Google Drive que Opalopy.

---

## 📋 Checklist Completo

### 1. Backend ✅

- [x] Backend actualizado para múltiples orígenes (CORS)
- [x] Archivo `.env` creado en `Opalo-ATS/backend/.env`
- [x] Credenciales de Google OAuth configuradas:
  - [x] `GOOGLE_CLIENT_ID`
  - [x] `GOOGLE_CLIENT_SECRET`
  - [x] `GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback`
  - [x] `FRONTEND_URL=http://localhost:3001`
- [ ] **Backend corriendo** en puerto 5000
- [ ] **Health check funciona**: `http://localhost:5000/health`

### 2. Google Cloud Console ⚠️

- [ ] **Redirect URI agregado** en Google Cloud Console:
  - [ ] `http://localhost:5000/api/auth/google/callback` (desarrollo local)
  - [ ] Si tienes producción, también: `https://tu-backend-url/api/auth/google/callback`
- [ ] **Verificar** que las credenciales OAuth sean correctas

### 3. Frontend ⚠️

- [ ] **Archivo `.env.local` creado** en la raíz de `Opalo-ATS/`
- [ ] **`VITE_API_URL` configurado** en `.env.local`:
  ```env
  VITE_API_URL=http://localhost:5000
  ```
- [ ] **Frontend corriendo** en puerto 3001
- [ ] **Verificar** que el frontend pueda conectarse al backend

### 4. Prueba de Conexión 🧪

- [ ] Abrir Opalo ATS en `http://localhost:3001`
- [ ] Iniciar sesión
- [ ] Ir a **Settings** → **Almacenamiento de Archivos**
- [ ] Hacer clic en **"Conectar con Google Drive"**
- [ ] Verificar que:
  - [ ] Se abre ventana popup de Google
  - [ ] Puedes autorizar la aplicación
  - [ ] Se redirige correctamente
  - [ ] Muestra "Conectado" con tu email de Google

---

## 🔧 Pasos Detallados

### Paso 1: Verificar Backend

```bash
# Verificar que el backend esté corriendo
cd Opalo-ATS/backend
npm run dev
```

Deberías ver:
```
🚀 Servidor backend corriendo en http://0.0.0.0:5000
🔐 Google OAuth Redirect URI: http://localhost:5000/api/auth/google/callback
✅ Backend listo para recibir peticiones
```

**Probar health check:**
Abre en el navegador: `http://localhost:5000/health`

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "...",
  "service": "Opalo ATS Backend - Google Drive API"
}
```

### Paso 2: Configurar Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en tu **OAuth 2.0 Client ID** ("Web client 1")
5. En **"Authorized redirect URIs"**, verifica que esté:
   - `http://localhost:5000/api/auth/google/callback` ✅
6. Si no está, agrégalo y guarda

### Paso 3: Configurar Frontend

**Crear archivo `.env.local` en la raíz de Opalo-ATS:**

```env
# Supabase Configuration (ya deberías tener esto)
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key

# Backend API URL (IMPORTANTE para Google Drive)
VITE_API_URL=http://localhost:5000
```

**Reiniciar el frontend** después de crear/editar `.env.local`:
```bash
cd Opalo-ATS
npm run dev
```

### Paso 4: Probar Conexión

1. Abre `http://localhost:3001`
2. Inicia sesión
3. Ve a **Settings** → **Almacenamiento de Archivos**
4. Haz clic en **"Conectar con Google Drive"**
5. Debería:
   - Abrir ventana popup
   - Redirigir a Google para autorizar
   - Pedir permisos para Google Drive
   - Redirigir de vuelta
   - Mostrar "Conectado"

---

## ❌ Problemas Comunes y Soluciones

### Error: "Backend no responde"

**Solución:**
1. Verifica que el backend esté corriendo: `cd Opalo-ATS/backend && npm run dev`
2. Verifica que responda: `http://localhost:5000/health`
3. Verifica que no haya errores en la terminal del backend

### Error: "redirect_uri_mismatch"

**Solución:**
1. Ve a Google Cloud Console → Credentials
2. Edita tu OAuth Client ID
3. Verifica que `http://localhost:5000/api/auth/google/callback` esté en "Authorized redirect URIs"
4. Guarda los cambios

### Error: "CORS error" o "No se puede conectar al backend"

**Solución:**
1. Verifica que `VITE_API_URL=http://localhost:5000` esté en `.env.local`
2. Reinicia el frontend después de editar `.env.local`
3. Verifica que el backend esté corriendo
4. Abre la consola del navegador (F12) para ver errores específicos

### La ventana popup no se abre

**Solución:**
1. Verifica que el bloqueador de popups esté deshabilitado
2. Revisa la consola del navegador (F12) para ver errores
3. Verifica que `VITE_API_URL` esté configurado correctamente

### Error: "invalid_client"

**Solución:**
1. Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén correctos en `backend/.env`
2. Verifica que no haya espacios extra o comillas
3. Reinicia el backend después de editar `.env`

---

## ✅ Verificación Final

Después de completar todos los pasos:

1. **Backend corriendo** ✅
2. **Frontend corriendo** ✅
3. **Google Cloud Console configurado** ✅
4. **`.env.local` configurado** ✅
5. **Conexión con Google Drive funciona** ✅

---

## 📝 Notas Importantes

1. **El backend puede ser compartido** entre Opalopy y Opalo ATS (ya está configurado)
2. **Cada app crea su propia carpeta raíz** en Google Drive:
   - Opalopy → "Opalopy" o "ATS Pro"
   - Opalo ATS → "Opalo ATS"
3. **Las credenciales OAuth pueden compartirse** entre ambas apps
4. **En producción**, cada app puede tener su propio backend o compartir uno

---

## 🆘 Si Algo No Funciona

1. **Revisa la consola del navegador** (F12) para ver errores
2. **Revisa la terminal del backend** para ver errores
3. **Verifica que todas las variables de entorno estén configuradas**
4. **Verifica que el backend responda** en `/health`
5. **Comparte los errores específicos** para diagnosticar

