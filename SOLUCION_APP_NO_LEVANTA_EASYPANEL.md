# 🔧 Solución: App No Levanta en EasyPanel

## 🔴 Problema

El build fue exitoso (✓ built in 1m 17s), pero la app no levanta. Esto se debe a que **las variables de entorno no están configuradas en EasyPanel** o están configuradas incorrectamente.

---

## ✅ Solución: Configurar Variables de Entorno en EasyPanel

### Paso 1: Ir a Variables de Entorno

1. En EasyPanel, ve a tu aplicación **Opalo ATS**
2. Busca la sección **"Environment Variables"** o **"Variables de Entorno"**
3. Puede estar en:
   - **Settings** → **Environment Variables**
   - **Configuration** → **Env Vars**
   - **Build Settings** → **Environment Variables**

### Paso 2: Agregar Variables (CRÍTICO: Build-time)

**⚠️ IMPORTANTE**: Las variables `VITE_*` DEBEN estar marcadas como **"Build-time"** o **"Build & Runtime"**, NO solo "Runtime".

Agrega estas variables:

#### Variable 1: VITE_SUPABASE_URL
- **Nombre**: `VITE_SUPABASE_URL`
- **Valor**: `https://afhiiplxqtodqxvmswor.supabase.co`
- **Scope**: **Build-time** o **Build & Runtime** ⚠️

#### Variable 2: VITE_SUPABASE_ANON_KEY
- **Nombre**: `VITE_SUPABASE_ANON_KEY`
- **Valor**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU`
- **Scope**: **Build-time** o **Build & Runtime** ⚠️

#### Variable 3: VITE_API_URL (Backend para Google Drive)
- **Nombre**: `VITE_API_URL`
- **Valor**: (La URL de tu backend en producción, por ejemplo: `https://backend-opalo-ats.tu-dominio.com` o la IP del servidor)
- **Scope**: **Build-time** o **Build & Runtime** ⚠️

**Nota**: Si el backend aún no está desplegado, puedes poner un placeholder por ahora:
```
http://localhost:5000
```

Después, cuando despliegues el backend, actualiza esta variable y haz rebuild.

#### Variable 4 (Opcional): GEMINI_API_KEY
- **Nombre**: `GEMINI_API_KEY`
- **Valor**: (Tu clave de Gemini si la tienes)
- **Scope**: **Build-time** o **Build & Runtime**

### Paso 3: Guardar y Rebuild (CRÍTICO)

**⚠️ CRÍTICO**: Después de agregar/modificar las variables:

1. Haz clic en **"Save"** o **"Guardar"**
2. Ve a **"Deployments"** o **"Despliegues"**
3. Haz clic en **"Redeploy"** o **"Rebuild"**
4. Esto es **obligatorio** porque las variables `VITE_*` se inyectan durante el build

---

## 🔍 Verificación

Después del rebuild:

1. ✅ El build se completa sin errores
2. ✅ La aplicación carga en el navegador (no muestra error de configuración)
3. ✅ En la consola del navegador (F12 → Console) ves:
   - `Loading data from Supabase...`
   - `✓ Loaded users from Supabase`
   - `✓ Loaded processes from Supabase`
   - `✓ Loaded candidates from Supabase`
4. ✅ NO hay errores como:
   - `⚠️ Supabase no está configurado`
   - `Failed to load resource: 406` o `400`
   - `CORS error`

---

## 🐛 Si Aún No Funciona

### Verificar Build Logs

En los logs de build, busca:
- `[build] cmds = ["npm run build"]`
- Debe mostrar que el build se completa sin errores

### Verificar Runtime Logs

En los logs de runtime, busca:
- `caddy run --config /app/Caddyfile`
- Debe mostrar que Caddy está corriendo

### Verificar Variables en Build

Si tienes acceso a los logs de build, verifica que las variables estén disponibles:
- Deben estar presentes cuando se ejecuta `npm run build`

### Verificar Caddy

Si Caddy no está corriendo, verifica:
- El `Caddyfile` está en `/app/Caddyfile`
- Los archivos de build están en `/app/dist`

---

## 📋 Checklist Completo

- [ ] Variables de entorno agregadas en EasyPanel
- [ ] Variables marcadas como **"Build-time"** o **"Build & Runtime"**
- [ ] Variables guardadas
- [ ] Rebuild ejecutado
- [ ] Build completado sin errores
- [ ] App carga en el navegador
- [ ] No hay errores en consola del navegador
- [ ] Datos de Supabase se cargan correctamente

---

## 📝 Nota sobre VITE_API_URL

Si el backend aún no está desplegado:

1. Puedes poner `VITE_API_URL=http://localhost:5000` por ahora
2. La app cargará, pero Google Drive no funcionará hasta que despliegues el backend
3. Después de desplegar el backend, actualiza `VITE_API_URL` con la URL real y haz rebuild

---

## 🔗 Siguiente Paso: Desplegar Backend

Una vez que el frontend funcione:

1. Despliega el backend en EasyPanel (o en tu servidor virtual)
2. Configura las variables de entorno del backend:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` (URL del backend en producción)
   - `FRONTEND_URL` (URL del frontend en producción)
3. Actualiza `VITE_API_URL` en el frontend con la URL del backend
4. Haz rebuild del frontend
5. Configura Google Cloud Console con las URLs de producción

