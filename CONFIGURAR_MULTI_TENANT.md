# Configuración Multi-Tenant: Opalo ATS y Opalopy

Este documento explica cómo configurar Opalo ATS para usar la misma base de datos de Supabase que Opalopy, manteniendo los datos completamente separados.

## ¿Qué es Multi-Tenant?

Multi-tenant significa que múltiples aplicaciones (Opalo ATS y Opalopy) comparten la misma base de datos, pero cada una solo ve y puede acceder a sus propios datos. Esto se logra usando un campo `app_name` en cada tabla que identifica a qué aplicación pertenece cada registro.

## Pasos de Configuración

### 1. Ejecutar la Migración SQL

**IMPORTANTE**: Ejecuta esto primero antes de usar Opalo ATS.

1. Ve a tu proyecto de Supabase: https://supabase.com
2. Selecciona el proyecto que usa Opalopy
3. Ve a **SQL Editor** → **New Query**
4. Abre el archivo `MIGRATION_ADD_APP_NAME.sql`
5. Copia y pega el contenido completo
6. Haz clic en **Run** (o presiona Ctrl+Enter)
7. Espera a que termine (puede tardar unos minutos)

Esta migración:
- Agrega la columna `app_name` a todas las tablas necesarias
- Marca todos los datos existentes como `'Opalopy'` (para que Opalopy siga funcionando)
- Crea índices para mejorar el rendimiento

### 2. Configurar Variables de Entorno

Configura Opalo ATS para usar las mismas credenciales de Supabase que Opalopy:

1. Abre el archivo `Opalo-ATS/.env.local`
2. Agrega las credenciales de Supabase de Opalopy:

```env
# Usa las mismas credenciales que Opalopy
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui

# API Key de Google Gemini (opcional)
GEMINI_API_KEY=

# URL del backend API
VITE_API_URL=http://localhost:5000
```

**¿Dónde encontrar las credenciales de Opalopy?**
- Abre el archivo `Opalopy/.env.local`
- Copia `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- Péguelas en `Opalo-ATS/.env.local`

### 3. Reiniciar la Aplicación

Después de configurar las variables de entorno:

1. Detén los servidores (Ctrl+C en las terminales)
2. Reinicia el frontend:
   ```bash
   cd Opalo-ATS
   npm run dev
   ```
3. Reinicia el backend:
   ```bash
   cd Opalo-ATS/backend
   npm run dev
   ```

### 4. Crear el Primer Usuario de Opalo ATS

Como Opalo ATS ahora filtra por `app_name = 'Opalo ATS'`, necesitas crear usuarios específicos para esta app:

1. Ve a Supabase SQL Editor
2. Ejecuta este SQL (cambia email y password):

```sql
INSERT INTO users (
    id,
    name,
    email,
    role,
    password_hash,
    app_name,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Super Admin',
    'admin@opaloats.com', -- CAMBIA ESTE EMAIL
    'admin',
    'admin123', -- CAMBIA ESTA CONTRASEÑA
    'Opalo ATS', -- IMPORTANTE: Debe ser exactamente 'Opalo ATS'
    NOW(),
    NOW()
);
```

3. Inicia sesión en http://localhost:3001 con el email y password que configuraste

## Cómo Funciona el Aislamiento

### Filtrado Automático

Todas las queries en Opalo ATS automáticamente filtran por `app_name = 'Opalo ATS'`:

- **Usuarios**: Solo usuarios con `app_name = 'Opalo ATS'`
- **Procesos**: Solo procesos con `app_name = 'Opalo ATS'`
- **Candidatos**: Solo candidatos con `app_name = 'Opalo ATS'`
- Y así para todas las tablas relacionadas

### Datos Completamente Separados

- ✅ Opalopy solo ve datos con `app_name = 'Opalopy'`
- ✅ Opalo ATS solo ve datos con `app_name = 'Opalo ATS'`
- ✅ No hay interferencia entre las dos aplicaciones
- ✅ Comparten la misma base de datos pero los datos están aislados

## Verificación

Para verificar que todo funciona:

1. **En Opalopy**: Deberías ver todos tus datos existentes (usuarios, procesos, candidatos)
2. **En Opalo ATS**: Deberías ver una aplicación vacía, lista para crear nuevos datos
3. **En Supabase**: Puedes verificar que hay datos con ambos `app_name`:

```sql
SELECT app_name, COUNT(*) 
FROM users 
GROUP BY app_name;

SELECT app_name, COUNT(*) 
FROM processes 
GROUP BY app_name;
```

## Solución de Problemas

### No veo mis datos en Opalo ATS

- Verifica que ejecutaste la migración SQL
- Verifica que las variables de entorno están correctas
- Verifica que creaste usuarios con `app_name = 'Opalo ATS'`

### Veo datos de Opalopy en Opalo ATS

- Verifica que el código está usando `APP_NAME` correctamente
- Reinicia los servidores después de los cambios
- Verifica que la migración se ejecutó correctamente

### Error al crear usuarios/procesos

- Verifica que el campo `app_name` se está agregando automáticamente
- Revisa la consola del navegador para ver errores específicos

## Notas Importantes

⚠️ **NO modifiques manualmente el campo `app_name`** de registros existentes de Opalopy. Esto podría hacer que desaparezcan de Opalopy.

⚠️ **El campo `app_name` debe ser exactamente** `'Opalo ATS'` (con mayúsculas y espacios como se muestra).

✅ **Los datos están completamente aislados** - Opalo ATS nunca verá datos de Opalopy y viceversa.

