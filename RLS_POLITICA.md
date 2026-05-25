# Política RLS — Base de datos compartida (Opalo ATS + Opalopy)

## Modelo (no cambiar)

| Concepto | Valor |
|----------|--------|
| Base de datos | **Una sola** instancia Supabase para ambas apps |
| Clave frontend | **Misma** `anon` key en Opalo ATS y Opalopy |
| Aislamiento | Columna **`app_name`** en cada fila |
| Opalo ATS | `app_name = 'Opalo ATS'` |
| Opalopy | `app_name IN ('Opalopy', 'ATS Pro')` |
| Backend / webhooks | `service_role` (bypass RLS), nunca en el frontend |

Son el mismo sistema con distinta marca/usuarios; **no mezclar ni renombrar** datos de un tenant al otro.

## Script maestro (único)

**[`RLS_MULTIAPP_DEFINITIVO.sql`](RLS_MULTIAPP_DEFINITIVO.sql)**

- Crea políticas **Opalo ATS** (`*_opalo_ats`) y **Opalopy** (`*_opalopy`).
- **No borra** políticas del otro tenant.
- **No mueve** filas entre `app_name`.
- Idempotente: se puede re-ejecutar.

Verificación: [`RLS_VERIFICAR.sql`](RLS_VERIFICAR.sql)  
Diagnóstico: [`RLS_DIAGNOSTICO_MULTIAPP.sql`](RLS_DIAGNOSTICO_MULTIAPP.sql)

## Qué NO hacer

| Acción | Por qué |
|--------|---------|
| `RLS_NORMALIZAR_APP_NAME_OPALO_ATS.sql` | Convierte Opalopy → Opalo ATS y **rompe Opalopy** |
| Deshabilitar RLS “para probar” | Expone todos los tenants |
| `RLS_OPALO_ATS_DEFINITIVO.sql` (versión vieja que borraba todas las políticas) | Eliminaba acceso de Opalopy |
| Cambiar `DEFAULT app_name` global a un solo tenant | Nuevos INSERT del otro tenant quedarían mal |

## Interpretar `RLS_VERIFICAR` sección 3

En BD compartida **es normal** ver:

```json
{ "tbl": "candidates", "sin_app_name": 448 }  // filas Opalopy — NO es un error
```

Eso significa “filas que **no** son Opalo ATS”, no “filas rotas”.  
Lo importante es que **existen** filas con `app_name = 'Opalo ATS'` para tu app.

## Si Opalo ATS “no ve” datos que creaste ahí

1. `RLS_DIAGNOSTICO_MULTIAPP.sql` — ¿tienen `app_name = 'Opalo ATS'`?
2. Si aparecen como `Opalopy` → error histórico puntual → [`RLS_REETIQUETAR_OPALO_ATS.sql`](RLS_REETIQUETAR_OPALO_ATS.sql) con **UUIDs concretos**.
3. Datos nuevos deben insertarse con `APP_NAME` desde el código (ya implementado).

## Tabla nueva

1. Columna `app_name TEXT NOT NULL DEFAULT 'Opalo ATS'` **solo si la tabla es exclusiva de Opalo ATS**.
2. En BD compartida, mejor **sin DEFAULT** y siempre enviar `app_name` desde la app.
3. Añadir políticas **de ambos tenants** (ver [`RLS_NUEVA_TABLA_TEMPLATE.sql`](RLS_NUEVA_TABLA_TEMPLATE.sql)).
4. Añadir la tabla al array en `RLS_MULTIAPP_DEFINITIVO.sql`.

## Código

- Opalo ATS: `APP_NAME = 'Opalo ATS'` en [`lib/appConfig.ts`](lib/appConfig.ts).
- Opalopy: su propio `APP_NAME` en su repo (`'Opalopy'` o `'ATS Pro'`).
- Toda query API: `.eq('app_name', APP_NAME)`.
- RLS es **segunda línea de defensa**; el filtro en código es obligatorio.

## Si ya ejecutaste el script destructivo o el de normalizar

1. Ejecuta **`RLS_MULTIAPP_DEFINITIVO.sql`** (restaura políticas Opalopy + Opalo ATS).
2. Si ejecutaste normalizar masivo, **restaura backup de Supabase** o re-etiqueta manualmente lo que era Opalopy (contacto con soporte / backup PITR).

## Resumen operativo

```
Problema de permisos  → RLS_MULTIAPP_DEFINITIVO.sql → RLS_VERIFICAR.sql
¿Cuántos datos hay?   → RLS_DIAGNOSTICO_MULTIAPP.sql
Fila mal etiquetada   → RLS_REETIQUETAR_OPALO_ATS.sql (IDs explícitos)
Tabla nueva           → migración + template + actualizar MULTIAPP
```
