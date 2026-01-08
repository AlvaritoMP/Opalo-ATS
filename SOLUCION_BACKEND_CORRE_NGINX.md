# 🔧 Solución: Backend Está Corriendo Nginx en Lugar de Node.js

## ❌ Problema Detectado

Los logs muestran que está corriendo **nginx** (servidor web del frontend) en lugar del **backend Node.js**.

**Logs que lo confirman:**
```
nginx/1.29.4
start worker processes
/docker-entrypoint.sh (nginx)
```

**Logs que FALTAN (del backend Node.js):**
```
🚀 Servidor backend corriendo en http://0.0.0.0:5000
✅ Backend listo para recibir peticiones
```

---

## 🔍 Causa

Easypanel está usando el **Dockerfile del frontend** (que tiene nginx) en lugar de ejecutar el backend Node.js directamente.

Esto puede pasar porque:
1. **Root Directory** está mal configurado
2. Easypanel está detectando el Dockerfile de la raíz
3. El servicio está configurado como "Static" en lugar de "Node.js"

---

## ✅ Solución

### Opción A: Configurar como Servicio Node.js (Recomendado)

1. Ve a tu backend en Easypanel (`opalo/atsopalo-backend`)
2. Ve a la configuración del servicio
3. Verifica el **tipo de servicio**:
   - Debe ser **"Node.js"** o **"App"**
   - NO debe ser **"Static"** o **"Nginx"**

4. Si está como "Static" o "Nginx":
   - Cambia a **"Node.js"** o **"App"**
   - Guarda los cambios
   - Reinicia el servicio

### Opción B: Verificar Root Directory

1. En la configuración del backend, verifica **Root Directory**:
   - ✅ Debe ser: `Opalo-ATS/backend`
   - ❌ NO debe ser: `Opalo-ATS` o `/` o vacío

2. Si está incorrecto:
   - Cámbialo a `Opalo-ATS/backend`
   - Guarda los cambios
   - Reinicia el servicio

### Opción C: Verificar Start Command

1. En la configuración del backend, verifica **Start Command**:
   - ✅ Debe ser: `npm start`
   - ❌ NO debe ser: Comando de nginx o vacío

2. Si está incorrecto:
   - Cámbialo a `npm start`
   - Guarda los cambios
   - Reinicia el servicio

### Opción D: Crear Dockerfile para el Backend (Si No Existe)

Si no hay un Dockerfile específico para el backend, Easypanel puede estar usando el del frontend.

1. Verifica si existe `Opalo-ATS/backend/Dockerfile`
2. Si NO existe, créalo con este contenido:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Start command
CMD ["npm", "start"]
```

3. Haz commit y push
4. Reinicia el servicio en Easypanel

---

## 🔍 Verificación Después de Corregir

Después de aplicar la solución, los logs deberían mostrar:

```
> opalo-ats-backend@1.0.0 start
> node src/server.js

🚀 Servidor backend corriendo en http://0.0.0.0:5000
📡 Frontend URL: https://opalo-atsopalo.bouasv.easypanel.host
🔐 Google OAuth Redirect URI: https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
✅ Backend listo para recibir peticiones
```

**NO** deberías ver logs de nginx.

---

## 📋 Checklist

- [ ] Tipo de servicio es "Node.js" o "App" (no "Static" o "Nginx")
- [ ] Root Directory es `Opalo-ATS/backend`
- [ ] Start Command es `npm start`
- [ ] Build Command es `npm install`
- [ ] Port es `5000`
- [ ] Servicio reiniciado después de cambios
- [ ] Logs muestran mensajes del backend Node.js (no nginx)

---

## 🎯 Próximos Pasos

1. **Verifica el tipo de servicio** en Easypanel
2. **Verifica Root Directory** (`Opalo-ATS/backend`)
3. **Verifica Start Command** (`npm start`)
4. **Reinicia el servicio**
5. **Verifica los logs** - deben mostrar mensajes del backend Node.js

---

## 💡 Nota

Si Easypanel sigue usando nginx después de estos cambios, puede ser que:
- El servicio esté configurado como "Static" y necesite cambiarse a "Node.js"
- Haya un Dockerfile en la raíz que Easypanel está detectando automáticamente
- Necesites crear un Dockerfile específico para el backend

