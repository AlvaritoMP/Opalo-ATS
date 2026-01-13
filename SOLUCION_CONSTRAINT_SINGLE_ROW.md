# 🔍 Solución: Error Constraint "single_row" en app_settings

## 🔴 Problema

El error indica que la tabla `app_settings` tiene un constraint que solo permite **una fila** en toda la tabla:

```
ERROR: new row for relation "app_settings" violates check constraint "single_row"
```

Esto significa que:
- Ya existe un registro en `app_settings`
- El constraint impide crear un segundo registro
- Necesitamos **actualizar** el registro existente en lugar de crear uno nuevo

---

## ✅ Solución

### Opción 1: Actualizar el Registro Existente (Recomendado)

1. Ve a **Supabase Dashboard** > **SQL Editor**
2. Ejecuta: **`VERIFICAR_REGISTROS_APP_SETTINGS.sql`**

Esto mostrará:
- Qué registros existen
- Qué `app_name` tienen
- El constraint que está causando el problema

3. Ejecuta: **`ACTUALIZAR_APP_SETTINGS_OPALO_ATS.sql`**

Este script:
- ✅ Actualiza el registro existente
- ✅ Cambia `app_name` a 'Opalo ATS' si es necesario
- ✅ Establece valores por defecto si faltan
- ✅ No intenta crear un registro nuevo

### Opción 2: Usar el Script Actualizado

He actualizado `CREAR_APP_SETTINGS_OPALO_ATS.sql` para que:
- ✅ Primero intente actualizar el registro existente
- ✅ Solo intente crear si realmente no existe
- ✅ Maneje el constraint correctamente

---

## 🔍 Verificación

Después de ejecutar el script:

1. Ejecuta `VERIFICAR_APP_SETTINGS.sql` para verificar
2. Debe mostrar un registro con `app_name = 'Opalo ATS'`
3. Recarga la aplicación
4. Intenta guardar un cambio en Settings
5. Verifica que persiste

---

## 📋 Checklist

- [ ] Ejecutar `VERIFICAR_REGISTROS_APP_SETTINGS.sql` - Ver qué registros existen
- [ ] Ejecutar `ACTUALIZAR_APP_SETTINGS_OPALO_ATS.sql` - Actualizar registro existente
- [ ] Verificar que el registro tiene `app_name = 'Opalo ATS'`
- [ ] Recargar aplicación
- [ ] Intentar guardar un cambio en Settings
- [ ] Verificar que persiste

---

## 💡 Nota Importante

El constraint `single_row` significa que la tabla `app_settings` está diseñada para tener **solo un registro global**. Para soportar múltiples aplicaciones (multi-tenant), necesitamos:

1. **Eliminar el constraint** (si es posible)
2. **O actualizar el registro existente** para que tenga `app_name = 'Opalo ATS'`

La segunda opción es más segura y no requiere modificar la estructura de la tabla.

---

## 🆘 Si Aún No Funciona

Si después de actualizar el registro los settings aún no persisten:

1. Verifica las políticas RLS en `app_settings`
2. Verifica que hay políticas para UPDATE
3. Verifica la consola del navegador para errores
4. Comparte los resultados de `VERIFICAR_APP_SETTINGS.sql`
