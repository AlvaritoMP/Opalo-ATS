# Guía de Despliegue en EasyPanel

> **📌 Para integración con Google Drive**: Ver `DEPLOY_GOOGLE_DRIVE.md` para instrucciones completas.

# Guía de Despliegue en EasyPanel

Esta guía te ayudará a desplegar tu aplicación ATS Pro en producción usando EasyPanel.

## ⚠️ IMPORTANTE: Antes de Desplegar

**Tu aplicación actual es solo frontend**. Para producción real necesitas:

1. **Backend API** (Node.js, Python, Baserow, Supabase, etc.)
2. **Base de datos** (PostgreSQL, MongoDB, etc.)
3. **Autenticación real** (JWT, OAuth, etc.)

📋 **Lee primero**: `PRODUCTION_CHECKLIST.md` para ver qué necesitas implementar.

Esta guía asume que ya tienes el backend configurado o que estás desplegando solo el frontend como demo.

## Prerrequisitos

1. **Servidor virtual** con EasyPanel instalado
2. **Repositorio Git** (GitHub, GitLab, etc.) con tu código
3. **Clave API de Gemini** para las funcionalidades de IA
4. **Backend configurado** (si es para producción real)

## Archivos de Configuración Creados

- `Dockerfile`: Construye y sirve la aplicación con nginx
- `.dockerignore`: Optimiza el build excluyendo archivos innecesarios
- `nginx.conf`: Configuración del servidor web para producción

## Pasos para Desplegar en EasyPanel

### 1. Preparar el Repositorio

Asegúrate de que todos los archivos estén en tu repositorio Git:

```bash
git add Dockerfile .dockerignore nginx.conf
git commit -m "Add production deployment files"
git push
```

### 2. Configurar Variables de Entorno en EasyPanel

En el panel de EasyPanel, ve a la sección **"Environment Variables"** o **"Variables de Entorno"** y configura:

**Variables requeridas:**

1. **`VITE_SUPABASE_URL`**: URL de tu proyecto Supabase
   - Valor: `https://afhiiplxqtodqxvmswor.supabase.co`

2. **`VITE_SUPABASE_ANON_KEY`**: Clave anónima de Supabase
   - Valor: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU`

3. **`GEMINI_API_KEY`** (opcional): Tu clave API de Gemini para funcionalidades de IA
   - Obtener en: https://aistudio.google.com/apikey

**Nota importante:** Las variables que empiezan con `VITE_` son necesarias porque Vite las inyecta en el código durante el build. Asegúrate de configurarlas ANTES de hacer el build.

### 3. Crear Nueva Aplicación en EasyPanel

1. **Inicia sesión** en tu panel de EasyPanel
2. **Crea una nueva aplicación** → Selecciona "Docker" o "From Git"
3. **Conecta tu repositorio Git**:
   - URL del repositorio
   - Rama (generalmente `main` o `master`)
   - Ruta del Dockerfile: `./Dockerfile`

### 4. Configurar el Build

En la configuración de build de EasyPanel:

- **Build Command**: (no necesario, el Dockerfile lo maneja)
- **Dockerfile Path**: `./Dockerfile`
- **Context**: `.` (directorio raíz)

### 5. Configurar el Puerto

- **Puerto interno**: `80` (nginx escucha en el puerto 80)
- EasyPanel manejará el mapeo del puerto externo automáticamente

### 6. Variables de Entorno

Agrega las variables de entorno en la sección correspondiente:

```
GEMINI_API_KEY=tu_clave_api_aqui
```

### 7. Desplegar

1. Haz clic en **"Deploy"** o **"Build & Deploy"**
2. Espera a que el build termine (puede tomar varios minutos la primera vez)
3. Una vez completado, tu aplicación estará disponible en la URL proporcionada por EasyPanel

## Verificación Post-Despliegue

1. **Accede a la URL** proporcionada por EasyPanel
2. **Verifica que la aplicación carga** correctamente
3. **Prueba el login** con las credenciales por defecto:
   - Email: `admin@ats.com`
   - Password: `password`

## Solución de Problemas

### Error: "Cannot find module"
- Verifica que todas las dependencias estén en `package.json`
- Asegúrate de que `npm ci` se ejecute correctamente en el Dockerfile

### Error: "Environment variable not found"
- Verifica que `GEMINI_API_KEY` esté configurada en EasyPanel
- Asegúrate de que el nombre de la variable sea exactamente `GEMINI_API_KEY`

### La aplicación carga pero no funciona
- Revisa los logs en EasyPanel
- Verifica que nginx esté sirviendo los archivos correctamente
- Comprueba la consola del navegador para errores de JavaScript

### Problemas con el routing (404 en rutas)
- Verifica que `nginx.conf` esté copiado correctamente
- Asegúrate de que la configuración de `try_files` esté presente

## Actualizaciones Futuras

Para actualizar la aplicación:

1. Haz cambios en tu código local
2. Haz commit y push a tu repositorio
3. En EasyPanel, haz clic en **"Redeploy"** o configura auto-deploy desde Git

## Notas Importantes

- **Datos**: Los datos se almacenan en `localStorage` del navegador, no en el servidor. Cada usuario verá sus propios datos.
- **Seguridad**: En producción, considera implementar autenticación real y una base de datos backend.
- **HTTPS**: EasyPanel generalmente proporciona HTTPS automáticamente, pero verifica la configuración.

## Recursos Adicionales

- [Documentación de EasyPanel](https://easypanel.io/docs)
- [Documentación de Vite](https://vitejs.dev/)
- [Documentación de Docker](https://docs.docker.com/)

