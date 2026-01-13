# 🔍 Solución: Settings No Persisten

## 🔴 Problema

Los cambios en Settings no persisten:
- Provincias y distritos
- Símbolo de moneda
- Conexión con Google Drive
- Logos subidos

---

## ✅ Diagnóstico

### Paso 1: Verificar si Existe el Registro de Settings

1. Ve a **Supabase Dashboard** > **SQL Editor**
2. Ejecuta: **`VERIFICAR_APP_SETTINGS.sql`**

Esto mostrará:
- Si existe un registro de `app_settings` con `app_name = 'Opalo ATS'`
- Qué valores tiene actualmente
- Las políticas RLS

**Si no existe el registro:**
- Ejecuta **`CREAR_APP_SETTINGS_OPALO_ATS.sql`** para crearlo

### Paso 2: Verificar Errores en la Consola

1. Abre la aplicación en el navegador
2. Abre la consola (F12 → Console)
3. Intenta guardar un cambio en Settings
4. Busca errores como:
   - `Error updating standard settings fields`
   - `Error updating optional settings fields`
   - `401 Unauthorized`
   - `403 Forbidden`
   - `column does not exist`

### Paso 3: Verificar Políticas RLS

Si las políticas RLS están bloqueando el UPDATE, los cambios no se guardarán.

Ejecuta `VERIFICAR_APP_SETTINGS.sql` y verifica que hay políticas para:
- SELECT
- INSERT
- UPDATE
- DELETE

Todas deben tener `app_name = 'Opalo ATS'` en la condición.

---

## 🔧 Soluciones

### Solución 1: Crear Registro de Settings

Si no existe el registro:

1. Ejecuta **`CREAR_APP_SETTINGS_OPALO_ATS.sql`**
2. Recarga la aplicación
3. Intenta guardar cambios de nuevo

### Solución 2: Verificar Políticas RLS

Si las políticas RLS están bloqueando:

1. Ejecuta `VERIFICAR_APP_SETTINGS.sql` para ver las políticas
2. Si faltan políticas, ejecuta `CREAR_POLITICAS_SOLO_ANON_SEGURO.sql`
3. Verifica que hay políticas para UPDATE en `app_settings`

### Solución 3: Verificar Columnas en la Tabla

Algunas columnas pueden no existir (como `provinces`, `districts`, `powered_by_logo_url`).

El código intenta manejarlas, pero si fallan, verifica en la consola qué error aparece.

---

## 📋 Checklist

- [ ] Ejecutar `VERIFICAR_APP_SETTINGS.sql` - ¿Existe el registro?
- [ ] Si no existe, ejecutar `CREAR_APP_SETTINGS_OPALO_ATS.sql`
- [ ] Verificar políticas RLS - ¿Hay políticas para UPDATE?
- [ ] Verificar consola del navegador - ¿Hay errores al guardar?
- [ ] Intentar guardar un cambio simple (símbolo de moneda)
- [ ] Recargar la aplicación y verificar si persiste

---

## 🆘 Información Necesaria

Para diagnosticar mejor, necesito:

1. **Resultado de `VERIFICAR_APP_SETTINGS.sql`** - ¿Existe el registro?
2. **Errores de la consola** - ¿Qué errores aparecen al guardar?
3. **Políticas RLS** - ¿Hay políticas para UPDATE en `app_settings`?

---

## 💡 Nota Importante

El código de `settingsApi.update()` intenta:
1. Actualizar campos estándar primero
2. Actualizar campos opcionales por separado (si existen)
3. Manejar errores de columnas que no existen

Si hay errores, deberían aparecer en la consola del navegador.
