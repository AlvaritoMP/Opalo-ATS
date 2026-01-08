# 📋 Pasos Exactos para Corregir Variables en EasyPanel

## 🎯 Problema

Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` NO están en el código compilado, por eso da error 401.

---

## ✅ Solución Paso a Paso

### Paso 1: Ir a EasyPanel

1. Abre EasyPanel en tu navegador
2. Ve a tu proyecto/servidor
3. Selecciona el servicio del **frontend de Opalo ATS**

### Paso 2: Ir a Variables de Entorno

Busca una de estas opciones:
- **"Environment Variables"**
- **"Variables de Entorno"**
- **"Env Vars"**
- **"Configuration"** → **"Environment Variables"**
- **"Settings"** → **"Environment Variables"**

### Paso 3: Eliminar Variables Existentes (Si Existen)

1. Busca `VITE_SUPABASE_URL`
2. Si existe, haz clic en el **icono de eliminar** (🗑️ o X) y confirma
3. Busca `VITE_SUPABASE_ANON_KEY`
4. Si existe, elimínala también
5. Busca `VITE_API_URL`
6. Si existe, elimínala también

### Paso 4: Crear Variable 1: VITE_SUPABASE_URL

1. Haz clic en **"Add Variable"** o **"Agregar Variable"** o **"+"**
2. En **"Name"** o **"Nombre"**: escribe exactamente:
   ```
   VITE_SUPABASE_URL
   ```
3. En **"Value"** o **"Valor"**: copia y pega exactamente (sin espacios):
   ```
   https://afhiiplxqtodqxvmswor.supabase.co
   ```
4. Si hay una opción de **"Scope"**, **"Type"**, o **"Build-time"**, selecciónala
5. Haz clic en **"Save"** o **"Guardar"**

### Paso 5: Crear Variable 2: VITE_SUPABASE_ANON_KEY

1. Haz clic en **"Add Variable"** de nuevo
2. En **"Name"**: escribe exactamente:
   ```
   VITE_SUPABASE_ANON_KEY
   ```
3. En **"Value"**: copia y pega exactamente (sin espacios, toda la línea):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU
   ```
4. Si hay opción de **"Scope"** o **"Build-time"**, selecciónala
5. Haz clic en **"Save"**

### Paso 6: Crear Variable 3: VITE_API_URL

1. Haz clic en **"Add Variable"** de nuevo
2. En **"Name"**: escribe exactamente:
   ```
   VITE_API_URL
   ```
3. En **"Value"**: escribe:
   ```
   https://opalo-atsopalo-backend.bouasv.easypanel.host
   ```
4. Si hay opción de **"Scope"** o **"Build-time"**, selecciónala
5. Haz clic en **"Save"**

### Paso 7: REBUILD OBLIGATORIO ⚠️

**MUY IMPORTANTE**: Después de crear las variables:

1. Ve a la sección **"Deployments"** o **"Despliegues"** o **"Deploy"**
2. Busca el botón **"Redeploy"** o **"Rebuild"** o **"Deploy"**
3. Haz clic en él
4. **Espera a que termine completamente** el build (puede tardar varios minutos)
5. Verifica que no haya errores en los logs

---

## 🔍 Verificación

### Después del Rebuild:

1. Abre la app en producción
2. Abre la consola del navegador (F12)
3. Ve a **Console**
4. **NO deberías ver** errores 401
5. Deberías ver: `✓ Loaded users from Supabase`

---

## 🐛 Si EasyPanel No Tiene Opción "Build-time"

Algunos paneles no tienen esta opción explícita. En ese caso:

1. **Asegúrate** de que las variables existan
2. **Verifica** que los valores sean correctos (sin espacios)
3. **Haz rebuild** después de crear las variables
4. EasyPanel debería inyectar automáticamente las variables `VITE_*` durante el build

---

## 📝 Valores Exactos para Copiar

### VITE_SUPABASE_URL
```
https://afhiiplxqtodqxvmswor.supabase.co
```

### VITE_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU
```

### VITE_API_URL
```
https://opalo-atsopalo-backend.bouasv.easypanel.host
```

---

## ✅ Checklist Final

- [ ] Variables eliminadas (si existían)
- [ ] `VITE_SUPABASE_URL` creada con valor correcto
- [ ] `VITE_SUPABASE_ANON_KEY` creada con valor correcto
- [ ] `VITE_API_URL` creada con valor correcto
- [ ] Variables guardadas
- [ ] **REBUILD ejecutado**
- [ ] Build completado sin errores
- [ ] App funciona sin errores 401

---

## 🎯 Resumen

**El problema**: Las variables no están en el build compilado.

**La solución**: 
1. Eliminar y recrear las variables
2. **REBUILD obligatorio**

**Por qué funciona**: Al recrear las variables y hacer rebuild, Vite las inyectará durante el build y quedarán en el código compilado.

