# Instrucciones para Ejecutar la Migración Multi-Tenant

El script original era demasiado largo y causaba timeout. Se ha dividido en 4 partes más pequeñas.

## Orden de Ejecución

Ejecuta los scripts en este orden en el SQL Editor de Supabase:

### 1. Parte 1: Agregar Columnas
**Archivo:** `MIGRATION_ADD_APP_NAME_PARTE1.sql`
- ✅ Agrega las columnas `app_name` a todas las tablas
- ⏱️ Tiempo estimado: 1-2 segundos
- ✅ Es seguro ejecutarlo múltiples veces

### 2. Parte 2: Actualizar Datos (Tablas Principales)
**Archivo:** `MIGRATION_ADD_APP_NAME_PARTE2.sql`
- ✅ Actualiza `stages`, `document_categories` y `attachments`
- ⏱️ Tiempo estimado: 5-30 segundos (depende del tamaño de la BD)
- ⚠️ Si hay muchos datos, puede tardar un poco

### 3. Parte 3: Actualizar Datos (Tablas Relacionadas)
**Archivo:** `MIGRATION_ADD_APP_NAME_PARTE3.sql`
- ✅ Actualiza `candidate_history`, `post_its`, `comments` y `interview_events`
- ⏱️ Tiempo estimado: 5-30 segundos
- ⚠️ Si hay muchos datos, puede tardar un poco

### 4. Parte 4: Crear Índices
**Archivo:** `MIGRATION_ADD_APP_NAME_PARTE4.sql`
- ✅ Crea índices para mejorar el rendimiento
- ⏱️ Tiempo estimado: 2-5 segundos
- ✅ Es seguro ejecutarlo múltiples veces

### 5. Verificación (Opcional)
**Archivo:** `MIGRATION_ADD_APP_NAME_VERIFICACION.sql`
- ✅ Verifica que todo se completó correctamente
- 📊 Muestra estadísticas de distribución de datos

## Pasos Detallados

1. **Abre Supabase SQL Editor**
   - Ve a tu proyecto en Supabase
   - Abre el SQL Editor

2. **Ejecuta Parte 1**
   - Copia y pega el contenido de `MIGRATION_ADD_APP_NAME_PARTE1.sql`
   - Haz clic en "Run"
   - Espera a que termine (debería ser rápido)

3. **Ejecuta Parte 2**
   - Copia y pega el contenido de `MIGRATION_ADD_APP_NAME_PARTE2.sql`
   - Haz clic en "Run"
   - Espera a que termine

4. **Ejecuta Parte 3**
   - Copia y pega el contenido de `MIGRATION_ADD_APP_NAME_PARTE3.sql`
   - Haz clic en "Run"
   - Espera a que termine

5. **Ejecuta Parte 4**
   - Copia y pega el contenido de `MIGRATION_ADD_APP_NAME_PARTE4.sql`
   - Haz clic en "Run"
   - Espera a que termine

6. **Verifica (Opcional)**
   - Copia y pega el contenido de `MIGRATION_ADD_APP_NAME_VERIFICACION.sql`
   - Haz clic en "Run"
   - Revisa los resultados

## Solución de Problemas

### Si una parte da timeout:
- Espera unos minutos y vuelve a intentar esa parte específica
- Las partes están diseñadas para ser idempotentes (puedes ejecutarlas múltiples veces)

### Si hay errores de "columna ya existe":
- Es normal, significa que ya se ejecutó esa parte
- Puedes continuar con la siguiente parte

### Si hay registros sin app_name después de ejecutar todo:
- Ejecuta esta consulta para corregirlos:
```sql
-- Corregir registros huérfanos
UPDATE stages SET app_name = 'Opalopy' WHERE app_name IS NULL;
UPDATE document_categories SET app_name = 'Opalopy' WHERE app_name IS NULL;
UPDATE attachments SET app_name = 'Opalopy' WHERE app_name IS NULL;
UPDATE candidate_history SET app_name = 'Opalopy' WHERE app_name IS NULL;
UPDATE post_its SET app_name = 'Opalopy' WHERE app_name IS NULL;
UPDATE comments SET app_name = 'Opalopy' WHERE app_name IS NULL;
UPDATE interview_events SET app_name = 'Opalopy' WHERE app_name IS NULL;
```

## Verificación Final

Después de ejecutar todas las partes, deberías poder:

1. Ver que todas las tablas tienen la columna `app_name`
2. Ver que los datos existentes tienen `app_name = 'Opalopy'`
3. Ver que los índices se crearon correctamente

Una vez completado, Opalo ATS podrá crear nuevos registros con `app_name = 'Opalo ATS'` y estarán completamente aislados de Opalopy.

