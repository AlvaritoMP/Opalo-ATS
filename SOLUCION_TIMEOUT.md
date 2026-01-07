# Solución para Problemas de Timeout

Si incluso el script más simple (`ALTER TABLE users ADD COLUMN app_name TEXT;`) está dando timeout, puede ser por varias razones:

## Posibles Causas

1. **Tabla bloqueada**: Otra operación está bloqueando la tabla
2. **Conexión lenta**: Problema de red o conexión a Supabase
3. **Tabla muy grande**: Aunque sin DEFAULT, puede tomar tiempo en tablas enormes
4. **Locks activos**: Hay transacciones abiertas que están bloqueando

## Soluciones

### 1. Verificar Estado Actual

Primero ejecuta `MIGRATION_VERIFICAR_ESTADO.sql` para ver:
- Si alguna columna ya existe
- El estado actual de las tablas

### 2. Verificar Bloqueos

Ejecuta esto en Supabase SQL Editor para ver si hay bloqueos:

```sql
SELECT 
    pid,
    usename,
    application_name,
    state,
    query,
    query_start,
    now() - query_start AS duration
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;
```

Si ves queries largas, espera a que terminen o cancélalas.

### 3. Verificar Tamaño de Tablas

```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'processes', 'candidates')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 4. Intentar en Horario de Menor Uso

Si la base de datos está muy ocupada, intenta:
- En horarios de menor tráfico
- Cuando no haya otras operaciones ejecutándose

### 5. Usar Supabase Dashboard

En lugar del SQL Editor, intenta:
1. Ve a **Table Editor** en Supabase
2. Selecciona la tabla `users`
3. Ve a **Modify Table**
4. Agrega la columna manualmente desde la interfaz

### 6. Contactar Soporte de Supabase

Si nada funciona, puede ser un problema del lado de Supabase:
- Verifica el estado de tu proyecto en el dashboard
- Revisa los logs de la base de datos
- Contacta soporte si el problema persiste

## Alternativa: Migración Manual

Si los scripts SQL no funcionan, puedes agregar las columnas manualmente desde el Dashboard de Supabase:

1. Ve a **Table Editor**
2. Para cada tabla:
   - Haz clic en la tabla
   - Clic en **Modify Table** o el ícono de configuración
   - Agrega columna: `app_name` tipo `text`
   - Guarda

Luego ejecuta los scripts de actualización de datos.

## Verificar Después de Agregar Manualmente

```sql
-- Verificar que todas las columnas existen
SELECT 
    table_name,
    column_name
FROM information_schema.columns 
WHERE column_name = 'app_name'
ORDER BY table_name;
```

