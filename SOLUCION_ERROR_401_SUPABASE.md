# 🔐 Solución: Error 401 "Invalid API key" en Producción

## ❌ Problema

Todos los requests a Supabase devuelven **401 Unauthorized** con el mensaje:
```
"Invalid API key"
"Double check your Supabase `anon` or `service_role` API key."
```

## 🔍 Causa

Las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` **NO están configuradas** o **NO están marcadas como "Build-time"** en EasyPanel.

**Importante**: Las variables que empiezan con `VITE_` deben estar disponibles **durante el build**, no solo en runtime.

---

## ✅ Solución: Configurar Variables en EasyPanel

### Paso 1: Ir a Variables de Entorno

1. En EasyPanel, ve a tu aplicación **Opalo ATS**
2. Busca la sección **"Environment Variables"** o **"Variables de Entorno"**
3. Puede estar en:
   - **Settings** → **Environment Variables**
   - **Configuration** → **Env Vars**
   - **Build Settings** → **Environment Variables**

### Paso 2: Agregar Variables (Build-time) ⚠️ CRÍTICO

Agrega estas variables y **asegúrate de marcarlas como "Build-time"** o **"Build & Runtime"**:

#### Variable 1: VITE_SUPABASE_URL
- **Nombre**: `VITE_SUPABASE_URL`
- **Valor**: `https://afhiiplxqtodqxvmswor.supabase.co`
- **Scope**: **Build-time** ⚠️ (MUY IMPORTANTE)

#### Variable 2: VITE_SUPABASE_ANON_KEY
- **Nombre**: `VITE_SUPABASE_ANON_KEY`
- **Valor**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU`
- **Scope**: **Build-time** ⚠️ (MUY IMPORTANTE)

#### Variable 3: VITE_API_URL (si usas Google Drive)
- **Nombre**: `VITE_API_URL`
- **Valor**: `https://url-de-tu-backend` (la URL del backend de Opalopy)
- **Scope**: **Build-time** ⚠️ (MUY IMPORTANTE)

### Paso 3: Verificar que Estén Marcadas como Build-time

**CRÍTICO**: Si las variables NO están marcadas como "Build-time":
- ❌ Vite no las inyectará durante el build
- ❌ El código compilado no tendrá las variables
- ❌ Todos los requests a Supabase fallarán con 401

**Cómo verificar**:
- Debe haber una opción/checkbox que diga "Build-time" o "Build & Runtime"
- Debe estar **marcado/activado** para estas variables

### Paso 4: Rebuild la Aplicación ⚠️ OBLIGATORIO

**Después de agregar/cambiar las variables**:

1. Ve a **"Deployments"** o **"Despliegues"**
2. Haz clic en **"Redeploy"** o **"Rebuild"**
3. Espera a que termine el build completo

**⚠️ IMPORTANTE**: 
- El rebuild es **obligatorio** porque las variables `VITE_*` se inyectan durante el build
- Si solo cambias las variables sin rebuild, no surtirán efecto

---

## 🔍 Verificación Post-Rebuild

### Paso 1: Verificar que el Build Incluyó las Variables

Después del rebuild, verifica en los logs del build que no haya errores relacionados con variables de entorno.

### Paso 2: Verificar en el Navegador

1. Abre la app en producción
2. Abre la consola del navegador (F12)
3. Ve a la pestaña **Console**
4. Deberías ver:
   - ✅ `Loading data from Supabase...`
   - ✅ `✓ Loaded processes from Supabase`
   - ✅ `✓ Loaded users from Supabase`
   - ❌ **NO** deberías ver errores 401

### Paso 3: Verificar en Network Tab

1. En DevTools, ve a la pestaña **Network**
2. Busca requests a `supabase.co`
3. Verifica que:
   - ✅ Status code sea `200` (no `401`)
   - ✅ Los requests tengan los headers correctos
   - ✅ Las respuestas contengan datos

---

## 🐛 Si Aún No Funciona

### Verificar que las Variables Estén Correctas

1. En EasyPanel, verifica que:
   - `VITE_SUPABASE_URL` = `https://afhiiplxqtodqxvmswor.supabase.co` (sin slash final)
   - `VITE_SUPABASE_ANON_KEY` = La clave completa (sin espacios)

2. Verifica que **NO haya espacios extra** al inicio o final

### Verificar que Estén Marcadas como Build-time

Si EasyPanel tiene opciones como:
- "Runtime only" ❌ (NO usar para VITE_*)
- "Build-time" ✅ (USAR para VITE_*)
- "Build & Runtime" ✅ (También funciona)

**Debe estar marcado "Build-time" o "Build & Runtime"**

### Verificar el Build Log

En los logs del build en EasyPanel, busca:
- ✅ No debería haber errores sobre variables no definidas
- ✅ El build debería completarse exitosamente

### Verificar en el Código Compilado

Si tienes acceso al código compilado, verifica que las variables estén inyectadas:
- Busca en `dist/assets/*.js` por `afhiiplxqtodqxvmswor.supabase.co`
- Deberías encontrar la URL de Supabase en el código

---

## 📝 Resumen de Pasos

1. ✅ Ir a EasyPanel → Tu app → Environment Variables
2. ✅ Agregar `VITE_SUPABASE_URL` (marcar como Build-time)
3. ✅ Agregar `VITE_SUPABASE_ANON_KEY` (marcar como Build-time)
4. ✅ Agregar `VITE_API_URL` si usas Google Drive (marcar como Build-time)
5. ✅ **Rebuild** la aplicación (obligatorio)
6. ✅ Verificar que funcione en el navegador

---

## ✅ Checklist

- [ ] Variables de entorno agregadas en EasyPanel
- [ ] Variables marcadas como "Build-time"
- [ ] Valores correctos (sin espacios extra)
- [ ] Rebuild ejecutado después de agregar variables
- [ ] Build completado sin errores
- [ ] App carga sin errores 401
- [ ] Requests a Supabase funcionan (status 200)

---

## 🎯 Nota Importante

**Las variables `VITE_*` son especiales**:
- Se inyectan **durante el build** (no en runtime)
- Si no están durante el build, el código compilado no las tendrá
- **Siempre** debes hacer rebuild después de cambiar variables `VITE_*`

Esto es diferente de variables normales que se leen en runtime.

