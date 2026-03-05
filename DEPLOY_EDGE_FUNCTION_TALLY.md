# 🚀 Deploy de Edge Function para Tally - Guía Rápida

## ✅ Archivos Creados

He creado:
- ✅ `supabase/functions/tally-webhook/index.ts` - La Edge Function completa
- ✅ Código actualizado en `lib/api/formIntegrations.ts` para usar Edge Functions

## 📋 Pasos para Desplegar

### Paso 1: Instalar Supabase CLI

```bash
# Windows (PowerShell)
winget install --id=Supabase.CLI

# O verifica si ya está instalado
supabase --version
```

### Paso 2: Login en Supabase

```bash
supabase login
```

Te abrirá el navegador para autenticarte.

### Paso 3: Linkear con tu Proyecto

```bash
supabase link --project-ref afhiiplxqtodqxvmswor
```

### Paso 4: Desplegar la Función

```bash
supabase functions deploy tally-webhook
```

## 📋 Paso 5: Verificar que Funciona

Después del deploy, Supabase te dará la URL. Debería ser algo como:

```
https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook
```

## 📋 Paso 6: Actualizar Integraciones Existentes

Si ya tienes integraciones creadas, necesitas actualizar sus URLs:

```sql
-- Ver integraciones actuales
SELECT id, form_name, webhook_url 
FROM form_integrations;

-- Actualizar a Edge Function (reemplaza los IDs)
UPDATE form_integrations
SET webhook_url = REPLACE(webhook_url, 
    'opalo-atsopalo-backend.bouasv.easypanel.host/api/webhooks/tally',
    'afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook'
)
WHERE webhook_url LIKE '%opalo-atsopalo-backend%';
```

O simplemente crea una nueva integración desde el frontend (ahora generará la URL correcta automáticamente).

## 📋 Paso 7: Configurar en Tally

1. Obtén la URL de la integración (de Supabase o del frontend)
2. Ve a Tally → Settings → Integrations → Webhook
3. Pega la nueva URL
4. Configura evento: **"Form submission"**
5. Guarda

## 📋 Paso 8: Probar

1. Envía un formulario de prueba desde Tally
2. Ve a Supabase Dashboard → Edge Functions → tally-webhook → Logs
3. Deberías ver los logs del procesamiento
4. Verifica en Supabase que se creó el candidato

## 🔍 Ver Logs

En Supabase Dashboard:
1. Ve a **Edge Functions** (menú lateral)
2. Haz clic en **tally-webhook**
3. Ve a la pestaña **Logs**
4. Verás todos los logs en tiempo real

## ✅ Ventajas

- ✅ **Más confiable** - No depende de Easypanel
- ✅ **Más rápido** - Ejecuta cerca de la base de datos
- ✅ **Sin problemas de CORS** - Mismo dominio
- ✅ **Sin problemas de http/https** - Supabase maneja todo
- ✅ **Logs integrados** - Ver directamente en Supabase

## 🐛 Si Hay Problemas

### Error: "supabase: command not found"

**Solución**: Instala Supabase CLI:
```bash
winget install --id=Supabase.CLI
```

### Error: "Function not found"

**Solución**: Asegúrate de estar en el directorio correcto y que el archivo existe:
```bash
ls supabase/functions/tally-webhook/index.ts
```

### Error: "Project not linked"

**Solución**: Linkea el proyecto:
```bash
supabase link --project-ref afhiiplxqtodqxvmswor
```
