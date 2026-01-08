# 🔍 Diagnóstico Completo: Backend No Funciona

## ❌ Problema

Después de cambiar el puerto del dominio a 5000, el backend sigue sin funcionar.

---

## ✅ Pasos de Diagnóstico

### Paso 1: Verificar Status del Backend

1. Ve a Easypanel
2. Ve a tu servicio **`atsopalo-backend`**
3. **¿Cuál es el Status?**
   - ✅ **Running** = Está corriendo
   - ❌ **Stopped** = Está detenido
   - ⚠️ **Error** = Hay un error
   - 🔄 **Starting** = Está iniciando

**Si está "Stopped":**
- Haz clic en **"Start"** o **"Deploy"**
- Espera a que termine

**Si está "Error":**
- Ve a los Logs para ver el error
- Comparte el error para diagnosticar

---

### Paso 2: Verificar Logs del Backend

1. En Easypanel, ve a tu backend
2. Ve a la pestaña **"Logs"**
3. **¿Qué ves en los últimos mensajes?**

#### ✅ Logs Correctos (Backend Funcionando)

Deberías ver algo como:

```
> opalo-ats-backend@1.0.0 start
> node src/server.js

🚀 Servidor backend corriendo en http://0.0.0.0:5000
📡 Frontend URL: https://opalo-atsopalo.bouasv.easypanel.host
🔐 Google OAuth Redirect URI: https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
✅ Backend listo para recibir peticiones
```

#### ❌ Logs con Errores

Si ves errores, compártelos. Errores comunes:

**Error: Cannot find module './src/server.js'**
```
Error: Cannot find module './src/server.js'
```
→ **Causa**: Root Directory incorrecto
→ **Solución**: Debe ser `Opalo-ATS/backend`

**Error: Cannot find module 'express'**
```
Error: Cannot find module 'express'
```
→ **Causa**: Dependencias no instaladas o Root Directory incorrecto
→ **Solución**: Verificar Root Directory y Build Command

**Error: EADDRINUSE**
```
Error: listen EADDRINUSE: address already in use :::5000
```
→ **Causa**: Puerto 5000 ya en uso
→ **Solución**: Reiniciar el servicio

**Advertencia: GOOGLE_CLIENT_ID no está configurada**
```
⚠️ ADVERTENCIA: GOOGLE_CLIENT_ID no está configurada
```
→ **Causa**: Variables de entorno no configuradas
→ **Solución**: Verificar Environment Variables

---

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

---

### Paso 4: Verificar Variables de Entorno

En **Environment Variables** del backend, verifica que estén:

```
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://opalo-atsopalo.bouasv.easypanel.host
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
```

**⚠️ IMPORTANTE**: 
- No deben tener comillas
- No deben tener espacios al inicio o final

---

### Paso 5: Verificar Configuración del Dominio

En **Domains** → **Edit Domain**, verifica:

- **HTTPS**: `ON` ✅
- **Host**: `opalo-atsopalo-backend.bouasv.easypanel.host` ✅
- **Path**: `/` ✅
- **Protocol**: `HTTP` ✅
- **Port**: `5000` ✅ (ya corregido)
- **Path**: `/` ✅

---

### Paso 6: Reiniciar el Servicio

1. En Easypanel, ve a tu backend
2. Haz clic en **"Restart"** o **"Stop"** y luego **"Start"**
3. Espera a que termine completamente
4. Verifica los logs de nuevo

---

## 🔍 Información Necesaria

Para diagnosticar mejor, necesito que compartas:

1. **Status del backend**: ¿Running, Stopped, Error?
2. **Últimos logs del backend**: Copia los últimos 20-30 líneas
3. **Configuración del servicio**:
   - Root Directory: ¿?
   - Build Command: ¿?
   - Start Command: ¿?
   - Port: ¿?

---

## 📋 Checklist de Diagnóstico

- [ ] Status del backend verificado
- [ ] Logs revisados (compartir si hay errores)
- [ ] Root Directory verificado (`Opalo-ATS/backend`)
- [ ] Build Command verificado (`npm install`)
- [ ] Start Command verificado (`npm start`)
- [ ] Port verificado (`5000`)
- [ ] Variables de entorno verificadas
- [ ] Puerto del dominio verificado (`5000`)
- [ ] Servicio reiniciado

---

## 🎯 Próximos Pasos

1. **Comparte el Status** del backend
2. **Comparte los últimos logs** (especialmente si hay errores)
3. **Comparte la configuración** del servicio (Root Directory, Start Command, etc.)

Con esta información podremos identificar el problema exacto.

