# 🔧 Solución Final: Variables NO Están en el Build

## ❌ Problema

Error 401 "Invalid API key" significa que las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` **NO están en el código compilado**.

---

## 🎯 Solución: Forzar Rebuild con Variables Correctas

### Paso 1: Verificar Variables en EasyPanel

1. Ve a EasyPanel
2. Selecciona el servicio del **frontend de Opalo ATS**
3. Ve a **"Environment Variables"** o **"Variables de Entorno"**

### Paso 2: Eliminar y Recrear las Variables

**IMPORTANTE**: A veces las variables no se inyectan correctamente si ya existían antes. Vamos a recrearlas:

1. **Elimina** `VITE_SUPABASE_URL` (si existe)
2. **Elimina** `VITE_SUPABASE_ANON_KEY` (si existe)
3. **Elimina** `VITE_API_URL` (si existe)

4. **Crea de nuevo** `VITE_SUPABASE_URL`:
   - Nombre: `VITE_SUPABASE_URL`
   - Valor: `https://afhiiplxqtodqxvmswor.supabase.co`
   - **Sin espacios** al inicio o final
   - Si hay opción de "Scope" o "Type", selecciona **"Build-time"**

5. **Crea de nuevo** `VITE_SUPABASE_ANON_KEY`:
   - Nombre: `VITE_SUPABASE_ANON_KEY`
   - Valor: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU`
   - **Sin espacios** al inicio o final
   - Si hay opción de "Scope" o "Type", selecciona **"Build-time"**

6. **Crea de nuevo** `VITE_API_URL`:
   - Nombre: `VITE_API_URL`
   - Valor: `https://opalo-atsopalo-backend.bouasv.easypanel.host`
   - Si hay opción de "Scope" o "Type", selecciona **"Build-time"**

7. **Guarda** todos los cambios

### Paso 3: REBUILD OBLIGATORIO

**CRÍTICO**: Después de crear/modificar las variables:

1. Ve a **"Deployments"** o **"Despliegues"**
2. Haz clic en **"Redeploy"** o **"Rebuild"**
3. **Espera a que termine completamente** el build
4. Verifica que no haya errores en los logs del build

---

## 🔍 Verificación Post-Rebuild

### Paso 1: Verificar Build Logs

En los logs del build, busca:
- ✅ No debe haber errores sobre variables no definidas
- ✅ El build debe completarse exitosamente
- ✅ Debe mostrar que los archivos se crearon en `dist/`

### Paso 2: Verificar en el Navegador

1. Abre la app en producción
2. Abre la consola del navegador (F12)
3. Ve a la pestaña **Console**
4. **NO deberías ver** errores 401 "Invalid API key"
5. Deberías ver:
   - ✅ `Loading data from Supabase...`
   - ✅ `✓ Loaded users from Supabase`

### Paso 3: Verificar en Network Tab

1. En DevTools, ve a la pestaña **Network**
2. Busca requests a `supabase.co`
3. Verifica que:
   - ✅ Status code sea `200` (no `401`)
   - ✅ Los requests tengan el header `apikey` con el valor correcto

---

## 🐛 Si Aún No Funciona

### Opción A: Verificar que las Variables Estén Correctas

Copia y pega **exactamente** estos valores (sin espacios):

**VITE_SUPABASE_URL**:
```
https://afhiiplxqtodqxvmswor.supabase.co
```

**VITE_SUPABASE_ANON_KEY**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU
```

### Opción B: Verificar Build Command

En EasyPanel, verifica que el **Build Command** sea:
```bash
npm ci && npm run build
```

O simplemente:
```bash
npm run build
```

### Opción C: Verificar Root Directory

Verifica que el **Root Directory** sea la raíz del proyecto (no `Opalo-ATS/`).

---

## 📋 Checklist Completo

- [ ] Variables eliminadas y recreadas en EasyPanel
- [ ] Valores son correctos (sin espacios extra)
- [ ] Variables marcadas como "Build-time" (si hay opción)
- [ ] Variables guardadas
- [ ] **REBUILD ejecutado después de recrear variables**
- [ ] Build completado sin errores
- [ ] App carga sin errores 401
- [ ] Requests a Supabase funcionan (status 200)

---

## 🎯 Resumen

**El problema es que las variables NO están en el build**. 

**Solución**:
1. Elimina y recrea las variables en EasyPanel
2. **REBUILD obligatorio** después de recrear
3. Verifica que funcione

---

## 💡 Nota Importante

**Las variables `VITE_*` se inyectan durante el build**. Si no están disponibles durante el build, el código compilado no las tendrá, y siempre dará error 401.

**Siempre debes hacer rebuild después de cambiar variables `VITE_*`**.

