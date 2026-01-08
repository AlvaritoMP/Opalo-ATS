# 🔧 Corregir Configuración del Dominio del Backend

## ❌ Problema Detectado

En la configuración del dominio del backend veo:
- **Port**: `80` ❌ (INCORRECTO)
- **Protocol**: `HTTP` ✅ (Correcto)

El backend está configurado para escuchar en el **puerto 5000**, pero el dominio está redirigiendo al puerto 80, lo que causa que las peticiones no lleguen al backend.

---

## ✅ Solución: Corregir Puerto del Dominio

### Paso 1: Editar Configuración del Dominio

1. En Easypanel, ve a tu backend (`atsopalo-backend`)
2. Ve a la pestaña **"🔗 Domains"**
3. Haz clic en el icono de **editar** (lápiz) del dominio
4. En el modal "Update Domain":

### Paso 2: Corregir Puerto

En la sección **"Destination"**:

1. **Protocol**: Debe ser `HTTP` ✅ (ya está correcto)
2. **Port**: Cambia de `80` a `5000` ⚠️ **IMPORTANTE**
3. **Path**: Debe ser `/` ✅ (ya está correcto)

### Paso 3: Guardar

1. Haz clic en el botón verde **"Save"**
2. Espera a que se apliquen los cambios

---

## 🔍 Verificación

Después de corregir el puerto:

1. Abre en el navegador:
   ```
   https://opalo-atsopalo-backend.bouasv.easypanel.host/health
   ```

2. Deberías ver:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-...",
     "service": "Opalo ATS Backend - Google Drive API"
   }
   ```

3. **NO** debería redirigirte a la app

---

## 📋 Configuración Correcta del Dominio

### Details Tab
- **HTTPS**: `ON` ✅
- **Host**: `opalo-atsopalo-backend.bouasv.easypanel.host` ✅
- **Path**: `/` ✅

### Destination Section
- **Protocol**: `HTTP` ✅
- **Port**: `5000` ⚠️ **CORREGIR AQUÍ**
- **Path**: `/` ✅

---

## 🎯 Después de Corregir

Una vez que el dominio esté configurado correctamente:

1. ✅ El endpoint `/health` funcionará
2. ✅ El frontend podrá conectarse al backend
3. ✅ Google Drive OAuth funcionará correctamente

---

## 📝 Nota

El puerto **80** es típicamente usado por servidores web (nginx, Apache) que actúan como proxy. En Easypanel, el dominio debe apuntar directamente al puerto donde corre tu aplicación Node.js, que es **5000**.

