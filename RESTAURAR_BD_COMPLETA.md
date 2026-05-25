# Restaurar base de datos — Opalo ATS + Opalopy

## Qué pasó

Un script de normalización (`RLS_NORMALIZAR_APP_NAME_OPALO_ATS.sql` o similar) convirtió filas con `app_name = 'Opalopy'` → `'Opalo ATS'`.  
**Opalo ATS y Opalopy dejaron de funcionar correctamente.** No se puede revertir con `UPDATE` masivo.

Estado actual confirmado: en `candidates` solo queda `app_name = 'Opalo ATS'` (599 filas). Antes había ~448 filas Opalopy.

## Solución: restaurar backup de Supabase (obligatorio)

Proyecto: **ATS Alfa Oro** — `afhiiplxqtodqxvmswor`  
**PITR no está activo** → la CLI falla con `PITR is not enabled`. Solo sirve el **Dashboard**.

Backups disponibles (verificados):

| Fecha (UTC) | Usar |
|-------------|------|
| **22-may-2026 09:18:37** | ✅ **Elegido** — incidente fue hoy después de este backup |
| 21-may-2026 ~09:16 | Alternativa si el 22 ya incluyera el daño |
| 20-may-2026 ~09:14 | Más conservador; pierde más datos recientes |

### ⚠️ Antes de restaurar

- **Downtime**: la app quedará inaccesible durante la restauración (minutos u horas según tamaño).
- **Pérdida de datos**: todo lo creado/modificado **después** del backup elegido se pierde.
- Avisa a quien use Opalo ATS y Opalopy antes de pulsar Restore.

---

## Restaurar — Dashboard (única opción viable)

1. Abre: [Database → Backups](https://supabase.com/dashboard/project/afhiiplxqtodqxvmswor/database/backups/scheduled)
2. Pestaña **Scheduled** (backups diarios).
3. Elige el backup del **22 de mayo de 2026 — 09:18:37 UTC**.
4. Pulsa **Restore** (o **Start a restore**).
5. Confirma. El proyecto quedará **Offline** hasta que termine.
6. Espera la notificación de Supabase cuando finalice.

> Si tu plan permite descargar el backup pero no restaurar in-place, crea un proyecto nuevo y sigue [Restore Dashboard backup](https://supabase.com/docs/guides/platform/migrating-within-supabase/dashboard-restore). En proyectos con backup físico nuevo, lo normal es restaurar **in-place** desde Scheduled Backups.

---

## CLI — NO funciona en este proyecto

```powershell
supabase backups restore --project-ref afhiiplxqtodqxvmswor -t 1779268500 --yes
# Error: PITR is not enabled for this project.
```

Listar backups (solo lectura):

```powershell
supabase backups list --project-ref afhiiplxqtodqxvmswor
```

---

## Después de restaurar (obligatorio)

### 1. Esquema — alinear BD con el código actual

El backup trae **datos** de ayer; el **código desplegado hoy** puede esperar columnas/tablas nuevas. Ejecuta en SQL Editor:

1. **`POST_RESTORE_SINCRONIZAR_BD.sql`** — columnas/tablas idempotentes (`bulk_column_values`, `field_mapping`, etc.)
2. **`RLS_MULTIAPP_DEFINITIVO.sql`** — políticas de ambas apps
3. **`RLS_VERIFICAR.sql`** — todo en ✅ OK

### 2. Deploy — código que no vive en la BD

```powershell
supabase functions deploy tally-webhook --no-verify-jwt
```

El frontend en Easypanel debe estar en el commit actual del repo (Tally, normalización de texto, optimizaciones).

### 3. Datos de hoy que el backup NO trae (recuperación manual)

| Qué se perdió | Cómo recuperarlo |
|---------------|------------------|
| Candidatos creados **después** del backup | Reenviar formularios Tally o importar Excel |
| `bulk_column_values` en BD (tabla masiva) | Abrir el proceso masivo: la app **migra automáticamente** desde `localStorage` si aún tienes la pestaña/navegador donde trabajaste hoy |
| Texto normalizado ("CALLE" → "Calle") | Botón **Normalizar texto** en el proceso masivo (vuelve a persistir en BD) |
| Mapeos Tally guardados hoy | Revisar integración del proceso y volver a guardar mapeo si falta |
| Entradas del log de actividad masiva | No recuperables; solo auditoría |

### 4. Probar ambas apps

- Opalopy (~437 candidatos)
- Opalo ATS (~155 candidatos + procesos masivos)

### 5. No ejecutar

- `RLS_NORMALIZAR_APP_NAME_OPALO_ATS.sql`
- `RLS_OPALO_ATS_DEFINITIVO.sql` (versión vieja)

---

## Verificación post-restauración

```sql
SELECT COALESCE(app_name, '(NULL)') AS app_name, COUNT(*) 
FROM public.candidates GROUP BY 1;
```

Esperado: al menos dos valores (`Opalo ATS` y `Opalopy` o `ATS Pro`).

---

## Si no puedes restaurar backup

Contacta soporte Supabase o usa PITR de pago.  
**No** uses scripts masivos de `UPDATE app_name` en BD compartida.
