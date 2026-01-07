# Instrucciones V2: Migración Sin DEFAULT (Más Rápida)

El problema de timeout se debe a que `ALTER TABLE ... ADD COLUMN ... DEFAULT` actualiza TODOS los registros existentes de una vez, lo cual puede tomar mucho tiempo en tablas grandes.

## Solución: Agregar columna SIN DEFAULT, luego actualizar

### Paso 1: Agregar Columnas (SIN DEFAULT)

Ejecuta estos scripts uno por uno. Son MUY rápidos porque no actualizan datos:

1. ✅ `MIGRATION_01_users_V2.sql` - Solo agrega la columna (vacía)
2. ✅ `MIGRATION_02_processes_V2.sql`
3. ✅ `MIGRATION_03_candidates_V2.sql`
4. ✅ `MIGRATION_04_stages.sql` (ya está bien, no tiene DEFAULT)
5. ✅ `MIGRATION_05_document_categories.sql` (ya está bien)
6. ✅ `MIGRATION_06_attachments.sql` (ya está bien)
7. ✅ `MIGRATION_07_candidate_history.sql` (ya está bien)
8. ✅ `MIGRATION_08_post_its.sql` (ya está bien)
9. ✅ `MIGRATION_09_comments.sql` (ya está bien)
10. ✅ `MIGRATION_10_interview_events.sql` (ya está bien)
11. ✅ `MIGRATION_11_form_integrations.sql` - Cambia a SIN DEFAULT
12. ✅ `MIGRATION_12_app_settings.sql` - Cambia a SIN DEFAULT

**Para las tablas 11 y 12, usa estas versiones:**

```sql
-- MIGRATION_11_form_integrations_V2.sql
ALTER TABLE form_integrations 
ADD COLUMN IF NOT EXISTS app_name TEXT;

-- MIGRATION_12_app_settings_V2.sql
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS app_name TEXT;
```

### Paso 2: Actualizar Valores por Defecto

Después de agregar todas las columnas, ejecuta `MIGRATION_UPDATE_DEFAULTS.sql` para actualizar los registros existentes.

**IMPORTANTE:** Si hay muchos registros, ejecuta cada UPDATE por separado:

```sql
-- Ejecuta esto primero
UPDATE users 
SET app_name = 'Opalopy' 
WHERE app_name IS NULL
LIMIT 10000;

-- Si hay más de 10000, ejecuta varias veces hasta que no actualice más
-- Verifica con: SELECT COUNT(*) FROM users WHERE app_name IS NULL;
```

### Paso 3: Actualizar Tablas Relacionadas

Ejecuta los scripts de actualización:
- `MIGRATION_UPDATE_STAGES.sql`
- `MIGRATION_UPDATE_DOCUMENT_CATEGORIES.sql`
- `MIGRATION_UPDATE_ATTACHMENTS.sql`
- `MIGRATION_UPDATE_CANDIDATE_RELATED.sql`

### Paso 4: Crear Índices

Ejecuta `MIGRATION_CREATE_INDEXES.sql`

## ¿Por qué esta versión es más rápida?

- `ALTER TABLE ... ADD COLUMN ... DEFAULT` = Agrega columna + actualiza TODOS los registros de una vez
- `ALTER TABLE ... ADD COLUMN` (sin DEFAULT) = Solo agrega la columna (instantáneo)
- Luego `UPDATE ... LIMIT 10000` = Actualiza en lotes pequeños

## Verificación

```sql
-- Ver cuántos registros faltan por actualizar
SELECT 
    'users' as tabla,
    COUNT(*) FILTER (WHERE app_name IS NULL) as sin_app_name
FROM users
UNION ALL
SELECT 'processes', COUNT(*) FILTER (WHERE app_name IS NULL) FROM processes
UNION ALL
SELECT 'candidates', COUNT(*) FILTER (WHERE app_name IS NULL) FROM candidates;
```

Si todos muestran 0, ¡la migración está completa!

