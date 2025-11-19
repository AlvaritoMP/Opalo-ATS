# 🔍 Verificar Variables de Entorno de Supabase

## 📋 Variables Necesarias

En Easypanel, en tu app **frontend**, debes tener estas variables:

### Obligatorias para Supabase:
```env
VITE_SUPABASE_URL=https://afhiiplxqtodqxvmswor.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU
```

### Para Google Drive (opcional):
```env
VITE_API_URL=https://opalo-ats-backend.bouasv.easypanel.host
```

## ✅ Verificación

### Paso 1: Verificar Variables en Easypanel

1. Ve a tu app **frontend** en Easypanel
2. Ve a **"Environment Variables"**
3. Verifica que tengas:
   - ✅ `VITE_SUPABASE_URL`
   - ✅ `VITE_SUPABASE_ANON_KEY`
   - ✅ `VITE_API_URL` (para Google Drive)

### Paso 2: Verificar en la Consola del Navegador

1. Abre tu app: `https://opalo-atsalfaoro.bouasv.easypanel.host`
2. Abre la consola (F12 → Console)
3. Busca estos mensajes:

**Si las variables están bien:**
```
Loading data from Supabase...
✓ Loaded processes from Supabase
✓ Loaded candidates from Supabase
✓ Loaded users from Supabase
✓ Data loaded successfully
```

**Si hay problemas:**
```
Loading data from Supabase...
⚠ Failed to load processes from Supabase, using fallback: [error]
⚠ Failed to load candidates from Supabase, using fallback: [error]
```

### Paso 3: Verificar que las Variables Estén en el Build

Las variables `VITE_*` deben estar disponibles en tiempo de build. Si las agregaste después del último build, **debes hacer rebuild**.

### Paso 4: Rebuild del Frontend

1. En Easypanel, ve a tu app **frontend**
2. Haz clic en **"Redeploy"** o **"Rebuild"**
3. Espera a que termine
4. Prueba de nuevo

---

## 🔍 Sobre VITE_API_URL

`VITE_API_URL` **NO afecta** la carga de datos de Supabase. Solo se usa para:
- Conectar con Google Drive OAuth
- Llamadas al backend de Google Drive

Si ves redirecciones relacionadas con el backend, es porque:
- Estás intentando conectar Google Drive
- O hay algún error en el código de Google Drive

Pero **NO debería** afectar la carga inicial de datos de Supabase.

---

## 🆘 Si Sigue Sin Funcionar

1. **Abre la consola del navegador** (F12)
2. **Comparte los mensajes** que ves:
   - ¿Ves "Loading data from Supabase..."?
   - ¿Ves "Failed to load ... from Supabase"?
   - ¿Qué errores aparecen?

3. **Verifica las variables de entorno** en Easypanel
4. **Haz rebuild** del frontend

---

## 📝 Nota

El código tiene un timeout de 5 segundos para las llamadas a Supabase. Si fallan o tardan más, usa datos de ejemplo. Esto es normal si:
- Las variables no están configuradas
- No se hizo rebuild después de agregarlas
- Hay problemas de conexión a Supabase

