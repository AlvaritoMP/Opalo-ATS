# 🌐 Configurar CORS en Supabase para Producción

## 🎯 Objetivo

Configurar Supabase para permitir requests desde tu dominio de producción.

---

## ✅ Pasos en Supabase Dashboard

### Paso 1: Ir a Settings

1. Ve a Supabase Dashboard: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Haz clic en **Settings** (⚙️) en el menú lateral

### Paso 2: Ir a API Settings

1. En Settings, busca **"API"** o haz clic en **"API"** en el menú
2. Esto te mostrará la configuración de la API

### Paso 3: Configurar Site URL

1. Busca el campo **"Site URL"**
2. Actualiza o agrega tu URL de producción:
   ```
   https://opalo-atsopalo.bouasv.easypanel.host
   ```
3. Haz clic en **"Save"** o **"Guardar"**

### Paso 4: Configurar Additional Redirect URLs (Si Existe)

1. Busca **"Additional Redirect URLs"** o **"Redirect URLs"**
2. Agrega tu URL de producción:
   ```
   https://opalo-atsopalo.bouasv.easypanel.host
   ```
3. Haz clic en **"Save"**

### Paso 5: Buscar Configuración de CORS (Si Está Disponible)

Algunos proyectos de Supabase tienen una sección específica para CORS:

1. Busca **"CORS"** o **"Allowed Origins"** en Settings
2. Si existe, agrega tu URL de producción
3. Guarda los cambios

---

## 🔍 Ubicaciones Posibles en Supabase

La configuración puede estar en:

1. **Settings → API → Site URL**
2. **Settings → API → Additional Redirect URLs**
3. **Settings → Authentication → Site URL**
4. **Settings → Security → CORS**
5. **Project Settings → API → CORS**

---

## 📝 URL a Agregar

Agrega exactamente esta URL (sin `/` al final):
```
https://opalo-atsopalo.bouasv.easypanel.host
```

Si tienes un dominio personalizado, agrega:
```
https://tu-dominio.com
https://www.tu-dominio.com
```

---

## ✅ Verificación

Después de configurar:

1. Espera unos minutos para que los cambios se propaguen
2. Recarga la app en producción
3. Abre DevTools → Network
4. Haz clic en un request a Supabase
5. Ve a Headers → Response Headers
6. Busca `Access-Control-Allow-Origin`
7. Debería tener tu URL de producción

---

## 🐛 Si No Encuentras la Opción de CORS

Si no encuentras una opción específica de CORS:

1. **Site URL** es la más importante - configúrala
2. Supabase puede permitir automáticamente el dominio si está en Site URL
3. Si aún no funciona, puede ser necesario contactar a soporte de Supabase

---

## 📋 Checklist

- [ ] Site URL configurada con URL de producción
- [ ] Additional Redirect URLs configurada (si existe)
- [ ] CORS configurado (si está disponible)
- [ ] Cambios guardados
- [ ] Esperado unos minutos para propagación
- [ ] Probado de nuevo en producción

---

## 🎯 Resumen

**Problema**: Supabase bloquea requests desde el dominio de producción por CORS.

**Solución**: 
1. Agrega la URL de producción en Supabase Dashboard → Settings → API → Site URL
2. Espera unos minutos
3. Prueba de nuevo

