# ✅ Configuración de Redirect URIs en Google Cloud

## 📋 Tus URIs Actuales

Tienes estas URIs configuradas:
1. `https://opalo-atsalfaoro.bouasv.easypanel.host/`
2. `http://localhost:3000/api/auth/google/callback`
3. `https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/callback`

## ✅ Análisis

### ✅ Correctas (Mantener):

1. **`https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/callback`**
   - ✅ **CORRECTA** - Esta es la URI de producción del backend
   - ✅ **MANTENER** - Es la que se usa en producción

2. **`http://localhost:3000/api/auth/google/callback`**
   - ✅ **CORRECTA** - Para desarrollo local
   - ✅ **MANTENER** - Útil si desarrollas localmente

### ⚠️ Revisar:

3. **`https://opalo-atsalfaoro.bouasv.easypanel.host/`**
   - ⚠️ **INCORRECTA** - Esta es la URL del frontend, no del callback
   - ❌ **ELIMINAR** - No es una URI de callback válida

## ✅ Configuración Recomendada

### Authorized JavaScript origins:
```
https://opalo-ats-backend.bouasv.easypanel.host
http://localhost:5000
```

### Authorized redirect URIs:
```
https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/callback
http://localhost:5000/api/auth/google/callback
http://localhost:3000/api/auth/google/callback
```

**Nota**: Si no desarrollas localmente, puedes eliminar las URIs de `localhost`.

---

## 📝 Resumen

- ✅ **Sí, está bien tener múltiples URIs** - Es normal para desarrollo y producción
- ✅ **Mantén** las URIs de `localhost` si desarrollas localmente
- ✅ **Mantén** la URI de producción del backend
- ❌ **Elimina** `https://opalo-atsalfaoro.bouasv.easypanel.host/` (es del frontend, no del callback)

---

## 🔍 Sobre el Error 502

El error 502 del backend es un problema separado. Necesitamos verificar:
1. ¿Está configurado el puerto 5000 en Easypanel?
2. ¿Los logs muestran que el servidor sigue corriendo?

