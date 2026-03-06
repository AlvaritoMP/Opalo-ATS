# 🔐 Solución Final: Error 401 en Edge Function

## ❌ Problema

El error 401 persiste porque Supabase está rechazando la request antes de que llegue al código de la función. Las Edge Functions de Supabase requieren autenticación a nivel de infraestructura.

## ✅ Solución: Agregar Anon Key en la URL

Si Tally no puede enviar headers personalizados, podemos agregar el anon key en la URL como query parameter.

### Paso 1: Actualizar la URL en Supabase

Ejecuta este SQL en Supabase SQL Editor:

```sql
UPDATE form_integrations
SET webhook_url = 'https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook/cdcb452f-ca43-482c-90d8-f9eb8d08dcc1?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU'
WHERE webhook_url LIKE '%supabase.co%';
```

### Paso 2: Actualizar la URL en Tally

1. Ve a Tally → Settings → Integrations → Webhook
2. Actualiza la URL del webhook a:
   ```
   https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook/cdcb452f-ca43-482c-90d8-f9eb8d08dcc1?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU
   ```
3. Guarda los cambios

### Paso 3: Probar

1. Envía un formulario de prueba desde Tally
2. Verifica en Supabase que se creó el candidato

## 🔍 Si el 401 Persiste

Si el 401 persiste después de agregar el anon key en la URL, entonces Supabase no está aceptando el apikey de la URL. En ese caso:

### Opción A: Verificar si Tally Permite Headers

1. Ve a Tally → Settings → Integrations → Webhook
2. Busca opción de "Headers", "Custom Headers", o "Additional Headers"
3. Si existe, agrega:
   - Header Name: `apikey`
   - Header Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU`

### Opción B: Usar Servicio Intermedio

Si Tally no puede enviar headers y Supabase no acepta el apikey en la URL, necesitamos un servicio intermedio que:
1. Reciba el webhook de Tally (sin autenticación)
2. Agregue el header `apikey`
3. Reenvíe la request a Supabase

Esto requiere un servidor adicional (como el backend en Easypanel que ya tienes).

## 📋 Pasos Inmediatos

1. **Ejecuta el SQL** para actualizar la URL en Supabase
2. **Actualiza la URL en Tally** con el anon key como query parameter
3. **Prueba** enviando un formulario
4. **Verifica** en Supabase si se creó el candidato

Si el 401 persiste, avísame y exploramos otras opciones.
