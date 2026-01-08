# 🔧 Solución: "Service is not reachable"

## ❌ Problema

Cuando accedes a `https://opalo-atsopalo-backend.bouasv.easypanel.host/health`, ves el error:
```
Service is not reachable
Make sure the service is running and healthy.
```

Esto significa que el backend **no está corriendo** o **no está accesible**.

---

## ✅ Pasos para Solucionar

### Paso 1: Verificar Status del Backend

1. Ve a Easypanel
2. Ve a tu servicio **`atsopalo-backend`**
3. Verifica el **Status**:
   - ✅ **Running** = Está corriendo
   - ❌ **Stopped** = Está detenido
   - ⚠️ **Error** = Hay un error

### Paso 2: Si el Status es "Stopped"

1. Haz clic en el botón **"Start"** o **"Deploy"**
2. Espera a que termine el build y el inicio
3. Verifica que el Status cambie a **"Running"**

### Paso 3: Verificar Logs del Backend

1. En Easypanel, ve a tu backend
2. Ve a la pestaña **"Logs"**
3. Busca los últimos mensajes

**¿Qué deberías ver si está funcionando?**
```
🚀 Servidor backend corriendo en http://0.0.0.0:5000
📡 Frontend URL: https://opalo-atsopalo.bouasv.easypanel.host
✅ Backend listo para recibir peticiones
```

**Si ves errores:**
- `Error: Cannot find module` → Root Directory incorrecto
- `EADDRINUSE` → Puerto en uso
- `⚠️ ADVERTENCIA: GOOGLE_CLIENT_ID no está configurada` → Variables no configuradas

### Paso 4: Verificar Configuración

En la configuración del backend, verifica:

1. **Root Directory**: Debe ser `Opalo-ATS/backend`
2. **Start Command**: Debe ser `npm start`
3. **Port**: Debe ser `5000`
4. **Build Command**: Debe ser `npm install`

### Paso 5: Verificar Variables de Entorno

En **Environment Variables**, verifica que estén:

```
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://opalo-atsopalo.bouasv.easypanel.host
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
```

### Paso 6: Reiniciar el Servicio

1. En Easypanel, ve a tu backend
2. Haz clic en **"Restart"** o **"Stop"** y luego **"Start"**
3. Espera a que termine
4. Verifica los logs de nuevo

---

## 🔍 Diagnóstico Adicional

### Si el Backend Está "Running" pero Sigue el Error

1. **Verifica el puerto del dominio** (ya lo corregiste a 5000)
2. **Verifica que no haya errores en los logs**
3. **Espera unos minutos** después de reiniciar (puede tardar en estar disponible)

### Si Hay Errores en los Logs

**Error: Cannot find module './src/server.js'**
→ **Solución**: Verifica que Root Directory sea `Opalo-ATS/backend`

**Error: Cannot find module 'express'**
→ **Solución**: Verifica que Build Command sea `npm install`

**Error: EADDRINUSE: address already in use :::5000**
→ **Solución**: Reinicia el servicio o verifica que no haya otro proceso usando el puerto

---

## 📋 Checklist

- [ ] Status del backend es "Running"
- [ ] Logs muestran que el servidor está corriendo
- [ ] Root Directory es `Opalo-ATS/backend`
- [ ] Start Command es `npm start`
- [ ] Port es `5000`
- [ ] Variables de entorno están configuradas
- [ ] Puerto del dominio es `5000` (no 80)
- [ ] Servicio reiniciado después de cambios

---

## 🎯 Próximos Pasos

1. **Verifica el Status** del backend en Easypanel
2. **Si está "Stopped"**, haz clic en "Start"
3. **Revisa los Logs** para ver si hay errores
4. **Comparte los logs** si hay errores para diagnosticar mejor

---

## 💡 Nota

El error "Service is not reachable" generalmente significa que:
- El servicio no está corriendo
- El servicio está corriendo pero hay un error que lo detiene
- El servicio está corriendo pero no está accesible (problema de red/configuración)

La solución más común es **reiniciar el servicio** y verificar que esté en estado "Running".

