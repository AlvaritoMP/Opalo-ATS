# 🔐 Resolver Error 401 - Paso a Paso

## ✅ Paso 1: Actualizar URL en Supabase

Ejecuta este SQL en **Supabase SQL Editor**:

```sql
UPDATE form_integrations
SET webhook_url = 'https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook/cdcb452f-ca43-482c-90d8-f9eb8d08dcc1?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU'
WHERE webhook_url LIKE '%supabase.co%';

-- Verificar que se actualizó
SELECT 
    id,
    form_name,
    webhook_url
FROM form_integrations 
ORDER BY created_at DESC 
LIMIT 1;
```

## ✅ Paso 2: Actualizar URL en Tally

1. Ve a **Tally** → Settings → Integrations → Webhook
2. Actualiza la URL del webhook a:
   ```
   https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook/cdcb452f-ca43-482c-90d8-f9eb8d08dcc1?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU
   ```
3. **Guarda** los cambios

## ✅ Paso 3: Probar

1. Envía un formulario de prueba desde Tally
2. Verifica en Supabase si se creó el candidato

## ❌ Si el 401 Persiste

Si el 401 persiste después de agregar el apikey en la URL, significa que Supabase no está leyendo el apikey de la URL automáticamente. En ese caso:

### Opción A: Verificar si Tally Permite Headers

1. Ve a Tally → Settings → Integrations → Webhook
2. Busca opción de **"Headers"**, **"Custom Headers"**, o **"Additional Headers"**
3. Si existe, agrega:
   - **Header Name**: `apikey`
   - **Header Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU`

### Opción B: Usar Backend de Easypanel como Intermediario

Si Tally no permite headers, podemos usar el backend de Easypanel que ya tienes como intermediario:
- Tally → Backend Easypanel (sin autenticación) → Supabase Edge Function (con apikey)

## 📋 Checklist

- [ ] SQL ejecutado en Supabase
- [ ] URL actualizada en Tally
- [ ] Formulario de prueba enviado
- [ ] Verificado en Supabase si se creó el candidato
- [ ] Si 401 persiste, verificar si Tally permite headers
