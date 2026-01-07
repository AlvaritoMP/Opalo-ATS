# Instrucciones Simplificadas para la Migración

El script completo causaba timeout. Ahora está dividido en scripts muy pequeños, uno por tabla.

## ⚠️ IMPORTANTE: Ejecuta UNO por UNO

Cada script es independiente y muy pequeño. Ejecuta cada uno por separado en el SQL Editor de Supabase.

## Paso 1: Agregar Columnas (Ejecuta en orden)

Ejecuta estos scripts uno por uno, esperando a que cada uno termine:

1. ✅ `MIGRATION_01_users.sql`
2. ✅ `MIGRATION_02_processes.sql`
3. ✅ `MIGRATION_03_candidates.sql`
4. ✅ `MIGRATION_04_stages.sql`
5. ✅ `MIGRATION_05_document_categories.sql`
6. ✅ `MIGRATION_06_attachments.sql`
7. ✅ `MIGRATION_07_candidate_history.sql`
8. ✅ `MIGRATION_08_post_its.sql`
9. ✅ `MIGRATION_09_comments.sql`
10. ✅ `MIGRATION_10_interview_events.sql`
11. ✅ `MIGRATION_11_form_integrations.sql`
12. ✅ `MIGRATION_12_app_settings.sql`

**Cada uno debería tomar menos de 1 segundo.**

## Paso 2: Actualizar Datos Existentes

Después de agregar todas las columnas, actualiza los datos:

### 2.1. Stages
- Ejecuta `MIGRATION_UPDATE_STAGES.sql`
- Si hay muchos registros, ejecútalo varias veces hasta que no actualice más registros
- Verifica con: `SELECT COUNT(*) FROM stages WHERE app_name IS NULL;`

### 2.2. Document Categories
- Ejecuta `MIGRATION_UPDATE_DOCUMENT_CATEGORIES.sql`
- Ejecuta varias veces si es necesario

### 2.3. Attachments
- Ejecuta `MIGRATION_UPDATE_ATTACHMENTS.sql`
- Descomenta y ejecuta los otros bloques si es necesario

### 2.4. Tablas relacionadas con candidates
- Ejecuta `MIGRATION_UPDATE_CANDIDATE_RELATED.sql`
- Descomenta y ejecuta cada bloque por separado si hay muchos datos

## Paso 3: Crear Índices

Ejecuta `MIGRATION_CREATE_INDEXES.sql` (puede tomar unos segundos)

## Verificación

Ejecuta esta consulta para verificar:

```sql
SELECT 
    table_name,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE app_name IS NOT NULL) as con_app_name,
    COUNT(*) FILTER (WHERE app_name IS NULL) as sin_app_name
FROM (
    SELECT 'users' as table_name, app_name FROM users
    UNION ALL SELECT 'processes', app_name FROM processes
    UNION ALL SELECT 'candidates', app_name FROM candidates
    UNION ALL SELECT 'stages', app_name FROM stages
    UNION ALL SELECT 'document_categories', app_name FROM document_categories
    UNION ALL SELECT 'attachments', app_name FROM attachments
    UNION ALL SELECT 'candidate_history', app_name FROM candidate_history
    UNION ALL SELECT 'post_its', app_name FROM post_its
    UNION ALL SELECT 'comments', app_name FROM comments
    UNION ALL SELECT 'interview_events', app_name FROM interview_events
) t
GROUP BY table_name
ORDER BY table_name;
```

## Si un script da timeout

1. Espera 30 segundos
2. Verifica si la columna se creó: `SELECT column_name FROM information_schema.columns WHERE table_name = 'nombre_tabla' AND column_name = 'app_name';`
3. Si la columna ya existe, continúa con el siguiente script
4. Si no existe, intenta ejecutarlo de nuevo

## Notas

- Todos los scripts usan `IF NOT EXISTS`, así que son seguros de ejecutar múltiples veces
- Los scripts de actualización usan `LIMIT 1000` para evitar timeout
- Si hay muchos datos, ejecuta los scripts de actualización varias veces

