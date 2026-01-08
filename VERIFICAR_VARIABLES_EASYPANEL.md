# ✅ Verificar Variables en EasyPanel - Guía Visual

## 🎯 Objetivo

Verificar que las variables de entorno estén correctamente configuradas en EasyPanel.

---

## 📋 Paso 1: Ubicación de Variables

1. Abre EasyPanel
2. Selecciona el servicio del **frontend de Opalo ATS**
3. Busca una de estas secciones:
   - **"Environment Variables"**
   - **"Variables de Entorno"**
   - **"Env Vars"**
   - **"Configuration"** → **"Environment Variables"**
   - **"Settings"** → **"Environment Variables"**

---

## 📋 Paso 2: Verificar Variables Existentes

Debes ver estas variables:

### ✅ Variable 1: VITE_SUPABASE_URL

- **Nombre**: `VITE_SUPABASE_URL`
- **Valor**: `https://afhiiplxqtodqxvmswor.supabase.co`
- **Tipo/Scope**: Debe decir "Build-time" o "Build & Runtime" (si hay opción)

### ✅ Variable 2: VITE_SUPABASE_ANON_KEY

- **Nombre**: `VITE_SUPABASE_ANON_KEY`
- **Valor**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU`
- **Tipo/Scope**: Debe decir "Build-time" o "Build & Runtime" (si hay opción)

### ✅ Variable 3: VITE_API_URL

- **Nombre**: `VITE_API_URL`
- **Valor**: `https://opalo-atsopalo-backend.bouasv.easypanel.host`
- **Tipo/Scope**: Debe decir "Build-time" o "Build & Runtime" (si hay opción)

---

## 📋 Paso 3: Si las Variables NO Existen

### Crear VITE_SUPABASE_URL

1. Haz clic en **"Add Variable"** o **"Agregar Variable"**
2. **Nombre**: `VITE_SUPABASE_URL`
3. **Valor**: `https://afhiiplxqtodqxvmswor.supabase.co`
4. Si hay opción de **"Scope"** o **"Type"**, selecciona **"Build-time"** o **"Build & Runtime"**
5. Haz clic en **"Save"** o **"Guardar"**

### Crear VITE_SUPABASE_ANON_KEY

1. Haz clic en **"Add Variable"** o **"Agregar Variable"**
2. **Nombre**: `VITE_SUPABASE_ANON_KEY`
3. **Valor**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU`
4. Si hay opción de **"Scope"** o **"Type"**, selecciona **"Build-time"** o **"Build & Runtime"**
5. Haz clic en **"Save"** o **"Guardar"**

---

## 📋 Paso 4: Si las Variables Existen pero NO Funcionan

### Opción A: Editar Variables Existentes

1. Haz clic en el **lápiz** o **"Edit"** junto a cada variable
2. Verifica que el valor sea exactamente el correcto (sin espacios extra)
3. Si hay opción de **"Scope"**, cambia a **"Build-time"** o **"Build & Runtime"**
4. Guarda los cambios

### Opción B: Eliminar y Recrear

1. **Elimina** las variables existentes
2. **Crea de nuevo** siguiendo el Paso 3
3. **Asegúrate** de marcar como "Build-time" si hay opción

---

## 📋 Paso 5: REBUILD Obligatorio

**Después de crear/modificar las variables**:

1. Ve a **"Deployments"** o **"Despliegues"**
2. Haz clic en **"Redeploy"** o **"Rebuild"**
3. Espera a que termine el build completamente
4. Verifica que no haya errores en los logs

---

## 🔍 Verificación Final

### En EasyPanel

- [ ] Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` existen
- [ ] Valores son correctos (sin espacios)
- [ ] Variables marcadas como "Build-time" (si hay opción)
- [ ] Rebuild ejecutado

### En el Navegador

1. Abre la app en producción
2. Abre consola (F12)
3. Verifica que NO haya errores 401
4. Deberías ver datos cargándose de Supabase

---

## 🐛 Si EasyPanel No Tiene Opción "Build-time"

Algunos paneles no tienen esta opción explícita. En ese caso:

1. **Asegúrate** de que las variables existan
2. **Verifica** que los valores sean correctos
3. **Haz rebuild** después de cualquier cambio
4. Si aún no funciona, puede ser que EasyPanel inyecte automáticamente las variables `VITE_*` durante el build

---

## 📝 Nota

Si después de seguir estos pasos aún no funciona, puede ser un problema específico de cómo EasyPanel maneja las variables. En ese caso, comparte:
1. Una captura de pantalla de las variables en EasyPanel
2. Los logs del build
3. Los errores exactos de la consola del navegador

