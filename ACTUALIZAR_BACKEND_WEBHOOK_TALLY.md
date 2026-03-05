# 🔧 Actualizar Backend para Webhooks de Tally

Este documento explica cómo actualizar el backend para que pueda recibir y procesar webhooks de Tally.

## 📋 Cambios Realizados

1. ✅ Creado endpoint `/api/webhooks/tally/:webhookId` para recibir webhooks
2. ✅ Agregada dependencia `@supabase/supabase-js` al backend
3. ✅ Implementada lógica de mapeo de campos de Tally a candidatos
4. ✅ Agregado logging detallado para debugging

## 🚀 Pasos para Actualizar el Backend

### Paso 1: Instalar la Nueva Dependencia

En el directorio del backend (`Opalo-ATS/backend`), ejecuta:

```bash
npm install @supabase/supabase-js
```

O si estás en producción y el backend está en Easypanel, esto se hará automáticamente cuando hagas deploy.

### Paso 2: Verificar Variables de Entorno

Asegúrate de que el backend tenga estas variables de entorno configuradas:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=tu-service-key-aqui
```

**⚠️ IMPORTANTE**: Usa `SUPABASE_SERVICE_KEY` (no `SUPABASE_ANON_KEY`) para que el backend pueda crear candidatos sin restricciones de RLS.

**Cómo obtener el Service Key:**
1. Ve a tu proyecto en Supabase
2. Ve a **Settings** → **API**
3. Copia el **`service_role` key** (⚠️ NUNCA lo expongas en el frontend)

### Paso 3: Hacer Deploy del Backend

Si estás usando Easypanel:

1. Haz commit y push de los cambios:
   ```bash
   git add Opalo-ATS/backend/
   git commit -m "Agregar endpoint de webhook de Tally"
   git push
   ```

2. En Easypanel:
   - Ve a tu app del backend
   - Haz clic en **"Redeploy"** o **"Rebuild"**
   - Espera a que termine el deploy

3. Verifica que el backend esté funcionando:
   ```bash
   curl https://tu-backend-url.com/health
   ```

### Paso 4: Verificar que el Endpoint Funciona

Prueba el endpoint con un request de prueba:

```bash
curl -X POST https://tu-backend-url.com/api/webhooks/tally/test-id \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

Deberías recibir una respuesta (aunque sea un error 404 si no existe la integración, significa que el endpoint está funcionando).

## 🔍 Verificar que Funciona

1. **Verifica los logs del backend** después de hacer deploy
2. **Envía un formulario de prueba desde Tally**
3. **Revisa los logs** para ver si llegó el webhook
4. **Verifica en Supabase** si se creó el candidato (usa `VERIFICAR_WEBHOOK_TALLY.sql`)

## 📝 Estructura del Endpoint

El endpoint espera recibir datos en el formato de Tally:

```json
{
  "eventId": "evt_xxxxx",
  "eventType": "FORM_RESPONSE",
  "formId": "xxxxx",
  "formName": "Nombre del Formulario",
  "responseId": "resp_xxxxx",
  "submittedAt": "2024-01-15T10:30:00Z",
  "fields": [
    {
      "key": "name",
      "label": "Nombre completo",
      "type": "TEXT",
      "value": "Juan Pérez"
    },
    {
      "key": "email",
      "label": "Email",
      "type": "EMAIL",
      "value": "juan@example.com"
    }
  ]
}
```

## 🐛 Solución de Problemas

### Error: "Integration not found"

- Verifica que la URL del webhook en Tally sea exactamente la misma que en la integración
- Verifica que la integración exista en Supabase

### Error: "Process not found"

- Verifica que el `process_id` en la integración sea correcto
- Verifica que el proceso tenga al menos una etapa

### Error: "Failed to create candidate"

- Verifica que `SUPABASE_SERVICE_KEY` esté configurada correctamente
- Verifica los logs del backend para ver el error específico
- Verifica que los campos requeridos estén presentes

### El webhook llega pero no se crea el candidato

- Revisa los logs del backend para ver qué está pasando
- Verifica que el formulario de Tally tenga al menos un campo `name` o `email`
- Verifica que el mapeo de campos esté correcto

## 📚 Documentación Relacionada

- `GUIA_INTEGRACION_TALLY.md` - Guía completa de integración
- `GUIA_VERIFICAR_WEBHOOK_TALLY.md` - Cómo verificar que funciona
- `VERIFICAR_WEBHOOK_TALLY.sql` - Scripts SQL para verificar en Supabase
