# 🔍 Solución: Procesos No Se Cargan en la Aplicación

## 🔴 Problema

La aplicación no está cargando los procesos que ya existen en la base de datos. Esto puede deberse a que los procesos no tienen el campo `app_name` configurado correctamente.

---

## ✅ Diagnóstico

### Paso 1: Verificar Procesos en la Base de Datos

1. Ve a **Supabase Dashboard** > **SQL Editor**
2. Ejecuta el script: **`VERIFICAR_PROCESOS_SIN_APP_NAME.sql`**

Este script te mostrará:
- Todos los procesos y su `app_name`
- Cuántos procesos hay por `app_name`
- Qué procesos necesitan corrección

### Paso 2: Verificar en la Consola del Navegador

1. Abre la aplicación en el navegador
2. Abre la consola (F12 → Console)
3. Busca estos mensajes:

**Si hay errores:**
```
❌ Failed to load processes from Supabase: [error]
```

**Si no hay errores pero no carga procesos:**
```
✓ Loaded processes from Supabase
```
Pero la lista de procesos está vacía.

---

## 🔧 Solución

### Opción 1: Corregir app_name de Procesos Existentes

Si los procesos no tienen `app_name` o tienen un valor incorrecto:

1. Ve a **Supabase Dashboard** > **SQL Editor**
2. Ejecuta el script: **`CORREGIR_APP_NAME_PROCESOS.sql`**

Este script:
- ✅ Actualiza procesos sin `app_name` a `app_name = 'Opalo ATS'`
- ✅ Actualiza procesos con `app_name` incorrecto a `'Opalo ATS'`
- ✅ NO afecta procesos de otras aplicaciones (Opalopy) que ya tengan su `app_name` correcto

### Opción 2: Verificar APP_NAME en el Código

Verifica que el valor de `APP_NAME` en el código sea correcto:

1. Abre `lib/appConfig.ts`
2. Verifica que `APP_NAME = 'Opalo ATS'`
3. Si es diferente, corrígelo y haz rebuild

---

## 🔍 Verificación Post-Corrección

Después de ejecutar el script de corrección:

1. **Recarga la aplicación** en el navegador
2. **Verifica la consola** - deberías ver:
   ```
   ✓ Loaded processes from Supabase
   ```
3. **Verifica la lista de procesos** - deberían aparecer todos los procesos

---

## 📋 Checklist

- [ ] Ejecutar `VERIFICAR_PROCESOS_SIN_APP_NAME.sql` para diagnosticar
- [ ] Verificar que hay procesos en la base de datos
- [ ] Verificar que los procesos tienen `app_name = 'Opalo ATS'`
- [ ] Si no tienen `app_name` correcto, ejecutar `CORREGIR_APP_NAME_PROCESOS.sql`
- [ ] Recargar la aplicación
- [ ] Verificar que los procesos aparecen en la lista

---

## ⚠️ Importante

- El script de corrección **NO elimina** procesos
- Solo actualiza el campo `app_name`
- Si hay procesos de otras aplicaciones (Opalopy), no se verán afectados si ya tienen su `app_name` correcto
- Los procesos nuevos que se creen desde la aplicación ya tendrán `app_name = 'Opalo ATS'` automáticamente

---

## 🆘 Si Aún No Funciona

Si después de corregir el `app_name` los procesos aún no aparecen:

1. **Verifica las políticas RLS:**
   - Ejecuta `VERIFICAR_RLS_Y_POLITICAS_SIMPLE.sql`
   - Verifica que hay políticas para el rol `anon` en la tabla `processes`

2. **Verifica la consola del navegador:**
   - Busca errores 401, 403, o 500
   - Verifica que las llamadas a Supabase se están haciendo correctamente

3. **Verifica las variables de entorno:**
   - `VITE_SUPABASE_URL` debe estar configurada
   - `VITE_SUPABASE_ANON_KEY` debe estar configurada
   - Deben estar marcadas como "Build-time" en EasyPanel

---

## ✅ Resultado Esperado

Después de aplicar la solución:

- ✅ Todos los procesos con `app_name = 'Opalo ATS'` aparecen en la aplicación
- ✅ Los procesos se cargan correctamente al iniciar la app
- ✅ No hay errores en la consola del navegador
- ✅ La lista de procesos muestra todos los procesos existentes
