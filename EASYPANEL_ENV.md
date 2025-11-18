# Configuración de Variables de Entorno en Easypanel

## Variables de Entorno Requeridas

Para que la aplicación funcione correctamente en Easypanel, necesitas configurar las siguientes variables de entorno:

### 1. Variables de Supabase (REQUERIDAS)

Estas variables son necesarias para que la aplicación se conecte a la base de datos:

```
VITE_SUPABASE_URL=https://afhiiplxqtodqxvmswor.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU
```

### 2. Variable de Gemini (OPCIONAL)

Solo necesaria si usas funcionalidades de IA:

```
GEMINI_API_KEY=tu_clave_api_aqui
```

## Cómo Configurar en Easypanel

### Paso 1: Acceder a la Configuración

1. Inicia sesión en tu panel de Easypanel
2. Selecciona tu aplicación
3. Ve a la sección **"Environment Variables"** o **"Variables de Entorno"**
4. Haz clic en **"Add Variable"** o **"Agregar Variable"**

### Paso 2: Agregar Cada Variable

Para cada variable, haz lo siguiente:

1. **Nombre de la variable**: Ingresa exactamente el nombre (ej: `VITE_SUPABASE_URL`)
2. **Valor**: Pega el valor correspondiente
3. **Scope**: Selecciona "Build & Runtime" (si está disponible) o "Runtime"
4. Haz clic en **"Save"** o **"Guardar"**

### Paso 3: Reconstruir la Aplicación

**IMPORTANTE**: Después de agregar las variables de entorno:

1. Ve a la sección **"Deployments"** o **"Despliegues"**
2. Haz clic en **"Redeploy"** o **"Rebuild"**
3. Esto es necesario porque las variables `VITE_*` se inyectan durante el build

## Verificación

Después del despliegue, verifica en la consola del navegador (F12) que:

1. No hay errores de conexión a Supabase
2. Los logs muestran "Loading data from Supabase..."
3. Los datos se cargan correctamente

## Solución de Problemas

### La app no carga después de agregar variables

- **Solución**: Asegúrate de hacer un **Redeploy** después de agregar las variables
- Las variables `VITE_*` solo se inyectan durante el build, no en runtime

### Error: "Failed to load resource"

- **Solución**: Verifica que los valores de las variables sean correctos
- Asegúrate de no tener espacios extra al inicio o final de los valores

### La app carga pero no se conecta a Supabase

- **Solución**: 
  1. Verifica que las variables estén configuradas correctamente
  2. Revisa los logs de la consola del navegador
  3. Asegúrate de que las políticas RLS en Supabase permitan acceso anónimo (para desarrollo)

## Notas Importantes

- ⚠️ **Las variables `VITE_*` se inyectan en el código durante el build**
- ⚠️ **Debes hacer un rebuild después de agregar o modificar estas variables**
- ⚠️ **No uses comillas en los valores de las variables en Easypanel**
- ⚠️ **La clave anónima de Supabase es pública y segura de usar en el frontend**

