# 🐳 Crear Dockerfile para el Backend

## ❌ Problema

Easypanel está usando el Dockerfile del frontend (nginx) en lugar del backend Node.js porque:
- El Dockerfile en la raíz es para el frontend
- No hay un Dockerfile específico para el backend
- Easypanel está detectando el Dockerfile incorrecto

---

## ✅ Solución: Crear Dockerfile para el Backend

### Paso 1: Crear Dockerfile en el Backend

Crea un archivo `Dockerfile` en `Opalo-ATS/backend/` con este contenido:

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

### Paso 2: Verificar que Existe package.json

Asegúrate de que `Opalo-ATS/backend/package.json` existe y tiene el script `start`:

```json
{
  "scripts": {
    "start": "node src/server.js"
  }
}
```

### Paso 3: Commit y Push

1. Haz commit del nuevo Dockerfile:
   ```bash
   git add Opalo-ATS/backend/Dockerfile
   git commit -m "Agregar Dockerfile para backend"
   git push
   ```

### Paso 4: Reconfigurar el Servicio en Easypanel

1. Ve a tu backend en Easypanel (`opalo/atsopalo-backend`)
2. Ve a la configuración del servicio
3. Verifica que el **Root Directory** sea `Opalo-ATS/backend`
4. Haz clic en **"Redeploy"** o **"Rebuild"**
5. Espera a que termine

---

## 🔍 Verificación

Después de crear el Dockerfile y hacer redeploy, los logs deberían mostrar:

```
> opalo-ats-backend@1.0.0 start
> node src/server.js

🚀 Servidor backend corriendo en http://0.0.0.0:5000
✅ Backend listo para recibir peticiones
```

**NO** deberías ver logs de nginx.

---

## 📋 Alternativa: Si Easypanel No Usa Dockerfile

Si Easypanel no usa Dockerfile y ejecuta Node.js directamente:

1. Verifica que el **Root Directory** sea `Opalo-ATS/backend`
2. Verifica que el **Start Command** sea `npm start`
3. Verifica que el **Build Command** sea `npm install`
4. Verifica que el **Port** sea `5000`
5. Haz clic en **"Redeploy"**

---

## 🎯 Próximos Pasos

1. **Crear el Dockerfile** en `Opalo-ATS/backend/`
2. **Commit y push** del Dockerfile
3. **Redeploy** el servicio en Easypanel
4. **Verificar los logs** - deben mostrar mensajes del backend Node.js

