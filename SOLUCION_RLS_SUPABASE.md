# 🔐 Solución: Configurar RLS en Supabase para Opalo ATS

## ❌ Problema

Error 401 "Invalid API key" aunque las variables estén correctas. Esto puede ser porque **RLS (Row Level Security) está bloqueando las queries**.

---

## 🎯 Solución: Configurar Políticas RLS

Supabase usa **RLS (Row Level Security)** para controlar el acceso a los datos. Si RLS está habilitado pero no hay políticas que permitan acceso, todas las queries fallarán con 401.

---

## ✅ Pasos para Configurar RLS

### Paso 1: Ejecutar Script SQL en Supabase

1. Ve a **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Copia y pega el contenido completo de `CONFIGURAR_RLS_SUPABASE_OPALO_ATS.sql`
5. Haz clic en **"Run"** o **"Ejecutar"**

### Paso 2: Verificar que se Crearon las Políticas

Después de ejecutar el script, deberías ver un resultado mostrando todas las políticas creadas.

---

## 🔍 ¿Qué Hace el Script?

1. **Habilita RLS** en todas las tablas necesarias
2. **Elimina políticas existentes** que puedan causar conflictos
3. **Crea políticas nuevas** que permiten:
   - **SELECT**: Leer datos con `app_name = 'Opalo ATS'`
   - **INSERT**: Insertar datos con `app_name = 'Opalo ATS'`
   - **UPDATE**: Actualizar datos con `app_name = 'Opalo ATS'`
   - **DELETE**: Eliminar datos con `app_name = 'Opalo ATS'`

---

## ✅ Verificación Post-Script

### Paso 1: Verificar en Supabase

Ejecuta esta query en SQL Editor:

```sql
-- Verificar políticas creadas
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'processes', 'candidates')
ORDER BY tablename, policyname;
```

Deberías ver políticas para cada tabla.

### Paso 2: Verificar en el Navegador

1. Abre la app en producción
2. Abre la consola del navegador (F12)
3. Intenta iniciar sesión
4. **NO deberías ver** errores 401
5. Deberías ver datos cargándose correctamente

---

## 🐛 Si Aún No Funciona

### Opción A: Verificar que RLS Esté Habilitado

Ejecuta:

```sql
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'processes', 'candidates');
```

`rowsecurity` debe ser `true` para todas las tablas.

### Opción B: Verificar Políticas Específicas

```sql
-- Ver políticas de users
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Ver políticas de processes
SELECT * FROM pg_policies WHERE tablename = 'processes';

-- Ver políticas de candidates
SELECT * FROM pg_policies WHERE tablename = 'candidates';
```

### Opción C: Deshabilitar RLS Temporalmente (Solo para Testing)

**⚠️ SOLO PARA PROBAR - NO RECOMENDADO EN PRODUCCIÓN**

```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates DISABLE ROW LEVEL SECURITY;
```

Si esto funciona, el problema es RLS. Vuelve a habilitarlo y ejecuta el script completo.

---

## 📝 Notas Importantes

1. **RLS es necesario** para seguridad - no lo deshabilites permanentemente
2. **Las políticas filtran por `app_name`** - esto asegura que Opalo ATS solo vea sus propios datos
3. **Opalopy también necesita sus propias políticas** con `app_name = 'Opalopy'` (si no las tiene)

---

## ✅ Checklist

- [ ] Script SQL ejecutado en Supabase
- [ ] Políticas creadas correctamente
- [ ] RLS habilitado en todas las tablas
- [ ] Intentado login en la app
- [ ] No hay errores 401
- [ ] Datos se cargan correctamente

---

## 🎯 Resumen

**El problema probablemente es RLS**. Ejecuta el script `CONFIGURAR_RLS_SUPABASE_OPALO_ATS.sql` en Supabase y debería solucionarse.

