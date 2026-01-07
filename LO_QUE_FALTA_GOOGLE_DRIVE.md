# 🎯 Lo Que Falta para Google Drive en Opalo ATS

## ✅ Lo Que Ya Está Listo

- [x] Backend actualizado para múltiples orígenes (CORS)
- [x] Archivo `backend/.env` con credenciales de Google OAuth
- [x] Código del frontend configurado para usar `VITE_API_URL`
- [x] Repositorio Git creado y código subido

---

## ⚠️ Lo Que Falta (3 Pasos)

### 1. Configurar `.env.local` en el Frontend ⚠️ CRÍTICO

**Ubicación**: `Opalo-ATS/.env.local` (en la raíz del proyecto)

**Contenido necesario**:
```env
# Supabase (ya deberías tener esto)
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key

# Backend API URL (IMPORTANTE para Google Drive)
VITE_API_URL=http://localhost:5000
```

**Pasos**:
1. Crea el archivo `Opalo-ATS/.env.local` si no existe
2. Agrega `VITE_API_URL=http://localhost:5000`
3. Reinicia el frontend después de crear/editar el archivo

---

### 2. Agregar Redirect URI en Google Cloud Console ⚠️ IMPORTANTE

**Pasos**:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en tu **OAuth 2.0 Client ID** ("Web client 1")
5. En **"Authorized redirect URIs"**, verifica que esté:
   - `http://localhost:5000/api/auth/google/callback` ✅
6. Si **NO está**, agrégalo y guarda

---

### 3. Iniciar el Backend ⚠️ NECESARIO

**Pasos**:
1. Abre una terminal
2. Ejecuta:
   ```bash
   cd Opalo-ATS/backend
   npm run dev
   ```
3. Deberías ver:
   ```
   🚀 Servidor backend corriendo en http://0.0.0.0:5000
   🔐 Google OAuth Redirect URI: http://localhost:5000/api/auth/google/callback
   ✅ Backend listo para recibir peticiones
   ```
4. Verifica que funcione: Abre `http://localhost:5000/health` en el navegador

---

## 🧪 Prueba Final

Después de completar los 3 pasos:

1. **Inicia el frontend** (si no está corriendo):
   ```bash
   cd Opalo-ATS
   npm run dev
   ```

2. **Abre la app** en `http://localhost:3001`

3. **Inicia sesión**

4. **Ve a Settings** → **Almacenamiento de Archivos**

5. **Haz clic en "Conectar con Google Drive"**

6. **Debería**:
   - Abrir ventana popup
   - Redirigir a Google para autorizar
   - Pedir permisos para Google Drive
   - Redirigir de vuelta
   - Mostrar "Conectado" con tu email

---

## 📋 Checklist Rápido

- [ ] **`.env.local` creado** con `VITE_API_URL=http://localhost:5000`
- [ ] **Google Cloud Console** tiene `http://localhost:5000/api/auth/google/callback` en Redirect URIs
- [ ] **Backend corriendo** en puerto 5000
- [ ] **Frontend corriendo** en puerto 3001
- [ ] **Conexión con Google Drive probada** y funcionando

---

## 🆘 Si Algo No Funciona

### Error: "No se puede conectar al backend"

**Solución**:
- Verifica que el backend esté corriendo
- Verifica que `VITE_API_URL=http://localhost:5000` esté en `.env.local`
- Reinicia el frontend después de editar `.env.local`

### Error: "redirect_uri_mismatch"

**Solución**:
- Ve a Google Cloud Console → Credentials
- Verifica que `http://localhost:5000/api/auth/google/callback` esté en Redirect URIs
- Guarda los cambios

### La ventana popup no se abre

**Solución**:
- Verifica que el bloqueador de popups esté deshabilitado
- Revisa la consola del navegador (F12) para ver errores
- Verifica que `VITE_API_URL` esté configurado

---

## ✅ Resumen

**Solo faltan 3 cosas**:

1. ✅ Crear `.env.local` con `VITE_API_URL=http://localhost:5000`
2. ✅ Agregar Redirect URI en Google Cloud Console
3. ✅ Iniciar el backend

**Después de esto, Google Drive debería funcionar igual que en Opalopy.** 🎉

