# Guía Completa: Migración Multi-Tenant Opalo ATS / Opalopy

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [¿Qué se Hizo?](#qué-se-hizo)
3. [Cambios en la Base de Datos](#cambios-en-la-base-de-datos)
4. [Cambios en el Código de Opalo ATS](#cambios-en-el-código-de-opalo-ats)
5. [Cambios Necesarios en Opalopy](#cambios-necesarios-en-opalopy)
6. [Instrucciones Paso a Paso para Opalopy](#instrucciones-paso-a-paso-para-opalopy)
7. [Verificación y Testing](#verificación-y-testing)
8. [Solución de Problemas](#solución-de-problemas)

---

## 🎯 Resumen Ejecutivo

### Objetivo
Permitir que **Opalo ATS** y **Opalopy** compartan la misma base de datos de Supabase, pero manteniendo sus datos completamente aislados mediante el campo `app_name`.

### Estado Actual
- ✅ **Base de Datos**: Migración completada - Todas las tablas tienen columna `app_name`
- ✅ **Opalo ATS**: Código actualizado - Filtra y asigna `app_name = 'Opalo ATS'`
- ⚠️ **Opalopy**: **PENDIENTE** - Necesita actualización de código

### Resultado Esperado
- Opalopy solo ve y puede modificar datos con `app_name = 'Opalopy'`
- Opalo ATS solo ve y puede modificar datos con `app_name = 'Opalo ATS'`
- Los datos están completamente aislados aunque compartan la misma BD

---

## 🔍 ¿Qué se Hizo?

### 1. Migración de Base de Datos

Se ejecutó el script `MIGRATION_COMPLETA_OPTIMIZADA.sql` en Supabase que:

1. **Agregó columna `app_name`** a 12 tablas:
   - `users`
   - `processes`
   - `candidates`
   - `stages`
   - `document_categories`
   - `attachments`
   - `candidate_history`
   - `post_its`
   - `comments`
   - `interview_events`
   - `form_integrations`
   - `app_settings`

2. **Actualizó datos existentes** con `app_name = 'Opalopy'`:
   - 100 candidates → `app_name = 'Opalopy'`
   - 15 processes → `app_name = 'Opalopy'`
   - 8 users → `app_name = 'Opalopy'`

3. **Creó índices** para mejorar el rendimiento de las consultas filtradas

### 2. Actualización de Código en Opalo ATS

Se modificaron las APIs para:
- Filtrar todas las queries por `app_name = 'Opalo ATS'`
- Asignar `app_name = 'Opalo ATS'` en todas las inserciones
- Asegurar que solo se actualicen/eliminen registros de esta app

---

## 🗄️ Cambios en la Base de Datos

### Estructura Agregada

Cada tabla ahora tiene una columna adicional:

```sql
app_name TEXT NULLABLE
```

### Valores Actuales

- **Datos existentes**: `app_name = 'Opalopy'` (marcados automáticamente)
- **Nuevos datos de Opalopy**: Deben tener `app_name = 'Opalopy'`
- **Nuevos datos de Opalo ATS**: Tienen `app_name = 'Opalo ATS'`

### Índices Creados

Se crearon índices en todas las tablas para optimizar las consultas:

```sql
CREATE INDEX idx_[tabla]_app_name ON [tabla](app_name);
```

---

## 💻 Cambios en el Código de Opalo ATS

### Archivo Nuevo: `lib/appConfig.ts`

```typescript
// Configuración de la aplicación
export const APP_NAME = 'Opalo ATS';
```

### Archivos Modificados

#### 1. `lib/api/users.ts`
- `getAll()`: Agrega `.eq('app_name', APP_NAME)`
- `getById()`: Agrega `.eq('app_name', APP_NAME)`
- `getByEmail()`: Agrega `.eq('app_name', APP_NAME)`
- `create()`: Asigna `app_name: APP_NAME` en el insert
- `update()`: Agrega `.eq('app_name', APP_NAME)` en el update
- `delete()`: Agrega `.eq('app_name', APP_NAME)` en el delete
- `login()`: Filtra por `app_name` al buscar usuario

#### 2. `lib/api/processes.ts`
- `getAll()`: Filtra procesos por `app_name`
- `getById()`: Filtra por `app_name`
- `create()`: Asigna `app_name` al proceso, stages, document_categories y attachments
- `update()`: Solo actualiza procesos de esta app
- Todas las queries de stages, document_categories y attachments también filtran por `app_name`

#### 3. `lib/api/candidates.ts`
- `getAll()`: Filtra candidatos por `app_name`
- `getById()`: Filtra por `app_name`
- `create()`: Asigna `app_name` al candidato, history y attachments
- `update()`: Solo actualiza candidatos de esta app
- `delete()`, `archive()`, `restore()`: Solo operan en candidatos de esta app
- Queries de history, post_its, comments y attachments filtran por `app_name`

#### 4. `lib/api/postits.ts`
- `create()`: Asigna `app_name: APP_NAME`
- `delete()`: Filtra por `app_name`

#### 5. `lib/api/comments.ts`
- `create()`: Asigna `app_name` al comentario y attachments
- `delete()`: Filtra por `app_name`
- Queries de attachments de comentarios filtran por `app_name`

#### 6. `lib/api/interviews.ts`
- `getAll()`: Filtra eventos por `app_name`
- `getByDateRange()`: Filtra por `app_name`
- `create()`: Asigna `app_name: APP_NAME`
- `update()`: Solo actualiza eventos de esta app
- `delete()`: Solo elimina eventos de esta app

#### 7. `lib/api/settings.ts`
- `get()`: Filtra settings por `app_name`
- `create()`: Asigna `app_name: APP_NAME`
- `update()`: Solo actualiza settings de esta app
- Cambio: Usa tabla `app_settings` (no `settings`)

### Patrón de Cambios

#### En SELECT queries:
```typescript
// ANTES
.from('users')
.select('*')

// DESPUÉS
.from('users')
.select('*')
.eq('app_name', APP_NAME)
```

#### En INSERT:
```typescript
// ANTES
.insert({ name: '...', email: '...' })

// DESPUÉS
.insert({ name: '...', email: '...', app_name: APP_NAME })
```

#### En UPDATE:
```typescript
// ANTES
.update(data)
.eq('id', id)

// DESPUÉS
.update(data)
.eq('id', id)
.eq('app_name', APP_NAME)
```

#### En DELETE:
```typescript
// ANTES
.delete()
.eq('id', id)

// DESPUÉS
.delete()
.eq('id', id)
.eq('app_name', APP_NAME)
```

---

## 🔧 Cambios Necesarios en Opalopy

### ⚠️ IMPORTANTE: Opalopy DEBE ser actualizado

Sin estos cambios, Opalopy:
- ❌ Podría ver datos de Opalo ATS
- ❌ Crearía datos sin `app_name` o con valor incorrecto
- ❌ No tendría aislamiento de datos

### Archivos a Modificar

Los mismos archivos que se modificaron en Opalo ATS, pero con `APP_NAME = 'Opalopy'`:

1. **Crear**: `lib/appConfig.ts`
2. **Modificar**: `lib/api/users.ts`
3. **Modificar**: `lib/api/processes.ts`
4. **Modificar**: `lib/api/candidates.ts`
5. **Modificar**: `lib/api/postits.ts`
6. **Modificar**: `lib/api/comments.ts`
7. **Modificar**: `lib/api/interviews.ts`
8. **Modificar**: `lib/api/settings.ts`

---

## 📝 Instrucciones Paso a Paso para Opalopy

### Paso 1: Preparación

```bash
# 1. Ir al directorio de Opalopy
cd Opalopy

# 2. Verificar que estás en la rama correcta
git branch

# 3. Hacer backup (IMPORTANTE)
git add .
git commit -m "Backup antes de actualización multi-tenant"
git push
```

### Paso 2: Crear Archivo de Configuración

Crear `Opalopy/lib/appConfig.ts`:

```typescript
// Configuración de la aplicación
export const APP_NAME = 'Opalopy';
```

### Paso 3: Actualizar APIs

#### 3.1. Actualizar `lib/api/users.ts`

**Agregar import al inicio:**
```typescript
import { APP_NAME } from '../appConfig';
```

**Modificar `getAll()`:**
```typescript
async getAll(): Promise<User[]> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('app_name', APP_NAME) // ← AGREGAR ESTA LÍNEA
        .order('name');
    // ... resto del código
}
```

**Modificar `getById()`:**
```typescript
async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .eq('app_name', APP_NAME) // ← AGREGAR ESTA LÍNEA
        .single();
    // ... resto del código
}
```

**Modificar `getByEmail()`:**
```typescript
async getByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('app_name', APP_NAME) // ← AGREGAR ESTA LÍNEA
        .single();
    // ... resto del código
}
```

**Modificar `create()`:**
```typescript
async create(userData: Omit<User, 'id'>): Promise<User> {
    const dbData = userToDb(userData);
    dbData.app_name = APP_NAME; // ← AGREGAR ESTA LÍNEA
    
    const { data, error } = await supabase
        .from('users')
        .insert(dbData)
        .select()
        .single();
    // ... resto del código
}
```

**Modificar `update()`:**
```typescript
async update(id: string, userData: Partial<User>): Promise<User> {
    const dbData = userToDb(userData);
    delete dbData.app_name; // ← No permitir cambiar app_name
    
    const { data, error } = await supabase
        .from('users')
        .update(dbData)
        .eq('id', id)
        .eq('app_name', APP_NAME) // ← AGREGAR ESTA LÍNEA
        .select()
        .single();
    // ... resto del código
}
```

**Modificar `delete()`:**
```typescript
async delete(id: string): Promise<void> {
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
        .eq('app_name', APP_NAME) // ← AGREGAR ESTA LÍNEA
    
    if (error) throw error;
}
```

**Modificar `login()`:**
```typescript
async login(email: string, password: string): Promise<User | null> {
    // Buscar usuario con app_name
    const user = await this.getByEmail(email); // Ya filtra por app_name
    // ... resto del código
}
```

#### 3.2. Actualizar `lib/api/processes.ts`

**Agregar import:**
```typescript
import { APP_NAME } from '../appConfig';
```

**Modificar `getAll()`:**
```typescript
async getAll(includeAttachments: boolean = false): Promise<Process[]> {
    const { data: processes, error } = await supabase
        .from('processes')
        .select('...')
        .eq('app_name', APP_NAME) // ← AGREGAR
        .order('created_at', { ascending: false })
        .limit(200);
    // ... resto del código
    
    // También filtrar stages, document_categories, attachments
    const queries: Promise<any>[] = [
        supabase
            .from('stages')
            .select('...')
            .in('process_id', processIds)
            .eq('app_name', APP_NAME) // ← AGREGAR
            .order('order_index'),
        // ... similar para document_categories y attachments
    ];
}
```

**Modificar `getById()`:**
```typescript
async getById(id: string): Promise<Process | null> {
    const { data: process, error } = await supabase
        .from('processes')
        .select('*')
        .eq('id', id)
        .eq('app_name', APP_NAME) // ← AGREGAR
        .single();
    // ... resto del código
}
```

**Modificar `create()`:**
```typescript
async create(processData: Omit<Process, 'id'>, createdBy?: string): Promise<Process> {
    const dbData = processToDb(processData);
    dbData.app_name = APP_NAME; // ← AGREGAR
    
    const { data: process, error } = await supabase
        .from('processes')
        .insert(dbData)
        .select()
        .single();
    
    // Al crear stages:
    const stagesWithCritical = processData.stages.map((stage, index) => ({
        // ...
        app_name: APP_NAME, // ← AGREGAR
    }));
    
    // Similar para document_categories y attachments
}
```

**Modificar `update()`:**
```typescript
async update(id: string, processData: Partial<Process>): Promise<Process> {
    const dbData = processToDb(processData);
    delete dbData.app_name; // ← No permitir cambiar
    
    const { error } = await supabase
        .from('processes')
        .update(restDbData)
        .eq('id', id)
        .eq('app_name', APP_NAME) // ← AGREGAR
    // ... resto del código
}
```

#### 3.3. Actualizar `lib/api/candidates.ts`

**Agregar import:**
```typescript
import { APP_NAME } from '../appConfig';
```

**Modificar `getAll()`:**
```typescript
async getAll(includeArchived: boolean = false, includeRelations: boolean = true): Promise<Candidate[]> {
    let query = supabase
        .from('candidates')
        .select('...')
        .eq('app_name', APP_NAME) // ← AGREGAR
        .order('created_at', { ascending: false })
        .limit(200);
    // ... resto del código
    
    // En las queries de relaciones:
    const [historyResult, postItsResult, commentsResult] = await Promise.all([
        supabase
            .from('candidate_history')
            .select('...')
            .in('candidate_id', candidateIds)
            .eq('app_name', APP_NAME) // ← AGREGAR
            .order('moved_at', { ascending: true }),
        // ... similar para post_its y comments
    ]);
}
```

**Modificar `getById()`:**
```typescript
async getById(id: string): Promise<Candidate | null> {
    const { data, error } = await supabase
        .from('candidates')
        .select('...')
        .eq('id', id)
        .eq('app_name', APP_NAME) // ← AGREGAR
        .single();
    // ... resto del código
}
```

**Modificar `create()`:**
```typescript
async create(candidateData: Omit<Candidate, 'id' | 'history'>, createdBy?: string): Promise<Candidate> {
    const dbData = candidateToDb(candidateData);
    dbData.app_name = APP_NAME; // ← AGREGAR
    
    const { data, error } = await supabase
        .from('candidates')
        .insert(dbData)
        .select()
        .single();
    
    // Al crear history:
    await supabase.from('candidate_history').insert({
        // ...
        app_name: APP_NAME, // ← AGREGAR
    });
    
    // Al crear attachments:
    const attachmentsToInsert = candidateData.attachments.map(att => ({
        // ...
        app_name: APP_NAME, // ← AGREGAR
    }));
}
```

**Modificar `update()`, `delete()`, `archive()`, `restore()`:**
Similar a los anteriores, agregar `.eq('app_name', APP_NAME)` en todas las queries.

#### 3.4. Actualizar `lib/api/postits.ts`

**Agregar import:**
```typescript
import { APP_NAME } from '../appConfig';
```

**Modificar `create()`:**
```typescript
async create(candidateId: string, postIt: Omit<PostIt, 'id' | 'createdAt'>): Promise<PostIt> {
    const { data, error } = await supabase
        .from('post_its')
        .insert({
            candidate_id: candidateId,
            text: postIt.text,
            color: postIt.color,
            created_by: postIt.createdBy,
            app_name: APP_NAME, // ← AGREGAR
        })
        .select()
        .single();
    // ... resto del código
}
```

**Modificar `delete()`:**
```typescript
async delete(postItId: string): Promise<void> {
    const { error } = await supabase
        .from('post_its')
        .delete()
        .eq('id', postItId)
        .eq('app_name', APP_NAME) // ← AGREGAR
    
    if (error) throw error;
}
```

#### 3.5. Actualizar `lib/api/comments.ts`

**Agregar import:**
```typescript
import { APP_NAME } from '../appConfig';
```

**Modificar `create()`:**
```typescript
async create(candidateId: string, comment: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> {
    const { data, error } = await supabase
        .from('comments')
        .insert({
            candidate_id: candidateId,
            text: comment.text,
            user_id: comment.userId,
            app_name: APP_NAME, // ← AGREGAR
        })
        .select()
        .single();
    
    // Al crear attachments del comentario:
    const attachmentsToInsert = comment.attachments.map(att => ({
        // ...
        app_name: APP_NAME, // ← AGREGAR
    }));
    
    // Al obtener attachments:
    const { data: attachments } = await supabase
        .from('attachments')
        .select('*')
        .eq('comment_id', data.id)
        .eq('app_name', APP_NAME) // ← AGREGAR
}
```

**Modificar `delete()`:**
```typescript
async delete(commentId: string): Promise<void> {
    const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('app_name', APP_NAME) // ← AGREGAR
    
    if (error) throw error;
}
```

#### 3.6. Actualizar `lib/api/interviews.ts`

**Agregar import:**
```typescript
import { APP_NAME } from '../appConfig';
```

**Modificar todos los métodos:**
- `getAll()`: Agregar `.eq('app_name', APP_NAME)`
- `getByDateRange()`: Agregar `.eq('app_name', APP_NAME)`
- `create()`: Agregar `app_name: APP_NAME` en el insert
- `update()`: Agregar `.eq('app_name', APP_NAME)` y `delete dbData.app_name`
- `delete()`: Agregar `.eq('app_name', APP_NAME)`

#### 3.7. Actualizar `lib/api/settings.ts`

**Agregar import:**
```typescript
import { APP_NAME } from '../appConfig';
```

**Modificar `get()`:**
```typescript
async get(): Promise<AppSettings> {
    const { data, error } = await supabase
        .from('app_settings') // ← Verificar que usa app_settings, no settings
        .select('*')
        .eq('app_name', APP_NAME) // ← AGREGAR
        .single();
    // ... resto del código
}
```

**Modificar `create()`:**
```typescript
async create(settings: AppSettings): Promise<AppSettings> {
    const dbData = settingsToDb(settings);
    dbData.app_name = APP_NAME; // ← AGREGAR
    
    const { data, error } = await supabase
        .from('app_settings')
        .insert(dbData)
        .select()
        .single();
    // ... resto del código
}
```

**Modificar `update()`:**
```typescript
async update(settings: Partial<AppSettings>): Promise<AppSettings> {
    const dbData = settingsToDb(settings);
    delete dbData.app_name; // ← No permitir cambiar
    
    const { error: standardError } = await supabase
        .from('app_settings')
        .update(standardFields)
        .eq('app_name', APP_NAME) // ← AGREGAR
    // ... resto del código
}
```

### Paso 4: Probar Localmente

```bash
# 1. Instalar dependencias (si es necesario)
npm install

# 2. Iniciar aplicación
npm run dev

# 3. Verificar:
# - La app carga correctamente
# - Solo muestra datos de Opalopy (100 candidates, 15 processes, 8 users)
# - Puedes crear nuevos procesos/candidatos
# - No ves datos de Opalo ATS
```

### Paso 5: Commit y Push

```bash
# 1. Verificar cambios
git status

# 2. Agregar cambios
git add .

# 3. Commit
git commit -m "feat: Agregar soporte multi-tenant con app_name = 'Opalopy'

- Agregar lib/appConfig.ts con APP_NAME = 'Opalopy'
- Actualizar todas las APIs para filtrar por app_name
- Asegurar aislamiento de datos entre Opalopy y Opalo ATS
- Mantener compatibilidad con datos existentes (app_name = 'Opalopy')"

# 4. Push
git push
```

### Paso 6: Desplegar en Servidor

**Si el servidor tiene Git:**

```bash
# SSH al servidor
ssh usuario@servidor

# Ir al directorio de Opalopy
cd /ruta/a/Opalopy

# Pull de los cambios
git pull origin main  # o la rama que uses

# Instalar dependencias (si es necesario)
npm install

# Reiniciar la aplicación
# Opción A: Si usa PM2
pm2 restart opalopy

# Opción B: Si usa systemd
sudo systemctl restart opalopy

# Opción C: Si usa otro método, seguir sus instrucciones
```

**Si el servidor NO tiene Git:**

1. Subir los archivos modificados vía FTP/SFTP
2. O usar el método de despliegue que tengas configurado

---

## ✅ Verificación y Testing

### Verificación en Base de Datos

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar distribución de datos por app_name
SELECT 
    'users' as tabla,
    app_name,
    COUNT(*) as total
FROM users
GROUP BY app_name
UNION ALL
SELECT 'processes', app_name, COUNT(*) FROM processes GROUP BY app_name
UNION ALL
SELECT 'candidates', app_name, COUNT(*) FROM candidates GROUP BY app_name
ORDER BY tabla, app_name;
```

**Resultado esperado:**
- `Opalopy`: Con los datos existentes
- `Opalo ATS`: Con los nuevos datos creados desde Opalo ATS

### Testing Funcional

#### En Opalopy:
1. ✅ Login funciona
2. ✅ Ve solo sus datos (100 candidates, 15 processes, 8 users)
3. ✅ Puede crear nuevos procesos
4. ✅ Puede crear nuevos candidatos
5. ✅ Los nuevos registros tienen `app_name = 'Opalopy'`
6. ✅ No ve datos de Opalo ATS

#### En Opalo ATS:
1. ✅ Login funciona
2. ✅ Ve solo sus datos (inicialmente vacío)
3. ✅ Puede crear nuevos procesos
4. ✅ Puede crear nuevos candidatos
5. ✅ Los nuevos registros tienen `app_name = 'Opalo ATS'`
6. ✅ No ve datos de Opalopy

### Verificación de Aislamiento

```sql
-- Crear un proceso en Opalopy y verificar
-- Debería tener app_name = 'Opalopy'

-- Crear un proceso en Opalo ATS y verificar
-- Debería tener app_name = 'Opalo ATS'

-- Verificar que Opalopy NO ve el proceso de Opalo ATS
-- Verificar que Opalo ATS NO ve el proceso de Opalopy
```

---

## 🔧 Solución de Problemas

### Problema: Opalopy ve datos de Opalo ATS

**Causa**: Las queries no están filtrando por `app_name`

**Solución**: Verificar que todas las queries tengan `.eq('app_name', APP_NAME)`

### Problema: Nuevos registros no tienen app_name

**Causa**: Los inserts no están asignando `app_name`

**Solución**: Verificar que todos los inserts incluyan `app_name: APP_NAME`

### Problema: Error "column app_name does not exist"

**Causa**: La migración de BD no se ejecutó o falló

**Solución**: Ejecutar `MIGRATION_COMPLETA_OPTIMIZADA.sql` en Supabase

### Problema: La app no carga después de los cambios

**Causa**: Error de sintaxis o import faltante

**Solución**: 
1. Revisar consola del navegador
2. Verificar que `lib/appConfig.ts` existe
3. Verificar que todos los imports están correctos

### Problema: Datos existentes no se ven

**Causa**: Los datos tienen `app_name = 'Opalopy'` pero las queries no filtran correctamente

**Solución**: Verificar que las queries usen `.eq('app_name', APP_NAME)` y que `APP_NAME = 'Opalopy'`

---

## 📚 Referencias

### Archivos de Referencia en Opalo ATS

Puedes usar los archivos de Opalo-ATS como referencia:

- `Opalo-ATS/lib/appConfig.ts` → Copiar y cambiar a `'Opalopy'`
- `Opalo-ATS/lib/api/users.ts` → Ver patrones de cambios
- `Opalo-ATS/lib/api/processes.ts` → Ver patrones de cambios
- `Opalo-ATS/lib/api/candidates.ts` → Ver patrones de cambios
- etc.

### Scripts SQL

- `MIGRATION_COMPLETA_OPTIMIZADA.sql` - Script de migración (ya ejecutado)
- `REVERTIR_CAMBIOS.sql` - Para revertir si es necesario
- `VERIFICAR_ESTADO_ACTUAL.sql` - Para verificar estado

---

## 📞 Soporte

Si tienes problemas:

1. Revisa la consola del navegador para errores
2. Revisa los logs del servidor
3. Ejecuta `VERIFICAR_ESTADO_ACTUAL.sql` para ver el estado de la BD
4. Compara con los archivos de Opalo-ATS como referencia

---

## ✅ Checklist Final

Antes de considerar la migración completa:

- [ ] Base de datos migrada (columnas `app_name` creadas)
- [ ] Opalo ATS actualizado y funcionando
- [ ] Opalopy código actualizado
- [ ] Opalopy probado localmente
- [ ] Opalopy commit y push realizado
- [ ] Opalopy desplegado en servidor
- [ ] Verificación de aislamiento completada
- [ ] Ambas apps funcionando correctamente
- [ ] No hay datos mezclados entre apps

---

**¡Migración Multi-Tenant Completada!** 🎉

