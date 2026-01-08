# 🏗️ Explicación: Arquitectura Multi-Tenant

## ❓ ¿Cómo Funciona la Base de Datos Compartida?

### 1. **Supabase es Compartido**
- ✅ **Opalopy** y **Opalo ATS** usan la **misma base de datos** de Supabase
- ✅ Ambos usan las **mismas credenciales** (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`)
- ✅ Ambos se conectan **directamente desde el frontend** (no hay backend intermedio)

### 2. **Aislamiento por `app_name`**
- ✅ Cada tabla tiene una columna `app_name`
- ✅ **Opalopy** filtra por `app_name = 'Opalopy'`
- ✅ **Opalo ATS** filtra por `app_name = 'Opalo ATS'`
- ✅ Los datos están **completamente aislados** aunque compartan la BD

### 3. **Backend NO Afecta Supabase**
- ✅ El backend (`Opalo-ATS/backend`) **solo se usa para Google Drive OAuth**
- ✅ El backend **NO se conecta a Supabase**
- ✅ Supabase se conecta **directamente desde el frontend** usando `lib/supabase.ts`

---

## 🔍 ¿Cómo Sabemos que Funciona?

### Evidencia en el Código:

1. **Frontend se conecta directamente a Supabase:**
   ```typescript
   // lib/supabase.ts
   export const supabase = createClient(
       supabaseUrl,
       supabaseAnonKey,
       {...}
   );
   ```

2. **Todas las queries filtran por `app_name`:**
   ```typescript
   // lib/api/users.ts
   .from('users')
   .select('*')
   .eq('app_name', APP_NAME) // ← Filtro por app_name
   ```

3. **Backend solo maneja Google Drive:**
   ```javascript
   // Opalo-ATS/backend/src/routes/auth.js
   // Solo maneja OAuth de Google, NO Supabase
   ```

---

## ⚠️ ¿Por Qué el Error 401?

El error 401 "Invalid API key" puede ser por:

1. **Políticas RLS bloquean el rol `anon`**
   - Las políticas pueden no especificar `TO anon`
   - El rol `anon` necesita acceso explícito

2. **CORS no configurado**
   - Supabase puede estar bloqueando el origen de producción

3. **API Key incorrecta**
   - Aunque verificaste que es igual, puede haber espacios o caracteres ocultos

---

## ✅ Solución Segura

### Paso 1: Verificar Estado Actual (NO DESTRUCTIVO)
Ejecuta `VERIFICAR_ESTADO_ACTUAL_RLS.sql` primero para ver:
- Qué políticas existen
- Qué roles tienen acceso
- Si hay políticas para `anon`

### Paso 2: Crear Políticas Solo Si Faltan
Si las políticas no permiten acceso a `anon`, creamos nuevas políticas **sin eliminar las existentes** (usando nombres únicos).

---

## 🎯 Conclusión

- ✅ **Sí, la BD puede ser afectada por ambos backends** (pero no hay backends para Supabase)
- ✅ **Sí, ambos frontends se conectan a la misma BD**
- ✅ **El aislamiento funciona por `app_name`**
- ✅ **Las políticas RLS deben permitir acceso al rol `anon`**
