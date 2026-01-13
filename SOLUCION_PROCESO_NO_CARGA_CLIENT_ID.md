# 🔍 Solución: Proceso No Se Carga - Posible Problema con client_id

## 🔴 Problema

El proceso de Opalo ATS existe en la base de datos con `app_name = 'Opalo ATS'` correcto, pero no se carga en la aplicación. Posible causa: el proceso tiene `client_id` pero la tabla `clients` no existe aún.

---

## ✅ Diagnóstico

### Paso 1: Verificar el Proceso Específico

1. Ve a **Supabase Dashboard** > **SQL Editor**
2. Ejecuta el script: **`VERIFICAR_PROCESO_ESPECIFICO.sql`**

Este script te mostrará:
- El proceso de Opalo ATS
- Si la tabla `clients` existe
- Si el proceso tiene `client_id` y si ese cliente existe
- Si hay problemas de foreign key

### Paso 2: Verificar en la Consola del Navegador

1. Abre la aplicación en el navegador
2. Abre la consola (F12 → Console)
3. Busca errores relacionados con:
   - `clients`
   - `foreign key`
   - `relation "clients" does not exist`
   - `Failed to load processes`

---

## 🔧 Soluciones

### Solución 1: Ejecutar Migración de Clients (Si No Se Ha Ejecutado)

Si la tabla `clients` no existe:

1. Ve a **Supabase Dashboard** > **SQL Editor**
2. Ejecuta el script: **`MIGRATION_ADD_CLIENTS.sql`**

Este script:
- ✅ Crea la tabla `clients`
- ✅ Agrega el campo `client_id` a `processes` (si no existe)
- ✅ Crea las políticas RLS
- ✅ Crea los índices necesarios

### Solución 2: Establecer client_id a NULL (Temporal)

Si el proceso tiene un `client_id` que apunta a un cliente inexistente:

```sql
-- Establecer client_id a NULL para el proceso de Opalo ATS
UPDATE processes
SET client_id = NULL
WHERE app_name = 'Opalo ATS' AND client_id IS NOT NULL;
```

### Solución 3: Verificar Errores en la Query

Si la tabla `clients` existe pero hay un error en la query, puede ser que:

1. **La query esté intentando hacer JOIN con clients** (aunque no debería)
2. **Hay un error de permisos RLS** en la tabla `clients`
3. **Hay un error de foreign key constraint**

---

## 🔍 Verificación Post-Solución

Después de aplicar la solución:

1. **Recarga la aplicación** en el navegador
2. **Verifica la consola** - deberías ver:
   ```
   ✓ Loaded processes from Supabase
   ```
3. **Verifica la lista de procesos** - el proceso debería aparecer

---

## 📋 Checklist

- [ ] Ejecutar `VERIFICAR_PROCESO_ESPECIFICO.sql` para diagnosticar
- [ ] Verificar si la tabla `clients` existe
- [ ] Verificar si el proceso tiene `client_id` y si es válido
- [ ] Si la tabla `clients` no existe, ejecutar `MIGRATION_ADD_CLIENTS.sql`
- [ ] Si el proceso tiene `client_id` inválido, establecerlo a NULL
- [ ] Recargar la aplicación
- [ ] Verificar que el proceso aparece en la lista

---

## 🆘 Si Aún No Funciona

### Verificar Errores en la Consola

1. Abre la consola del navegador (F12)
2. Busca errores específicos:
   - `Failed to load processes from Supabase`
   - `relation "clients" does not exist`
   - `foreign key constraint`
   - `401 Unauthorized`
   - `403 Forbidden`

### Verificar Políticas RLS

1. Ejecuta `VERIFICAR_RLS_Y_POLITICAS_SIMPLE.sql`
2. Verifica que hay políticas para el rol `anon` en:
   - Tabla `processes`
   - Tabla `clients` (si existe)

### Verificar la Query Directamente

Puedes probar la query directamente en Supabase:

```sql
SELECT 
    id, 
    title, 
    app_name, 
    client_id
FROM processes
WHERE app_name = 'Opalo ATS';
```

Si esta query funciona pero la app no carga, el problema está en:
- Las políticas RLS
- El código de la aplicación
- Las variables de entorno

---

## 💡 Nota Importante

El campo `client_id` es **opcional** (puede ser NULL). Si el proceso no tiene cliente asignado, debería cargarse normalmente. El problema solo ocurre si:

1. El proceso tiene `client_id` pero la tabla `clients` no existe
2. El proceso tiene `client_id` que apunta a un cliente inexistente
3. Hay un error de foreign key constraint

---

## ✅ Resultado Esperado

Después de aplicar la solución:

- ✅ El proceso de Opalo ATS aparece en la aplicación
- ✅ El proceso se carga correctamente al iniciar la app
- ✅ No hay errores en la consola del navegador
- ✅ El proceso puede editarse y asignarse un cliente si es necesario
