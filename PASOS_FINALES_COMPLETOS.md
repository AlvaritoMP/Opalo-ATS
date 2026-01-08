# ✅ Pasos Finales Completos

## 🎯 Orden de Ejecución

### Paso 1: Configurar URLs en Supabase (YA HECHO)

1. ✅ Ve a Supabase Dashboard → Authentication → URL Configuration
2. ✅ Actualiza **Site URL** a: `https://opalo-atsopalo.bouasv.easypanel.host`
3. ✅ Agrega en **Redirect URLs**: `https://opalo-atsopalo.bouasv.easypanel.host`
4. ✅ Guarda los cambios
5. ⏳ Espera 2-3 minutos

### Paso 2: Reestablecer RLS

1. Ve a Supabase SQL Editor
2. Ejecuta `REESTABLECER_RLS_COMPLETO.sql`
3. Este script:
   - ✅ Rehabilita RLS en todas las tablas
   - ✅ Crea políticas para Opalo ATS (si no existen)
   - ✅ Verifica que todo esté correcto

### Paso 3: Verificar

1. Espera 2-3 minutos después de ejecutar el script
2. Abre la app en producción
3. Intenta iniciar sesión con:
   - Email: `admin@opaloats.com`
   - Password: `admin123`
4. Debería funcionar correctamente

---

## 🔍 Si Aún No Funciona

### Verificar RLS

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'processes', 'candidates');
```

Todos deben mostrar `rowsecurity = true`.

### Verificar Políticas

```sql
-- Verificar políticas de users
SELECT * FROM pg_policies 
WHERE tablename = 'users' 
AND policyname LIKE '%Opalo ATS%';
```

Debe haber al menos 4 políticas (SELECT, INSERT, UPDATE, DELETE).

---

## ✅ Checklist Final

- [ ] URLs configuradas en Supabase (Site URL y Redirect URLs)
- [ ] RLS reestablecido (script ejecutado)
- [ ] Políticas creadas para Opalo ATS
- [ ] Esperado 2-3 minutos para propagación
- [ ] Probado login en producción
- [ ] Verificado que Opalopy sigue funcionando

---

## 🎯 Resumen

**Después de configurar las URLs en Supabase**:
1. Ejecuta `REESTABLECER_RLS_COMPLETO.sql` para reestablecer RLS
2. Espera unos minutos
3. Prueba la app

Esto debería solucionar el problema.

