# Instrucciones para Agregar Columnas Manualmente en Supabase

Si los scripts SQL están dando timeout, la mejor opción es agregar las columnas manualmente desde el Dashboard de Supabase.

## Paso 1: Acceder al Table Editor

1. Ve a tu proyecto en Supabase: https://supabase.com
2. En el menú lateral, haz clic en **"Table Editor"**
3. Verás una lista de todas tus tablas

## Paso 2: Agregar Columna `app_name` a cada tabla

Para cada una de estas tablas, sigue estos pasos:

### Tabla: `users`
1. Haz clic en la tabla `users`
2. Haz clic en el ícono de **configuración** (⚙️) o busca "Modify Table"
3. Haz clic en **"Add Column"** o **"Add a new column"**
4. Completa:
   - **Name**: `app_name`
   - **Type**: `text`
   - **Default value**: (deja vacío por ahora)
   - **Is nullable**: ✅ Sí (marca la casilla)
5. Haz clic en **"Save"** o **"Add Column"**

### Repite para estas tablas:
- ✅ `processes`
- ✅ `candidates`
- ✅ `stages`
- ✅ `document_categories`
- ✅ `attachments`
- ✅ `candidate_history`
- ✅ `post_its`
- ✅ `comments`
- ✅ `interview_events`
- ✅ `form_integrations`
- ✅ `app_settings`

**Para todas las tablas:**
- **Name**: `app_name`
- **Type**: `text`
- **Default value**: (vacío)
- **Is nullable**: ✅ Sí

## Paso 3: Verificar que se agregaron

Después de agregar todas las columnas, ejecuta este script simple:

```sql
SELECT table_name 
FROM information_schema.columns 
WHERE column_name = 'app_name'
ORDER BY table_name;
```

Deberías ver las 12 tablas listadas.

## Paso 4: Actualizar Valores por Defecto

Una vez que todas las columnas estén agregadas, ejecuta los scripts de actualización:

1. `MIGRATION_UPDATE_DEFAULTS.sql` - Actualiza users, processes, candidates, etc.
2. `MIGRATION_UPDATE_STAGES.sql` - Actualiza stages
3. `MIGRATION_UPDATE_DOCUMENT_CATEGORIES.sql` - Actualiza document_categories
4. `MIGRATION_UPDATE_ATTACHMENTS.sql` - Actualiza attachments
5. `MIGRATION_UPDATE_CANDIDATE_RELATED.sql` - Actualiza tablas relacionadas

## Paso 5: Crear Índices

Ejecuta `MIGRATION_CREATE_INDEXES.sql` para crear los índices.

## Alternativa: Usar SQL Editor con Scripts Pequeños

Si prefieres usar SQL pero los scripts completos dan timeout:

1. Abre el **SQL Editor** en Supabase
2. Para cada tabla, ejecuta solo esta línea:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS app_name TEXT;
```

3. Espera a que termine antes de ejecutar el siguiente
4. Repite para cada tabla

## Notas

- Si una columna ya existe, no causará error gracias a `IF NOT EXISTS`
- Puedes ejecutar los scripts de actualización después de agregar todas las columnas
- Los índices se pueden crear al final

## Si Nada Funciona

Si incluso agregar manualmente da problemas:

1. Verifica el estado de tu proyecto en Supabase Dashboard
2. Revisa los logs de la base de datos
3. Verifica que no haya operaciones largas ejecutándose
4. Intenta en otro momento (puede haber mantenimiento)
5. Contacta soporte de Supabase si el problema persiste

