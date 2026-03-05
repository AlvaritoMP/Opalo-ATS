# 🚀 Configurar Edge Function de Supabase para Webhooks de Tally

## ✅ Ventajas de Usar Edge Function

- ✅ **Más confiable**: No depende de proxies o reverse proxies
- ✅ **Más simple**: Todo en un solo lugar (Supabase)
- ✅ **Sin problemas de CORS**: Está en el mismo dominio
- ✅ **Sin problemas de http/https**: Supabase maneja todo
- ✅ **Mejor rendimiento**: Edge Functions son rápidas
- ✅ **Logs integrados**: Ver logs directamente en Supabase

## 📋 Paso 1: Instalar Supabase CLI

Si no tienes Supabase CLI instalado:

```bash
# Windows (PowerShell)
winget install --id=Supabase.CLI

# O con npm
npm install -g supabase
```

## 📋 Paso 2: Inicializar Supabase en el Proyecto

En la raíz del proyecto:

```bash
supabase init
```

Esto creará una carpeta `supabase/` con la estructura necesaria.

## 📋 Paso 3: Crear la Edge Function

Ya he creado el archivo `supabase/functions/tally-webhook/index.ts` con todo el código necesario.

## 📋 Paso 4: Configurar Variables de Entorno

Las Edge Functions de Supabase tienen acceso automático a:
- `SUPABASE_URL` (automático)
- `SUPABASE_SERVICE_ROLE_KEY` (automático)

No necesitas configurar nada adicional.

## 📋 Paso 5: Desplegar la Edge Function

```bash
# Login en Supabase (si es necesario)
supabase login

# Linkear con tu proyecto
supabase link --project-ref afhiiplxqtodqxvmswor

# Desplegar la función
supabase functions deploy tally-webhook
```

## 📋 Paso 6: Obtener la URL de la Edge Function

Después del deploy, Supabase te dará una URL como:

```
https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook/[webhook-id]
```

**⚠️ IMPORTANTE**: Necesitas agregar el `webhook-id` al final de la URL.

## 📋 Paso 7: Actualizar las Integraciones Existentes

Ejecuta esta consulta en Supabase para actualizar las URLs de webhook:

```sql
-- Ver las integraciones actuales
SELECT id, form_name, webhook_url 
FROM form_integrations;

-- Actualizar la URL del webhook (reemplaza TU_WEBHOOK_ID con el ID real)
UPDATE form_integrations
SET webhook_url = 'https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook/TU_WEBHOOK_ID'
WHERE id = 'TU_INTEGRATION_ID';
```

O mejor aún, actualiza el código del frontend para generar la URL correcta.

## 📋 Paso 8: Actualizar el Código del Frontend

Necesitas actualizar `lib/api/formIntegrations.ts` para generar URLs de Edge Function en lugar de URLs del backend:

```typescript
// En lugar de:
dbData.webhook_url = `${baseUrl}/api/webhooks/tally/${webhookId}`;

// Usar:
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
dbData.webhook_url = `${supabaseUrl}/functions/v1/tally-webhook/${webhookId}`;
```

## 📋 Paso 9: Configurar en Tally

1. Ve a Tally → Settings → Integrations → Webhook
2. Pega la nueva URL (de la Edge Function)
3. Configura el evento: **"Form submission"**
4. Guarda

## 📋 Paso 10: Probar

1. Envía un formulario de prueba desde Tally
2. Ve a Supabase → Edge Functions → tally-webhook → Logs
3. Deberías ver los logs del procesamiento
4. Verifica en Supabase que se creó el candidato

## 🔍 Ver Logs de la Edge Function

En Supabase Dashboard:
1. Ve a **Edge Functions**
2. Haz clic en **tally-webhook**
3. Ve a la pestaña **Logs**
4. Verás todos los logs en tiempo real

## 🐛 Solución de Problemas

### Error: "Function not found"

**Solución**: Asegúrate de que la función esté desplegada:
```bash
supabase functions deploy tally-webhook
```

### Error: "Integration not found"

**Solución**: Verifica que la URL en `form_integrations` sea correcta y tenga el formato:
```
https://[project-ref].supabase.co/functions/v1/tally-webhook/[webhook-id]
```

### Error: "Process not found"

**Solución**: Verifica que el `process_id` en la integración sea correcto y que el proceso tenga etapas.

## ✅ Ventajas de Esta Solución

1. **No depende del backend de Easypanel** - Todo está en Supabase
2. **Más confiable** - Edge Functions son más estables
3. **Mejor rendimiento** - Ejecuta cerca de la base de datos
4. **Logs integrados** - Ver logs directamente en Supabase
5. **Sin problemas de CORS** - Mismo dominio
6. **Sin problemas de http/https** - Supabase maneja todo

## 📝 Nota

Puedes mantener el backend de Easypanel para Google Drive OAuth, pero los webhooks de Tally funcionarán mejor con la Edge Function.
