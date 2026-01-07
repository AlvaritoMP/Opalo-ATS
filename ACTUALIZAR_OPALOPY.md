# Actualizar Opalopy para Multi-Tenant

## ⚠️ IMPORTANTE

Aunque la migración de la base de datos ya está completa, **el código de Opalopy también necesita actualizarse** para:

1. Filtrar todas las queries por `app_name = 'Opalopy'`
2. Asignar `app_name = 'Opalopy'` en todas las inserciones
3. Mantener el aislamiento de datos

## Cambios Necesarios en Opalopy

### 1. Crear archivo de configuración

Crea `Opalopy/lib/appConfig.ts`:

```typescript
// Configuración de la aplicación
export const APP_NAME = 'Opalopy';
```

### 2. Actualizar todas las APIs

Necesitas actualizar los mismos archivos que actualicé en Opalo-ATS:

- `lib/api/users.ts` - Filtrar y asignar `app_name = 'Opalopy'`
- `lib/api/processes.ts` - Filtrar y asignar `app_name = 'Opalopy'`
- `lib/api/candidates.ts` - Filtrar y asignar `app_name = 'Opalopy'`
- `lib/api/postits.ts` - Filtrar y asignar `app_name = 'Opalopy'`
- `lib/api/comments.ts` - Filtrar y asignar `app_name = 'Opalopy'`
- `lib/api/interviews.ts` - Filtrar y asignar `app_name = 'Opalopy'`
- `lib/api/settings.ts` - Filtrar y asignar `app_name = 'Opalopy'`

### 3. Patrón de Cambios

Para cada API, necesitas:

**En queries SELECT:**
```typescript
// Antes
.from('users')
.select('*')

// Después
.from('users')
.select('*')
.eq('app_name', APP_NAME)
```

**En INSERT:**
```typescript
// Antes
.insert({ name: '...', email: '...' })

// Después
.insert({ name: '...', email: '...', app_name: APP_NAME })
```

**En UPDATE:**
```typescript
// Antes
.update(data)
.eq('id', id)

// Después
.update(data)
.eq('id', id)
.eq('app_name', APP_NAME)
```

**En DELETE:**
```typescript
// Antes
.delete()
.eq('id', id)

// Después
.delete()
.eq('id', id)
.eq('app_name', APP_NAME)
```

## Proceso de Actualización

### Opción A: Actualización Manual (Recomendado)

1. **Hacer backup del código actual de Opalopy**
   ```bash
   cd Opalopy
   git add .
   git commit -m "Backup antes de actualización multi-tenant"
   git push
   ```

2. **Aplicar los mismos cambios que hice en Opalo-ATS**
   - Usa los archivos de Opalo-ATS como referencia
   - Cambia `APP_NAME = 'Opalo ATS'` por `APP_NAME = 'Opalopy'`
   - Aplica los mismos filtros `.eq('app_name', APP_NAME)`

3. **Probar localmente**
   ```bash
   npm run dev
   ```
   - Verifica que Opalopy solo muestra sus propios datos
   - Verifica que puedes crear nuevos registros
   - Verifica que no ves datos de Opalo ATS

4. **Commit y Push**
   ```bash
   git add .
   git commit -m "feat: Agregar soporte multi-tenant con app_name"
   git push
   ```

5. **Desplegar en el servidor**
   - Si usas CI/CD, debería desplegarse automáticamente
   - Si es manual, haz pull en el servidor y reinicia la aplicación

### Opción B: Usar los Archivos de Opalo-ATS como Base

1. Copia los archivos de APIs de Opalo-ATS
2. Reemplaza `APP_NAME = 'Opalo ATS'` por `APP_NAME = 'Opalopy'`
3. Ajusta cualquier diferencia específica de Opalopy
4. Prueba y despliega

## Verificación Post-Despliegue

Después de desplegar, verifica:

1. **Opalopy solo ve sus datos:**
   ```sql
   -- En Supabase, ejecuta esto
   SELECT app_name, COUNT(*) 
   FROM users 
   GROUP BY app_name;
   ```
   Deberías ver solo usuarios con `app_name = 'Opalopy'` desde Opalopy

2. **Nuevos registros tienen app_name correcto:**
   - Crea un nuevo proceso en Opalopy
   - Verifica en Supabase que tiene `app_name = 'Opalopy'`

3. **Aislamiento funciona:**
   - Opalopy no debería ver datos de Opalo ATS
   - Opalo ATS no debería ver datos de Opalopy

## Checklist de Actualización

- [ ] Crear `lib/appConfig.ts` con `APP_NAME = 'Opalopy'`
- [ ] Actualizar `lib/api/users.ts`
- [ ] Actualizar `lib/api/processes.ts`
- [ ] Actualizar `lib/api/candidates.ts`
- [ ] Actualizar `lib/api/postits.ts`
- [ ] Actualizar `lib/api/comments.ts`
- [ ] Actualizar `lib/api/interviews.ts`
- [ ] Actualizar `lib/api/settings.ts`
- [ ] Probar localmente
- [ ] Commit y push
- [ ] Desplegar en servidor
- [ ] Verificar funcionamiento en producción

## Notas Importantes

1. **Los datos existentes están seguros**: Ya tienen `app_name = 'Opalopy'`, así que seguirán funcionando.

2. **Sin cambios en la BD**: No necesitas ejecutar más scripts SQL, solo actualizar el código.

3. **Rollback**: Si algo sale mal, puedes revertir el commit y Opalopy seguirá funcionando (aunque sin aislamiento).

4. **Testing**: Prueba bien antes de desplegar en producción.

## ¿Necesitas Ayuda?

Si quieres, puedo ayudarte a:
- Crear los archivos actualizados para Opalopy
- Revisar los cambios antes de desplegar
- Crear un script de migración del código

