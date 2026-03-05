# 🔍 Guía para Verificar Webhooks de Tally

Esta guía te ayudará a verificar si los webhooks de Tally están llegando correctamente y si los candidatos se están creando en Supabase.

## 📋 Pasos para Verificar

### 1. Verificar que el Endpoint Existe

Primero, verifica que el endpoint de webhook esté funcionando:

1. Obtén la URL del webhook de tu integración (debería verse así):
   ```
   https://opalo-atsopalo-backend.bouasv.easypanel.host/api/webhooks/tally/[id-unico]
   ```

2. Prueba el endpoint con un POST request (puedes usar Postman, curl, o cualquier herramienta):
   ```bash
   curl -X POST https://opalo-atsopalo-backend.bouasv.easypanel.host/api/webhooks/tally/[id-unico] \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

3. Deberías recibir una respuesta (aunque sea un error, significa que el endpoint está funcionando).

### 2. Verificar en Supabase

Ejecuta el script SQL `VERIFICAR_WEBHOOK_TALLY.sql` en el SQL Editor de Supabase:

1. Ve a tu proyecto en Supabase
2. Abre el **SQL Editor**
3. Copia y pega el contenido de `VERIFICAR_WEBHOOK_TALLY.sql`
4. **Reemplaza** `'TU_PROCESS_ID'` y `'TU_INTEGRATION_ID'` con los IDs reales de tu integración
5. Ejecuta las consultas una por una

### 3. Verificar los Logs del Backend

Si tienes acceso a los logs del backend (en Easypanel o donde esté desplegado):

1. Busca mensajes que empiecen con:
   - `📥 Webhook recibido de Tally`
   - `✅ Integración encontrada`
   - `✅ Candidato creado`
   - `❌ Error...`

2. Estos logs te dirán exactamente qué está pasando cuando Tally envía el webhook.

### 4. Verificar en Tally

En Tally, verifica que:

1. El webhook esté configurado correctamente:
   - Ve a **Settings** → **Integrations** → **Webhook**
   - Verifica que la URL sea exactamente la que se muestra en tu integración
   - Verifica que el evento sea **"Form submission"**

2. Prueba enviar un formulario de prueba:
   - Completa el formulario en Tally
   - Envía el formulario
   - Verifica en los logs del backend si llegó el webhook

### 5. Verificar Candidatos Creados

En la aplicación ATS:

1. Ve al proceso que configuraste en la integración
2. Busca candidatos nuevos
3. Verifica que tengan:
   - El nombre o email del formulario
   - El source debería ser el nombre del formulario o "Tally"
   - Deberían estar en la primera etapa del proceso

## 🔧 Solución de Problemas

### Problema: No veo candidatos en el proceso

**Posibles causas:**

1. **El webhook no está llegando al backend**
   - Verifica que la URL del webhook en Tally sea exactamente la misma que en la integración
   - Verifica los logs del backend para ver si llegan requests

2. **El backend no puede acceder a Supabase**
   - Verifica que `SUPABASE_SERVICE_KEY` esté configurada en las variables de entorno del backend
   - Verifica que `SUPABASE_URL` esté configurada

3. **El proceso no existe o no tiene etapas**
   - Verifica en Supabase que el proceso tenga al menos una etapa
   - Verifica que el `process_id` en la integración sea correcto

4. **Error al crear el candidato**
   - Revisa los logs del backend para ver el error específico
   - Verifica que los campos requeridos estén presentes

### Problema: El webhook llega pero no se crea el candidato

**Verifica:**

1. **Los campos del formulario de Tally**
   - Asegúrate de que al menos uno de estos campos exista: `name`, `nombre`, `email`, `correo`
   - Verifica que los nombres de los campos coincidan con los esperados (ver `GUIA_INTEGRACION_TALLY.md`)

2. **El mapeo de campos**
   - Si configuraste un mapeo personalizado, verifica que los nombres de los campos de Tally coincidan exactamente
   - Revisa los logs del backend para ver qué datos se están recibiendo

3. **Los permisos de Supabase**
   - Verifica que el `SUPABASE_SERVICE_KEY` tenga permisos para insertar en la tabla `candidates`
   - Verifica las políticas RLS si están habilitadas

## 📊 Consultas Útiles en Supabase

### Ver todas las integraciones
```sql
SELECT * FROM form_integrations ORDER BY created_at DESC;
```

### Ver candidatos creados en las últimas 24 horas
```sql
SELECT * FROM candidates 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Ver candidatos de un proceso específico
```sql
SELECT c.*, p.title as process_title 
FROM candidates c
LEFT JOIN processes p ON c.process_id = p.id
WHERE c.process_id = 'TU_PROCESS_ID'
ORDER BY c.created_at DESC;
```

### Ver el historial de movimientos recientes
```sql
SELECT ch.*, c.name as candidate_name
FROM candidate_history ch
LEFT JOIN candidates c ON ch.candidate_id = c.id
WHERE ch.moved_at >= NOW() - INTERVAL '24 hours'
  AND ch.moved_by ILIKE '%Tally%'
ORDER BY ch.moved_at DESC;
```

## ✅ Checklist de Verificación

- [ ] El endpoint de webhook está desplegado y accesible
- [ ] La URL del webhook en Tally coincide exactamente con la de la integración
- [ ] El backend tiene configuradas `SUPABASE_URL` y `SUPABASE_SERVICE_KEY`
- [ ] El proceso tiene al menos una etapa
- [ ] El formulario de Tally tiene al menos un campo `name` o `email`
- [ ] Los logs del backend muestran que el webhook está llegando
- [ ] Los candidatos aparecen en Supabase después de enviar el formulario
- [ ] Los candidatos aparecen en el proceso correcto en la aplicación
