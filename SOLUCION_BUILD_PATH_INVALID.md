# 🔧 Solución: Build Path "Invalid"

## 🔴 Problema

El campo "Build Path" no acepta `backend` y muestra "invalid".

## ✅ Soluciones

### Opción 1: Probar Diferentes Formatos

Intenta estos formatos en el campo "Build Path":

1. `/backend` (con barra inicial)
2. `./backend` (con punto y barra)
3. `backend/` (con barra final)

### Opción 2: Configurar Comandos Manualmente (Recomendado)

Si el Build Path no funciona, podemos configurar todo manualmente:

#### En la sección "Build":

**Install Command:**
```
cd backend && npm ci
```

**Build Command:**
(Dejar vacío - no necesitamos build para el backend)

**Start Command:**
```
cd backend && node src/server.js
```

### Opción 3: Usar Dockerfile

Si Nixpacks no funciona bien con monorepos, podemos crear un Dockerfile específico para el backend.

---

## 🎯 Solución Recomendada

**Usa la Opción 2**: Configura los comandos manualmente. Esto es más confiable para monorepos.

### Pasos:

1. En la sección **"Build"**:
   - **Install Command**: `cd backend && npm ci`
   - **Build Command**: (dejar vacío)
   - **Start Command**: `cd backend && node src/server.js`

2. En la sección **"Source"**:
   - **Build Path**: Dejar como `/` (raíz)
   - O probar `/backend` si lo acepta

3. Haz clic en **"Save"**

4. Haz **Redeploy**

---

## 📝 Nota

El problema es que Easypanel/Nixpacks puede no soportar bien el Build Path para monorepos. Configurar los comandos manualmente con `cd backend &&` es más confiable.

