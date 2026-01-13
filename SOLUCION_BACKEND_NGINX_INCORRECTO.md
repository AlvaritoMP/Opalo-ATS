# 🔧 Solución: Backend Corriendo Nginx en Lugar de Node.js

## ❌ Problema Confirmado

Los logs muestran que el backend está corriendo **Nginx** en lugar de **Node.js**:

```
nginx/1.29.4
using the "epoll" event method
start worker processes
```

Cuando accedes a `/api/auth/google/drive`, está sirviendo archivos estáticos del frontend (`.js`, `.css`) en lugar de ejecutar el código Node.js.

---

## ✅ Solución: Verificar y Corregir Configuración en EasyPanel

### Paso 1: Verificar Root Directory / Build Path

En EasyPanel, ve a `opalo/atsopalo-backend` > **Source**:

1. **Verifica Build Path**:
   - Debe ser exactamente: `Opalo-ATS/backend` ✅
   - **NO** debe ser `.` o `Opalo-ATS` o cualquier otra cosa

2. **Verifica File**:
   - Debe ser: `Dockerfile` ✅
   - **NO** debe tener path completo como `Opalo-ATS/backend/Dockerfile`

3. **Verifica Build Method**:
   - Debe estar seleccionado: **Dockerfile** ✅
   - **NO** debe ser Buildpacks o Nixpacks

### Paso 2: Verificar Start Command

En EasyPanel, ve a `opalo/atsopalo-backend` > **Overview** o **Resources**:

1. **Busca "Start Command"** o **"Command"**
2. **DEBE estar vacío** o ser: `npm start` ✅
3. **NO debe ser**: `npm run build` o cualquier comando de build

### Paso 3: Verificar Root Directory (Otra Ubicación)

Algunos paneles tienen un campo "Root Directory" separado:

1. Busca un campo llamado **"Root Directory"** o **"Working Directory"**
2. Debe ser: `Opalo-ATS/backend` ✅
3. O puede estar vacío si el Build Path ya lo especifica

### Paso 4: Eliminar Configuración Antigua

Si EasyPanel está usando una configuración antigua:

1. **Elimina el servicio** `opalo/atsopalo-backend` (si es posible sin perder datos)
2. **Crea un nuevo servicio** desde cero
3. **Configura**:
   - Repository URL: `https://github.com/AlvaritoMP/Opalo-ATS.git`
   - Branch: `main`
   - Build Path: `Opalo-ATS/backend`
   - File: `Dockerfile`
   - Build: `Dockerfile`

---

## 🔍 Verificación del Dockerfile

El Dockerfile del backend debe ser así:

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

**IMPORTANTE**: 
- `CMD ["npm", "start"]` ✅ (CORRECTO)
- `CMD ["npm", "run", "build"]` ❌ (INCORRECTO - esto es para el frontend)

---

## 🔧 Solución Alternativa: Verificar si Hay Otro Dockerfile

Puede haber un Dockerfile en la raíz del repositorio que EasyPanel está usando:

1. **Verifica** si existe `Dockerfile` en la raíz del repo
2. **Si existe**, puede estar interfiriendo
3. **Verifica** que el Dockerfile en `Opalo-ATS/backend/Dockerfile` sea el correcto

---

## 📋 Checklist

- [ ] Build Path configurado como `Opalo-ATS/backend`
- [ ] File configurado como `Dockerfile`
- [ ] Build Method: Dockerfile (seleccionado)
- [ ] Start Command: `npm start` o vacío
- [ ] Root Directory: `Opalo-ATS/backend` o vacío
- [ ] Dockerfile en `Opalo-ATS/backend/Dockerfile` tiene `CMD ["npm", "start"]`
- [ ] No hay Dockerfile en la raíz del repo interfiriendo

---

## 🎯 Próximos Pasos

1. **Verifica** la configuración en EasyPanel (Build Path, File, Start Command)
2. **Redeploy** el servicio después de corregir
3. **Verifica los logs** - deben mostrar Node.js corriendo, no Nginx
4. **Prueba** el endpoint `/health` - debe retornar JSON del backend Node.js

---

## 💡 Nota

Si después de verificar todo sigue corriendo Nginx, puede ser que EasyPanel tenga una caché o configuración que no se ha actualizado. En ese caso:

1. **Elimina y recrea** el servicio (si es posible)
2. **O contacta soporte de EasyPanel** para verificar por qué está usando el Dockerfile incorrecto


