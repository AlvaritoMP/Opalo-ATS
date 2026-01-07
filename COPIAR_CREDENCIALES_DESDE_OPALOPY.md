# 📋 Copiar Credenciales de Google OAuth desde Opalopy

## 🎯 Objetivo

Copiar las credenciales de Google OAuth desde `Opalopy/backend/.env` a `Opalo-ATS/backend/.env` para que Opalo ATS pueda conectarse con Google Drive.

---

## 📝 Pasos a Seguir

### Paso 1: Abrir el archivo `.env` de Opalopy

1. Abre el archivo: `Opalopy/backend/.env`
2. Busca estas 3 líneas:
   - `GOOGLE_CLIENT_ID=...`
   - `GOOGLE_CLIENT_SECRET=...`
   - `GOOGLE_REDIRECT_URI=...` (opcional, puede no estar)

### Paso 2: Copiar las credenciales

Copia los valores de:
- `GOOGLE_CLIENT_ID` (ejemplo: `123456789-abcdefg.apps.googleusercontent.com`)
- `GOOGLE_CLIENT_SECRET` (ejemplo: `GOCSPX-abcdefghijklmnopqrstuvwxyz`)

**Nota**: El `GOOGLE_REDIRECT_URI` puede ser:
- `http://localhost:5000/api/auth/google/callback` (desarrollo local)
- O una URL de producción si Opalopy está en producción

### Paso 3: Crear el archivo `.env` para Opalo ATS

1. Crea el archivo: `Opalo-ATS/backend/.env`
2. Pega este contenido (reemplaza los valores con los de Opalopy):

```env
# Google OAuth2 Credentials
# Copiadas desde Opalopy el [fecha]
GOOGLE_CLIENT_ID=TU_CLIENT_ID_DE_OPALOPY_AQUI
GOOGLE_CLIENT_SECRET=TU_CLIENT_SECRET_DE_OPALOPY_AQUI

# Redirect URI para OAuth callback
# Para desarrollo local de Opalo ATS:
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Frontend URL (para CORS y redirecciones)
# IMPORTANTE: Opalo ATS corre en puerto 3001, no 3000
FRONTEND_URL=http://localhost:3001

# Puerto del servidor backend
PORT=5000

# Entorno
NODE_ENV=development
```

### Paso 4: Verificar en Google Cloud Console

**IMPORTANTE**: Asegúrate de que el Redirect URI `http://localhost:5000/api/auth/google/callback` esté configurado en Google Cloud Console:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona el proyecto donde están las credenciales de Opalopy
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en tu **OAuth 2.0 Client ID** (el que usa Opalopy)
5. En **Authorized redirect URIs**, verifica que esté:
   - `http://localhost:5000/api/auth/google/callback` ✅
   - Si no está, agrégalo y guarda

**Nota**: Opalo ATS y Opalopy pueden usar las **mismas credenciales** de Google OAuth porque:
- Ambas usan el mismo puerto del backend (5000)
- El Redirect URI es el mismo para desarrollo local
- Google Drive creará carpetas separadas ("Opalo ATS" vs "Opalopy")

### Paso 5: Reiniciar el backend

Después de crear el archivo `.env`:

1. Si el backend está corriendo, deténlo (Ctrl+C)
2. Reinícialo:
   ```bash
   cd Opalo-ATS/backend
   npm run dev
   ```

Deberías ver:
```
🚀 Servidor backend corriendo en http://0.0.0.0:5000
🔐 Google OAuth Redirect URI: http://localhost:5000/api/auth/google/callback
✅ Backend listo para recibir peticiones
```

### Paso 6: Probar la conexión

1. Abre la app Opalo ATS en `http://localhost:3001`
2. Ve a **Settings** → **Almacenamiento de Archivos**
3. Haz clic en **"Conectar con Google Drive"**
4. Debería:
   - Abrir una ventana popup
   - Redirigirte a Google para autorizar
   - Pedirte permisos para acceder a Google Drive
   - Redirigirte de vuelta a la app
   - Mostrar "Conectado" con tu email de Google

---

## ✅ Verificación

### Verificar que el archivo `.env` esté correcto

El archivo `Opalo-ATS/backend/.env` debe tener:
- ✅ `GOOGLE_CLIENT_ID` con un valor (no vacío)
- ✅ `GOOGLE_CLIENT_SECRET` con un valor (no vacío)
- ✅ `GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback`
- ✅ `FRONTEND_URL=http://localhost:3001` (puerto 3001, no 3000)
- ✅ `PORT=5000`

### Verificar que el backend esté corriendo

Abre en el navegador:
```
http://localhost:5000/health
```

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "service": "Opalo ATS Backend - Google Drive API"
}
```

---

## 🔍 Diferencias entre Opalopy y Opalo ATS

| Aspecto | Opalopy | Opalo ATS |
|---------|---------|-----------|
| **Puerto Frontend** | 3000 | 3001 |
| **Puerto Backend** | 5000 | 5000 (mismo) |
| **Carpeta Raíz Google Drive** | "Opalopy" o "ATS Pro" | "Opalo ATS" |
| **Credenciales OAuth** | Pueden compartirse | Pueden compartirse |
| **Redirect URI** | `http://localhost:5000/api/auth/google/callback` | `http://localhost:5000/api/auth/google/callback` (mismo) |

**Conclusión**: Opalo ATS y Opalopy pueden usar las **mismas credenciales de Google OAuth** porque:
- El backend corre en el mismo puerto (5000)
- El Redirect URI es el mismo para desarrollo local
- Google Drive creará carpetas separadas para cada app

---

## ❌ Errores Comunes

### Error 1: "redirect_uri_mismatch"

**Solución**: 
1. Ve a Google Cloud Console → Credentials
2. Edita tu OAuth 2.0 Client ID
3. Asegúrate de que `http://localhost:5000/api/auth/google/callback` esté en "Authorized redirect URIs"
4. Guarda los cambios

### Error 2: "invalid_client"

**Solución**: 
1. Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén correctos en `.env`
2. Asegúrate de que no haya espacios extra o comillas
3. Reinicia el backend después de editar `.env`

### Error 3: "Backend no responde"

**Solución**: 
1. Verifica que el backend esté corriendo: `cd Opalo-ATS/backend && npm run dev`
2. Verifica que responda: `http://localhost:5000/health`

---

## 📝 Notas Importantes

1. **Las credenciales de Google OAuth pueden compartirse** entre Opalopy y Opalo ATS
2. **Cada app creará su propia carpeta raíz** en Google Drive:
   - Opalopy → "Opalopy" o "ATS Pro"
   - Opalo ATS → "Opalo ATS"
3. **El archivo `.env` NO debe subirse a Git** (ya está en `.gitignore`)
4. **En producción**, cada app puede tener su propio backend con su propia URL, pero pueden usar las mismas credenciales OAuth si el Redirect URI está configurado correctamente

---

## 🆘 Si Aún No Funciona

1. **Revisa la consola del navegador** (F12) para ver errores
2. **Revisa la terminal del backend** para ver errores
3. **Verifica que el archivo `.env` esté en la ubicación correcta**: `Opalo-ATS/backend/.env`
4. **Verifica que no haya espacios extra** en las variables de entorno
5. **Comparte los errores** que veas para diagnosticar

