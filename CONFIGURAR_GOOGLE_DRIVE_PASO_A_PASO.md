# 🔧 Configurar Google Drive - Paso a Paso

## 🎯 Situación Actual

- ✅ Frontend de Opalo ATS funcionando en `http://localhost:3001`
- ⚠️ Backend de Opalo ATS está vacío (no se movió correctamente)
- ✅ Opción: Usar el backend compartido de Opalopy (recomendado)

---

## ✅ Solución: Usar Backend Compartido de Opalopy

**Ventajas**:
- ✅ Ya está configurado y funcionando
- ✅ Mismas credenciales de Google OAuth
- ✅ Menos configuración
- ✅ Cada app crea su propia carpeta en Google Drive

---

## 📋 Pasos para Configurar

### Paso 1: Verificar Backend de Opalopy

**Ubicación**: `Opalopy/backend/` (en el directorio padre)

**Verificar**:
1. ¿Existe `Opalopy/backend/src/server.js`?
2. ¿Tiene `Opalopy/backend/.env` con credenciales de Google OAuth?

Si **NO existe Opalopy**, necesitamos copiar el backend desde el repositorio original.

---

### Paso 2: Configurar `.env.local` en Opalo ATS

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
1. Crea el archivo `.env.local` en la raíz (`C:\Users\alvar\Opaloats\.env.local`)
2. Agrega `VITE_API_URL=http://localhost:5000`
3. Reinicia el frontend después de crear/editar

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

### Paso 4: Iniciar el Backend Compartido

**Opción A: Si Opalopy existe localmente**

```powershell
# Iniciar backend de Opalopy
cd C:\Users\alvar\Opaloats\Opalopy\backend
npm run dev
```

**Opción B: Si Opalopy NO existe, usar el backend del servidor**

Si Opalopy solo existe en el servidor, puedes:
1. Usar el backend del servidor (si está accesible)
2. O clonar Opalopy localmente para tener el backend

---

### Paso 5: Reiniciar el Frontend

**Pasos**:
1. Si el frontend está corriendo, presiona `Ctrl+C`
2. Reinicia:
   ```powershell
   cd C:\Users\alvar\Opaloats
   npm run dev
   ```
3. Verifica que cargue en `http://localhost:3001`

---

### Paso 6: Probar la Conexión

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
   - Mostrar "Conectado" con tu email

---

## 🐛 Solución de Problemas

### Error: "Backend no responde"

**Solución**:
1. Verifica que el backend esté corriendo
2. Verifica que responda: `http://localhost:5000/health`
3. Verifica que no haya errores en la terminal del backend

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
3. Verifica que el backend tenga CORS configurado para `http://localhost:3001`

---

## ✅ Checklist Final

- [ ] `.env.local` creado con `VITE_API_URL=http://localhost:5000`
- [ ] Google Cloud Console tiene `http://localhost:5000/api/auth/google/callback` en Redirect URIs
- [ ] Backend compartido corriendo en puerto 5000
- [ ] Backend responde en `http://localhost:5000/health`
- [ ] Frontend reiniciado después de agregar `VITE_API_URL`
- [ ] Conexión con Google Drive probada y funcionando

---

## 🎯 Siguiente Paso: Producción

Una vez que funcione en localhost:

1. Despliega el backend en EasyPanel o tu servidor
2. Actualiza `VITE_API_URL` en EasyPanel con la URL del backend en producción
3. Agrega el Redirect URI de producción en Google Cloud Console
4. Haz rebuild del frontend


