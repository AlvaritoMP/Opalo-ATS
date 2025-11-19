# 🔧 Solución: Error 502 Bad Gateway

## 🔴 Problema

El error **502 Bad Gateway** significa que Caddy no puede conectarse al servidor Node.js. Esto puede deberse a:

1. El servidor Node.js no se está ejecutando
2. El servidor se está crasheando al iniciar
3. Problemas con las variables de entorno
4. El puerto no está configurado correctamente

## ✅ Solución

### Paso 1: Revisar los Logs del Backend

1. En Easypanel, ve a tu app **backend**
2. Abre la sección **"Logs"** o **"Console"**
3. Busca errores como:
   - `Error: Cannot find module`
   - `Error: Missing required parameter`
   - `Error: EADDRINUSE` (puerto en uso)
   - Cualquier error de Node.js

### Paso 2: Verificar Variables de Entorno

Asegúrate de tener estas variables configuradas:

```env
PORT=5000
FRONTEND_URL=https://opalo-atsalfaoro.bouasv.easypanel.host
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
SESSION_SECRET=tu_secret_aleatorio
```

**⚠️ IMPORTANTE**: 
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` son **obligatorios**
- Si no están configurados, el servidor puede crashear al iniciar

### Paso 3: Verificar Start Command

En la sección "Build", el "Start Command" debe ser:

```
sh -c 'node src/server.js & sleep 2 && caddy run --config /app/Caddyfile --adapter caddyfile'
```

O más simple (si Easypanel maneja Caddy automáticamente):

```
node src/server.js
```

### Paso 4: Verificar que el Servidor se Inicie

En los logs, deberías ver:

```
🚀 Servidor backend corriendo en http://0.0.0.0:5000
📡 Frontend URL: https://opalo-atsalfaoro.bouasv.easypanel.host
✅ Backend listo para recibir peticiones
```

**Si NO ves estos mensajes**, el servidor no se está iniciando correctamente.

### Paso 5: Verificar Dependencias

El backend necesita estas dependencias en `backend/package.json`:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "googleapis": "^126.0.1"
  }
}
```

---

## 🔍 Errores Comunes

### Error: "Cannot find module 'express'"
- **Causa**: Las dependencias no se instalaron
- **Solución**: Verifica que `npm ci` se ejecutó correctamente en los logs

### Error: "Missing required parameter: client_id"
- **Causa**: `GOOGLE_CLIENT_ID` no está configurado
- **Solución**: Agrega `GOOGLE_CLIENT_ID` en las variables de entorno

### Error: "EADDRINUSE: address already in use :::5000"
- **Causa**: El puerto 5000 ya está en uso
- **Solución**: Cambia `PORT` a otro puerto (ej: `5001`)

### El servidor se inicia pero luego se cierra
- **Causa**: Puede ser un error no capturado
- **Solución**: Revisa los logs completos para ver el error

---

## 📝 Checklist de Verificación

- [ ] Variables de entorno configuradas (especialmente `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`)
- [ ] Start Command configurado correctamente
- [ ] Logs muestran que el servidor se inicia
- [ ] No hay errores en los logs
- [ ] Build Path configurado como `backend`

---

## 🆘 Próximos Pasos

1. **Revisa los logs** del backend en Easypanel
2. **Comparte el error** que ves en los logs
3. Con esa información, podremos solucionarlo específicamente

---

## 💡 Nota

El error 502 generalmente significa que:
- Caddy está corriendo ✅
- Pero no puede conectarse al servidor Node.js ❌

Por eso necesitamos ver los logs para saber por qué el servidor Node.js no está respondiendo.

