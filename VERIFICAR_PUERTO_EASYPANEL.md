# 🔍 Cómo Verificar el Puerto en Easypanel

## 📋 Pasos para Verificar el Puerto

### Paso 1: Ir a la Configuración del Backend

1. En Easypanel, ve a tu app **backend** (`opalo / ats-backend`)
2. Haz clic en el nombre de la app o en el icono de configuración

### Paso 2: Buscar la Sección de Puerto

El puerto puede estar en diferentes lugares según la versión de Easypanel:

#### Opción A: Sección "Port" o "Ports"
- Busca una sección llamada **"Port"**, **"Ports"**, o **"Expose Port"**
- Puede estar en:
  - La página principal de configuración
  - Una pestaña llamada **"Settings"** o **"General"**
  - Una sección de **"Network"** o **"Networking"**

#### Opción B: Variables de Entorno
- Ve a la sección **"Environment Variables"**
- Busca una variable llamada `PORT`
- Debe tener el valor: `5000`

#### Opción C: Sección "Deploy" o "Build"
- A veces el puerto está en la configuración de deploy
- Busca campos relacionados con **"Port"** o **"Expose"**

### Paso 3: Si No Encuentras la Configuración de Puerto

Si no encuentras una sección específica de puerto, Easypanel puede estar usando el puerto del `EXPOSE` en el Dockerfile (que ya está configurado como 5000).

En ese caso, verifica:
1. **Variables de entorno**: Debe tener `PORT=5000`
2. **Dockerfile**: Ya tiene `EXPOSE 5000`

---

## 🔍 Qué Buscar Específicamente

Busca campos o secciones que digan:
- "Port"
- "Expose Port"
- "Container Port"
- "Service Port"
- "Internal Port"
- "Application Port"

---

## 📝 Si No Encuentras Nada

Si no encuentras una configuración de puerto explícita:
1. **Toma una captura** de toda la página de configuración del backend
2. O busca en todas las pestañas/secciones disponibles
3. El puerto puede estar en una sección que no es obvia

---

## 🆘 Alternativa: Verificar en los Logs

Si no puedes encontrar la configuración de puerto, podemos verificar en los logs:
1. Ve a los **logs de runtime** del backend
2. Busca mensajes que mencionen el puerto
3. O verifica si hay errores relacionados con el puerto

---

## 💡 Nota

En Easypanel, a veces el puerto se configura automáticamente desde el Dockerfile (`EXPOSE 5000`), pero otras veces necesita configurarse manualmente. Depende de la versión y configuración de Easypanel.

