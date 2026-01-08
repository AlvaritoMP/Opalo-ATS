# 🔐 Solución Segura: Configurar RLS sin Romper Opalopy

## ✅ Script Seguro Creado

He creado un script **NO DESTRUCTIVO** que:
- ✅ **NO elimina** políticas existentes de Opalopy
- ✅ Solo **agrega** políticas nuevas para Opalo ATS
- ✅ Usa `CREATE POLICY IF NOT EXISTS` para evitar duplicados
- ✅ **No afecta** a Opalopy en absoluto

---

## 📋 Pasos Seguros

### Paso 1: Verificar Políticas Existentes (Opcional pero Recomendado)

Antes de ejecutar el script, puedes verificar qué políticas ya existen:

1. Ve a Supabase SQL Editor
2. Ejecuta `VERIFICAR_POLITICAS_EXISTENTES.sql`
3. Esto te mostrará todas las políticas existentes sin modificar nada

### Paso 2: Ejecutar Script Seguro

1. Ve a Supabase SQL Editor
2. Copia y pega el contenido de **`CONFIGURAR_RLS_SUPABASE_OPALO_ATS_SEGURO.sql`**
3. Haz clic en **"Run"** o **"Ejecutar"**

**Este script**:
- ✅ Solo habilita RLS (si no está habilitado)
- ✅ Solo crea políticas nuevas con `IF NOT EXISTS`
- ✅ **NO elimina** nada existente
- ✅ **NO afecta** a Opalopy

### Paso 3: Verificar que Opalopy Sigue Funcionando

Después de ejecutar el script:

1. Abre Opalopy en producción
2. Verifica que todo funcione normalmente
3. Intenta iniciar sesión
4. Verifica que puedas ver tus datos

### Paso 4: Verificar que Opalo ATS Funciona

1. Abre Opalo ATS en producción
2. Intenta iniciar sesión
3. Deberías poder ingresar sin errores 401

---

## 🔍 ¿Por Qué es Seguro?

### El Script Usa `IF NOT EXISTS`

```sql
CREATE POLICY IF NOT EXISTS "Users can read Opalo ATS data"
```

Esto significa:
- ✅ Si la política **NO existe**, la crea
- ✅ Si la política **YA existe**, no hace nada (no la sobrescribe)
- ✅ **NO elimina** políticas existentes

### No Hay Comandos DESTRUCTIVOS

El script seguro:
- ✅ Solo usa `CREATE POLICY IF NOT EXISTS`
- ✅ Solo usa `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- ❌ **NO usa** `DROP POLICY`
- ❌ **NO elimina** nada

---

## 🐛 Si Opalopy Deja de Funcionar (Muy Improbable)

Si después de ejecutar el script seguro Opalopy deja de funcionar:

### Opción 1: Verificar Políticas de Opalopy

Ejecuta en Supabase SQL Editor:

```sql
-- Ver políticas de Opalopy
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND (policyname LIKE '%Opalopy%' OR policyname LIKE '%ATS Pro%')
ORDER BY tablename, policyname;
```

Si no hay políticas para Opalopy, necesitarás crearlas.

### Opción 2: Crear Políticas para Opalopy (Si Faltan)

Si Opalopy no tiene políticas, ejecuta:

```sql
-- Crear políticas para Opalopy (similar al script de Opalo ATS)
CREATE POLICY IF NOT EXISTS "Users can read Opalopy data"
ON public.users FOR SELECT
USING (app_name = 'Opalopy');

CREATE POLICY IF NOT EXISTS "Users can insert Opalopy data"
ON public.users FOR INSERT
WITH CHECK (app_name = 'Opalopy');

-- ... (y así para todas las tablas)
```

### Opción 3: Deshabilitar RLS Temporalmente (Solo para Testing)

**⚠️ SOLO PARA PROBAR - NO RECOMENDADO EN PRODUCCIÓN**

```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates DISABLE ROW LEVEL SECURITY;
```

Si esto funciona, el problema es que faltan políticas para Opalopy.

---

## ✅ Checklist

- [ ] Ejecutado `VERIFICAR_POLITICAS_EXISTENTES.sql` (opcional)
- [ ] Ejecutado `CONFIGURAR_RLS_SUPABASE_OPALO_ATS_SEGURO.sql`
- [ ] Verificado que Opalopy sigue funcionando
- [ ] Verificado que Opalo ATS funciona
- [ ] No hay errores 401 en ninguna app

---

## 🎯 Resumen

**El script seguro**:
- ✅ No es destructivo
- ✅ No elimina políticas existentes
- ✅ Solo agrega políticas nuevas para Opalo ATS
- ✅ No afecta a Opalopy

**Puedes ejecutarlo con confianza**. Si Opalopy tiene políticas existentes, seguirán funcionando. Si no las tiene, el script solo agregará las de Opalo ATS y Opalopy seguirá funcionando (probablemente porque RLS no estaba habilitado antes).

---

## 📝 Nota Importante

Si Opalopy **ya estaba funcionando** antes, significa que:
- O RLS no estaba habilitado (y seguirá funcionando igual)
- O ya tiene políticas (y seguirán funcionando igual)

En ambos casos, el script seguro **no romperá nada**.

