# ✅ Solución: Crear Políticas para Rol Anon

## 🔍 Problema Identificado

- ✅ RLS está **habilitado** en todas las tablas
- ❌ **NO hay políticas** para el rol `anon` (0 políticas)
- ❌ Estado: `❌ NEEDS POLICIES` en todas las tablas

**Esto explica el error 401**: Cuando RLS está habilitado pero no hay políticas, el acceso está bloqueado por defecto.

---

## ✅ Solución: Ejecutar Script Seguro

### Paso 1: Ejecutar Script

1. Ve a **Supabase SQL Editor**
2. Ejecuta el script: **`CREAR_POLITICAS_SOLO_ANON_SEGURO.sql`**

### Paso 2: ¿Qué Hace Este Script?

- ✅ **NO elimina** políticas existentes
- ✅ Solo **crea nuevas políticas** si no existen
- ✅ Usa `DO $$ BEGIN ... END $$` para verificar antes de crear
- ✅ Especifica `TO anon` explícitamente
- ✅ Filtra por `app_name = 'Opalo ATS'` para aislar datos

### Paso 3: Verificar Resultado

Después de ejecutar, vuelve a ejecutar `VERIFICAR_RLS_Y_POLITICAS_SIMPLE.sql` y deberías ver:

- `Policies for anon`: Debería mostrar números > 0
- `Status`: Debería cambiar a `✅ HAS POLICIES`

---

## 🎯 Políticas que se Crearán

Para cada tabla (`users`, `processes`, `candidates`, `app_settings`, etc.):

1. **SELECT** - Permitir leer datos de Opalo ATS
2. **INSERT** - Permitir crear datos de Opalo ATS
3. **UPDATE** - Permitir actualizar datos de Opalo ATS
4. **DELETE** - Permitir eliminar datos de Opalo ATS

Todas las políticas:
- Especifican `TO anon` (rol anon explícitamente)
- Filtran por `app_name = 'Opalo ATS'` (aislamiento de datos)

---

## ⚠️ Seguridad

- ✅ **No afecta Opalopy**: Las políticas solo permiten acceso a datos con `app_name = 'Opalo ATS'`
- ✅ **No elimina nada**: Solo crea políticas nuevas si no existen
- ✅ **Nombres únicos**: Las políticas tienen nombres únicos que no conflictan

---

## 📋 Checklist

- [ ] Ejecutar `CREAR_POLITICAS_SOLO_ANON_SEGURO.sql` en Supabase SQL Editor
- [ ] Verificar que no haya errores
- [ ] Ejecutar `VERIFICAR_RLS_Y_POLITICAS_SIMPLE.sql` para confirmar
- [ ] Probar la app en producción

---

## 🎯 Resultado Esperado

Después de ejecutar el script:

1. ✅ Las políticas se crearán para el rol `anon`
2. ✅ El error 401 debería desaparecer
3. ✅ La app debería poder conectarse a Supabase
4. ✅ Opalopy no se verá afectado (sus datos tienen `app_name = 'Opalopy'`)

