# 📋 Guía de Integración: Gestión de Clientes en Procesos

## ✅ Funcionalidad Implementada

Se ha agregado la capacidad de asociar clientes a los procesos en Opalo ATS. Los clientes se gestionan desde la configuración y pueden ser seleccionados al crear o editar procesos.

---

## 🗄️ Cambios en la Base de Datos

### 1. Nueva Tabla: `clients`

La tabla `clients` almacena la información de los clientes:

- `id` (UUID): Identificador único
- `razon_social` (TEXT): Razón social del cliente
- `ruc` (TEXT): RUC del cliente (único por app)
- `app_name` (TEXT): Nombre de la aplicación (multi-tenant)
- `created_at` (TIMESTAMP): Fecha de creación
- `updated_at` (TIMESTAMP): Fecha de última actualización

### 2. Modificación en Tabla: `processes`

Se agregó el campo `client_id` a la tabla `processes`:

- `client_id` (UUID): Referencia al cliente (opcional, puede ser NULL)
- Foreign Key a `clients(id)` con `ON DELETE SET NULL`

### 3. Políticas RLS

Se crearon políticas de Row Level Security (RLS) para la tabla `clients`:
- SELECT: Permitir leer clientes de Opalo ATS
- INSERT: Permitir crear clientes de Opalo ATS
- UPDATE: Permitir actualizar clientes de Opalo ATS
- DELETE: Permitir eliminar clientes de Opalo ATS

---

## 📝 Pasos para Aplicar los Cambios

### Paso 1: Ejecutar Migración SQL

1. Ve a **Supabase Dashboard** > **SQL Editor**
2. Ejecuta el archivo: **`MIGRATION_ADD_CLIENTS.sql`**

Este script:
- ✅ Crea la tabla `clients`
- ✅ Agrega el campo `client_id` a `processes`
- ✅ Crea índices para optimizar búsquedas
- ✅ Habilita RLS y crea políticas de seguridad
- ✅ Crea trigger para actualizar `updated_at` automáticamente

### Paso 2: Verificar la Migración

Después de ejecutar, verifica que:
- La tabla `clients` existe
- El campo `client_id` existe en `processes`
- Las políticas RLS están creadas

Puedes ejecutar esta consulta para verificar:

```sql
-- Verificar tabla clients
SELECT * FROM clients LIMIT 1;

-- Verificar campo client_id en processes
SELECT id, title, client_id FROM processes LIMIT 1;

-- Verificar políticas RLS
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'clients';
```

---

## 🎨 Cambios en la Interfaz

### 1. Configuración > Clientes

**Ubicación**: Settings > Sección "Clientes"

**Funcionalidades**:
- ✅ Ver lista de clientes (Razón Social y RUC)
- ✅ Crear nuevo cliente
- ✅ Editar cliente existente
- ✅ Eliminar cliente (con confirmación)

**Campos del formulario**:
- **Razón Social** (requerido): Nombre legal de la empresa
- **RUC** (requerido): Número de RUC (único por app)

### 2. Crear/Editar Proceso > Selector de Cliente

**Ubicación**: Modal de crear/editar proceso

**Funcionalidades**:
- ✅ Selector dropdown con lista de clientes
- ✅ Opción "Sin cliente" (valor por defecto)
- ✅ Muestra Razón Social y RUC en el selector
- ✅ Guarda la asociación al crear/actualizar proceso

---

## 💻 Cambios en el Código

### Archivos Modificados/Creados

1. **`MIGRATION_ADD_CLIENTS.sql`**
   - Migración de base de datos

2. **`types.ts`**
   - Agregado interface `Client`
   - Agregado `clientId?: string` y `client?: Client` a `Process`

3. **`lib/api/clients.ts`** (NUEVO)
   - API completa para CRUD de clientes
   - Funciones: `getAll()`, `getById()`, `create()`, `update()`, `delete()`

4. **`lib/api/processes.ts`**
   - Actualizado `dbToProcess()` para incluir `clientId` y `client`
   - Actualizado `processToDb()` para incluir `client_id`
   - Actualizado query `getAll()` para incluir `client_id`

5. **`lib/api/index.ts`**
   - Exportado `clientsApi`

6. **`components/Settings.tsx`**
   - Agregada sección "Clientes" con gestión completa
   - Modal para crear/editar clientes

7. **`components/ProcessEditorModal.tsx`**
   - Agregado selector de cliente en el formulario
   - Carga lista de clientes al abrir el modal
   - Guarda `clientId` al crear/actualizar proceso

