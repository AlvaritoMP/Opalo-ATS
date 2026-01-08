# 🔧 Solución 2: Corregir Build en Easypanel

## ⚠️ Problema Identificado

Easypanel puede estar usando una **imagen de Docker cacheada** con las llaves de la primera app (Opalopy). Vite no está "viendo" las variables nuevas.

---

## ✅ Pasos para Corregir

### Paso 1: Verificar Variables en Easypanel

1. Ve a tu app en **Easypanel**
2. Ve a **Environment Variables** (Variables de Entorno)
3. Verifica que existan:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Paso 2: Verificar Formato de Variables

**IMPORTANTE**: Las variables deben estar **sin comillas**:

❌ **INCORRECTO:**
```
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

✅ **CORRECTO:**
```
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Paso 3: Verificar Tipo de Variable

1. Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén marcadas como **"Build-time"** (no "Runtime")
2. Si están como "Runtime", cámbialas a "Build-time"

### Paso 4: Redeploy con Limpieza de Caché

1. En Easypanel, ve a tu app
2. Busca la opción **"Redeploy"** o **"Rebuild"**
3. Si hay opciones avanzadas, selecciona:
   - ✅ **"Kill current container"**
   - ✅ **"Clear Cache"**
   - ✅ **"Force rebuild"**
4. Ejecuta el redeploy

### Paso 5: Esperar a que Termine el Build

1. Espera a que el build termine completamente
2. Verifica que el contenedor esté corriendo
3. Prueba la app de nuevo

---

## 🔍 Verificar que Funcionó

Después del redeploy:

1. Abre la app en producción
2. Presiona `F12` > **Network**
3. Busca una petición a `supabase.co/rest/v1/users`
4. Haz clic en la petición > **Headers** > **Request Headers**
5. Verifica que el header `apikey` tenga el valor correcto (debe coincidir letra por letra con la que usaste en el fetch exitoso)

---

## ⚠️ Si el Header `apikey` Sigue Incorrecto

Si después del redeploy el header `apikey` es distinto o más corto, entonces:

1. **Elimina las variables** en Easypanel
2. **Vuelve a crearlas** (copiando desde Supabase Dashboard)
3. **Marca como "Build-time"**
4. **Redeploy de nuevo**

---

## 📋 Checklist

- [ ] Variables existen en Easypanel
- [ ] Variables están **sin comillas**
- [ ] Variables están como **"Build-time"** (no "Runtime")
- [ ] Redeploy ejecutado con limpieza de caché
- [ ] Build terminado completamente
- [ ] Header `apikey` verificado en Network tab

