# 🔍 Solución: Proceso No Aparece en la Aplicación

## 🔴 Problema

El proceso existe en la base de datos con `app_name = 'Opalo ATS'` correcto, pero no aparece en la aplicación.

---

## ✅ Diagnóstico

### Paso 1: Ejecutar Script de Diagnóstico

1. Ve a **Supabase Dashboard** > **SQL Editor**
2. Ejecuta el script: **`DIAGNOSTICO_PROCESO_NO_APARECE.sql`**

Este script verificará:
- ✅ El proceso y su `app_name`
- ✅ Si tiene stages asociados
- ✅ Si tiene document_categories asociados
- ✅ Las políticas RLS
- ✅ La query exacta que usa la aplicación

### Paso 2: Verificar en la Consola del Navegador

1. Abre la aplicación en el navegador
2. Abre la consola (F12 → Console)
3. Busca estos mensajes:

**Si hay errores:**
```
❌ Failed to load processes from Supabase: [error]
⚠️ Error cargando stages, continuando sin stages: [error]
⚠️ Error cargando document_categories, continuando sin categorías: [error]
```

**Si no hay errores pero no aparece:**
```
✓ Loaded processes from Supabase
```
Pero la lista está vacía.

---

## 🔧 Soluciones Posibles

### Solución 1: Verificar que el Proceso Tiene Stages

Si el proceso no tiene stages, puede que la aplicación no lo muestre correctamente. Verifica:

```sql
SELECT 
    p.id,
    p.title,
    COUNT(s.id) as cantidad_stages
FROM processes p
LEFT JOIN stages s ON s.process_id = p.id AND s.app_name = 'Opalo ATS'
WHERE p.app_name = 'Opalo ATS'
GROUP BY p.id, p.title;
```

Si el proceso no tiene stages, créalos desde la aplicación editando el proceso.

### Solución 2: Verificar Políticas RLS

Si las políticas RLS no están correctas, el proceso no se cargará. Verifica:

```sql
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'processes';
```

Debe haber políticas para SELECT, INSERT, UPDATE, DELETE con `app_name = 'Opalo ATS'`.

### Solución 3: Verificar que la Query Funciona Directamente

Prueba la query exacta que usa la aplicación:

```sql
SELECT 
    id, 
    title, 
    app_name, 
    client_id
FROM processes
WHERE app_name = 'Opalo ATS'
ORDER BY created_at DESC
LIMIT 200;
```

Si esta query retorna el proceso pero la app no lo muestra, el problema está en:
- Las queries de stages/document_categories que están fallando
- El código de la aplicación
- Las políticas RLS en stages/document_categories

---

## 🔧 Código Actualizado

He actualizado el código para que sea más robusto:

- ✅ Si la query de `stages` falla, el proceso se carga sin stages (array vacío)
- ✅ Si la query de `document_categories` falla, el proceso se carga sin categorías (array vacío)
- ✅ Si la query de `attachments` falla, el proceso se carga sin attachments (array vacío)

Esto asegura que el proceso se cargue incluso si hay problemas con las relaciones.

---

## 📋 Checklist

- [ ] Ejecutar `DIAGNOSTICO_PROCESO_NO_APARECE.sql` en Supabase
- [ ] Verificar que el proceso aparece en la query directa
- [ ] Verificar que el proceso tiene `app_name = 'Opalo ATS'`
- [ ] Verificar que las políticas RLS están correctas
- [ ] Verificar la consola del navegador para errores
- [ ] Recargar la aplicación (hard refresh: Ctrl+Shift+R)
- [ ] Verificar que el proceso aparece en la lista

---

## 🆘 Si Aún No Funciona

### Verificar Errores Específicos

1. Abre la consola del navegador (F12)
2. Busca errores específicos:
   - `Failed to load processes from Supabase`
   - `Error cargando stages`
   - `Error cargando document_categories`
   - `401 Unauthorized`
   - `403 Forbidden`

### Verificar Políticas RLS en Stages y Document Categories

Si las políticas RLS en `stages` o `document_categories` están bloqueando el acceso:

```sql
-- Verificar políticas en stages
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'stages';

-- Verificar políticas en document_categories
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'document_categories';
```

Deben tener políticas para el rol `anon` con `app_name = 'Opalo ATS'`.

---

## ✅ Resultado Esperado

Después de aplicar la solución:

- ✅ El proceso aparece en la aplicación
- ✅ El proceso se carga correctamente al iniciar la app
- ✅ No hay errores en la consola del navegador
- ✅ El proceso puede editarse normalmente
- ✅ Si el proceso no tiene stages, se pueden agregar editándolo

---

## 💡 Nota Importante

El código ahora es más robusto y maneja errores en las queries de relaciones. Si una query falla, el proceso se carga con arrays vacíos para esa relación, en lugar de fallar completamente.
