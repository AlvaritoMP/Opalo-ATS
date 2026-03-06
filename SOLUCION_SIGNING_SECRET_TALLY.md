# 🔐 Solución: Signing Secret de Tally + Autenticación Supabase

## ❌ Problema

El **signing secret** de Tally verifica que el webhook viene de Tally, pero **NO resuelve el error 401 de Supabase**. Supabase Edge Functions requieren el header `apikey` para autenticarse.

## ✅ Solución: Dos Pasos

### Paso 1: Configurar Signing Secret (Opcional pero Recomendado)

El signing secret verifica que el webhook viene realmente de Tally:

1. **En Tally**: Configura el signing secret en la configuración del webhook
2. **En Supabase**: Guarda el secret como variable de entorno de la Edge Function

```bash
supabase secrets set TALLY_WEBHOOK_SECRET=tu-signing-secret-aqui
```

3. **En la Edge Function**: Verifica la firma del webhook (esto lo agregaremos después)

### Paso 2: Resolver el 401 de Supabase (REQUERIDO)

El problema del 401 es que Supabase rechaza la request antes de llegar al código. Necesitas **una de estas opciones**:

#### Opción A: Agregar Header `apikey` en Tally (MEJOR)

1. Ve a Tally → Settings → Integrations → Webhook
2. Busca opción de **"Headers"**, **"Custom Headers"**, o **"Additional Headers"**
3. Agrega:
   - **Header Name**: `apikey`
   - **Header Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU`

#### Opción B: Agregar Anon Key en la URL (Si Tally NO permite headers)

1. **Actualiza la URL en Supabase**:
   ```sql
   UPDATE form_integrations
   SET webhook_url = 'https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook/cdcb452f-ca43-482c-90d8-f9eb8d08dcc1?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU'
   WHERE webhook_url LIKE '%supabase.co%';
   ```

2. **Actualiza la URL en Tally** con el mismo valor (incluyendo el `?apikey=...`)

## 🔍 Verificar en Tally

**¿Tally tiene opción de agregar headers personalizados además del signing secret?**

Busca en la configuración del webhook:
- "Headers"
- "Custom Headers"
- "Additional Headers"
- "Request Headers"
- "HTTP Headers"

Si **SÍ tiene**: Usa la Opción A (agregar header `apikey`)
Si **NO tiene**: Usa la Opción B (anon key en la URL)

## 📋 Pasos Inmediatos

1. **Verifica si Tally permite headers personalizados**
2. **Si SÍ**: Agrega el header `apikey` con tu anon key
3. **Si NO**: Ejecuta el SQL y actualiza la URL en Tally con el `?apikey=...`
4. **Prueba** enviando un formulario
5. **Verifica** en Supabase si se creó el candidato

¿Tally tiene opción de agregar headers personalizados además del signing secret?
