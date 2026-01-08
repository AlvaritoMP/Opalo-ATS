# 🔐 Verificar Clave Anon Key en Supabase

## 🎯 Objetivo

Verificar que la clave anon key que estás usando en EasyPanel sea la correcta.

---

## ✅ Pasos para Verificar

### Paso 1: Ir a Supabase Dashboard

1. Abre: https://supabase.com/dashboard
2. Inicia sesión
3. Selecciona tu proyecto

### Paso 2: Obtener la Clave Anon Key

1. Ve a **Settings** (⚙️) en el menú lateral
2. Haz clic en **"API"**
3. Busca la sección **"Project API keys"**
4. Busca la clave **"anon"** o **"anon public"**
5. Haz clic en el icono de **ojo** 👁️ para revelarla
6. Copia la clave completa

### Paso 3: Comparar con EasyPanel

1. Ve a EasyPanel
2. Ve a las variables de entorno del frontend
3. Compara `VITE_SUPABASE_ANON_KEY` con la clave que copiaste de Supabase
4. **Deben ser exactamente iguales** (sin espacios, sin saltos de línea)

---

## 🔧 Si la Clave es Diferente

Si la clave en Supabase es diferente a la que tienes en EasyPanel:

1. **Actualiza** `VITE_SUPABASE_ANON_KEY` en EasyPanel con la clave correcta
2. **Guarda** los cambios
3. **Haz REBUILD** del frontend
4. **Prueba** de nuevo

---

## 📝 Clave Actual que Deberías Tener

La clave que deberías tener es:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU
```

**Verifica** que esta sea la misma que aparece en Supabase Dashboard → Settings → API → anon key.

---

## 🐛 Si la Clave es Correcta pero Sigue Fallando

Si la clave es correcta pero sigue dando 401, el problema puede ser:

1. **RLS bloqueando**: Aunque ejecutamos el script, puede haber un problema
2. **Variables no en el build**: EasyPanel no está inyectando las variables
3. **CORS**: Problema de configuración en Supabase

---

## ✅ Verificación Rápida

En la consola del navegador, ejecuta:

```javascript
// Verificar si las variables están disponibles
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log('Key length:', import.meta.env.VITE_SUPABASE_ANON_KEY?.length);
```

**Resultado esperado**:
- `URL: https://afhiiplxqtodqxvmswor.supabase.co`
- `Key exists: true`
- `Key length: 200+` (la clave es larga)

Si muestra `undefined` o `""`, las variables NO están en el build.

