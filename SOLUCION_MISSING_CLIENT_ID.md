# 🔧 Solución: "Missing required parameter: client_id"

## ❌ Error Encontrado

```
Access blocked: Authorization Error
Missing required parameter: client_id
Error 400: invalid_request
```

## 🔍 Causa del Problema

El `oauth2Client` se estaba inicializando **ANTES** de que `dotenv.config()` cargara las variables de entorno del archivo `.env`.

**Flujo problemático**:
1. `server.js` importa `authRoutes`
2. `auth.js` se ejecuta e inicializa `oauth2Client` con `process.env.GOOGLE_CLIENT_ID` (que es `undefined`)
3. `server.js` llama a `dotenv.config()` (demasiado tarde)

## ✅ Solución Aplicada

He modificado `Opalo-ATS/backend/src/routes/auth.js` para que:

1. **No inicialice `oauth2Client` al cargar el módulo**
2. **Cree el `oauth2Client` cada vez que se necesite** (dentro de cada ruta)
3. **Verifique que las variables existan** antes de crear el cliente

### Cambios Realizados

**Antes**:
```javascript
// Se inicializaba al cargar el módulo (ANTES de dotenv)
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,  // undefined en este momento
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);
```

**Después**:
```javascript
// Función que crea el cliente cuando se necesita (DESPUÉS de dotenv)
function getOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    // ... verificación y creación
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// Se usa dentro de cada ruta
router.get('/google/drive', (req, res) => {
    const oauth2Client = getOAuth2Client(); // Lee las variables AHORA
    // ...
});
```

---

## 📋 Pasos para Aplicar la Solución

### 1. Reiniciar el Backend ⚠️ CRÍTICO

**El backend DEBE reiniciarse** para que los cambios surtan efecto:

1. Ve a la terminal donde está corriendo el backend
2. Presiona `Ctrl+C` para detenerlo
3. Reinicia:
   ```powershell
   cd Opalo-ATS\backend
   npm run dev
   ```

### 2. Verificar que el Backend Esté Leyendo las Variables

Al iniciar, deberías ver:
```
🚀 Servidor backend corriendo en http://0.0.0.0:5000
🔐 Google OAuth Redirect URI: http://localhost:5000/api/auth/google/callback
✅ Backend listo para recibir peticiones
```

**NO deberías ver**:
```
⚠️ ADVERTENCIA: GOOGLE_CLIENT_ID no está configurada
```

### 3. Probar la Ruta Directamente

Abre en el navegador: `http://localhost:5000/api/auth/google/drive`

**Si funciona**: Debería redirigir a Google para autorizar
**Si falla**: Verifica que el backend esté reiniciado y que `.env` tenga las credenciales

### 4. Probar desde la App

1. Abre la app en `http://localhost:3001`
2. Ve a **Settings** → **Almacenamiento de Archivos**
3. Haz clic en **"Conectar con Google Drive"**
4. Debería abrir una ventana popup y redirigir a Google

---

## ✅ Checklist

- [x] Código corregido en `auth.js`
- [ ] Backend reiniciado (debes hacerlo manualmente)
- [ ] Backend muestra las variables correctamente (sin advertencias)
- [ ] Ruta `/api/auth/google/drive` funciona directamente
- [ ] Conexión desde la app funciona

---

## 🐛 Si Aún No Funciona

### Verificar que `.env` Existe y Tiene las Credenciales

```powershell
cd Opalo-ATS\backend
Get-Content .env | Select-String "GOOGLE_CLIENT_ID"
```

Debería mostrar:
```
GOOGLE_CLIENT_ID=968572483416-v3dju424jrbae7b85u7fb7jurskfmh15.apps.googleusercontent.com
```

### Verificar que el Backend Esté Leyendo el `.env`

En la terminal del backend, cuando inicies, deberías ver logs como:
```
🔗 Redirigiendo a Google OAuth para: http://localhost:3001
🔑 Client ID: 968572483416-v3dju424...
```

Si NO ves el "Client ID", el backend no está leyendo el `.env`.

### Verificar la Ubicación del `.env`

El archivo `.env` debe estar en:
```
Opalo-ATS/backend/.env
```

**NO** en:
- `Opalo-ATS/.env` ❌
- `Opalo-ATS/backend/src/.env` ❌

---

## 🎯 Resumen

**Problema**: `oauth2Client` se inicializaba antes de que `dotenv` cargara las variables
**Solución**: Crear el cliente dentro de cada ruta (después de que `dotenv` haya cargado)
**Acción requerida**: Reiniciar el backend

