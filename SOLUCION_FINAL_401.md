# ✅ Solución Final: Error 401 - Usar Backend de Easypanel

## ❌ Problema

Supabase Edge Functions requieren el header `apikey` para autenticarse, pero:
- Tally no puede enviar headers personalizados
- Supabase no lee el `apikey` de la URL como query parameter
- El 401 persiste

## ✅ Solución: Usar Backend de Easypanel

El backend de Easypanel ya está funcionando y procesa los webhooks de Tally correctamente. No requiere autenticación y crea los candidatos directamente en Supabase usando el service role key.

### Paso 1: Actualizar URL en Supabase

Ejecuta este SQL en **Supabase SQL Editor**:

```sql
UPDATE form_integrations
SET webhook_url = 'https://opalo-atsopalo-backend.bouasv.easypanel.host/api/webhooks/tally/cdcb452f-ca43-482c-90d8-f9eb8d08dcc1'
WHERE webhook_url LIKE '%supabase.co%';
```

### Paso 2: Actualizar URL en Tally

1. Ve a **Tally** → Settings → Integrations → Webhook
2. Actualiza la URL del webhook a:
   ```
   https://opalo-atsopalo-backend.bouasv.easypanel.host/api/webhooks/tally/cdcb452f-ca43-482c-90d8-f9eb8d08dcc1
   ```
3. **Guarda** los cambios

### Paso 3: Verificar que el Backend Está Corriendo

El backend debe estar corriendo en Easypanel. Verifica en los logs que el servidor esté activo.

### Paso 4: Probar

1. Envía un formulario de prueba desde Tally
2. Verifica en los logs del backend que recibió el webhook
3. Verifica en Supabase que se creó el candidato

## 🔄 Flujo Completo

```
Tally → Backend Easypanel (sin autenticación) → Supabase (con service role key) → Candidato creado
```

## ✅ Ventajas de Usar el Backend

1. **No requiere autenticación** - Tally puede enviar webhooks sin problemas
2. **Ya está funcionando** - El código del backend ya procesa los webhooks correctamente
3. **Más control** - Puedes agregar logging, validaciones, etc.
4. **Sin problemas de 401** - El backend no requiere autenticación de Tally

## 📋 Checklist

- [ ] SQL ejecutado en Supabase
- [ ] URL actualizada en Tally
- [ ] Backend corriendo en Easypanel
- [ ] Formulario de prueba enviado
- [ ] Verificado en logs del backend
- [ ] Verificado en Supabase si se creó el candidato
