# 🔍 Diagnóstico: Qué Buscar en los Logs del Backend

## ✅ Cambios Realizados

He agregado **logging extensivo** para diagnosticar el problema. Después del redeploy, verás logs detallados.

## 📋 Pasos para Diagnosticar

### Paso 1: Redesplegar el Backend

1. Ve a Easypanel → App del backend
2. Haz clic en **"Redeploy"** o **"Rebuild"**
3. Espera a que termine el build

### Paso 2: Verificar Logs de Inicio

Después del deploy, en los logs del backend deberías ver:

```
🔵 Cargando webhookRoutes...
🔵 Cargando módulo webhooks.js...
🔵 Router de webhooks creado
🔵 Inicializando cliente Supabase...
🔵 SUPABASE_URL: ✅ Configurado
🔵 SUPABASE_SERVICE_KEY: ✅ Configurado
🔵 Cliente Supabase inicializado
🔵 Registrando ruta /api/webhooks
🔵 Ruta /api/webhooks registrada correctamente
🚀 Servidor backend corriendo en http://0.0.0.0:5000
```

**Si NO ves estos logs:**
- ❌ El código del webhook NO se está cargando
- ❌ Hay un error al importar el módulo
- ❌ El archivo `webhooks.js` no existe en el servidor

**Si ves estos logs:**
- ✅ El código se está cargando correctamente
- ✅ El módulo está funcionando

### Paso 3: Enviar Formulario de Prueba

1. Envía un formulario de prueba desde Tally
2. Inmediatamente revisa los logs del backend

### Paso 4: Qué Buscar en los Logs

#### ✅ Si el Webhook Llega Correctamente

Deberías ver:

```
🔴 ==========================================
🔴 WEBHOOK ENDPOINT LLAMADO
🔴 Timestamp: 2026-03-05T...
🔴 Params: { webhookId: 'cdcb452f-...' }
🔴 Body keys: [ 'eventId', 'eventType', 'formId', ... ]
🔴 ==========================================
📥 Webhook recibido de Tally - ID: cdcb452f-...
📋 Datos recibidos: { ... }
🔍 Buscando integración con webhook_url: https://...
```

**Si ves esto:**
- ✅ El webhook está llegando
- ✅ El código se está ejecutando
- ✅ Continúa leyendo para ver si hay errores después

#### ❌ Si NO Ves Nada

**Si NO ves el log `🔴 WEBHOOK ENDPOINT LLAMADO`:**

1. **Verifica que el webhook esté configurado en Tally:**
   - Ve a Tally → Settings → Integrations → Webhook
   - Verifica que la URL sea correcta
   - Verifica que el evento sea "Form submission"

2. **Prueba el endpoint manualmente:**
   ```bash
   curl -X POST https://opalo-atsopalo-backend.bouasv.easypanel.host/api/webhooks/tally/test-id \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```
   
   Si ves el log `🔴 WEBHOOK ENDPOINT LLAMADO` → El endpoint funciona, el problema es Tally
   Si NO ves nada → El endpoint no está funcionando

#### ❌ Si Ves Error de Variables de Entorno

Si ves:

```
🔵 SUPABASE_URL: ❌ NO configurado
🔵 SUPABASE_SERVICE_KEY: ❌ NO configurado
```

**Solución:**
1. Ve a Easypanel → App del backend → Environment Variables
2. Agrega:
   - `SUPABASE_URL=https://afhiiplxqtodqxvmswor.supabase.co`
   - `SUPABASE_SERVICE_KEY=tu-service-key-aqui`
3. Haz redeploy

#### ❌ Si Ves Error al Buscar Integración

Si ves:

```
❌ Integración no encontrada para webhook: https://...
```

**Solución:**
1. Ejecuta esta consulta en Supabase:
   ```sql
   SELECT webhook_url, form_name 
   FROM form_integrations 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
2. Compara la URL exacta con la configurada en Tally
3. Deben ser **exactamente iguales** (carácter por carácter)

#### ❌ Si Ves Error al Crear Candidato

Si ves:

```
❌ Error creando candidato: ...
```

**Solución:**
- Revisa el error específico en los logs
- Verifica que el proceso tenga al menos una etapa
- Verifica que el candidato tenga al menos `name` o `email`

## 📊 Resumen de Logs Esperados

### Al Iniciar el Backend:
```
🔵 Cargando webhookRoutes...
🔵 Cargando módulo webhooks.js...
🔵 Router de webhooks creado
🔵 Inicializando cliente Supabase...
🔵 SUPABASE_URL: ✅ Configurado
🔵 SUPABASE_SERVICE_KEY: ✅ Configurado
🔵 Cliente Supabase inicializado
🔵 Registrando ruta /api/webhooks
🔵 Ruta /api/webhooks registrada correctamente
🚀 Servidor backend corriendo...
```

### Cuando Llega un Webhook:
```
🔴 ==========================================
🔴 WEBHOOK ENDPOINT LLAMADO
🔴 Timestamp: ...
🔴 Params: ...
🔴 Body keys: ...
🔴 ==========================================
📥 Webhook recibido de Tally - ID: ...
📋 Datos recibidos: ...
🔍 Buscando integración...
✅ Integración encontrada: ...
✅ Proceso encontrado...
👤 Datos del candidato mapeados: ...
✅ Candidato creado: ...
🎉 Webhook procesado exitosamente
```

## 🎯 Próximos Pasos

1. **Haz redeploy del backend** en Easypanel
2. **Revisa los logs de inicio** (deberías ver los logs 🔵)
3. **Envía un formulario de prueba** desde Tally
4. **Revisa los logs inmediatamente** (deberías ver los logs 🔴)
5. **Comparte los logs** que veas para diagnosticar el problema específico

## 💡 Tip

**Filtra los logs** en Easypanel buscando:
- `🔵` para ver logs de carga del módulo
- `🔴` para ver cuando se llama el endpoint
- `📥` para ver cuando llega el webhook
- `✅` para ver pasos exitosos
- `❌` para ver errores
