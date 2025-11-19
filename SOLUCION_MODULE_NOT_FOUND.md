# 🔧 Solución: Error "Cannot find module '/app/src/server.js'"

## 🔴 Problema

El error indica que Node.js no puede encontrar el archivo `/app/src/server.js`. Esto significa que el comando `cd backend &&` no está funcionando correctamente, o el directorio de trabajo no es el esperado.

## ✅ Solución

### Opción 1: Usar Ruta Absoluta en Start Command

En Easypanel, en la sección **"Build"** del backend:

**Start Command:**
```
node /app/backend/src/server.js
```

O si el directorio de trabajo es `/app`:

**Start Command:**
```
node backend/src/server.js
```

### Opción 2: Cambiar el Directorio de Trabajo

**Start Command:**
```
cd /app/backend && node src/server.js
```

### Opción 3: Usar el Script de package.json

**Start Command:**
```
cd /app/backend && npm start
```

---

## 🎯 Solución Recomendada

Usa la **Opción 1** con ruta absoluta:

**Start Command:**
```
node /app/backend/src/server.js
```

---

## 📝 Verificar Estructura

El archivo debe estar en:
- `/app/backend/src/server.js` (si el Build Path es `/`)
- O `/app/src/server.js` (si el Build Path es `backend`)

Como el Build Path no funciona bien, usemos la ruta absoluta `/app/backend/src/server.js`.

---

## ✅ Pasos

1. En Easypanel, ve a la sección **"Build"** del backend
2. En **"Start Command"**, escribe:
   ```
   node /app/backend/src/server.js
   ```
3. Haz clic en **"Save"**
4. Haz **Redeploy**
5. Verifica los logs

---

## 🔍 Si Sigue Sin Funcionar

Verifica en los logs del build qué estructura de directorios tiene. El error muestra que está buscando en `/app/src/server.js`, lo que significa que el directorio de trabajo es `/app`, no `/app/backend`.

Por eso necesitamos usar la ruta completa: `/app/backend/src/server.js`

