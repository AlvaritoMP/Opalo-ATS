# 🔐 Solución: RLS Bloqueando Aunque las Políticas Existan

## ✅ Diagnóstico

- ✅ La apikey está en el build
- ✅ La clave anon key es correcta
- ❌ Sigue dando error 401

**Conclusión**: El problema es con RLS (Row Level Security).

---

## 🔍 Verificar RLS

### Paso 1: Ejecutar Script de Verificación

1. Ve a Supabase SQL Editor
2. Ejecuta `VERIFICAR_RLS_FUNCIONA.sql`
3. Revisa los resultados

### Paso 2: Verificar Resultados

**Si RLS NO está habilitado**:
- Algunas tablas no tienen RLS habilitado
- Necesitas habilitarlo

**Si NO hay políticas para Opalo ATS**:
- Las políticas no se crearon correctamente
- Necesitas ejecutar el script de nuevo

**Si hay políticas pero no funcionan**:
- Puede ser un problema con el rol `anon`
- O las políticas están mal configuradas

---

## 🔧 Solución: Políticas Más Permisivas

Si las políticas existen pero no funcionan, puede ser que necesitemos políticas más permisivas. Ejecuta este script:

```sql
-- Eliminar políticas existentes de Opalo ATS (solo las de Opalo ATS)
DROP POLICY IF EXISTS "Users can read Opalo ATS data" ON public.users;
DROP POLICY IF EXISTS "Users can insert Opalo ATS data" ON public.users;
DROP POLICY IF EXISTS "Users can update Opalo ATS data" ON public.users;
DROP POLICY IF EXISTS "Users can delete Opalo ATS data" ON public.users;

-- Crear políticas más permisivas (permitir todo para anon)
CREATE POLICY "Allow all for Opalo ATS users"
ON public.users
FOR ALL
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

-- Repetir para otras tablas importantes
DROP POLICY IF EXISTS "Processes can read Opalo ATS data" ON public.processes;
DROP POLICY IF EXISTS "Processes can insert Opalo ATS data" ON public.processes;
DROP POLICY IF EXISTS "Processes can update Opalo ATS data" ON public.processes;
DROP POLICY IF EXISTS "Processes can delete Opalo ATS data" ON public.processes;

CREATE POLICY "Allow all for Opalo ATS processes"
ON public.processes
FOR ALL
USING (app_name = 'Opalo ATS')
WITH CHECK (app_name = 'Opalo ATS');

-- Y así para candidates, stages, etc.
```

---

## 🐛 Solución Alternativa: Deshabilitar RLS Temporalmente (Solo para Testing)

**⚠️ SOLO PARA PROBAR - NO RECOMENDADO EN PRODUCCIÓN**

Si quieres probar si el problema es RLS:

```sql
-- Deshabilitar RLS temporalmente
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_its DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;
```

**Si esto funciona**, el problema es RLS. Luego vuelve a habilitarlo y crea las políticas correctas.

---

## 🔍 Verificar Permisos del Rol Anon

El rol `anon` necesita permisos básicos. Ejecuta:

```sql
-- Verificar permisos del rol anon
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
AND table_schema = 'public'
AND table_name IN ('users', 'processes', 'candidates');
```

Si no hay permisos, puede ser necesario otorgarlos (aunque normalmente Supabase los otorga automáticamente).

---

## 📋 Checklist

- [ ] Ejecutado script de verificación RLS
- [ ] Verificado que RLS está habilitado
- [ ] Verificado que hay políticas para Opalo ATS
- [ ] Probado deshabilitar RLS temporalmente (si es necesario)
- [ ] Verificado permisos del rol anon

---

## 🎯 Próximo Paso

Ejecuta `VERIFICAR_RLS_FUNCIONA.sql` en Supabase y comparte los resultados. Con eso podré darte la solución exacta.

