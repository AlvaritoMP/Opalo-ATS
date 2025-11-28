# Solución para Timeouts en Supabase

## 🔴 Problema

Estás recibiendo errores de timeout en Supabase:

```
"canceling statement due to statement timeout"
```

Esto ocurre cuando las consultas SQL tardan más de lo permitido (generalmente 2-5 segundos en el plan gratuito).

## 🔍 Causas Posibles

1. **Falta de índices**: La tabla `processes` puede no tener índices en `created_at`
2. **Consultas complejas**: Se están cargando procesos con todas sus relaciones (stages, categories, attachments) en paralelo
3. **Tabla grande**: Si tienes muchos procesos, la consulta puede ser lenta
4. **N+1 queries**: Se pueden estar haciendo múltiples consultas por cada proceso

## ✅ Soluciones Implementadas

### ✅ Solución 1: Optimización de Consultas (YA IMPLEMENTADO)

He optimizado las consultas en `lib/api/processes.ts` y `lib/api/candidates.ts` para eliminar el patrón N+1:

**Antes:**
- Para 10 procesos: 1 consulta + (10 × 3) = 31 consultas
- Para 100 candidatos: 1 consulta + (100 × 4) = 401 consultas

**Ahora:**
- Para 10 procesos: 4 consultas totales (1 procesos + 1 stages + 1 categories + 1 attachments)
- Para 100 candidatos: 5 consultas totales (1 candidatos + 1 history + 1 post_its + 1 comments + 1 attachments)

Las relaciones ahora se cargan en batch y se agrupan en memoria, reduciendo drásticamente el número de consultas.

### Solución 2: Agregar Índices (RECOMENDADO - EJECUTAR AHORA)

Ejecuta este SQL en el SQL Editor de Supabase:

```sql
-- Índice para ordenar por created_at (ya debería existir, pero verificar)
CREATE INDEX IF NOT EXISTS idx_processes_created_at ON processes(created_at DESC);

-- Índices para las relaciones (mejoran las consultas de stages, categories, attachments)
CREATE INDEX IF NOT EXISTS idx_stages_process_id ON stages(process_id);
CREATE INDEX IF NOT EXISTS idx_document_categories_process_id ON document_categories(process_id);
CREATE INDEX IF NOT EXISTS idx_attachments_process_id ON attachments(process_id) WHERE candidate_id IS NULL;

-- Índice compuesto para attachments del proceso (sin candidato)
CREATE INDEX IF NOT EXISTS idx_attachments_process_no_candidate ON attachments(process_id, candidate_id) WHERE candidate_id IS NULL;
```

### Solución 2: Optimizar las Consultas

Las consultas actuales cargan todos los procesos con todas sus relaciones. Esto puede ser lento si tienes muchos procesos.

**Opciones:**

1. **Agregar límite y paginación** (para listas grandes)
2. **Cargar relaciones solo cuando se necesiten** (lazy loading)
3. **Usar una sola consulta con JOINs** en lugar de múltiples consultas

### Solución 3: Aumentar el Timeout (Solo para planes pagos)

Si estás en un plan pago de Supabase, puedes aumentar el timeout en la configuración del proyecto.

## 🚀 Implementación Inmediata

### Paso 1: Ejecutar los Índices (CRÍTICO)

Los índices mejorarán significativamente el rendimiento de las consultas optimizadas.

1. Ve a tu proyecto en Supabase: https://supabase.com
2. Ve a **SQL Editor** en el menú lateral
3. Pega el SQL de arriba (Solución 1)
4. Haz clic en **Run**

### Paso 2: Verificar el Rendimiento

Después de agregar los índices:
1. Recarga la aplicación
2. Verifica que los procesos se carguen más rápido
3. Revisa los logs de Supabase para ver si los timeouts desaparecen

### Paso 3: Si el Problema Persiste

Si después de agregar los índices aún tienes problemas:

1. **Considera agregar paginación**: En lugar de cargar todos los procesos, carga solo los primeros 20-50
2. **Lazy loading**: Carga las relaciones (stages, categories) solo cuando se abre un proceso específico
3. **Caché**: Implementa caché en el frontend para evitar recargar datos constantemente

## 📊 Verificar Índices Existentes

Para ver qué índices ya tienes, ejecuta este SQL:

```sql
-- Ver índices en la tabla processes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'processes'
ORDER BY indexname;

-- Ver índices en otras tablas relacionadas
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('stages', 'document_categories', 'attachments')
ORDER BY tablename, indexname;
```

## ⚠️ Nota sobre el Plan Gratuito

El plan gratuito de Supabase tiene:
- Timeout de consultas: ~2-5 segundos
- Límite de conexiones simultáneas
- Límite de ancho de banda

Si tu aplicación crece, considera actualizar a un plan pago.

