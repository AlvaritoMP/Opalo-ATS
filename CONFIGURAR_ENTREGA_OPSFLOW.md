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
3. Si falla: revisar logs de la Edge Function en Supabase ATS
