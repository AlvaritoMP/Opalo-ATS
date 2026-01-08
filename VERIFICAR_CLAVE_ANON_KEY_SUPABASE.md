# 🔐 Verificar y Regenerar Clave Anon Key en Supabase

## ❌ Problema Persistente

Aunque configuramos URLs y RLS, sigue dando error 401 "Invalid API key".

---

## 🔍 Verificación Completa

### Paso 1: Verificar Estado de la Clave

1. Ve a Supabase Dashboard → Settings → API
2. Busca la sección **"Project API keys"**
3. Verifica que la clave **"anon"** o **"anon public"** esté:
   - ✅ **Habilitada** (no deshabilitada)
   - ✅ **Visible** (puedes verla)
   - ✅ **Activa** (no revocada)

### Paso 2: Regenerar Clave Anon Key (Si es Necesario)

Si la clave está deshabilitada o quieres regenerarla:

1. En **Settings → API → Project API keys**
2. Busca la clave **"anon"**
3. Haz clic en el menú (tres puntos) junto a la clave
4. Selecciona **"Reset"** o **"Regenerate"**
5. **Copia la nueva clave** que se genera
6. **Actualiza** `VITE_SUPABASE_ANON_KEY` en EasyPanel con la nueva clave
7. **Haz REBUILD** del frontend (obligatorio)

---

## 🔧 Solución: Regenerar Clave

### Paso 1: Regenerar en Supabase

1. Ve a Supabase Dashboard → Settings → API
2. Busca **"Project API keys"** → **"anon"**
3. Haz clic en **"Reset"** o **"Regenerate"**
4. Copia la nueva clave completa

### Paso 2: Actualizar en EasyPanel

1. Ve a EasyPanel → Frontend Opalo ATS → Environment Variables
2. Actualiza `VITE_SUPABASE_ANON_KEY` con la nueva clave
3. Guarda los cambios

### Paso 3: Rebuild

1. Ve a Deployments
2. Haz clic en **"Redeploy"** o **"Rebuild"**
3. Espera a que termine

---

## 🔍 Verificar en Network Tab

Después del rebuild:

1. Abre la app en producción
2. Abre DevTools → Network
3. Haz clic en un request a Supabase
4. Ve a Headers → Request Headers
5. Verifica que el header `apikey` tenga la nueva clave

---

## 🐛 Si Regenerar No Funciona

Si regenerar la clave no funciona, puede ser:

1. **Problema con el proyecto**: Verifica que estés en el proyecto correcto
2. **Problema con la URL**: Verifica que la URL de Supabase sea correcta
3. **Problema de permisos**: El rol anon puede no tener permisos

---

## 📋 Checklist

- [ ] Clave anon key verificada en Supabase
- [ ] Clave regenerada (si es necesario)
- [ ] Clave actualizada en EasyPanel
- [ ] Rebuild ejecutado
- [ ] Verificado en Network tab que la nueva clave está en el header
- [ ] Probado de nuevo

---

## 🎯 Resumen

**Si la clave está deshabilitada o hay problemas**:
1. Regenera la clave anon key en Supabase
2. Actualiza en EasyPanel
3. Rebuild obligatorio

Esto debería solucionar el problema.

