# Configurar entrega ATS → OpsFlow

Opalo ATS guarda el paquete en la BD compartida y una **Edge Function** lo reenvía a OpsFlow.

## 1. Migraciones SQL (Supabase compartida ATS + Opalopy)

Ejecutar en orden (si aún no lo hiciste):

1. `MIGRATION_ADD_WORKER_HANDOFF.sql`
2. `MIGRATION_ADD_WORKER_HANDOFF_RLS.sql`
3. `MIGRATION_ADD_WORKER_HANDOFF_DELIVERY.sql`

## 2. Desplegar Edge Function `deliver-worker-handoff`

Proyecto Supabase: **el de Opalo ATS** (compartido con Opalopy).

### Secrets (Dashboard → Edge Functions → Secrets, o CLI)

| Secret | Valor |
|--------|--------|
| `OPSFLOW_HANDOFF_INGEST_URL` | `https://rlnfehtgspnkyeevduli.supabase.co/functions/v1/receive-worker-handoff` |
| `OPSFLOW_HANDOFF_INGEST_SECRET` | El secret acordado con OpsFlow (Bearer) |
| `SUPABASE_URL` | Auto en Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto en Supabase |

### Despliegue con CLI

```powershell
cd C:\Users\alvar\Opaloats
npx supabase login
npx supabase link --project-ref <PROJECT_REF_ATS>
npx supabase secrets set OPSFLOW_HANDOFF_INGEST_URL="https://rlnfehtgspnkyeevduli.supabase.co/functions/v1/receive-worker-handoff"
npx supabase secrets set OPSFLOW_HANDOFF_INGEST_SECRET="<tu-secret>"
npx supabase functions deploy deliver-worker-handoff
```

## 3. Flujo en la app

1. Usuario envía candidatos → INSERT local (`delivery_status = pending`)
2. Frontend invoca `deliver-worker-handoff` con `{ packageId }`
3. Edge Function POST a OpsFlow
4. Éxito → `delivery_status = delivered`, `opsflow_package_id` guardado
5. Fallo → `delivery_status = failed`; reintentar desde **Envíos OpsFlow**

## 4. Probar

1. En Opalo ATS: enviar un candidato a OpsFlow
2. En OpsFlow: menú **Recepción ATS** → debe aparecer el paquete
3. Abrir el detalle del candidato: deben verse **nombres**, **apellido paterno** y **apellido materno**
4. Al **Registrar en unidad**, el Nombre completo debe prellenarse como `nombres + apellidoPaterno + apellidoMaterno`
5. Si falla: revisar logs de la Edge Function en Supabase ATS

### Identidad y campos en el snapshot (envíos nuevos)

Cada item incluye:

1. **`workerSnapshot.identity`**: `nombres`, `apellidoPaterno`, `apellidoMaterno`, `fullName`, `dni`, `email`, `phone`, `phone2`
2. **`workerSnapshot.fields`**: **todos** los campos canónicos con valor (candidato, proceso, evaluación) **más todas las columnas personalizadas del proceso masivo** que tengan dato
3. **`meta.fieldLabels`**: etiquetas legibles para que OpsFlow muestre nombres de columna

ATS ya no filtra por selección de campos en la UI: OpsFlow decide qué usar.

Ejemplo: `fixtures/opsflow-handoff-item.sample.json`.

Smoke local de composición/parse:

```powershell
node scripts/verify-worker-handoff-names.mjs
```

> Los paquetes antiguos en OpsFlow no se reescriben; solo aplica a envíos o reenvíos nuevos.
