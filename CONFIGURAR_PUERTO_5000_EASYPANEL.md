# 🔧 Configurar Puerto 5000 en Easypanel

## ✅ Solución

### Paso 1: Agregar Puerto

En la sección **"Ports"** que ves en la pantalla:

1. Haz clic en el botón **"Add Port"**
2. Se abrirá un formulario o campos para configurar el puerto

### Paso 2: Configurar el Puerto

Configura así:

- **Published** (Puerto en el host): `5000`
- **Target** (Puerto dentro de la aplicación): `5000`

O si solo hay un campo:
- **Port**: `5000`

### Paso 3: Guardar

1. Haz clic en **"Save"** o el botón de guardar
2. Espera a que se aplique la configuración

### Paso 4: Verificar

1. Después de guardar, el puerto debería aparecer en la lista
2. Prueba el endpoint: `https://opalo-ats-backend.bouasv.easypanel.host/health`
3. Debería funcionar correctamente

---

## 📝 Nota

Según la descripción en Easypanel:
- **"Published"** es el puerto en tu máquina host
- **"Target"** es el puerto dentro de tu aplicación

Como el servidor Node.js está escuchando en el puerto 5000 dentro del contenedor, ambos deben ser `5000`.

---

## 🔍 Si No Funciona

Si después de agregar el puerto sigue sin funcionar:
1. Verifica que el puerto aparezca en la lista
2. Verifica los logs del backend para asegurarte de que sigue corriendo
3. Prueba el endpoint `/health` de nuevo

