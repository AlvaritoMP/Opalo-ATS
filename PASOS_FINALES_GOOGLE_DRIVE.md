# 🎯 Pasos Finales para Configurar Google Drive

## ✅ Lo Que Ya Está Listo

- [x] Backend creado en `Opalo-ATS/backend/`
- [x] Código del backend completo (server.js, routes, config)
- [x] Frontend configurado para usar `VITE_API_URL`
- [x] Backend pusheado al repositorio

---

## 📋 Pasos para Completar la Configuración

### Paso 1: Crear `backend/.env` ⚠️ CRÍTICO

**Ubicación**: `Opalo-ATS/backend/.env`

**Contenido**:
```env
PORT=5000
GOOGLE_CLIENT_ID=TU_GOOGLE_CLIENT_ID_AQUI
GOOGLE_CLIENT_SECRET=TU_GOOGLE_CLIENT_SECRET_AQUI
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:3001
NODE_ENV=development
```

**Pasos**:
1. Ve a `Opalo-ATS/backend/`
2. Crea el archivo `.env`
3. Copia el contenido de arriba
4. Guarda el archivo

---

### Paso 2: Instalar Dependencias del Backend

```powershell
cd C:\Users\alvar\Opaloats\Opalo-ATS\backend
npm install
```

---

### Paso 3: Crear `.env.local` en la Raíz ⚠️ CRÍTICO

**Ubicación**: `.env.local` (en la raíz de `Opaloats`)

**Contenido**:
```env
# Supabase (ya deberías tener esto)
VITE_SUPABASE_URL=https://afhiiplxqtodqxvmswor.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU

# Backend API URL (IMPORTANTE para Google Drive)
VITE_API_URL=http://localhost:5000
```

**Pasos**:
1. Ve a la raíz del proyecto (`C:\Users\alvar\Opaloats`)
2. Crea el archivo `.env.local` si no existe
3. Agrega `VITE_API_URL=http://localhost:5000`
4. Guarda el archivo

---

### Paso 4: Verificar Google Cloud Console

**Pasos**:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en tu **OAuth 2.0 Client ID**
5. En **"Authorized redirect URIs"**, verifica que esté:
   - `http://localhost:5000/api/auth/google/callback` ✅
6. Si no está, agrégalo y guarda

---

### Paso 5: Iniciar el Backend

```powershell
cd C:\Users\alvar\Opaloats\Opalo-ATS\backend
npm run dev
```

**Deberías ver**:
```
🚀 Servidor backend corriendo en http://0.0.0.0:5000
🔐 Google OAuth Redirect URI: http://localhost:5000/api/auth/google/callback
✅ Backend listo para recibir peticiones
```

**Verifica que funcione**: Abre `http://localhost:5000/health` en el navegador
- Debería responder con JSON: `{"status":"ok",...}`

---

### Paso 6: Reiniciar el Frontend

**Pasos**:
1. Si el frontend está corriendo, presiona `Ctrl+C`
2. Reinicia:
   ```powershell
   cd C:\Users\alvar\Opaloats
   npm run dev
   ```
3. Verifica que cargue en `http://localhost:3001`

---

### Paso 7: Probar la Conexión con Google Drive

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

## ✅ Checklist Final

- [ ] `Opalo-ATS/backend/.env` creado con credenciales Google OAuth
- [ ] Dependencias del backend instaladas (`npm install`)
- [ ] Backend corriendo en puerto 5000
- [ ] Backend responde en `http://localhost:5000/health`
- [ ] `.env.local` en la raíz con `VITE_API_URL=http://localhost:5000`
- [ ] Frontend reiniciado después de agregar `VITE_API_URL`
- [ ] Google Cloud Console tiene `http://localhost:5000/api/auth/google/callback` en Redirect URIs
- [ ] Conexión con Google Drive probada y funcionando

---

## 🐛 Solución de Problemas

### Error: "Backend no responde"

**Solución**:
1. Verifica que el backend esté corriendo
2. Verifica que responda: `http://localhost:5000/health`
3. Verifica que no haya errores en la terminal del backend
4. Verifica que el puerto 5000 no esté ocupado

### Error: "Missing required parameter: client_id"

**Solución**:
1. Verifica que `GOOGLE_CLIENT_ID` esté en `backend/.env`
2. Verifica que no haya espacios extra o comillas
3. Reinicia el backend después de editar `.env`

### Error: "redirect_uri_mismatch"

**Solución**:
1. Ve a Google Cloud Console → Credentials
2. Edita tu OAuth Client ID
3. Verifica que `http://localhost:5000/api/auth/google/callback` esté en Redirect URIs
4. Guarda los cambios

### Error: "CORS error"

**Solución**:
1. Verifica que `VITE_API_URL=http://localhost:5000` esté en `.env.local`
2. Reinicia el frontend después de editar `.env.local`
3. Verifica que el backend esté corriendo

---

## 🎯 Resumen

**Solo necesitas**:
1. ✅ Crear `backend/.env` con credenciales
2. ✅ Instalar dependencias del backend
3. ✅ Crear `.env.local` con `VITE_API_URL`
4. ✅ Iniciar backend y frontend
5. ✅ Verificar Google Cloud Console

**Después de esto, Google Drive debería funcionar perfectamente.** 🎉


