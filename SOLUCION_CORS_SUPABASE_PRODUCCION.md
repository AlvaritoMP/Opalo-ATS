# 🌐 Solución: CORS o Configuración de Supabase en Producción

## ✅ Diagnóstico

- ✅ Funciona en localhost
- ❌ No funciona en producción
- ✅ Mismas credenciales
- ✅ Mismo código

**Conclusión**: El problema es específico de producción, probablemente **CORS** o configuración de Supabase.

---

## 🔍 Verificar CORS en Supabase

### Paso 1: Ir a Configuración de Supabase

1. Ve a Supabase Dashboard: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** (⚙️)
4. Busca **"API"** o **"CORS"** o **"Security"**

### Paso 2: Verificar Orígenes Permitidos

Busca una sección que diga:
- **"Allowed Origins"**
- **"CORS Origins"**
- **"Site URL"**
- **"Additional Redirect URLs"**

### Paso 3: Agregar URL de Producción

Agrega la URL de tu app en producción:
```
https://opalo-atsopalo.bouasv.easypanel.host
```

O si tienes un dominio personalizado:
```
https://tu-dominio.com
```

**⚠️ IMPORTANTE**: 
- No agregues `/` al final
- Agrega `https://` al inicio
- Si tienes `www`, agrega ambas versiones (con y sin www)

---

## 🔍 Verificar Site URL en Supabase

1. En Supabase Dashboard → Settings → API
2. Busca **"Site URL"** o **"URL Configuration"**
3. Verifica que esté configurada correctamente
4. Puede ser que necesites agregar tu URL de producción aquí también

---

## 🐛 Verificar en Network Tab

En producción, en Network tab:

1. Haz clic en un request a Supabase que falle
2. Ve a la pestaña **Headers**
3. Busca el header **`Origin`**
4. Verifica que el valor sea tu URL de producción
5. Ve a **Response Headers**
6. Busca **`Access-Control-Allow-Origin`**
7. Si está vacío o es diferente a tu URL → Problema de CORS

---

## 🔧 Solución: Agregar URL en Supabase

### Opción 1: Site URL

1. Ve a Supabase Dashboard → Settings → API
2. Busca **"Site URL"**
3. Agrega o actualiza con tu URL de producción:
   ```
   https://opalo-atsopalo.bouasv.easypanel.host
   ```

### Opción 2: CORS Origins (si está disponible)

1. Busca **"CORS Origins"** o **"Allowed Origins"**
2. Agrega tu URL de producción
3. Guarda los cambios

### Opción 3: Additional Redirect URLs

1. Busca **"Additional Redirect URLs"** o **"Redirect URLs"**
2. Agrega tu URL de producción
3. Guarda los cambios

---

## 🔍 Verificar Diferencias entre Localhost y Producción

### En Localhost:
- URL: `http://localhost:3001`
- Supabase permite localhost por defecto
- CORS no es un problema

### En Producción:
- URL: `https://opalo-atsopalo.bouasv.easypanel.host`
- Supabase NO permite este dominio por defecto
- CORS bloquea las requests

---

## 📋 Checklist

- [ ] URL de producción agregada en Supabase (Site URL o CORS)
- [ ] Verificado header `Origin` en Network tab
- [ ] Verificado header `Access-Control-Allow-Origin` en Response
- [ ] Probado de nuevo en producción

---

## 🎯 Resumen

**Problema**: Supabase está bloqueando requests desde el dominio de producción por CORS.

**Solución**: 
1. Agrega la URL de producción en Supabase Dashboard
2. Configura CORS o Site URL
3. Prueba de nuevo

---

## 💡 Nota

Supabase permite `localhost` por defecto, pero los dominios de producción deben agregarse manualmente en la configuración.

