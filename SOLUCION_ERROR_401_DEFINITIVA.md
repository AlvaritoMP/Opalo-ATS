# 🔐 Solución Definitiva: Error 401 "Invalid API key"

## ❌ Problema

Todos los requests a Supabase devuelven **401 "Invalid API key"**. Esto significa que las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` **NO están en el código compilado**.

---

## 🎯 Causa Raíz

Las variables `VITE_*` se inyectan **durante el build**, no en runtime. Si no están disponibles durante el build, el código compilado no las tendrá.

---

## ✅ Solución Paso a Paso

### Paso 1: Verificar Variables en EasyPanel

1. Ve a EasyPanel
2. Selecciona el servicio del **frontend de Opalo ATS**
3. Ve a **"Environment Variables"** o **"Variables de Entorno"**

### Paso 2: Verificar que las Variables Existan

Debes tener exactamente estas dos variables:

#### Variable 1: VITE_SUPABASE_URL
- **Nombre**: `VITE_SUPABASE_URL`
- **Valor**: `https://afhiiplxqtodqxvmswor.supabase.co`
- **⚠️ CRÍTICO**: Debe estar marcada como **"Build-time"** o **"Build & Runtime"**

#### Variable 2: VITE_SUPABASE_ANON_KEY
- **Nombre**: `VITE_SUPABASE_ANON_KEY`
- **Valor**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU`
- **⚠️ CRÍTICO**: Debe estar marcada como **"Build-time"** o **"Build & Runtime"**

### Paso 3: Verificar "Build-time" ⚠️ MUY IMPORTANTE

**En EasyPanel, busca una opción como**:
- ☑️ **"Build-time"** (debe estar marcado)
- ☑️ **"Build & Runtime"** (también funciona)
- ☐ **"Runtime only"** (NO funciona para VITE_*)

**Si NO hay opción para "Build-time"**:
- Algunos paneles tienen esta opción en un menú desplegable
- O puede estar en la configuración avanzada
- Si no encuentras la opción, **elimina y vuelve a crear las variables**

### Paso 4: Eliminar y Recrear las Variables (Si es Necesario)

Si las variables ya existen pero no funcionan:

1. **Elimina** `VITE_SUPABASE_URL`
2. **Elimina** `VITE_SUPABASE_ANON_KEY`
3. **Crea de nuevo** `VITE_SUPABASE_URL`:
   - Nombre: `VITE_SUPABASE_URL`
   - Valor: `https://afhiiplxqtodqxvmswor.supabase.co`
   - **Marca como "Build-time"** si hay opción
4. **Crea de nuevo** `VITE_SUPABASE_ANON_KEY`:
   - Nombre: `VITE_SUPABASE_ANON_KEY`
   - Valor: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU`
   - **Marca como "Build-time"** si hay opción
5. **Guarda** los cambios

### Paso 5: REBUILD OBLIGATORIO ⚠️

**Después de crear/modificar las variables**:

1. Ve a **"Deployments"** o **"Despliegues"**
2. Haz clic en **"Redeploy"** o **"Rebuild"**
3. **Espera a que termine completamente** el build
4. Esto es **obligatorio** porque las variables `VITE_*` se inyectan durante el build

---

## 🔍 Verificación Post-Rebuild

### Paso 1: Verificar Build Logs

En los logs del build, busca:
- ✅ No debe haber errores sobre variables no definidas
- ✅ El build debe completarse exitosamente

### Paso 2: Verificar en el Navegador

1. Abre la app en producción
2. Abre la consola del navegador (F12)
3. Ve a la pestaña **Console**
4. **NO deberías ver** errores 401 "Invalid API key"
5. Deberías ver:
   - ✅ `Loading data from Supabase...`
   - ✅ `✓ Loaded users from Supabase`
   - ✅ `✓ Loaded processes from Supabase`

### Paso 3: Verificar en Network Tab

1. En DevTools, ve a la pestaña **Network**
2. Busca requests a `supabase.co`
3. Verifica que:
   - ✅ Status code sea `200` (no `401`)
   - ✅ Los requests tengan los headers correctos
   - ✅ Las respuestas contengan datos

---

## 🐛 Si Aún No Funciona

### Opción A: Verificar que las Variables Estén Correctas

Copia y pega exactamente estos valores (sin espacios extra):

**VITE_SUPABASE_URL**:
```
https://afhiiplxqtodqxvmswor.supabase.co
```

**VITE_SUPABASE_ANON_KEY**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU
```

### Opción B: Verificar Build Method

En EasyPanel, verifica el **Build Method**:
- ✅ **Nixpacks** (recomendado)
- ✅ **Dockerfile** (si tienes uno)
- ❌ **Static** (puede no funcionar bien con variables)

### Opción C: Verificar Build Command

El build command debe ser algo como:
```bash
npm ci && npm run build
```

O simplemente:
```bash
npm run build
```

---

## 📋 Checklist Completo

- [ ] Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` existen
- [ ] Valores son correctos (sin espacios extra)
- [ ] Variables marcadas como "Build-time" (si hay opción)
- [ ] Variables guardadas
- [ ] **REBUILD ejecutado después de crear/modificar variables**
- [ ] Build completado sin errores
- [ ] App carga sin errores 401
- [ ] Requests a Supabase funcionan (status 200)

---

## 🎯 Resumen

**El problema es que las variables NO están en el build**. 

**Solución**:
1. Verifica que existan en EasyPanel
2. Asegúrate de que estén marcadas como "Build-time" (si hay opción)
3. **REBUILD obligatorio** después de cualquier cambio

---

## 💡 Nota Importante

**Las variables `VITE_*` son especiales**:
- Se inyectan **durante el build** (no en runtime)
- Si no están durante el build, el código compilado no las tendrá
- **Siempre** debes hacer rebuild después de cambiar variables `VITE_*`

Esto es diferente de variables normales que se leen en runtime.

