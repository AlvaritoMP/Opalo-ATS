# Solución Rápida: App No Responde

## 🔴 Problema Detectado

Falta el filtro `.eq('app_name', APP_NAME)` en `processes.ts` en el método `getAll()`. Esto puede estar causando que la query falle o traiga datos incorrectos.

## ✅ Solución Aplicada

He corregido el archivo `lib/api/processes.ts` para agregar los filtros faltantes.

## 🔧 Pasos para Aplicar la Corrección

### 1. Verificar que el archivo esté corregido

El archivo `lib/api/processes.ts` ahora tiene:
- Filtro `.eq('app_name', APP_NAME)` en `getAll()`
- Filtros en las queries de stages y document_categories

### 2. Reiniciar el servidor

```bash
# Detener el servidor (Ctrl+C en la terminal donde corre npm run dev)
# Reiniciar
npm run dev
```

### 3. Limpiar cache del navegador

- Presiona `Ctrl+Shift+R` (Windows) o `Cmd+Shift+R` (Mac) para hard refresh
- O abre una ventana de incógnito y ve a `localhost:3001`

### 4. Verificar consola del navegador

- Presiona `F12` para abrir DevTools
- Ve a la pestaña "Console"
- Busca errores en rojo
- Si ves errores, compártelos para diagnosticar

## 🚨 Si Sigue Sin Funcionar

### Opción A: Verificar Errores en Consola

1. Abre DevTools (`F12`)
2. Ve a "Console"
3. Busca errores que mencionen:
   - `app_name`
   - `column does not exist`
   - `Failed to fetch`
   - Cualquier error en rojo

### Opción B: Verificar Estado de Base de Datos

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar que app_name existe en processes
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'processes' 
AND column_name = 'app_name';

-- Verificar que hay datos con app_name
SELECT app_name, COUNT(*) 
FROM processes 
GROUP BY app_name;
```

### Opción C: Verificar Credenciales

Abre `.env.local` y verifica que tenga:

```env
VITE_SUPABASE_URL=https://afhiiplxqtodqxvmswor.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Opción D: Reconstruir la App

```bash
# Detener servidor
# Limpiar
rm -rf node_modules
rm -rf .vite
npm cache clean --force

# Reinstalar
npm install

# Reiniciar
npm run dev
```

## 📋 Checklist de Verificación

- [ ] Archivo `lib/api/processes.ts` tiene filtro `.eq('app_name', APP_NAME)` en `getAll()`
- [ ] Servidor reiniciado
- [ ] Cache del navegador limpiado
- [ ] Consola del navegador revisada (sin errores)
- [ ] Credenciales de Supabase correctas en `.env.local`
- [ ] Migración SQL ejecutada correctamente

## 🔍 Errores Comunes y Soluciones

### Error: "column app_name does not exist"
**Solución**: Ejecutar `MIGRATION_COMPLETA_OPTIMIZADA.sql` en Supabase

### Error: "Failed to fetch" o errores de red
**Solución**: Verificar que Supabase esté funcionando y las credenciales sean correctas

### Error: "Cannot read property of undefined"
**Solución**: Verificar que `APP_NAME` esté importado correctamente en todas las APIs

### La app carga pero muestra datos de Opalopy
**Solución**: Verificar que todos los filtros `.eq('app_name', APP_NAME)` estén presentes

## 📞 Si Nada Funciona

Comparte:
1. Errores de la consola del navegador (F12 > Console)
2. Errores de la terminal donde corre `npm run dev`
3. Resultado de la query de verificación de BD

