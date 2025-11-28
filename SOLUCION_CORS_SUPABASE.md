# Solución para Errores de CORS con Supabase

## 🔴 Problema

Tu aplicación está recibiendo errores de CORS al intentar conectarse a Supabase:

```
Access to fetch at 'https://afhiiplxqtodqxvmswor.supabase.co/rest/v1/...' 
from origin 'https://opalo-atsalfaoro.bouasv.easypanel.host' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## ✅ Solución: Configurar CORS en Supabase

### Paso 1: Acceder al Dashboard de Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto: `afhiiplxqtodqxvmswor`

### Paso 2: Agregar Dominio Permitido

1. En el menú lateral, ve a **Settings** (Configuración)
2. Haz clic en **API** en el submenú
3. Busca la sección **"CORS"** o **"Allowed Origins"** o **"Site URL"**
4. En el campo **"Site URL"** o **"Additional Allowed Origins"**, agrega:
   ```
   https://opalo-atsalfaoro.bouasv.easypanel.host
   ```
5. Si hay un campo para múltiples dominios, agrega también:
   ```
   https://opalo-atsalfaoro.bouasv.easypanel.host
   http://localhost:3000
   ```
   (El localhost es para desarrollo local)

### Paso 3: Verificar Configuración de RLS (Row Level Security)

Asegúrate de que las políticas RLS estén configuradas correctamente:

1. Ve a **Authentication** > **Policies** en el dashboard
2. Verifica que las tablas (`processes`, `candidates`, `users`, etc.) tengan políticas RLS apropiadas
3. Si las políticas son muy restrictivas, pueden estar bloqueando las peticiones

### Paso 4: Verificar API Keys

1. En **Settings** > **API**, verifica que estés usando la **anon key** (no la service_role key) en el frontend
2. La anon key es la que debe usarse en el cliente de Supabase del frontend

### Paso 5: Reiniciar la Aplicación

Después de hacer los cambios:
1. Espera 1-2 minutos para que los cambios se propaguen
2. Recarga la aplicación en el navegador (Ctrl+F5 o Cmd+Shift+R para forzar recarga)
3. Verifica que los errores de CORS hayan desaparecido

## 🔍 Verificación

Para verificar que CORS está configurado correctamente:

1. Abre las **Developer Tools** del navegador (F12)
2. Ve a la pestaña **Network**
3. Intenta cargar datos en la aplicación
4. Busca las peticiones a `afhiiplxqtodqxvmswor.supabase.co`
5. Verifica que las peticiones tengan status `200` o `201` (no `CORS error`)

## 📝 Notas Adicionales

### Si el problema persiste:

1. **Verifica que el dominio sea exacto**: Asegúrate de que el dominio en Supabase coincida exactamente con el dominio desde el que se está accediendo (incluyendo `https://`)

2. **Verifica variables de entorno**: Asegúrate de que las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén configuradas correctamente en tu entorno de producción

3. **Revisa los logs de Supabase**: En el dashboard de Supabase, ve a **Logs** > **API Logs** para ver si hay errores adicionales

4. **Verifica el plan de Supabase**: Algunos planes gratuitos pueden tener limitaciones de CORS. Si estás en el plan gratuito, considera actualizar

## 🚨 Solución Temporal (No Recomendada para Producción)

Si necesitas una solución temporal mientras configuras CORS correctamente, puedes usar un proxy. Sin embargo, esto NO es recomendado para producción:

```nginx
# En nginx.conf (NO RECOMENDADO - solo para emergencias)
location /api/supabase/ {
    proxy_pass https://afhiiplxqtodqxvmswor.supabase.co/;
    proxy_set_header Host afhiiplxqtodqxvmswor.supabase.co;
    add_header Access-Control-Allow-Origin *;
}
```

**⚠️ ADVERTENCIA**: Esta solución temporal puede tener problemas de seguridad y rendimiento. Es mejor configurar CORS correctamente en Supabase.

## 📚 Referencias

- [Documentación de Supabase sobre CORS](https://supabase.com/docs/guides/api/cors)
- [Configuración de API en Supabase](https://supabase.com/docs/guides/api/rest/overview)

