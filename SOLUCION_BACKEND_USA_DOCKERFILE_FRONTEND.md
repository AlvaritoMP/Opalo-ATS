# 🔧 Solución: Backend Está Usando Dockerfile del Frontend

## ❌ Problema

Los logs del build muestran que Easypanel está usando el **Dockerfile del frontend** (que tiene nginx) en lugar del **Dockerfile del backend** (que tiene Node.js).

**Evidencia en los logs:**
- `FROM nginx:alpine` (frontend)
- `npm run build` (frontend)
- `COPY --from=builder /app/dist /usr/share/nginx/html` (frontend)

**Falta:**
- `node src/server.js` (backend)
- Mensajes del backend Node.js

---

## 🔍 Causa

El servicio del backend en Easypanel **NO está configurado con el Root Directory correcto**, por lo que Easypanel está usando el Dockerfile de la **raíz del repositorio** (que es del frontend) en lugar del Dockerfile de `Opalo-ATS/backend/`.

---

## ✅ Solución

### Paso 1: En Easypanel, Buscar Configuración del Servicio

1. Ve a tu servicio `opalo/atsopalo-backend`
2. **Busca una sección que permita configurar el directorio** del servicio
3. Puede estar en diferentes lugares según la versión de Easypanel:
   - **"Source"** o **"Repository"**
   - **"Settings"** o **"Configuración"**
   - **"Build Settings"** o **"Build"**
   - **"General"** o **"Básico"**
   - **"Deploy"** o **"Deployment"**

### Paso 2: Buscar Campo "Root Directory" o Similar

Busca un campo que permita especificar **dónde está el código del backend**. Puede llamarse:
- **"Root Directory"**
- **"Working Directory"**
- **"Build Path"**
- **"Context Path"**
- **"Source Directory"**
- O simplemente un campo de **"Path"** o **"Directory"**

### Paso 3: Configurar Root Directory

Si encuentras el campo:

1. **Configura el valor**: `Opalo-ATS/backend`
   - ✅ Debe ser: `Opalo-ATS/backend`
   - ❌ NO debe ser: `/` o vacío o `Opalo-ATS`

2. **Guarda los cambios**

### Paso 4: Si NO Encuentras el Campo

Si NO encuentras el campo "Root Directory", puede ser que Easypanel detecte automáticamente el Dockerfile. En ese caso:

1. **Verifica si hay un campo para "Dockerfile Path"** o **"Dockerfile Location"**
2. Configúralo como: `Opalo-ATS/backend/Dockerfile`

### Paso 5: Redeploy

Después de configurar el Root Directory:

1. Haz clic en **"Redeploy"** o **"Rebuild"** o **"Deploy"**
2. Espera a que termine el build
3. Verifica los logs - deben mostrar:
   ```
   > opalo-ats-backend@1.0.0 start
   > node src/server.js
   
   🚀 Servidor backend corriendo en http://0.0.0.0:5000
   ✅ Backend listo para recibir peticiones
   ```
   **NO** deberías ver logs de nginx o `npm run build`.

---

## 🔍 Verificación Alternativa: Crear .dockerignore

Si Easypanel sigue usando el Dockerfile incorrecto, puedes crear un `.dockerignore` en `Opalo-ATS/backend/` para asegurarte de que solo se use ese contexto:

**Crea `Opalo-ATS/backend/.dockerignore`:**
```
../
../../
../../Dockerfile
../../nginx.conf
!./Dockerfile
```

Esto le dice a Docker que ignore el Dockerfile de la raíz cuando esté en el contexto del backend.

---

## 📋 Checklist

- [ ] Buscar campo "Root Directory" o similar en Easypanel
- [ ] Configurar como `Opalo-ATS/backend`
- [ ] Guardar cambios
- [ ] Redeploy del servicio
- [ ] Verificar logs - deben mostrar backend Node.js (no nginx)

---

## 🎯 Próximos Pasos

1. **En Easypanel**, busca cualquier campo que permita especificar el directorio del código
2. **Configúralo** como `Opalo-ATS/backend`
3. **Redeploy** el servicio
4. **Verifica los logs** - deben mostrar el backend Node.js corriendo

---

## 💡 Nota

Si después de buscar no encuentras el campo "Root Directory", **comparte qué secciones o campos ves** en la configuración del servicio en Easypanel, y te ayudaré a identificar dónde configurarlo.



