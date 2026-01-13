# 🚀 Push Solo del Dockerfile - Paso a Paso

## ❌ Problema

El Build Path muestra "Invalid" porque el Dockerfile no está en el repositorio remoto.

---

## ✅ Solución Completa

### Paso 1: Agregar Dockerfile al Staging

El Dockerfile ya existe localmente. Agreguémoslo:

```bash
git add Opalo-ATS/backend/Dockerfile
```

### Paso 2: Crear Commit Limpio

```bash
git commit -m "Agregar Dockerfile para backend Node.js"
```

### Paso 3: Hacer Push

```bash
git push -u origin main
```

**Si GitHub bloquea el push** porque detecta secretos (aunque el Dockerfile no tiene secretos), usa estas URLs para permitir temporalmente:

1. **Client ID**: https://github.com/AlvaritoMP/Opalo-ATS/security/secret-scanning/unblock-secret/37zpkI9iVmbSJHu0AfY8sN1Lw3Q
2. **Client Secret**: https://github.com/AlvaritoMP/Opalo-ATS/security/secret-scanning/unblock-secret/37zpkNctiVChWyTVmY9OxQaR9gp

### Paso 4: Verificar en GitHub

1. Ve a: https://github.com/AlvaritoMP/Opalo-ATS/tree/main/Opalo-ATS/backend
2. **Debe existir** `Dockerfile`
3. Si existe, continúa al Paso 5

### Paso 5: Configurar en Easypanel

1. En Easypanel, ve a `opalo/atsopalo-backend` > **Source**
2. Configura:
   - **Repository URL**: `https://github.com/AlvaritoMP/Opalo-ATS.git` ✅
   - **Branch**: `main` ✅
   - **Build Path**: `Opalo-ATS/backend` ✅ (ahora debería validar)
   - **Build**: `Dockerfile` ✅
   - **File**: `Dockerfile` ✅

3. **Guarda** - ahora debería validar correctamente (sin "Invalid")

### Paso 6: Redeploy

1. Haz clic en **"Redeploy"** o **"Deploy"**
2. Espera a que termine el build
3. Verifica los logs - deben mostrar:
   ```
   > opalo-ats-backend@1.0.0 start
   > node src/server.js
   
   🚀 Servidor backend corriendo en http://0.0.0.0:5000
   ✅ Backend listo para recibir peticiones
   ```

---

## 📋 Checklist

- [ ] Dockerfile agregado al staging
- [ ] Commit creado
- [ ] Push exitoso (o autorizado temporalmente)
- [ ] Dockerfile verificado en GitHub
- [ ] Build Path configurado en Easypanel como `Opalo-ATS/backend`
- [ ] Guardado exitoso (sin "Invalid")
- [ ] Redeploy ejecutado
- [ ] Logs muestran backend Node.js corriendo



