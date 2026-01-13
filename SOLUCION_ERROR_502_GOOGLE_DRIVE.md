# 🔧 Solución: Error 502 al Conectar Google Drive

## ❌ Problema

Cuando intentas conectar Google Drive, aparece un error 502 (Bad Gateway) en el popup.

---

## 🔍 Causas Posibles

### 1. Backend No Está Corriendo Correctamente

El backend puede estar corriendo Nginx en lugar de Node.js.

### 2. Puerto Incorrecto en Configuración de Dominio

El dominio puede estar configurado para el puerto incorrecto.

### 3. Backend No Está Escuchando en el Puerto Correcto

El backend puede no estar escuchando en el puerto 5000.

---

## ✅ Solución: Verificar Backend

### Paso 1: Verificar Logs del Backend en EasyPanel

1. En EasyPanel, ve a `opalo/atsopalo-backend`
2. Ve a la pestaña **"Logs"**
3. **Verifica** qué está corriendo:

**✅ Si ves esto (Node.js corriendo correctamente):**
```
> opalo-ats-backend@1.0.0 start
> node src/server.js

🚀 Servidor backend corriendo en http://0.0.0.0:5000
✅ Backend listo para recibir peticiones
```

**❌ Si ves esto (Nginx corriendo - INCORRECTO):**
```
nginx/1.29.4
using the "epoll" event method
start worker processes
```

### Paso 2: Si Está Corriendo Nginx (INCORRECTO)

El problema es que EasyPanel está usando el Dockerfile del frontend en lugar del backend.

**Solución:**

1. **Verifica el Root Directory** en EasyPanel:
   - Ve a `opalo/atsopalo-backend` > **Source**
   - Verifica que **Build Path** sea: `Opalo-ATS/backend` ✅
   - Verifica que **File** sea: `Dockerfile` ✅

2. **Verifica el Dockerfile del Backend**:
   - Debe estar en: `Opalo-ATS/backend/Dockerfile`
   - Debe tener `CMD ["npm", "start"]` (no `npm run build`)

3. **Redeploy** el servicio:
   - Haz clic en **"Redeploy"** o **"Deploy"**
   - Espera a que termine el build
   - Verifica los logs de nuevo

### Paso 3: Verificar Configuración de Dominio

1. En EasyPanel, ve a `opalo/atsopalo-backend` > **Domains**
2. **Verifica** que el dominio esté configurado para el puerto **5000**:
   - **Port**: `5000` ✅
   - **NO** debe ser `80` o `443`

3. Si el puerto es incorrecto:
   - **Cambia** el puerto a `5000`
   - **Guarda** los cambios
   - **Redeploy** el servicio

### Paso 4: Verificar Endpoint de OAuth

1. **Verifica** que el endpoint de OAuth esté correctamente configurado:
   - El frontend debe llamar a: `https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google`
   - El backend debe tener esta ruta configurada

2. **Verifica** en los logs del backend si hay errores al iniciar:
   - Busca errores de conexión
   - Busca errores de configuración de Google OAuth

---

## 🔍 Verificación Completa

### Checklist:

- [ ] Logs muestran Node.js corriendo (no Nginx)
- [ ] Build Path configurado como `Opalo-ATS/backend`
- [ ] File configurado como `Dockerfile`
- [ ] Dominio configurado para puerto `5000`
- [ ] Backend escuchando en puerto `5000`
- [ ] Endpoint `/api/auth/google` existe en el backend

---

## 🎯 Próximos Pasos

1. **Verifica los logs** del backend en EasyPanel
2. **Comparte los logs** si ves algo diferente a Node.js corriendo
3. **Verifica la configuración del dominio** (puerto 5000)
4. **Redeploy** si es necesario

---

## 💡 Nota

El error 502 generalmente significa que:
- El servicio backend no está corriendo
- El servicio está corriendo pero no está escuchando en el puerto correcto
- Hay un problema de configuración de dominio/puerto

La causa más común es que EasyPanel está usando el Dockerfile del frontend (Nginx) en lugar del Dockerfile del backend (Node.js).


