# 🔍 Diagnóstico: Backend Redirige a la App

## ❌ Problema

El backend existe en Easypanel, tiene las variables configuradas, pero cuando accedes a:
```
https://opalo-atsopalo-backend.bouasv.easypanel.host/health
```
Te redirige a la app en lugar de mostrar el JSON.

---

## 🔍 Posibles Causas

### 1. Root Directory Incorrecto
El backend puede estar usando el directorio del frontend en lugar de `Opalo-ATS/backend`.

### 2. Backend No Está Corriendo
El servicio puede estar detenido o con errores.

### 3. Problema de Routing/Proxy
Easypanel puede estar enrutando incorrectamente las peticiones.

### 4. Start Command Incorrecto
El comando de inicio puede estar incorrecto.

---

## ✅ Pasos para Diagnosticar

### Paso 1: Verificar Logs del Backend

1. Ve a tu backend en Easypanel
2. Ve a la pestaña **Logs**
3. Busca mensajes como:
   - `🚀 Servidor backend corriendo en http://0.0.0.0:5000`
   - Errores de inicio
   - Errores de variables de entorno

**¿Qué deberías ver?**
```
🚀 Servidor backend corriendo en http://0.0.0.0:5000
📡 Frontend URL: https://opalo-atsopalo.bouasv.easypanel.host
🔐 Google OAuth Redirect URI: https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
✅ Backend listo para recibir peticiones
```

**Si NO ves estos mensajes:**
- El backend no está iniciando correctamente
- Revisa los errores en los logs

### Paso 2: Verificar Configuración del Servicio

En el backend, verifica:

1. **Root Directory**: Debe ser `Opalo-ATS/backend` (NO `Opalo-ATS` ni raíz)
2. **Start Command**: Debe ser `npm start` (NO `npm run dev`)
3. **Port**: Debe ser `5000`
4. **Build Command**: Debe ser `npm install`

### Paso 3: Verificar Status del Servicio

1. En Easypanel, ve a tu backend
2. Verifica el **Status**:
   - ✅ **Running** = Está corriendo
   - ❌ **Stopped** = Está detenido
   - ⚠️ **Error** = Hay un error

### Paso 4: Verificar que el Archivo Existe

En los logs, busca errores como:
- `Cannot find module`
- `Error: Cannot find file`
- `ENOENT`

Esto indicaría que el Root Directory está mal configurado.

---

## 🔧 Soluciones

### Solución 1: Verificar Root Directory

1. Ve a la configuración del backend
2. Verifica que **Root Directory** sea exactamente:
   ```
   Opalo-ATS/backend
   ```
3. **NO** debe ser:
   - `Opalo-ATS` (falta `/backend`)
   - `/` (raíz)
   - `backend` (falta `Opalo-ATS/`)

### Solución 2: Verificar Start Command

1. Ve a la configuración del backend
2. Verifica que **Start Command** sea:
   ```
   npm start
   ```
3. **NO** debe ser:
   - `npm run dev`
   - `node src/server.js` (aunque funciona, mejor usar `npm start)

### Solución 3: Verificar que package.json Existe

1. En los logs del build, busca si se instalan las dependencias
2. Deberías ver algo como:
   ```
   added 150 packages in 10s
   ```

### Solución 4: Reiniciar el Servicio

1. En Easypanel, ve a tu backend
2. Haz clic en **"Restart"** o **"Stop"** y luego **"Start"**
3. Espera a que termine
4. Verifica los logs de nuevo

---

## 🐛 Si Aún No Funciona

### Opción A: Probar con curl o Postman

Desde tu terminal, prueba:

```bash
curl https://opalo-atsopalo-backend.bouasv.easypanel.host/health
```

O usa Postman para hacer una petición GET a `/health`.

**Si funciona con curl pero no en el navegador:**
- Puede ser un problema de CORS o de redirección del navegador

### Opción B: Verificar Variables de Entorno

En los logs, busca advertencias como:
```
⚠️ ADVERTENCIA: GOOGLE_CLIENT_ID no está configurada
```

Si ves esto, las variables no se están cargando correctamente.

### Opción C: Verificar que el Puerto Esté Correcto

1. En la configuración del backend, verifica que **Port** sea `5000`
2. En los logs, verifica que diga:
   ```
   Servidor backend corriendo en http://0.0.0.0:5000
   ```

---

## 📋 Checklist de Diagnóstico

- [ ] Logs muestran que el servidor está corriendo
- [ ] Root Directory es `Opalo-ATS/backend`
- [ ] Start Command es `npm start`
- [ ] Port es `5000`
- [ ] Status del servicio es "Running"
- [ ] No hay errores en los logs
- [ ] Variables de entorno están configuradas
- [ ] Servicio reiniciado después de cambios

---

## 🎯 Próximos Pasos

Después de verificar todo lo anterior:

1. **Comparte los logs del backend** (especialmente los últimos mensajes)
2. **Comparte la configuración del servicio** (Root Directory, Start Command, Port)
3. **Comparte el Status del servicio**

Con esta información podremos identificar el problema exacto.

