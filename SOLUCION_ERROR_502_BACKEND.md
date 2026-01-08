# 🔧 Solución: Error 502 (Bad Gateway)

## ❌ Problema

Cuando accedes a `https://opalo-atsopalo-backend.bouasv.easypanel.host/health`, ves:
- Error 502 (Bad Gateway)
- "Failed to load resource: the server responded with a status of 502"

Esto significa que:
- El proxy de Easypanel está recibiendo la petición ✅
- Pero **NO puede conectarse** al backend ❌

---

## 🔍 Causas Posibles

### 1. Backend No Está Corriendo
El backend puede estar detenido o con errores.

### 2. Backend No Está Escuchando Correctamente
El backend puede estar corriendo pero no escuchando en el puerto 5000.

### 3. Problema de Configuración
Puede haber un problema con la configuración del servicio o del dominio.

---

## ✅ Pasos para Solucionar

### Paso 1: Verificar Status del Backend

1. Ve a Easypanel
2. Ve a tu backend (`atsopalo-backend`)
3. **¿Cuál es el Status?**
   - ✅ **Running** = Está corriendo
   - ❌ **Stopped** = Está detenido → Haz clic en "Start"
   - ⚠️ **Error** = Hay un error → Revisa logs
   - 🔄 **Starting** = Está iniciando → Espera

### Paso 2: Verificar Logs del Backend

1. En Easypanel, ve a tu backend
2. Ve a la pestaña **"Logs"**
3. **¿Qué ves en los últimos mensajes?**

#### ✅ Logs Correctos (Backend Funcionando)

Deberías ver:

```
> opalo-ats-backend@1.0.0 start
> node src/server.js

🚀 Servidor backend corriendo en http://0.0.0.0:5000
📡 Frontend URL: https://opalo-atsopalo.bouasv.easypanel.host
🔐 Google OAuth Redirect URI: https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
✅ Backend listo para recibir peticiones
```

#### ❌ Si NO Ves Estos Mensajes

El backend no está iniciando correctamente. Busca errores como:

**Error: Cannot find module './src/server.js'**
```
Error: Cannot find module './src/server.js'
```
→ **Solución**: Verifica que Root Directory sea `Opalo-ATS/backend`

**Error: Cannot find module 'express'**
```
Error: Cannot find module 'express'
```
→ **Solución**: Verifica que Build Command sea `npm install` y que Root Directory sea correcto

**Error: EADDRINUSE**
```
Error: listen EADDRINUSE: address already in use :::5000
```
→ **Solución**: Reinicia el servicio

### Paso 3: Verificar Configuración del Servicio

En la configuración del backend, verifica:

1. **Root Directory**: 
   - ✅ Debe ser: `Opalo-ATS/backend`
   - ❌ NO debe ser: `Opalo-ATS` o `/` o `backend`

2. **Build Command**:
   - ✅ Debe ser: `npm install`
   - ❌ NO debe ser: `npm run build` (eso es para frontend)

3. **Start Command**:
   - ✅ Debe ser: `npm start`
   - ❌ NO debe ser: `npm run dev` o `node server.js`

4. **Port**:
   - ✅ Debe ser: `5000`

### Paso 4: Reiniciar el Servicio

1. En Easypanel, ve a tu backend
2. Haz clic en **"Restart"** o **"Stop"** y luego **"Start"**
3. Espera a que termine completamente (puede tardar 1-2 minutos)
4. Verifica los logs de nuevo

### Paso 5: Verificar Variables de Entorno

En **Environment Variables** del backend, verifica que estén:

```
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://opalo-atsopalo.bouasv.easypanel.host
GOOGLE_CLIENT_ID=968572483416-v3dju424jrbae7b85u7fb7jurskfmh15.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
```

**⚠️ IMPORTANTE**: 
- No deben tener comillas
- No deben tener espacios al inicio o final

### Paso 6: Verificar Configuración del Dominio (Otra Vez)

En **Domains** → **Edit Domain**, verifica:

- **HTTPS**: `ON` ✅
- **Host**: `opalo-atsopalo-backend.bouasv.easypanel.host` ✅
- **Path**: `/` ✅
- **Protocol**: `HTTP` ✅
- **Port**: `5000` ✅
- **Path**: `/` ✅

---

## 🔍 Diagnóstico Adicional

### Si el Backend Está "Running" pero Sigue el 502

1. **Espera 1-2 minutos** después de iniciar (puede tardar en estar disponible)
2. **Verifica que los logs muestren** el mensaje "Backend listo para recibir peticiones"
3. **Reinicia el servicio** de nuevo
4. **Verifica que no haya errores** en los logs

### Si Hay Errores en los Logs

Comparte los errores específicos para diagnosticar mejor.

---

## 📋 Checklist

- [ ] Status del backend es "Running"
- [ ] Logs muestran "Backend listo para recibir peticiones"
- [ ] Root Directory es `Opalo-ATS/backend`
- [ ] Build Command es `npm install`
- [ ] Start Command es `npm start`
- [ ] Port es `5000`
- [ ] Variables de entorno están configuradas
- [ ] Puerto del dominio es `5000`
- [ ] Servicio reiniciado después de cambios
- [ ] Esperado 1-2 minutos después de reiniciar

---

## 🎯 Próximos Pasos

1. **Verifica el Status** del backend
2. **Revisa los Logs** y comparte los últimos mensajes
3. **Si está "Stopped"**, haz clic en "Start"
4. **Si hay errores**, compártelos para diagnosticar

---

## 💡 Nota

Un error 502 generalmente significa que el proxy no puede conectarse al backend. Las causas más comunes son:
- El backend no está corriendo
- El backend no está escuchando en el puerto correcto
- Hay un error que impide que el backend inicie

La solución más común es **reiniciar el servicio** y verificar que los logs muestren que está funcionando correctamente.

