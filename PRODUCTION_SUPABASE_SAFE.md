# Flujo seguro para Supabase en producción

Este proyecto usa Supabase con las variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Reglas de seguridad

1. No ejecutes `opencode` ni otras herramientas automáticas sobre el proyecto en el servidor de producción.
2. No modifiques `.env.local` desde herramientas externas sin saber exactamente qué cambias.
3. Si puedes, usa variables de entorno del servidor en lugar de dejar credenciales en un archivo.
4. `.env.local` está en `.gitignore`, por lo que no debe subirse al repositorio.

## Qué hacer si necesitas cambiar credenciales

- Actualiza las variables de entorno del servidor o del servicio de despliegue.
- Si necesitas usar un archivo local en producción, documenta el cambio y haz un respaldo antes.
- No confíes en editores o asistentes automáticos para reescribir la configuración.

## Verificación rápida

Para confirmar que la conexión sigue funcionando desde el servidor:
1. Verifica que `c:\Users\alvaro\Opalo-ATS\.env.local` contenga las variables correctas.
2. Ejecuta la aplicación con `npm run dev` o el comando de despliegue correspondiente.
3. Comprueba que no haya cambios pendientes en Git: `git status --short`.
4. Si deseas validar la conexión a Supabase, hazlo con una prueba controlada y explícita (como la consulta que ya ejecutamos).
