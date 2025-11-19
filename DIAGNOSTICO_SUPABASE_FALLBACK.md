# 🔍 Diagnóstico: App Usa Datos de Ejemplo en Lugar de Supabase

## 🔴 Problema

Las variables de Supabase están configuradas, pero la app está usando datos de ejemplo. Esto significa que las llamadas a Supabase están fallando.

## ✅ Diagnóstico

### Paso 1: Verificar en la Consola del Navegador

1. Abre tu app: `https://opalo-atsalfaoro.bouasv.easypanel.host`
2. Abre la consola del navegador (F12 → Console)
3. Busca estos mensajes:

**Si las llamadas a Supabase están fallando:**
```
Loading data from Supabase...
⚠ Failed to load processes from Supabase, using fallback: [error]
⚠ Failed to load candidates from Supabase, using fallback: [error]
⚠ Failed to load users from Supabase, using fallback: [error]
```

**Si las llamadas están funcionando:**
```
Loading data from Supabase...
✓ Loaded processes from Supabase
✓ Loaded candidates from Supabase
✓ Loaded users from Supabase
✓ Data loaded successfully
```

### Paso 2: Verificar Errores Específicos

En la consola, busca errores como:
- `Failed to fetch`
- `NetworkError`
- `CORS error`
- `401 Unauthorized`
- `403 Forbidden`
- `Timeout`

### Paso 3: Verificar Variables en el Build

Las variables `VITE_*` deben estar disponibles en tiempo de build. Para verificar:

1. Abre la consola del navegador
2. Escribe: `console.log(import.meta.env.VITE_SUPABASE_URL)`
3. Deberías ver: `https://afhiiplxqtodqxvmswor.supabase.co`

Si ves `undefined`, las variables no están en el build.

### Paso 4: Verificar Conexión a Supabase

1. Abre la consola del navegador
2. Ve a la pestaña **"Network"** (Red)
3. Recarga la página
4. Busca peticiones a `supabase.co`
5. Verifica si hay errores (códigos 401, 403, 500, etc.)

---

## 🔍 Posibles Causas

### 1. Timeout (5 segundos)
- **Causa**: Las llamadas a Supabase están tardando más de 5 segundos
- **Solución**: Verifica la conexión a internet o si Supabase está disponible

### 2. Error de CORS
- **Causa**: Problemas de CORS con Supabase
- **Solución**: Verifica que la URL de Supabase sea correcta

### 3. Políticas RLS (Row Level Security)
- **Causa**: Las políticas RLS de Supabase están bloqueando las consultas
- **Solución**: Verifica las políticas RLS en Supabase

### 4. Variables No en el Build
- **Causa**: Las variables no se inyectaron en el build
- **Solución**: Haz rebuild del frontend

### 5. Error de Autenticación
- **Causa**: La clave anónima de Supabase es incorrecta o expiró
- **Solución**: Verifica que `VITE_SUPABASE_ANON_KEY` sea correcta

---

## 🆘 Próximos Pasos

1. **Abre la consola del navegador** (F12)
2. **Comparte los mensajes** que ves:
   - ¿Ves "Loading data from Supabase..."?
   - ¿Ves "Failed to load ... from Supabase"?
   - ¿Qué errores específicos aparecen?

3. **Verifica la pestaña Network**:
   - ¿Hay peticiones a `supabase.co`?
   - ¿Qué códigos de estado tienen? (200, 401, 403, 500, etc.)

4. **Prueba en la consola**:
   ```javascript
   console.log(import.meta.env.VITE_SUPABASE_URL)
   console.log(import.meta.env.VITE_SUPABASE_ANON_KEY)
   ```

---

## 📝 Nota

El código tiene un timeout de 5 segundos y un sistema de fallback. Si las llamadas a Supabase fallan o tardan más de 5 segundos, automáticamente usa datos de ejemplo. Esto es para que la app siempre funcione, pero significa que necesitamos ver los errores específicos para solucionarlo.

