# 🔧 Solución: Error 502 con Backend Corriendo

## 🔴 Problema

El backend está corriendo (según los logs), pero el endpoint `/health` da error 502. Esto significa que Caddy/Easypanel no puede conectarse al servidor Node.js.

## ✅ Solución

### Paso 1: Verificar Puerto en Easypanel

En Easypanel, verifica que el puerto esté configurado:

1. Ve a tu app **backend** en Easypanel
2. Busca una sección de **"Port"** o **"Ports"**
3. Debe estar configurado como: `5000`

### Paso 2: Verificar Variables de Entorno

Asegúrate de tener:

```env
PORT=5000
```

### Paso 3: Verificar que el Servidor Escuche en 0.0.0.0

El servidor ya está configurado para escuchar en `0.0.0.0:5000`, lo cual es correcto.

### Paso 4: Verificar Logs de Runtime

En los logs de runtime, verifica que no haya errores después de que el servidor se inicia.

---

## 🔍 Posibles Causas

1. **Puerto no configurado en Easypanel**: Easypanel necesita saber qué puerto usar
2. **Caddy no configurado**: Si Easypanel usa Caddy, necesita saber cómo hacer proxy
3. **Servidor se cae después de iniciar**: Verifica los logs para ver si hay errores

---

## 🆘 Próximos Pasos

1. **Verifica el puerto** en la configuración de Easypanel
2. **Revisa los logs de runtime** para ver si hay errores después del inicio
3. **Comparte**:
   - ¿Está configurado el puerto 5000 en Easypanel?
   - ¿Qué aparece en los logs de runtime después de "Backend listo para recibir peticiones"?

