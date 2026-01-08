# ✅ Verificar Configuración del Backend

## 📋 Configuración Correcta

### Root Directory
```
Opalo-ATS/backend
```

### Build Command
```
npm install
```

### Start Command
```
npm start
```

### Port
```
5000
```

### Node Version
```
20
```

---

## 🔍 Qué Verificar en los Logs

### Logs Correctos (Backend Funcionando)

Deberías ver algo como:

```
> opalo-ats-backend@1.0.0 start
> node src/server.js

🚀 Servidor backend corriendo en http://0.0.0.0:5000
📡 Frontend URL: https://opalo-atsopalo.bouasv.easypanel.host
🔐 Google OAuth Redirect URI: https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
✅ Backend listo para recibir peticiones
```

### Logs Incorrectos (Backend No Funciona)

Si ves errores como:

```
Error: Cannot find module './src/server.js'
```
→ **Root Directory incorrecto**

```
Error: Cannot find module 'express'
```
→ **Dependencias no instaladas** o **Root Directory incorrecto**

```
EADDRINUSE: address already in use :::5000
```
→ **Puerto ya en uso** (puede haber otro proceso)

```
⚠️ ADVERTENCIA: GOOGLE_CLIENT_ID no está configurada
```
→ **Variables de entorno no configuradas**

---

## 🔧 Acciones Rápidas

1. **Ver logs del backend** → Identificar errores
2. **Verificar Root Directory** → Debe ser `Opalo-ATS/backend`
3. **Verificar Start Command** → Debe ser `npm start`
4. **Reiniciar servicio** → Aplicar cambios

