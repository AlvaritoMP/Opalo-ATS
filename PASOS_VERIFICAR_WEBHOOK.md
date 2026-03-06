# 🔍 Pasos para Verificar el Webhook - Guía Clara

## 📋 Paso 1: Obtener la URL del Webhook (En Supabase)

**Ejecuta SOLO esta consulta en Supabase SQL Editor:**

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

**Anota:**
- El `webhook_url` completo (ejemplo: `https://opalo-atsopalo-backend.bouasv.easypanel.host/api/webhooks/tally/cdcb452f-ca43-482c-90d8-f9eb8d08dcc1`)
- El `id` de la integración

## 📋 Paso 2: Verificar en Tally

1. Ve a tu formulario en Tally
2. **Settings** → **Integrations** → **Webhook**
3. **Compara la URL** con la que obtuviste en el Paso 1
4. Deben ser **EXACTAMENTE iguales** (carácter por carácter)

**Si NO son iguales:**
- Copia la URL exacta de Supabase
- Pégala en Tally
- Guarda los cambios

## 📋 Paso 3: Probar el Endpoint (En Terminal, NO en Supabase)

**Abre PowerShell o Terminal** en tu computadora y ejecuta:

```powershell
curl -X POST https://opalo-atsopalo-backend.bouasv.easypanel.host/api/webhooks/tally/cdcb452f-ca43-482c-90d8-f9eb8d08dcc1 `
  -H "Content-Type: application/json" `
  -d '{\"test\": \"data\"}'
```

**⚠️ IMPORTANTE:**
- Reemplaza `cdcb452f-ca43-482c-90d8-f9eb8d08dcc1` con el ID real de tu webhook (del Paso 1)
- Este comando se ejecuta en **PowerShell/Terminal**, NO en Supabase
- Después de ejecutarlo, revisa los **logs del backend en Easypanel**

**Resultado esperado en los logs:**
```
🔴 ==========================================
🔴 WEBHOOK ENDPOINT LLAMADO
🔴 Timestamp: ...
🔴 Params: { webhookId: 'cdcb452f-...' }
🔴 ==========================================
```

## 📋 Paso 4: Enviar Formulario de Prueba desde Tally

1. Completa tu formulario en Tally
2. Envía el formulario
3. **Inmediatamente** revisa los logs del backend en Easypanel
4. Busca el log `🔴 WEBHOOK ENDPOINT LLAMADO`

**Si ves el log:**
- ✅ El webhook está llegando
- ✅ El código se está ejecutando
- Continúa para ver si hay errores después

**Si NO ves el log:**
- ❌ El webhook NO está llegando
- Verifica la URL en Tally de nuevo
- Verifica que el evento sea "Form submission"

## 🎯 Resumen Rápido

1. **Supabase SQL Editor**: Ejecuta la consulta SQL para obtener la URL
2. **Tally**: Compara y corrige la URL si es necesario
3. **Terminal/PowerShell**: Prueba el endpoint con curl
4. **Tally**: Envía un formulario de prueba
5. **Easypanel Logs**: Revisa si aparece el log `🔴 WEBHOOK ENDPOINT LLAMADO`

## 💡 Alternativa: Probar desde el Navegador

Si no tienes curl, puedes usar una extensión del navegador como **Postman** o **REST Client**, o simplemente verifica que la URL en Tally sea correcta y envía un formulario de prueba.
