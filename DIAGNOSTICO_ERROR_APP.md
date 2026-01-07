# Diagnóstico: App No Responde / Modo Oscuro

## Síntomas
- La app se ve en modo oscuro/transparente
- No responde a interacciones
- No se puede acceder a la consola
- Al refrescar se actualiza pero luego no funciona

## Posibles Causas

### 1. Error en JavaScript que bloquea la UI
Las queries a Supabase pueden estar fallando y causando un error que bloquea toda la aplicación.

### 2. Problema con el filtrado por app_name
Si alguna tabla no tiene la columna `app_name` o hay un error en las queries, puede causar que la app se bloquee.

### 3. Loop infinito en useEffect
Un error en la carga de datos puede estar causando que el useEffect se ejecute infinitamente.

## Solución Rápida

### Paso 1: Abrir Consola del Navegador

**Chrome/Edge:**
- Presiona `F12` o `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- Ve a la pestaña "Console"
- Busca errores en rojo

**Si no puedes abrir la consola:**
- Cierra completamente el navegador
- Abre una ventana de incógnito
- Ve a `localhost:3001`
- Presiona `F12` inmediatamente

### Paso 2: Verificar Errores Comunes

Busca estos errores en la consola:

1. **"column app_name does not exist"**
   - Solución: Ejecutar `MIGRATION_COMPLETA_OPTIMIZADA.sql` en Supabase

2. **"Failed to fetch" o errores de red**
   - Solución: Verificar que Supabase esté funcionando

3. **Errores de sintaxis en TypeScript**
   - Solución: Verificar que todos los imports estén correctos

### Paso 3: Verificar Estado de Supabase

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar que todas las columnas app_name existen
SELECT 
    table_name,
    column_name
FROM information_schema.columns 
WHERE column_name = 'app_name'
ORDER BY table_name;
```

Deberías ver 12 tablas listadas.

### Paso 4: Verificar Credenciales

Verifica que `.env.local` tenga las credenciales correctas:

```env
VITE_SUPABASE_URL=https://afhiiplxqtodqxvmswor.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Paso 5: Limpiar Cache y Reconstruir

```bash
# Detener el servidor (Ctrl+C)

# Limpiar node_modules y cache
rm -rf node_modules
rm -rf .vite
npm cache clean --force

# Reinstalar
npm install

# Reiniciar
npm run dev
```

## Solución Temporal: Desactivar Filtrado Multi-Tenant

Si necesitas que la app funcione inmediatamente mientras diagnosticas, puedes temporalmente comentar los filtros por `app_name`:

### En `lib/api/users.ts`:

```typescript
// Temporalmente comentar el filtro
async getAll(): Promise<User[]> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        // .eq('app_name', APP_NAME) // ← COMENTAR TEMPORALMENTE
        .order('created_at', { ascending: false });
    // ...
}
```

**⚠️ ADVERTENCIA:** Esto hará que Opalo ATS vea datos de Opalopy. Solo úsalo para diagnóstico.

## Verificación de Errores en Código

Revisa estos archivos para errores de sintaxis:

1. `lib/appConfig.ts` - Debe existir y exportar `APP_NAME`
2. `lib/api/users.ts` - Verificar imports y uso de `APP_NAME`
3. `lib/api/processes.ts` - Verificar imports y uso de `APP_NAME`
4. `lib/api/candidates.ts` - Verificar imports y uso de `APP_NAME`
5. `lib/api/settings.ts` - Verificar que use `app_settings` (no `settings`)

## Comandos de Diagnóstico

### Ver errores de TypeScript:
```bash
npm run build
```

### Ver errores de lint:
```bash
npm run lint
```

### Verificar que el servidor esté corriendo:
```bash
# En otra terminal
curl http://localhost:3001
```

## Si Nada Funciona

1. **Revertir cambios temporalmente:**
   - Ejecuta `REVERTIR_CAMBIOS.sql` en Supabase
   - Comenta todos los filtros por `app_name` en las APIs
   - Reinicia la app

2. **Verificar logs del servidor:**
   - Revisa la terminal donde corre `npm run dev`
   - Busca errores ahí

3. **Probar en modo incógnito:**
   - Abre ventana incógnito
   - Ve a `localhost:3001`
   - Esto descarta problemas de cache del navegador

