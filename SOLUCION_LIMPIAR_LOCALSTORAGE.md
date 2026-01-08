# 🧹 Solución 1: Limpiar LocalStorage y Cookies

## ⚠️ Problema Identificado

Tu navegador puede tener guardado un **token de administrador** en LocalStorage que pertenece a la app original (Opalopy), y al intentar usarlo en la nueva URL, Supabase lo rechaza.

---

## ✅ Pasos para Limpiar

### Paso 1: Abrir DevTools

1. Abre la app en producción: `https://opalo-atsopalo.bouasv.easypanel.host`
2. Presiona `F12` para abrir DevTools

### Paso 2: Limpiar LocalStorage

1. Ve a la pestaña **Application** (o **Aplicación** en español)
2. En el panel izquierdo, expande **Local Storage**
3. Haz clic en el dominio de tu app (`https://opalo-atsopalo.bouasv.easypanel.host`)
4. Verás una lista de claves (keys) en el panel derecho
5. Haz clic derecho en cualquier clave y selecciona **"Clear All"** (o haz clic en el icono de "prohibido" 🚫)
6. Confirma si te pide confirmación

### Paso 3: Limpiar Cookies

1. En el mismo panel izquierdo, expande **Cookies**
2. Haz clic en el dominio de tu app
3. Selecciona todas las cookies (Ctrl+A o Cmd+A)
4. Haz clic derecho y selecciona **"Delete"** o presiona `Delete`

### Paso 4: Refrescar

1. Cierra DevTools
2. Presiona `Ctrl+Shift+R` (Windows) o `Cmd+Shift+R` (Mac) para hacer un **hard refresh**
3. O simplemente recarga la página (`F5`)

---

## 🎯 Resultado Esperado

Después de limpiar:

1. ✅ La app debería mostrar el formulario de login (no intentar usar sesión vieja)
2. ✅ Los errores 401 deberían desaparecer
3. ✅ Deberías poder hacer login con `admin@opaloats.com` / `admin123`

---

## 📋 Verificación

Después de limpiar, abre la consola (F12) y verifica:

1. Ve a la pestaña **Network**
2. Intenta hacer login o recarga la página
3. Busca una petición a `supabase.co/rest/v1/users`
4. Haz clic en la petición
5. Ve a **Headers** > **Request Headers**
6. Verifica que el header `apikey` tenga el valor correcto

---

## ⚠️ Si Sigue Sin Funcionar

Si después de limpiar LocalStorage y Cookies sigue el error 401, entonces el problema es que **Vite no está viendo las variables en Easypanel**. Ve a `SOLUCION_CORREGIR_BUILD_EASYPANEL.md`.

