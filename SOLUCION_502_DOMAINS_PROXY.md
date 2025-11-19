# 🔧 Solución: Error 502 - Usar Domains en Lugar de Ports

## 🔴 Problema

El servidor está corriendo correctamente, pero Easypanel no puede conectarse. Según la descripción en Easypanel:

> "If you want to expose HTTP/HTTPS you should use the "Proxy" from the "Domains" tab."

Los **"Ports"** son para exponer puertos TCP/UDP directamente, pero para aplicaciones web (HTTP/HTTPS) necesitas usar el **proxy desde la pestaña "Domains"**.

## ✅ Solución

### Paso 1: Ir a la Pestaña "Domains"

1. En Easypanel, ve a tu app **backend**
2. En el menú lateral, haz clic en **"Domains"** (icono de cadena/link)
3. Deberías ver opciones para configurar dominios y proxy

### Paso 2: Configurar el Proxy

En la pestaña "Domains", busca:
- Una opción para **"Add Domain"** o **"Configure Proxy"**
- O una sección de **"Proxy"** o **"Routing"**

### Paso 3: Configurar el Dominio/Proxy

Configura:
- **Domain**: `opalo-ats-backend.bouasv.easypanel.host` (o el dominio que Easypanel te asignó)
- **Port**: `5000` (el puerto interno donde corre tu aplicación)
- **Path**: `/` (o dejar vacío para todas las rutas)

### Paso 4: Guardar y Verificar

1. Guarda la configuración
2. Espera a que se aplique
3. Prueba el endpoint: `https://opalo-ats-backend.bouasv.easypanel.host/health`

---

## 📝 Nota Importante

- **"Ports"** = Para exponer puertos TCP/UDP directamente (no para HTTP/HTTPS)
- **"Domains"** = Para configurar proxy HTTP/HTTPS a tu aplicación

Para aplicaciones web, siempre usa **"Domains"** con el proxy configurado al puerto interno (5000).

---

## 🔍 Si No Encuentras la Opción

Si no ves opciones claras en "Domains":
1. **Toma una captura** de la pestaña "Domains"
2. O busca opciones como:
   - "Add Domain"
   - "Configure Proxy"
   - "Routing"
   - "Port Mapping"

---

## 💡 Alternativa

Si Easypanel asigna automáticamente el dominio, puede que solo necesites verificar que el proxy esté configurado correctamente al puerto 5000.

