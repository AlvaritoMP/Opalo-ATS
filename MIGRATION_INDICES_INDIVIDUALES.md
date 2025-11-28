# Ejecutar Índices Uno por Uno (Solución para Timeouts)

## ⚠️ Problema: Timeout Incluso con PARTE 1

Si incluso la PARTE 1 causa timeout, necesitas ejecutar los índices **uno por uno**, esperando entre cada uno.

## ✅ Solución: Índices Individuales

He creado scripts individuales para cada índice crítico. Ejecuta cada uno por separado:

### Paso 1: Índice Más Crítico (PROCESOS)

1. Abre `MIGRATION_INDICE_CRITICO_1.sql`
2. Copia y ejecuta en Supabase SQL Editor
3. **Espera a que termine completamente** (puede tardar 30-60 segundos)
4. Verifica que veas "Índice creado" con el nombre del índice

**Este es el índice más importante** - mejora directamente la consulta que está causando timeouts.

### Paso 2: Índice para Stages

1. **Espera al menos 15-20 segundos** después del anterior
2. Abre `MIGRATION_INDICE_CRITICO_2.sql`
3. Copia y ejecuta
4. Espera a que termine
5. Verifica que se creó

### Paso 3: Índices Adicionales (Opcionales pero Recomendados)

Ejecuta estos índices uno por uno, **esperando 15-20 segundos entre cada uno**:

#### Índice 3: Stages order_index
```sql
CREATE INDEX IF NOT EXISTS idx_stages_order_index ON stages(process_id, order_index);
```

#### Índice 4: Document Categories
```sql
CREATE INDEX IF NOT EXISTS idx_document_categories_process_id ON document_categories(process_id);
```

#### Índice 5: Attachments process_id
```sql
CREATE INDEX IF NOT EXISTS idx_attachments_process_id ON attachments(process_id);
```

#### Índice 6: Attachments sin candidato
```sql
CREATE INDEX IF NOT EXISTS idx_attachments_process_no_candidate ON attachments(process_id, candidate_id) WHERE candidate_id IS NULL;
```

#### Índice 7: Candidatos process_id
```sql
CREATE INDEX IF NOT EXISTS idx_candidates_process_id ON candidates(process_id);
```

#### Índice 8: Candidatos created_at
```sql
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at DESC);
```

#### Índice 9: Candidate History
```sql
CREATE INDEX IF NOT EXISTS idx_candidate_history_candidate_id ON candidate_history(candidate_id);
```

## 🎯 Estrategia Mínima (Solo los Críticos)

Si solo puedes crear algunos índices, prioriza estos **3 más críticos**:

1. ✅ `idx_processes_created_at_desc` - **MÁS IMPORTANTE**
2. ✅ `idx_stages_process_id` - Muy importante
3. ✅ `idx_candidates_process_id` - Importante

Con solo estos 3 índices, verás una mejora significativa.

## ⏱️ Tiempo Estimado

- **Cada índice individual**: 30-60 segundos
- **3 índices críticos**: ~3-5 minutos total
- **Todos los índices**: ~10-15 minutos (ejecutando uno por uno)

## 🔍 Verificar Índices Existentes

Antes de crear índices, verifica cuáles ya existen:

```sql
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('processes', 'stages', 'candidates', 'attachments')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

Si un índice ya existe, no necesitas crearlo de nuevo.

## 💡 Consejos para Evitar Timeouts

1. **Ejecuta en horas de menor tráfico** - Si tu app tiene usuarios activos, espera a que haya menos tráfico
2. **Espera entre índices** - No ejecutes el siguiente hasta que el anterior termine completamente
3. **Empieza con los críticos** - Los primeros 3 índices dan el 80% de la mejora
4. **Verifica antes de crear** - Usa el query de verificación para ver qué índices ya existen

## ⚠️ Si Aún Tienes Timeouts

Si incluso un índice individual causa timeout:

1. **Verifica el estado de Supabase** - Ve a Dashboard → Database → Connection Pooling para ver si hay problemas
2. **Intenta en otro momento** - Puede haber carga alta en el servidor
3. **Considera actualizar el plan** - Los planes gratuitos tienen límites más estrictos
4. **Los índices no son críticos** - Las optimizaciones de código ya resuelven los timeouts. Los índices son un "bonus" de rendimiento

## 📊 Después de Crear los Índices

1. **Recarga tu aplicación**
2. **Prueba cargar procesos y candidatos**
3. **Verifica que no haya más timeouts en los logs**

## ✅ Lo Más Importante

**Recuerda**: Las optimizaciones de código que ya implementamos (cargar en batch) son las que realmente eliminan los timeouts. Los índices mejoran el rendimiento, pero **no son críticos** para que la aplicación funcione.

Si no puedes crear los índices ahora, la aplicación seguirá funcionando mucho mejor que antes gracias a las optimizaciones de código.

