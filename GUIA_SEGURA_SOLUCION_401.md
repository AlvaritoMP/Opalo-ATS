# 🔐 Guía Segura: Solución Error 401

## ⚠️ Importante: No Ejecutar Scripts Destructivos

Tienes razón en ser cauteloso. Vamos a verificar primero antes de hacer cambios.

---

## 📋 Paso 1: Verificar Estado Actual (NO DESTRUCTIVO)

### Ejecuta `VERIFICAR_ESTADO_ACTUAL_RLS.sql`

Este script **NO modifica nada**, solo muestra:
- Qué políticas RLS existen
- Qué roles tienen acceso
- Si hay políticas para el rol `anon`
- Cuántos datos hay de cada app

**Resultado esperado:**
- Verás todas las políticas existentes
- Podrás identificar si faltan políticas para `anon`

---

## 🔍 Paso 2: Entender la Arquitectura

### ¿Cómo Funciona?

1. **Supabase es Compartido:**
   - ✅ Opalopy y Opalo ATS usan la **misma base de datos**
   - ✅ Ambos usan las **mismas credenciales** (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`)
   - ✅ Ambos se conectan **directamente desde el frontend**

2. **Aislamiento por `app_name`:**
   - ✅ Cada tabla tiene columna `app_name`
   - ✅ Opalopy filtra por `app_name = 'Opalopy'`
   - ✅ Opalo ATS filtra por `app_name = 'Opalo ATS'`

3. **Backend NO Afecta Supabase:**
   - ✅ El backend solo se usa para Google Drive OAuth
   - ✅ El backend NO se conecta a Supabase
   - ✅ Supabase se conecta desde el frontend usando `lib/supabase.ts`

### Evidencia en el Código:

```typescript
// lib/supabase.ts - Frontend se conecta directamente
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// lib/api/users.ts - Filtra por app_name
.eq('app_name', APP_NAME) // ← Aislamiento
```

---

## ✅ Paso 3: Solución Segura (Solo Si Faltan Políticas)

### Si el Paso 1 muestra que faltan políticas para `anon`:

Ejecuta `CREAR_POLITICAS_SOLO_ANON_SEGURO.sql`

**Este script:**
- ✅ **NO elimina** políticas existentes
- ✅ Solo **crea nuevas** políticas si no existen
- ✅ Usa `DO $$ BEGIN ... END $$` para verificar antes de crear
- ✅ Especifica `TO anon` explícitamente

**Nombres únicos:**
- Las nuevas políticas tienen nombres únicos (`anon_*_opalo_ats_*`)
- No conflictan con políticas existentes de Opalopy

---

## 🎯 Paso 4: Verificar Resultado

Después de ejecutar el script seguro:

1. Prueba la app en producción
2. Debería funcionar sin afectar Opalopy

---

## 📊 Resumen

| Paso | Script | Destructivo? | Descripción |
|------|--------|--------------|-------------|
| 1 | `VERIFICAR_ESTADO_ACTUAL_RLS.sql` | ❌ NO | Solo lectura, muestra estado actual |
| 2 | `CREAR_POLITICAS_SOLO_ANON_SEGURO.sql` | ❌ NO | Solo crea si no existen, no elimina nada |
| 3 | Probar app | - | Verificar que funciona |

---

## ⚠️ Si Aún No Funciona

Si después de estos pasos sigue el error 401:

1. **Verificar API Key:**
   - Copiar desde Supabase Dashboard
   - Pegar en EasyPanel (sin espacios)
   - Reconstruir la app

2. **Verificar CORS:**
   - Site URL: `https://opalo-atsopalo.bouasv.easypanel.host`
   - Redirect URLs: `https://opalo-atsopalo.bouasv.easypanel.host/**`

3. **Verificar Headers en Network Tab:**
   - Debe incluir `apikey: [tu-anon-key]`
   - Debe incluir `Origin: https://opalo-atsopalo.bouasv.easypanel.host`

---

## 🎯 Conclusión

- ✅ **Sí, la BD puede ser afectada** (pero solo por cambios en políticas RLS)
- ✅ **Sí, ambos frontends se conectan a la misma BD**
- ✅ **El aislamiento funciona por `app_name`**
- ✅ **Las políticas RLS deben permitir acceso al rol `anon`**
- ✅ **El script seguro NO elimina nada, solo agrega si falta**

