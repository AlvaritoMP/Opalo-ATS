# 🔐 Solución: Error 401 - Agregar Header en Tally

## ❌ Problema

El error 401 significa que Supabase está rechazando la request porque no tiene el header de autenticación.

## ✅ Solución: Agregar Header `apikey` en Tally

### Paso 1: Obtener tu Anon Key

1. Ve a Supabase Dashboard → Settings → API
2. Copia el **"anon" "public"** key
3. Es el mismo que usas en `VITE_SUPABASE_ANON_KEY`

### Paso 2: Configurar en Tally

1. Ve a Tally → Settings → Integrations → Webhook
2. Busca una opción de **"Headers"** o **"Custom Headers"** o **"Additional Headers"**
3. Agrega un header:
   - **Name**: `apikey`
   - **Value**: Tu anon key de Supabase

**Ejemplo:**
```
Header Name: apikey
Header Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU
```

### Paso 3: Guardar y Probar

1. Guarda los cambios en Tally
2. Envía un formulario de prueba
3. Verifica en Supabase que se creó el candidato

## 🔍 Si Tally NO Permite Headers

Si Tally no tiene opción de agregar headers personalizados, necesitamos usar el anon key en la URL como query parameter.

### Opción Alternativa: Anon Key en la URL

Actualiza la URL del webhook en Supabase para incluir el anon key:

```sql
UPDATE form_integrations
SET webhook_url = 'https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook/cdcb452f-ca43-482c-90d8-f9eb8d08dcc1?apikey=TU_ANON_KEY_AQUI'
WHERE webhook_url LIKE '%supabase.co%';
```

Y actualiza la Edge Function para leer el apikey de la URL.

Pero la mejor solución es agregar el header en Tally si es posible.

## 📋 Verificar en Tally

Busca en la configuración del webhook:
- "Headers"
- "Custom Headers"
- "Additional Headers"
- "Request Headers"
- "HTTP Headers"

Cualquiera de estas opciones te permitirá agregar el header `apikey`.
