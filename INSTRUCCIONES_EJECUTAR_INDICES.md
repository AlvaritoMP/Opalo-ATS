# Instrucciones para Ejecutar los Índices en Supabase

## ⚠️ Problema: Timeout al Ejecutar el Script Completo

Si obtuviste el error "Connection terminated due to connection timeout", es porque el script completo es demasiado grande para ejecutarlo de una vez. 

## ✅ Solución: Ejecutar en Partes

He dividido el script en 3 partes más pequeñas. Ejecuta cada una por separado:

### Paso 1: Ejecutar PARTE 1

1. Ve a Supabase Dashboard: https://supabase.com
2. Selecciona tu proyecto
3. Ve a **SQL Editor** en el menú lateral
4. Abre el archivo `MIGRATION_ADD_INDEXES_PERFORMANCE_PARTE1.sql`
5. Copia y pega el contenido completo
6. Haz clic en **Run** (o presiona Ctrl+Enter)
7. **Espera a que termine completamente** (puede tardar 10-30 segundos)
8. Verifica que veas el mensaje "Parte 1 completada" con la lista de índices creados

### Paso 2: Ejecutar PARTE 2

1. **Espera al menos 10 segundos** después de que termine PARTE 1
2. Abre el archivo `MIGRATION_ADD_INDEXES_PERFORMANCE_PARTE2.sql`
3. Copia y pega el contenido completo
4. Haz clic en **Run**
5. **Espera a que termine completamente**
6. Verifica que veas el mensaje "Parte 2 completada"

### Paso 3: Ejecutar PARTE 3

1. **Espera al menos 10 segundos** después de que termine PARTE 2
2. Abre el archivo `MIGRATION_ADD_INDEXES_PERFORMANCE_PARTE3.sql`
3. Copia y pega el contenido completo
4. Haz clic en **Run**
5. **Espera a que termine completamente**
6. Verifica que veas el mensaje "Parte 3 completada"

## 🔍 Verificar que Todos los Índices se Crearon

Después de ejecutar las 3 partes, ejecuta este SQL para verificar:

```sql
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('processes', 'stages', 'document_categories', 'attachments', 'candidates', 'candidate_history', 'post_its', 'comments')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

Deberías ver al menos estos índices:

**processes:**
- idx_processes_created_at_desc

**stages:**
- idx_stages_process_id
- idx_stages_order_index

**document_categories:**
- idx_document_categories_process_id

**attachments:**
- idx_attachments_process_id
- idx_attachments_process_no_candidate

**candidates:**
- idx_candidates_process_id
- idx_candidates_stage_id
- idx_candidates_archived
- idx_candidates_created_at

**candidate_history:**
- idx_candidate_history_candidate_id
- idx_candidate_history_moved_at

**post_its:**
- idx_post_its_candidate_id

**comments:**
- idx_comments_candidate_id

## ⚠️ Si Aún Tienes Problemas

### Opción A: Ejecutar Índices Individuales

Si incluso las partes causan timeout, ejecuta los índices uno por uno:

```sql
-- Solo este índice primero
CREATE INDEX IF NOT EXISTS idx_processes_created_at_desc ON processes(created_at DESC);
```

Espera a que termine, luego ejecuta el siguiente, etc.

### Opción B: Verificar Índices Existentes

Antes de crear índices, verifica cuáles ya existen:

```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('processes', 'stages', 'candidates')
ORDER BY tablename, indexname;
```

Si un índice ya existe, no necesitas crearlo de nuevo (el `IF NOT EXISTS` lo evita, pero es bueno saberlo).

### Opción C: Crear Índices en Horas de Menor Tráfico

Si tu aplicación tiene mucho tráfico, los índices pueden tardar más en crearse. Intenta ejecutarlos cuando haya menos usuarios activos.

## 📊 Después de Crear los Índices

1. **Recarga tu aplicación** - Los cambios son inmediatos
2. **Prueba cargar procesos y candidatos** - Deberían cargar más rápido
3. **Verifica los logs de Supabase** - No deberías ver más timeouts

## 💡 Nota Importante

Los índices mejoran el rendimiento de las consultas, pero las optimizaciones de código que ya implementamos (cargar en batch) son las que realmente eliminan los timeouts. Los índices son un "bonus" que hace todo aún más rápido.

Si no puedes crear los índices ahora, la aplicación seguirá funcionando mejor gracias a las optimizaciones de código, solo será un poco más lenta que con los índices.

