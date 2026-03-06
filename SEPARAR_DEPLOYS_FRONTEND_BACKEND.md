# 🔒 Separar Deploys de Frontend y Backend en Easypanel

## ✅ Cómo Funciona Easypanel

En Easypanel, cada **app/servicio** tiene su propia configuración independiente:
- **Root Directory**: Define qué carpeta del repositorio usar
- **Build settings**: Define cómo construir la app
- **Deploy settings**: Define cómo desplegar

**Cada app solo despliega lo que está en su Root Directory**, así que no hay conflicto.

## 🔍 Verificar Configuración Actual

### Frontend (App Principal)

1. Ve a Easypanel → Tu app del frontend (probablemente `atsopalo` o similar)
2. Verifica la configuración:
   - **Root Directory**: Debe ser la **raíz del proyecto** o la carpeta del frontend
     - Ejemplo: `.` (raíz) o `Opalo-ATS` (si el frontend está ahí)
   - **Build Method**: Probablemente `Nixpacks` o `Dockerfile`
   - **Port**: Probablemente `80` o `3000`

### Backend (App Separada)

1. Ve a Easypanel → Tu app del backend (probablemente `atsopalo-backend` o similar)
2. Verifica la configuración:
   - **Root Directory**: Debe ser `Opalo-ATS/backend` ⚠️ **MUY IMPORTANTE**
   - **Build Method**: Probablemente `Dockerfile` o `Nixpacks`
   - **Port**: `5000`

## ✅ Configuración Correcta

### Frontend
```
Root Directory: . (o la carpeta del frontend)
Build: Nixpacks/Dockerfile del frontend
Port: 80/3000
```

### Backend
```
Root Directory: Opalo-ATS/backend
Build: Dockerfile del backend
Port: 5000
```

## 🔒 Cómo Asegurarse de que No Haya Conflictos

### Opción 1: Verificar Root Directory (Recomendado)

**Frontend:**
- Root Directory: `.` (raíz del proyecto)
- Solo construye/despliega archivos del frontend

**Backend:**
- Root Directory: `Opalo-ATS/backend`
- Solo construye/despliega archivos del backend

**Con esta configuración:**
- ✅ Cuando haces deploy del frontend → Solo usa archivos de la raíz
- ✅ Cuando haces deploy del backend → Solo usa archivos de `Opalo-ATS/backend`
- ✅ No hay conflicto porque cada uno usa su carpeta

### Opción 2: Usar Dockerfiles Separados

Si ambos usan Dockerfile, asegúrate de que:

**Frontend Dockerfile** (en la raíz):
```dockerfile
# Frontend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
# ... resto del frontend
```

**Backend Dockerfile** (en `Opalo-ATS/backend/`):
```dockerfile
# Backend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "start"]
```

## 🎯 Verificación Rápida

### 1. Verificar Root Directory del Frontend

En Easypanel:
1. Ve a tu app del frontend
2. Busca **"Root Directory"** o **"Working Directory"**
3. Debe ser `.` o la carpeta del frontend (NO `Opalo-ATS/backend`)

### 2. Verificar Root Directory del Backend

En Easypanel:
1. Ve a tu app del backend
2. Busca **"Root Directory"** o **"Working Directory"**
3. Debe ser `Opalo-ATS/backend` (NO `.`)

### 3. Probar Deploy del Frontend

1. Haz un cambio pequeño en el frontend
2. Haz commit y push
3. Haz deploy del frontend en Easypanel
4. Verifica los logs del build:
   - ✅ Debe construir el frontend
   - ❌ NO debe intentar construir el backend
   - ❌ NO debe buscar `Opalo-ATS/backend/package.json`

## 📋 Checklist de Seguridad

Antes de hacer deploy del frontend, verifica:

- [ ] **Root Directory del frontend** NO es `Opalo-ATS/backend`
- [ ] **Root Directory del backend** ES `Opalo-ATS/backend`
- [ ] Cada app tiene su propia configuración de build
- [ ] Los Dockerfiles están en las carpetas correctas

## 🐛 Si Hay Problemas

### Problema: El Frontend Intenta Construir el Backend

**Síntomas:**
- Error al hacer deploy del frontend
- Busca `Opalo-ATS/backend/package.json`
- Error de dependencias del backend

**Solución:**
1. Verifica que el **Root Directory del frontend** sea `.` (raíz)
2. Verifica que el **Dockerfile del frontend** esté en la raíz
3. Verifica que el **Dockerfile del frontend** NO copie `Opalo-ATS/backend/`

### Problema: El Backend Intenta Construir el Frontend

**Síntomas:**
- Error al hacer deploy del backend
- Busca archivos del frontend
- Error de dependencias del frontend

**Solución:**
1. Verifica que el **Root Directory del backend** sea `Opalo-ATS/backend`
2. Verifica que el **Dockerfile del backend** esté en `Opalo-ATS/backend/`
3. Verifica que el **Dockerfile del backend** NO copie archivos del frontend

## 💡 Mejores Prácticas

1. **Mantén Root Directories separados**
   - Frontend: `.` o carpeta del frontend
   - Backend: `Opalo-ATS/backend`

2. **Usa Dockerfiles separados**
   - Frontend Dockerfile en la raíz
   - Backend Dockerfile en `Opalo-ATS/backend/`

3. **Verifica antes de cada deploy**
   - Revisa el Root Directory
   - Revisa los logs del build

4. **Documenta la configuración**
   - Anota el Root Directory de cada app
   - Anota el puerto de cada app

## ✅ Resumen

**No hay problema** si:
- ✅ El frontend tiene Root Directory diferente al backend
- ✅ Cada app solo despliega su carpeta
- ✅ Los Dockerfiles están en las carpetas correctas

**Sí hay problema** si:
- ❌ Ambos tienen el mismo Root Directory
- ❌ Un Dockerfile copia archivos del otro
- ❌ Las configuraciones están mezcladas

## 🎯 Acción Inmediata

**Verifica ahora mismo:**

1. Ve a Easypanel → App del frontend
2. Anota el **Root Directory**
3. Ve a Easypanel → App del backend
4. Anota el **Root Directory**
5. Compara: deben ser diferentes

Si son diferentes → ✅ No hay problema, puedes hacer deploy del frontend sin afectar el backend.

Si son iguales → ⚠️ Necesitas corregir la configuración.
