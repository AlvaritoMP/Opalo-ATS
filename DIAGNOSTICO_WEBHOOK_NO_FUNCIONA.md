# 🔍 Diagnóstico: Webhook de Tally No Crea Candidatos

## ✅ Lo Que Sabemos

- ✅ La integración existe en Supabase
- ❌ Los candidatos no se están creando

## 🔍 Pasos para Diagnosticar

### Paso 1: Verificar que el Webhook Llega al Backend

**Revisa los logs del backend en Easypanel:**

1. Ve a Easypanel
2. Abre la app del backend
3. Ve a **"Logs"** o **"View Logs"**
4. Busca mensajes que empiecen con:
   - `📥 Webhook recibido de Tally`
   - `✅ Integración encontrada`
   - `✅ Candidato creado`
   - `❌ Error...`

**¿Qué buscar?**
- Si ves `📥 Webhook recibido de Tally` → El webhook está llegando ✅
- Si NO ves nada → El webhook NO está llegando ❌

### Paso 2: Verificar la URL del Webhook en Tally

**La URL en Tally DEBE ser exactamente igual a la de la integración:**

1. Ejecuta esta consulta en Supabase para ver la URL exacta:
```sql
SELECT webhook_url, form_name 
FROM form_integrations 
ORDER BY created_at DESC 
LIMIT 1;
```

2. Ve a Tally → Settings → Integrations → Webhook
3. Verifica que la URL sea **EXACTAMENTE** la misma (carácter por carácter)
4. Verifica que el evento sea **"Form submission"**

### Paso 3: Probar el Endpoint Manualmente

Prueba si el endpoint responde (aunque sea con error):

```bash
curl -X POST https://opalo-atsopalo-backend.bouasv.easypanel.host/api/webhooks/tally/test-id \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**Resultados esperados:**
- Si responde con error 404 → El endpoint funciona, pero no encuentra la integración
- Si responde con error 500 → Hay un error en el backend
- Si no responde → El endpoint no está funcionando

### Paso 4: Verificar Variables de Entorno del Backend

En Easypanel, verifica que el backend tenga:

```env
SUPABASE_URL=https://afhiiplxqtodqxvmswor.supabase.co
SUPABASE_SERVICE_KEY=tu-service-key-aqui
```

**Verifica:**
- ✅ Las variables existen
- ✅ No tienen espacios extra
- ✅ El SERVICE_KEY es correcto (no el ANON_KEY)

### Paso 5: Verificar Errores en los Logs

Si ves errores en los logs del backend, busca:

- `❌ Error buscando integración` → Problema con Supabase
- `❌ Integración no encontrada` → La URL del webhook no coincide
- `❌ Error creando candidato` → Problema al insertar en Supabase
- `❌ Proceso no encontrado` → El process_id no existe

## 🎯 Soluciones Comunes

### Problema 1: El Webhook No Llega al Backend

**Síntomas:**
- No ves `📥 Webhook recibido de Tally` en los logs
- El endpoint no responde

**Soluciones:**
1. Verifica que la URL en Tally sea exactamente igual a la de la integración
2. Verifica que el evento en Tally sea "Form submission"
3. Verifica que el backend esté funcionando: `curl https://opalo-atsopalo-backend.bouasv.easypanel.host/health`

### Problema 2: Error "Integration not found"

**Síntomas:**
- Ves `❌ Integración no encontrada` en los logs
- El webhook llega pero no encuentra la integración

**Solución:**
- La URL del webhook en Tally NO coincide exactamente con la de la integración
- Copia la URL exacta de la consulta SQL y pégala en Tally

### Problema 3: Error "Failed to create candidate"

**Síntomas:**
- Ves `❌ Error creando candidato` en los logs
- El webhook llega y encuentra la integración, pero falla al crear

**Soluciones:**
1. Verifica que `SUPABASE_SERVICE_KEY` esté configurado correctamente
2. Verifica que el proceso tenga al menos una etapa
3. Verifica que el candidato tenga al menos `name` o `email`

### Problema 4: El Backend No Tiene las Variables

**Síntomas:**
- Error `SUPABASE_URL is not defined`
- Error `Cannot read property of undefined`

**Solución:**
- Agrega las variables de entorno en Easypanel (ver `CONFIGURAR_VARIABLES_BACKEND_EASYPANEL.md`)

## 📋 Checklist de Verificación

Ejecuta estos pasos en orden:

- [ ] **Paso 1**: Revisar logs del backend después de enviar un formulario
- [ ] **Paso 2**: Verificar que la URL en Tally coincida exactamente
- [ ] **Paso 3**: Probar el endpoint manualmente con curl
- [ ] **Paso 4**: Verificar variables de entorno del backend
- [ ] **Paso 5**: Buscar errores específicos en los logs

## 🔧 Próximos Pasos

1. **Revisa los logs del backend** y comparte qué ves (o no ves)
2. **Verifica la URL del webhook** en Tally vs la de la integración
3. **Prueba el endpoint** manualmente para ver si responde

## 💡 Consulta SQL para Verificar Todo

Ejecuta esta consulta en Supabase para ver el estado completo:

```sql
-- Ver integración y verificar si hay candidatos
SELECT 
    fi.id as integration_id,
    fi.form_name,
    fi.webhook_url,
    fi.process_id,
    p.title as process_title,
    COUNT(c.id) as total_candidatos,
    COUNT(CASE WHEN c.created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as candidatos_ultimas_24h,
    MAX(c.created_at) as ultimo_candidato
FROM form_integrations fi
LEFT JOIN processes p ON p.id = fi.process_id AND p.app_name = fi.app_name
LEFT JOIN candidates c ON c.process_id = fi.process_id 
    AND c.app_name = fi.app_name
    AND (c.source = fi.form_name OR c.source ILIKE '%Tally%')
GROUP BY fi.id, fi.form_name, fi.webhook_url, fi.process_id, p.title
ORDER BY fi.created_at DESC;
```

Esta consulta te mostrará:
- La integración
- El proceso vinculado
- Cuántos candidatos se han creado
- Cuántos en las últimas 24 horas
- Cuándo fue el último candidato
