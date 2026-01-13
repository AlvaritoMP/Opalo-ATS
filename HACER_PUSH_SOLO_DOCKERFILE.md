# 🚀 Hacer Push Solo del Dockerfile

## ❌ Problema

El Build Path muestra "Invalid" porque el Dockerfile no está en el repositorio remoto (el push fue bloqueado por secretos).

---

## ✅ Solución: Push Solo del Dockerfile

### Paso 1: Crear Commit Limpio Solo con Dockerfile

Ejecuta estos comandos en tu terminal:

```bash
# 1. Resetear al commit del remoto (antes de los commits con secretos)
git reset --soft origin/main

# 2. Agregar solo el Dockerfile
git add Opalo-ATS/backend/Dockerfile

# 3. Crear commit limpio
git commit -m "Agregar Dockerfile para backend Node.js"

# 4. Verificar que solo se agregó el Dockerfile
git status
```

**Deberías ver solo `Opalo-ATS/backend/Dockerfile` en el staging area.**

### Paso 2: Push del Dockerfile

```bash
# Push solo del Dockerfile
git push -u origin main
```

**Si GitHub bloquea el push**, verás URLs para permitir el push temporalmente. En ese caso:

1. **Abre las URLs** que GitHub proporciona
2. **Autoriza el push** temporalmente
3. **Haz push de nuevo**: `git push -u origin main`

### Paso 3: Verificar en GitHub

1. Ve a: https://github.com/AlvaritoMP/Opalo-ATS/tree/main/Opalo-ATS/backend
2. **Debe existir** el archivo `Dockerfile`
3. Si existe, continúa al Paso 4

### Paso 4: Configurar en Easypanel

1. En Easypanel, ve a `opalo/atsopalo-backend`
2. Ve a la pestaña **"Source"**
3. Verifica:
   - **Repository URL**: `https://github.com/AlvaritoMP/Opalo-ATS.git`
   - **Branch**: `main`
   - **Build Path**: `Opalo-ATS/backend` ✅ (ahora debería validar)
   - **Build**: `Dockerfile` (seleccionado)
   - **File**: `Dockerfile`

4. **Guarda** los cambios (debería validar correctamente ahora)

### Paso 5: Redeploy

1. Haz clic en **"Redeploy"** o **"Deploy"**
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

## 🔍 Verificación Final

Después del push y redeploy:

1. ✅ **Dockerfile existe en GitHub** en `Opalo-ATS/backend/Dockerfile`
2. ✅ **Build Path valida correctamente** en Easypanel
3. ✅ **Logs muestran backend Node.js** (no nginx)
4. ✅ **Endpoint `/health` funciona** y retorna JSON

---

## 📋 Checklist

- [ ] Commit limpio creado solo con Dockerfile
- [ ] Push exitoso a GitHub
- [ ] Dockerfile verificado en GitHub
- [ ] Build Path configurado en Easypanel como `Opalo-ATS/backend`
- [ ] Guardado exitoso (sin error "Invalid")
- [ ] Redeploy ejecutado
- [ ] Logs muestran backend Node.js corriendo

---

## 💡 Nota

Si después de hacer push solo del Dockerfile, el Build Path sigue mostrando "Invalid", puede ser que Easypanel necesite refrescar. Intenta:

1. **Guardar** de nuevo (incluso sin cambios)
2. **Esperar unos segundos** para que Easypanel valide
3. **Refrescar la página** del navegador



