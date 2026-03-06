# 🔐 Solución: Error 401 en Edge Function

## ❌ Problema

El error 401 significa que Supabase está rechazando la request porque no tiene autenticación. Las Edge Functions requieren autenticación por defecto.

## ✅ Solución: Configurar Autenticación en Tally

Tally necesita enviar el header `apikey` con tu anon key de Supabase.

### Paso 1: Obtener tu Anon Key

1. Ve a Supabase Dashboard → Settings → API
2. Copia el **"anon" "public"** key
3. Es el mismo que usas en `VITE_SUPABASE_ANON_KEY`

### Paso 2: Configurar en Tally

**Opción A: Si Tally Permite Headers Personalizados**

1. Ve a Tally → Settings → Integrations → Webhook
2. Busca una opción de **"Custom Headers"** o **"Headers"**
3. Agrega:
   - **Header**: `apikey`
   - **Value**: Tu anon key de Supabase (ej: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

**Opción B: Si Tally NO Permite Headers**

Necesitamos hacer que la función sea pública. Esto requiere modificar la función para que no requiera autenticación.

## ✅ Solución Alternativa: Hacer la Función Pública

Si Tally no permite agregar headers, podemos modificar la función para que acepte requests sin autenticación (solo para webhooks).

### Actualizar la Edge Function

He actualizado la función para que maneje requests sin autenticación. Necesitas redesplegarla:

```bash
supabase functions deploy tally-webhook
```

Pero esto puede no ser suficiente. Supabase puede estar rechazando la request antes de que llegue a la función.

## 🔧 Solución Definitiva: Usar Anon Key en la URL

La mejor solución es agregar el anon key como query parameter o en el header. Pero si Tally no lo permite, necesitamos hacer la función pública.

### Configurar Función Pública en Supabase

1. Ve a Supabase Dashboard → Edge Functions → tally-webhook
2. Busca configuración de **"Authentication"** o **"Public Access"**
3. Habilita **"Allow unauthenticated requests"** o similar

O ejecuta este SQL en Supabase:

```sql
-- Hacer la función pública (permite requests sin autenticación)
-- Esto requiere permisos de administrador
ALTER FUNCTION tally-webhook SECURITY DEFINER;
```

Pero esto puede no estar disponible en Supabase Cloud.

## 🎯 Solución Recomendada: Agregar Header en Tally

La mejor solución es que Tally envíe el header `apikey`. Verifica si Tally tiene opción de agregar headers personalizados en la configuración del webhook.

## 📋 Pasos Inmediatos

1. **Verifica si Tally permite headers personalizados**
   - Ve a la configuración del webhook en Tally
   - Busca opción de "Headers" o "Custom Headers"

2. **Si SÍ permite:**
   - Agrega header `apikey` con tu anon key
   - Prueba de nuevo

3. **Si NO permite:**
   - Necesitamos hacer la función pública
   - O usar un método alternativo

¿Tally tiene opción de agregar headers personalizados en la configuración del webhook?
