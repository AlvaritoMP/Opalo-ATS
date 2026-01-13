# 🔄 Guía: Cambiar app_name de 'Opalopy' a 'ATS Pro'

## 📋 Objetivo

Actualizar todos los registros que tienen `app_name = 'Opalopy'` a `app_name = 'ATS Pro'` en todas las tablas de la base de datos.

---

## ⚠️ Importante

- ✅ Este script **SOLO** actualiza registros con `app_name = 'Opalopy'`
- ✅ **NO afecta** registros con `app_name = 'Opalo ATS'`
- ✅ **NO afecta** registros con otros valores de `app_name`
- ✅ Usa `BEGIN` y `COMMIT` para transacción segura

---

## 📝 Pasos Recomendados

### Paso 1: Verificar Tablas con app_name

1. Ve a **Supabase Dashboard** > **SQL Editor**
2. Ejecuta: **`VERIFICAR_TABLAS_CON_APP_NAME.sql`**

Esto mostrará todas las tablas que tienen la columna `app_name`.

### Paso 2: Verificar Datos que se Actualizarán

1. Ejecuta: **`VERIFICAR_DATOS_OPALOPY.sql`**

Esto mostrará cuántos registros con `app_name = 'Opalopy'` hay en cada tabla.

**Verifica que:**
- Los números tienen sentido
- No hay registros inesperados
- Los totales coinciden con lo que esperas

### Paso 3: Ejecutar el Cambio

1. Ejecuta: **`CAMBIAR_APP_NAME_OPALOPY_A_ATS_PRO.sql`**

Este script:
- ✅ Actualiza todas las tablas en una transacción
- ✅ Solo cambia `'Opalopy'` a `'ATS Pro'`
- ✅ No afecta otros valores de `app_name`
- ✅ Muestra un resumen al final

### Paso 4: Verificar el Resultado

Después de ejecutar el script, verifica:

1. **El resumen al final** muestra los registros actualizados
2. **Ejecuta de nuevo** `VERIFICAR_DATOS_OPALOPY.sql` - debería mostrar 0 registros
3. **Verifica que los datos de 'Opalo ATS' no cambiaron**:
   ```sql
   SELECT COUNT(*) FROM processes WHERE app_name = 'Opalo ATS';
   ```

---

## 🔍 Tablas que se Actualizarán

El script actualiza las siguientes tablas (si existen):

1. `users`
2. `processes`
3. `candidates`
4. `stages`
5. `document_categories`
6. `attachments`
7. `candidate_history`
8. `post_its`
9. `comments`
10. `interview_events`
11. `form_integrations`
12. `app_settings`
13. `clients` (si existe)

---

## 🛡️ Seguridad

- ✅ Usa `BEGIN` y `COMMIT` para transacción atómica
- ✅ Solo actualiza donde `app_name = 'Opalopy'` exactamente
- ✅ No afecta datos de 'Opalo ATS'
- ✅ Puedes hacer `ROLLBACK` si algo sale mal (antes del COMMIT)

---

## ⚠️ Si Algo Sale Mal

Si necesitas revertir los cambios (antes de hacer COMMIT):

```sql
ROLLBACK;
```

**Nota:** Una vez que haces COMMIT, los cambios son permanentes. Por eso es importante verificar primero con los scripts de verificación.

---

## 📋 Checklist

- [ ] Ejecutar `VERIFICAR_TABLAS_CON_APP_NAME.sql` - Ver tablas
- [ ] Ejecutar `VERIFICAR_DATOS_OPALOPY.sql` - Ver qué se actualizará
- [ ] Verificar que los números tienen sentido
- [ ] Ejecutar `CAMBIAR_APP_NAME_OPALOPY_A_ATS_PRO.sql` - Hacer el cambio
- [ ] Verificar el resumen al final del script
- [ ] Ejecutar `VERIFICAR_DATOS_OPALOPY.sql` de nuevo - Debe mostrar 0
- [ ] Verificar que datos de 'Opalo ATS' no cambiaron

---

## ✅ Resultado Esperado

Después de ejecutar el script:

- ✅ Todos los registros con `app_name = 'Opalopy'` ahora tienen `app_name = 'ATS Pro'`
- ✅ Los registros con `app_name = 'Opalo ATS'` permanecen sin cambios
- ✅ La aplicación ATS Pro ahora verá sus datos correctamente
- ✅ La aplicación Opalo ATS sigue funcionando normalmente

---

## 💡 Nota

Después de este cambio, la aplicación ATS Pro deberá usar `APP_NAME = 'ATS Pro'` en su código. Si la aplicación ATS Pro aún usa `'Opalopy'` en su código, necesitarás actualizar también el código de esa aplicación.
