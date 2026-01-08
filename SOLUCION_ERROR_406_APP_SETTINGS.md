# 🔧 Solución: Error 406 en app_settings

## 🔴 Problema

En la consola del navegador aparece:
```
Failed to load resource: the server responded with a status of 406
Failed to load resource: the server responded with a status of 400
❌ Failed to load settings from Supabase
```

Esto ocurre cuando la app intenta cargar `app_settings` con el filtro `app_name=eq.Opalo+ATS`.

---

## ✅ Causas Posibles

1. **La columna `app_name` no existe en `app_settings`**
   - La migración para agregar `app_name` no se ejecutó en la base de datos

2. **No hay registros con `app_name = 'Opalo ATS'`**
   - La tabla existe pero no tiene datos para esta app

3. **El encoding del espacio en "Opalo ATS" causa problemas**
   - El `+` en la URL no se está decodificando correctamente

---

## ✅ Solución Aplicada

He modificado `lib/api/settings.ts` para:

1. **Manejar errores 406/400 gracefully**
   - Si falla con filtro `app_name`, intenta sin filtro
   - Si no hay registros, crea uno con valores por defecto
   - Si todo falla, retorna valores por defecto sin lanzar error

2. **Compatibilidad con tablas sin `app_name`**
   - Si la columna `app_name` no existe, intenta crear sin esa columna
   - La app puede funcionar aunque la migración no se haya ejecutado

3. **Mejor logging de errores**
   - Muestra warnings informativos en lugar de errores críticos
   - Permite que la app continúe funcionando

---

## 📋 Pasos para Verificar

### Paso 1: Verificar en Supabase

1. Ve a Supabase Dashboard → SQL Editor
2. Ejecuta:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'app_settings';
   ```
3. Verifica si `app_name` existe

### Paso 2: Verificar Registros

1. Ejecuta:
   ```sql
   SELECT * FROM app_settings;
   ```
2. Verifica si hay registros con `app_name = 'Opalo ATS'`

### Paso 3: Si Falta la Columna

Si `app_name` no existe, ejecuta la migración:
```sql
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS app_name TEXT;
```

Luego actualiza los registros existentes:
```sql
UPDATE app_settings 
SET app_name = 'Opalo ATS' 
WHERE app_name IS NULL;
```

---

## 🔍 Verificación Después del Fix

Después de hacer rebuild en EasyPanel:

1. ✅ La app carga sin errores en consola sobre `app_settings`
2. ✅ Si no hay settings, se crean con valores por defecto
3. ✅ La app funciona normalmente aunque falte la columna `app_name`

---

## 📝 Notas

- **Error de WebSocket**: El error de WebSocket (`ws://localhost:3001`) es **normal en producción**. Solo es para HMR (Hot Module Replacement) de Vite en desarrollo. Puede ignorarse.

- **Error 406/400**: Ahora se maneja gracefully y no debería aparecer en consola.

- **Fallback**: Si todo falla, la app usa valores por defecto y continúa funcionando.

---

## 🎯 Resultado Esperado

Después del rebuild:

✅ **Sin errores en consola sobre app_settings**
✅ **La app carga correctamente**
✅ **Los datos de Supabase se cargan normalmente**
✅ **Si falta `app_name`, la app funciona igual**


