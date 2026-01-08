# 🔍 Explicación: Puerto del Dominio vs Variables de Entorno

## ❓ Pregunta

¿Tenía sentido cambiar el puerto del dominio a 5000 si en las variables de entorno ya se indicaba puerto 5000?

## ✅ Respuesta: SÍ, tenía sentido

Son **dos configuraciones diferentes** que deben **coincidir**:

---

## 🔧 Dos Configuraciones Diferentes

### 1. Variables de Entorno (PORT=5000)

**¿Qué hace?**
- Le dice al **backend Node.js** en qué puerto debe **ESCUCHAR**
- El backend ejecuta: `app.listen(5000, ...)`

**Dónde se configura:**
- En Easypanel → Backend → Environment Variables
- Variable: `PORT=5000`

**Resultado:**
- El backend Node.js escucha en el puerto **5000** dentro del contenedor

---

### 2. Configuración del Dominio (Port: 5000)

**¿Qué hace?**
- Le dice al **proxy/load balancer de Easypanel** a qué puerto debe **REDIRIGIR** las peticiones
- Cuando alguien accede a `https://opalo-atsopalo-backend.bouasv.easypanel.host`, Easypanel redirige al puerto configurado

**Dónde se configura:**
- En Easypanel → Backend → Domains → Edit Domain
- Sección "Destination" → Port: `5000`

**Resultado:**
- Las peticiones externas se redirigen al puerto **5000** del contenedor

---

## 🔄 Flujo de una Petición

```
1. Usuario accede a: https://opalo-atsopalo-backend.bouasv.easypanel.host/health
   ↓
2. Easypanel (proxy) recibe la petición
   ↓
3. Easypanel consulta la configuración del dominio:
   - Protocol: HTTP
   - Port: 5000  ← Debe coincidir con PORT=5000
   ↓
4. Easypanel redirige la petición al puerto 5000 del contenedor
   ↓
5. El backend Node.js escucha en el puerto 5000 (configurado por PORT=5000)
   ↓
6. El backend procesa la petición y responde
```

---

## ❌ ¿Qué Pasaba Antes?

### Configuración Incorrecta:
- **Variables de entorno**: `PORT=5000` ✅
- **Dominio**: Port `80` ❌

### Resultado:
```
1. Usuario accede a: https://opalo-atsopalo-backend.bouasv.easypanel.host/health
   ↓
2. Easypanel redirige al puerto 80 (según configuración del dominio)
   ↓
3. El backend NO está escuchando en el puerto 80
   ↓
4. Error: "Service is not reachable"
```

---

## ✅ Configuración Correcta:

### Ahora:
- **Variables de entorno**: `PORT=5000` ✅
- **Dominio**: Port `5000` ✅

### Resultado:
```
1. Usuario accede a: https://opalo-atsopalo-backend.bouasv.easypanel.host/health
   ↓
2. Easypanel redirige al puerto 5000 (según configuración del dominio)
   ↓
3. El backend SÍ está escuchando en el puerto 5000 (según PORT=5000)
   ↓
4. El backend procesa la petición y responde correctamente ✅
```

---

## 📋 Resumen

| Configuración | Dónde | Qué Hace | Valor Correcto |
|---------------|-------|----------|----------------|
| **PORT (Variable)** | Environment Variables | Puerto donde el backend **escucha** | `5000` |
| **Port (Dominio)** | Domains → Destination | Puerto al que Easypanel **redirige** | `5000` |

**Ambos deben tener el mismo valor** para que funcione correctamente.

---

## 🎯 Conclusión

Sí, tenía sentido cambiar el puerto del dominio a 5000 porque:

1. ✅ El backend escucha en 5000 (PORT=5000)
2. ✅ El dominio debe redirigir a 5000 (Port: 5000)
3. ✅ Ambos deben coincidir para que las peticiones lleguen al backend

Si el dominio estaba en 80 pero el backend en 5000, las peticiones nunca llegarían al backend.