---

## 🧪 Pruebas Recomendadas

### 1. Crear Cliente
1. Ve a **Settings** > **Clientes**
2. Haz clic en **"Nuevo Cliente"**
3. Completa Razón Social y RUC
4. Haz clic en **"Crear"**
5. ✅ Verifica que aparece en la lista

### 2. Editar Cliente
1. En la lista de clientes, haz clic en el ícono de editar
2. Modifica los datos
3. Haz clic en **"Actualizar"**
4. ✅ Verifica que los cambios se guardaron

### 3. Eliminar Cliente
1. En la lista de clientes, haz clic en el ícono de eliminar
2. Confirma la eliminación
3. ✅ Verifica que desaparece de la lista

### 4. Asignar Cliente a Proceso
1. Crea o edita un proceso
2. En el campo **"Cliente"**, selecciona un cliente
3. Guarda el proceso
4. ✅ Verifica que el cliente se guardó correctamente

### 5. Proceso Sin Cliente
1. Crea un proceso sin seleccionar cliente (deja "Sin cliente")
2. Guarda el proceso
3. ✅ Verifica que el proceso se guarda correctamente sin cliente

### 6. Validación de RUC Único
1. Intenta crear un cliente con un RUC que ya existe
2. ✅ Debe mostrar un error indicando que el RUC ya existe

---

## 🔒 Seguridad

- ✅ RLS habilitado en la tabla `clients`
- ✅ Políticas que filtran por `app_name = 'Opalo ATS'`
- ✅ No afecta datos de otras aplicaciones (Opalopy)
- ✅ Foreign Key con `ON DELETE SET NULL` (si se elimina un cliente, los procesos no se eliminan)

---

## 📊 Consideraciones

### RUC Único
- El RUC es único por aplicación (`app_name`)
- Si intentas crear un cliente con un RUC que ya existe, obtendrás un error
- Esto evita duplicados dentro de la misma aplicación

### Eliminación de Clientes
- Si eliminas un cliente que está asociado a procesos, los procesos **NO se eliminan**
- El campo `client_id` en los procesos se establece en `NULL` automáticamente
- Los procesos quedan sin cliente asignado

### Multi-tenant
- Los clientes están aislados por `app_name`
- Cada aplicación (Opalo ATS, Opalopy) tiene su propia lista de clientes
- No hay interferencia entre aplicaciones

---

## 🆘 Solución de Problemas

### Error: "duplicate key value violates unique constraint"
- **Causa**: Intentaste crear un cliente con un RUC que ya existe
- **Solución**: Usa un RUC diferente o edita el cliente existente

### Error: "relation 'clients' does not exist"
- **Causa**: No se ejecutó la migración SQL
- **Solución**: Ejecuta `MIGRATION_ADD_CLIENTS.sql` en Supabase SQL Editor

### El selector de cliente está vacío
- **Causa**: No hay clientes creados o hay un error al cargar
- **Solución**: 
  1. Ve a Settings > Clientes y crea al menos un cliente
  2. Verifica la consola del navegador para errores
  3. Verifica que las políticas RLS estén correctas

### No puedo crear/editar clientes
- **Causa**: Políticas RLS incorrectas o falta de permisos
- **Solución**: 
  1. Verifica que las políticas RLS estén creadas (ver Paso 2)
  2. Verifica que estés usando la anon key correcta
  3. Verifica que `app_name` se esté estableciendo correctamente

---

## ✅ Checklist de Implementación

- [ ] Ejecutar `MIGRATION_ADD_CLIENTS.sql` en Supabase
- [ ] Verificar que la tabla `clients` existe
- [ ] Verificar que el campo `client_id` existe en `processes`
- [ ] Verificar que las políticas RLS están creadas
- [ ] Probar crear un cliente en Settings
- [ ] Probar editar un cliente
- [ ] Probar eliminar un cliente
- [ ] Probar asignar cliente a un proceso
- [ ] Probar crear proceso sin cliente
- [ ] Verificar que los datos se guardan correctamente

---

## 🎉 ¡Listo!

La funcionalidad de gestión de clientes está completamente implementada y lista para usar. Los usuarios pueden ahora:

1. ✅ Crear y gestionar clientes desde Settings
2. ✅ Asignar clientes a procesos al crearlos o editarlos
3. ✅ Ver qué procesos pertenecen a qué clientes

¡Disfruta de la nueva funcionalidad! 🚀
