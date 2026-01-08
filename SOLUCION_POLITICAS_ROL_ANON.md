# 🔐 Solución: Políticas RLS para Rol Anon

## ❌ Problema

Las políticas RLS pueden no estar configuradas específicamente para el rol `anon`, por eso da error 401.

---

## ✅ Solución: Crear Políticas Específicas para Anon

Las políticas anteriores no especificaban el rol `anon` explícitamente. Necesitamos crear políticas que **específicamente permitan acceso al rol `anon`**.

---

## 🔧 Paso 1: Ejecutar Script

1. Ve a Supabase SQL Editor
2. Ejecuta `CREAR_POLITICAS_PERMISIVAS_ANON.sql`
3. Este script:
   - Elimina las políticas anteriores de Opalo ATS
   - Crea nuevas políticas **específicamente para el rol `anon`**
   - Usa `TO anon` para asegurar que el rol anon tenga acceso

---

## 🔍 Diferencia Clave

### Políticas Anteriores (Pueden No Funcionar):
```sql
CREATE POLICY "Users can read Opalo ATS data"
ON public.users FOR SELECT
USING (app_name = 'Opalo ATS');
```

### Políticas Nuevas (Específicas para Anon):
```sql
CREATE POLICY "anon_users_opalo_ats_select"
ON public.users FOR SELECT
TO anon  -- ← Esto es clave: especifica el rol
USING (app_name = 'Opalo ATS');
```

---

## ✅ Verificación

Después de ejecutar el script:

1. Ejecuta `VERIFICAR_POLITICAS_ROL_ANON.sql` para verificar
2. Deberías ver políticas con `roles = '{anon}'`
3. Prueba la app en producción

---

## 📋 Checklist

- [ ] Script `CREAR_POLITICAS_PERMISIVAS_ANON.sql` ejecutado
- [ ] Políticas creadas con `TO anon`
- [ ] Verificación ejecutada
- [ ] Probado login en producción

---

## 🎯 Resumen

**Problema**: Las políticas RLS no especificaban el rol `anon` explícitamente.

**Solución**: Crear políticas que específicamente permitan acceso al rol `anon` usando `TO anon`.

Esto debería solucionar el problema sin afectar a Opalopy.

