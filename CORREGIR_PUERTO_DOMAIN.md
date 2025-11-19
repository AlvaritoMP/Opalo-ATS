# 🔧 Corregir Puerto del Domain en Easypanel

## 🔴 Problema

El dominio está configurado pero apunta a:
- **Interno**: `http://opalo_ats-backend:80/`

Pero el servidor Node.js está corriendo en el puerto **5000**, no en el 80.

## ✅ Solución

### Paso 1: Editar el Domain

1. En la sección **"Domains"**, haz clic en el icono de **editar** (lápiz) que está a la derecha del dominio
2. Se abrirá un formulario para editar la configuración

### Paso 2: Cambiar el Puerto Interno

En el formulario de edición, cambia:
- **Internal URL** o **Target**: De `http://opalo_ats-backend:80/` a `http://opalo_ats-backend:5000/`

O si hay un campo separado de puerto:
- **Port**: De `80` a `5000`

### Paso 3: Guardar

1. Haz clic en **"Save"** o el botón de guardar
2. Espera a que se aplique la configuración

### Paso 4: Verificar

1. Prueba el endpoint: `https://opalo-ats-backend.bouasv.easypanel.host/health`
2. Debería funcionar correctamente ahora

---

## 📝 Nota

El dominio externo (`https://opalo-ats-backend.bouasv.easypanel.host/`) está bien. Solo necesitas cambiar el puerto interno de `80` a `5000` para que apunte al servidor Node.js.

