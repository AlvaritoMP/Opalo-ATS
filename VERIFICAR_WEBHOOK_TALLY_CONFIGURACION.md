# 🔍 Verificar Configuración del Webhook en Tally

## ✅ Estado Actual

Los logs muestran que:
- ✅ El código del webhook está cargado
- ✅ Las variables están configuradas
- ✅ El servidor está funcionando
- ❌ **PERO** no llegan requests a `/api/webhooks/tally/...`

Esto significa que **Tally no está enviando el webhook** o la URL está mal configurada.

## 🔍 Paso 1: Obtener la URL Exacta del Webhook

Ejecuta esta consulta en Supabase para obtener la URL exacta:

```sql
SELECT 
    id,
    form_name,
    webhook_url,
    process_id
FROM form_integrations 
ORDER BY created_at DESC 
LIMIT 1;
```

**Anota la URL exacta** que aparece en `webhook_url`. Debe ser algo como:
```
https://opalo-atsopalo-backend.bouasv.easypanel.host/api/webhooks/tally/cdcb452f-ca43-482c-90d8-f9eb8d08dcc1
```

## 🔍 Paso 2: Verificar Configuración en Tally

1. Ve a tu formulario en Tally
2. Haz clic en **"Settings"** (Configuración)
3. Ve a **"Integrations"** (Integraciones)
4. Busca **"Webhook"**
5. Verifica:

### ✅ URL del Webhook
- La URL debe ser **EXACTAMENTE** igual a la de la consulta SQL
- Carácter por carácter, sin espacios extra
- Debe incluir `https://`
- Debe incluir el path completo `/api/webhooks/tally/[id]`

### ✅ Evento Configurado
- Debe estar configurado para **"Form submission"** o **"Envío de formulario"**
- NO debe ser "Form created" o cualquier otro evento

### ✅ Estado del Webhook
- Debe estar **activado** o **habilitado**
- No debe estar en "pausado" o "deshabilitado"

## 🔍 Paso 3: Probar el Endpoint Manualmente

Para verificar que el endpoint funciona, prueba con curl o Postman:

```bash
curl -X POST https://opalo-atsopalo-backend.bouasv.easypanel.host/api/webhooks/tally/cdcb452f-ca43-482c-90d8-f9eb8d08dcc1 \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "test-123",
    "eventType": "FORM_RESPONSE",
    "formId": "test-form",
    "fields": [
      {
        "key": "name",
        "label": "Nombre",
        "value": "Test User"
      },
      {
        "key": "email",
        "label": "Email",
        "value": "test@example.com"
      }
    ]
  }'
```

**Reemplaza** `cdcb452f-ca43-482c-90d8-f9eb8d08dcc1` con el ID real de tu webhook.

**Resultado esperado:**
- Si ves `🔴 WEBHOOK ENDPOINT LLAMADO` en los logs → El endpoint funciona ✅
- Si ves `❌ Integración no encontrada` → La URL no coincide
- Si no ves nada → El endpoint no está funcionando

## 🔍 Paso 4: Verificar Logs de Tally

Algunas plataformas de formularios tienen logs de webhooks:

1. Ve a Tally → Settings → Integrations → Webhook
2. Busca una sección de **"Logs"** o **"History"** o **"Recent deliveries"**
3. Verifica si hay intentos de envío
4. Si hay errores, anótalos

## 🔍 Paso 5: Verificar que el Formulario Esté Activo

1. Verifica que el formulario esté **publicado** o **activo**
2. Verifica que el formulario tenga al menos un campo
3. Prueba completar el formulario manualmente
4. Después de enviar, revisa los logs del backend inmediatamente

## 🐛 Problemas Comunes

### Problema 1: URL No Coincide Exactamente

**Síntomas:**
- El webhook no llega
- O llega pero da error 404

**Solución:**
- Copia la URL exacta de Supabase
- Pégala en Tally sin modificar nada
- Verifica que no haya espacios extra al inicio o final

### Problema 2: Evento Incorrecto

**Síntomas:**
- El webhook está configurado pero no se envía

**Solución:**
- Verifica que el evento sea **"Form submission"**
- NO debe ser "Form created" o "Form updated"

### Problema 3: Webhook Deshabilitado

**Síntomas:**
- El webhook está configurado pero no se envía

**Solución:**
- Verifica que el webhook esté **activado** o **habilitado**
- Algunas plataformas tienen un switch de activar/desactivar

### Problema 4: Formulario No Está Publicado

**Síntomas:**
- El formulario no se puede completar

**Solución:**
- Verifica que el formulario esté **publicado** o **activo**
- Algunos formularios tienen modo "draft" que no envía webhooks

## 📋 Checklist de Verificación

Antes de probar de nuevo, verifica:

- [ ] La URL en Tally es **exactamente igual** a la de Supabase
- [ ] El evento está configurado como **"Form submission"**
- [ ] El webhook está **activado** o **habilitado**
- [ ] El formulario está **publicado** o **activo**
- [ ] El endpoint responde cuando lo pruebas manualmente
- [ ] Los logs del backend muestran que el servidor está funcionando

## 🎯 Próximos Pasos

1. **Ejecuta la consulta SQL** para obtener la URL exacta
2. **Compara** la URL con la configurada en Tally
3. **Prueba el endpoint manualmente** con curl
4. **Envía un formulario de prueba** desde Tally
5. **Revisa los logs inmediatamente** después de enviar

## 💡 Tip

Si después de verificar todo aún no funciona, prueba:

1. **Desactivar y reactivar** el webhook en Tally
2. **Eliminar y volver a crear** el webhook en Tally
3. **Verificar que Tally tenga acceso a internet** (puede sonar obvio, pero algunos firewalls bloquean webhooks)
