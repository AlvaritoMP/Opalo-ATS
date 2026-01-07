# 🔧 Solución: Error "Missing required parameter: client_id"

## 🔴 Problema

Cuando intentas conectar con Google Drive, ves el error:
```
Access blocked: Authorization Error
Missing required parameter: client_id
Error 400: invalid_request
```

## 🔍 Causa

El backend no está enviando el `client_id` a Google. Esto puede deberse a:

1. **El backend no está corriendo** en puerto 5000
2. **El archivo `backend/.env` no tiene `GOOGLE_CLIENT_ID`**
3. **El backend no está leyendo las variables de entorno correctamente**

---

## ✅ Solución Paso a Paso

### Paso 1: Verificar que el Backend Esté Corriendo

1. **Abre una nueva terminal**

2. **Navega al backend**:
   ```bash
   cd Opalo-ATS\backend
   ```

3. **Inicia el backend**:
   ```bash
   npm run dev
   ```

4. **Deberías ver**:
   ```
   🚀 Servidor backend corriendo en http://0.0.0.0:5000
   🔐 Google OAuth Redirect URI: http://localhost:5000/api/auth/google/callback
   ✅ Backend listo para recibir peticiones
   ```

5. **Verifica que funcione**:
   - Abre en el navegador: `http://localhost:5000/health`
   - Deberías ver un JSON con `"status": "ok"`

### Paso 2: Verificar que `backend/.env` Tenga las Credenciales

1. **Abre el archivo**: `Opalo-ATS/backend/.env`

2. **Verifica que tenga**:
   ```env
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
   FRONTEND_URL=http://localhost:3001
   PORT=5000
   ```

3. **Si falta `GOOGLE_CLIENT_ID` o `GOOGLE_CLIENT_SECRET`**, agrégalos

4. **Reinicia el backend** después de editar `.env`:
   - Presiona `Ctrl+C` en la terminal del backend
   - Ejecuta: `npm run dev`

### Paso 3: Verificar que el Backend Esté Leyendo las Variables

1. **En la terminal del backend**, deberías ver al iniciar:
   ```
   🔐 Google OAuth Redirect URI: http://localhost:5000/api/auth/google/callback
   ```

2. **Si NO ves esa línea**, significa que el backend no está leyendo `.env` correctamente

3. **Verifica que el archivo `.env` esté en**:
   - `Opalo-ATS/backend/.env` ✅
   - NO en `Opalo-ATS/.env` ❌

### Paso 4: Probar la URL de Autenticación Directamente

1. **Abre en el navegador**:
   ```
   http://localhost:5000/api/auth/google/drive
   ```

2. **Debería**:
   - Redirigirte a Google para autorizar
   - NO mostrar el error de "Missing client_id"

3. **Si muestra el error**, significa que el backend no tiene las credenciales configuradas

---

## 🔍 Diagnóstico

### Verificar en la Terminal del Backend

Cuando inicias el backend, deberías ver:

```
🚀 Servidor backend corriendo en http://0.0.0.0:5000
📡 Frontend URL: http://localhost:3001
🔐 Google OAuth Redirect URI: http://localhost:5000/api/auth/google/callback
✅ Backend listo para recibir peticiones
```

**Si NO ves la línea de "Google OAuth Redirect URI"**, significa que:
- El archivo `.env` no existe, O
- Las variables no están configuradas, O
- El backend no está leyendo el archivo

### Verificar en la Consola del Navegador

Cuando haces clic en "Conectar con Google Drive", deberías ver:

```
🔗 URL de autenticación: http://localhost:5000/api/auth/google/drive
```

**Si ves esa URL**, el frontend está bien configurado.

**El problema está en el backend** que no está enviando el `client_id` a Google.

---

## 🆘 Solución Rápida

### Si el Backend No Está Corriendo:

```bash
cd Opalo-ATS\backend
npm run dev
```

### Si el Backend Está Corriendo pero Sin Credenciales:

1. **Abre**: `Opalo-ATS/backend/.env`
2. **Agrega**:
   ```env
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
   FRONTEND_URL=http://localhost:3001
   PORT=5000
   ```
3. **Reinicia el backend**: `Ctrl+C` y luego `npm run dev`

---

## ✅ Verificación Final

Después de configurar:

1. **Backend corriendo**: `http://localhost:5000/health` responde
2. **Backend tiene credenciales**: Se ve "Google OAuth Redirect URI" al iniciar
3. **URL de autenticación funciona**: `http://localhost:5000/api/auth/google/drive` redirige a Google
4. **Frontend puede conectar**: Al hacer clic en "Conectar", abre Google sin errores

---

## 📝 Notas

- El error "Missing client_id" **siempre** significa que el backend no tiene las credenciales
- El frontend está bien (está llamando al backend correctamente)
- El problema está en el backend (no tiene o no está leyendo `GOOGLE_CLIENT_ID`)

