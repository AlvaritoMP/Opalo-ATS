# 🔍 Verificar Logs de Runtime del Backend

## 📋 Lo que Necesitamos Ver

El log que compartiste solo muestra el **build**, pero necesitamos ver los **logs de runtime** (cuando el servidor está ejecutándose).

## ✅ Pasos para Ver los Logs de Runtime

### Paso 1: En Easypanel

1. Ve a tu app **backend** en Easypanel
2. Busca una sección llamada:
   - **"Logs"** o **"Console"**
   - **"Runtime Logs"** o **"Application Logs"**
   - O un icono de terminal/consola

### Paso 2: Verificar que el Servidor Esté Corriendo

En los logs de runtime, deberías ver:

```
🚀 Servidor backend corriendo en http://0.0.0.0:5000
📡 Frontend URL: https://opalo-atsalfaoro.bouasv.easypanel.host
✅ Backend listo para recibir peticiones
```

**Si NO ves estos mensajes**, el servidor no se está ejecutando.

### Paso 3: Verificar Errores

Si hay errores, deberías ver algo como:
- `Error: Cannot find module 'express'`
- `Error: Missing required parameter: client_id`
- `Error: EADDRINUSE: address already in use :::5000`

---

## 🔍 Verificar Configuración

### ¿Configuraste los Comandos Manualmente?

En la sección **"Build"** de Easypanel, verifica:

1. **Install Command**: ¿Está configurado como `cd backend && npm ci`?
2. **Start Command**: ¿Está configurado como `cd backend && node src/server.js`?

Si NO están configurados, Nixpacks está usando la configuración automática, que está detectando el `Caddyfile` del frontend.

---

## 🆘 Si No Puedes Ver los Logs de Runtime

1. **Intenta acceder al endpoint**:
   - Abre: `https://opalo-ats-backend.bouasv.easypanel.host/health`
   - Esto debería generar logs

2. **Verifica el estado del servicio**:
   - En Easypanel, busca un indicador de estado (verde/rojo)
   - O busca una sección de "Status" o "Health"

3. **Revisa si hay errores en el build**:
   - Aunque el build dice "Success", puede haber errores en la ejecución

---

## 📝 Información que Necesito

Para ayudarte mejor, necesito:

1. **¿Configuraste los comandos manualmente?**
   - Install Command: `cd backend && npm ci`
   - Start Command: `cd backend && node src/server.js`

2. **¿Qué ves en los logs de runtime?**
   - ¿Ves el mensaje "Servidor backend corriendo"?
   - ¿Hay algún error?

3. **¿El servicio está corriendo?**
   - ¿Hay un indicador verde/rojo en Easypanel?

