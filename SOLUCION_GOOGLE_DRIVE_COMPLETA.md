# 🔧 Solución Completa: Configurar Google Drive para Opalo ATS

## 🎯 Estado Actual

- ✅ Backend existe en `Opalo-ATS/backend`
- ✅ Frontend configurado para usar `VITE_API_URL`
- ⚠️ Falta configurar variables de entorno y verificar que todo esté listo

---

## 📋 Pasos para Configurar Google Drive

### Paso 1: Verificar/Crear `backend/.env`

**Ubicación**: `Opalo-ATS/backend/.env`

**Contenido necesario**:
```env
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:3001
PORT=5000
NODE_ENV=development
```

**Pasos**:
1. Ve a `Opalo-ATS/backend/`
2. Si no existe `.env`, créalo
3. Agrega las credenciales de Google OAuth (las mismas que usa Opalopy)

---

### Paso 2: Verificar/Crear `.env.local` en la Raíz

**Ubicación**: `.env.local` (en la raíz de `Opaloats`, no en `Opalo-ATS`)

**Contenido necesario**:
```env
# Supabase (ya deberías tener esto)
VITE_SUPABASE_URL=https://afhiiplxqtodqxvmswor.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU

# Backend API URL (IMPORTANTE para Google Drive)
VITE_API_URL=http://localhost:5000
```

**Pasos**:
1. Ve a la raíz del proyecto (`C:\Users\alvar\Opaloats`)
2. Si no existe `.env.local`, créalo
3. Agrega `VITE_API_URL=http://localhost:5000`
4. Reinicia el frontend después de crear/editar

---

### Paso 3: Verificar Google Cloud Console

**Pasos**:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en tu **OAuth 2.0 Client ID**
5. En **"Authorized redirect URIs"**, verifica que esté:
   - `http://localhost:5000/api/auth/google/callback` ✅
6. Si no está, agrégalo y guarda

---

### Paso 4: Iniciar el Backend

**Pasos**:
1. Abre una terminal
2. Ejecuta:
   ```powershell
   cd C:\Users\alvar\Opaloats\Opalo-ATS\backend
   npm install  # Solo si no has instalado dependencias
   npm run dev
   ```
3. Deberías ver:
   ```
   🚀 Servidor backend corriendo en http://0.0.0.0:5000
   🔐 Google OAuth Redirect URI: http://localhost:5000/api/auth/google/callback
   ✅ Backend listo para recibir peticiones
   ```
4. **Verifica que funcione**: Abre `http://localhost:5000/health` en el navegador
   - Debería responder con JSON: `{"status":"ok",...}`

---

### Paso 5: Reiniciar el Frontend

**Pasos**:
1. Si el frontend está corriendo, presiona `Ctrl+C` para detenerlo
2. Reinicia:
   ```powershell
   cd C:\Users\alvar\Opaloats
   npm run dev
   ```
3. Verifica que cargue en `http://localhost:3001`

---

### Paso 6: Probar la Conexión con Google Drive

**Pasos**:
1. Abre la app en `http://localhost:3001`
2. Inicia sesión
3. Ve a **Settings** → **Almacenamiento de Archivos**
4. Haz clic en **"Conectar con Google Drive"**
5. Debería:
   - Abrir ventana popup
   - Redirigir a Google para autorizar
   - Pedir permisos para Google Drive
   - Redirigir de vuelta
   - Mostrar "Conectado" con tu email de Google

---

## 🐛 Solución de Problemas

### Error: "Backend no responde"

**Solución**:
1. Verifica que el backend esté corriendo
2. Verifica que responda: `http://localhost:5000/health`
3. Verifica que no haya errores en la terminal del backend
4. Verifica que el puerto 5000 no esté ocupado por otro proceso

### Error: "redirect_uri_mismatch"

**Solución**:
1. Ve a Google Cloud Console → Credentials
2. Edita tu OAuth Client ID
3. Verifica que `http://localhost:5000/api/auth/google/callback` esté en "Authorized redirect URIs"
4. Guarda los cambios
5. Espera unos minutos para que los cambios se propaguen

### Error: "CORS error" o "No se puede conectar al backend"

**Solución**:
1. Verifica que `VITE_API_URL=http://localhost:5000` esté en `.env.local`
2. Reinicia el frontend después de editar `.env.local`
3. Verifica que el backend esté corriendo
4. Verifica que el backend tenga CORS configurado para `http://localhost:3001`

### Error: "invalid_client" o "Missing required parameter: client_id"

**Solución**:
1. Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén correctos en `backend/.env`
2. Verifica que no haya espacios extra o comillas
3. Reinicia el backend después de editar `.env`

### La ventana popup no se abre

**Solución**:
1. Verifica que el bloqueador de popups esté deshabilitado
2. Revisa la consola del navegador (F12) para ver errores
3. Verifica que `VITE_API_URL` esté configurado correctamente
4. Verifica que el backend esté corriendo

---

## ✅ Checklist Final

- [ ] `backend/.env` creado con credenciales de Google OAuth
- [ ] `.env.local` en la raíz con `VITE_API_URL=http://localhost:5000`
- [ ] Google Cloud Console tiene `http://localhost:5000/api/auth/google/callback` en Redirect URIs
- [ ] Backend corriendo en puerto 5000
- [ ] Backend responde en `http://localhost:5000/health`
- [ ] Frontend corriendo en puerto 3001
- [ ] Frontend reiniciado después de agregar `VITE_API_URL`
- [ ] Conexión con Google Drive probada y funcionando

---

## 📝 Notas Importantes

1. **El backend puede ser compartido** entre Opalopy y Opalo ATS
2. **Cada app crea su propia carpeta raíz** en Google Drive:
   - Opalopy → "Opalopy" o "ATS Pro"
   - Opalo ATS → "Opalo ATS"
3. **Las credenciales OAuth pueden compartirse** entre ambas apps
4. **En producción**, cada app puede tener su propio backend o compartir uno

---

## 🎯 Siguiente Paso

Una vez que funcione en localhost, para producción:

1. Despliega el backend en EasyPanel o tu servidor
2. Actualiza `VITE_API_URL` en EasyPanel con la URL del backend en producción
3. Agrega el Redirect URI de producción en Google Cloud Console
4. Haz rebuild del frontend


