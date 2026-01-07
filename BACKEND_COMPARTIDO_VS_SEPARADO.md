# 🔧 Backend Compartido vs Backend Separado para Opalo ATS

## ❓ Pregunta

¿Necesitas crear otro servicio de backend para Opalo ATS o puedes usar el mismo que ya usa Opalopy?

---

## ✅ Respuesta: Puedes Usar el Mismo Backend

**Recomendación**: Puedes usar el **mismo backend** para ambas apps (Opalopy y Opalo ATS) porque:

1. ✅ **El backend solo maneja OAuth de Google Drive** - No tiene lógica de negocio específica
2. ✅ **Las apps están separadas por `app_name`** - Ya implementamos multi-tenancy
3. ✅ **Google Drive crea carpetas separadas** - Cada app tiene su propia carpeta raíz
4. ✅ **Más simple y eficiente** - Menos recursos, menos configuración
5. ✅ **Las credenciales OAuth son las mismas** - Pueden compartirse

---

## 📋 Análisis del Backend Actual

### ¿Qué Hace el Backend?

El backend de Google Drive solo proporciona:

1. **Endpoint de autenticación OAuth**:
   - `GET /api/auth/google/drive` - Inicia el flujo OAuth
   - `GET /api/auth/google/callback` - Callback después de autorizar
   - `POST /api/auth/google/refresh` - Refresca tokens

2. **Health check**:
   - `GET /health` - Verifica que el backend esté funcionando

### ¿Tiene Lógica de Negocio Específica?

**NO**. El backend:
- ❌ No accede a la base de datos
- ❌ No filtra por `app_name`
- ❌ No tiene lógica específica de Opalopy o Opalo ATS
- ✅ Solo maneja OAuth de Google (genérico)

### ¿Cómo se Separan las Apps?

Las apps se separan en:

1. **Base de datos**: Por `app_name` (ya implementado)
2. **Google Drive**: Por carpeta raíz diferente:
   - Opalopy → "Opalopy" o "ATS Pro"
   - Opalo ATS → "Opalo ATS"
3. **Frontend**: Diferentes URLs/puertos

---

## 🎯 Opción 1: Backend Compartido (Recomendado)

### Configuración

**Un solo backend** que sirve a ambas apps:

```
Backend (Puerto 5000)
├── Opalopy (Frontend puerto 3000)
│   └── Usa: http://localhost:5000/api/auth/google/drive
└── Opalo ATS (Frontend puerto 3001)
    └── Usa: http://localhost:5000/api/auth/google/drive
```

### Variables de Entorno del Backend

```env
PORT=5000
FRONTEND_URL=http://localhost:3000  # O puedes usar múltiples URLs con CORS
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

### Configuración de CORS

El backend debe permitir ambas URLs del frontend:

```javascript
app.use(cors({
    origin: [
        'http://localhost:3000',  // Opalopy
        'http://localhost:3001', // Opalo ATS
        'https://opalo-atsalfaoro.bouasv.easypanel.host', // Producción Opalopy
        'https://tu-frontend-opalo-ats.com' // Producción Opalo ATS
    ],
    credentials: true,
}));
```

### Ventajas

- ✅ **Menos recursos** - Un solo servicio
- ✅ **Más simple** - Una sola configuración
- ✅ **Mantenimiento fácil** - Un solo lugar para actualizar
- ✅ **Mismas credenciales** - No necesitas duplicar OAuth

### Desventajas

- ⚠️ **Si una app falla, puede afectar a la otra** (pero es poco probable)
- ⚠️ **Menos escalable** - Si necesitas escalar, escalas ambas apps juntas

---

## 🎯 Opción 2: Backend Separado

### Configuración

**Dos backends independientes**:

```
Backend Opalopy (Puerto 5000)
└── Opalopy (Frontend puerto 3000)

Backend Opalo ATS (Puerto 5001)
└── Opalo ATS (Frontend puerto 3001)
```

### Variables de Entorno

**Backend Opalopy** (`Opalopy/backend/.env`):
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

**Backend Opalo ATS** (`Opalo-ATS/backend/.env`):
```env
PORT=5001
FRONTEND_URL=http://localhost:3001
GOOGLE_CLIENT_ID=...  # Pueden ser las mismas o diferentes
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback
```

### Google Cloud Console

Si usas backends separados, necesitas:

1. **Mismas credenciales OAuth** (recomendado):
   - Agregar ambos Redirect URIs:
     - `http://localhost:5000/api/auth/google/callback` (Opalopy)
     - `http://localhost:5001/api/auth/google/callback` (Opalo ATS)

2. **O credenciales diferentes**:
   - Crear un nuevo OAuth Client ID para Opalo ATS
   - Configurar Redirect URI solo para Opalo ATS

### Ventajas

- ✅ **Aislamiento completo** - Si una app falla, la otra no se afecta
- ✅ **Escalabilidad independiente** - Puedes escalar cada app por separado
- ✅ **Mantenimiento independiente** - Puedes actualizar una sin afectar la otra
- ✅ **Diferentes configuraciones** - Cada app puede tener su propia configuración

### Desventajas

- ❌ **Más recursos** - Dos servicios corriendo
- ❌ **Más configuración** - Duplicar variables de entorno
- ❌ **Más mantenimiento** - Dos lugares para actualizar

---

## 🎯 Recomendación por Escenario

### Desarrollo Local

**Usa el mismo backend** (puerto 5000):
- ✅ Más simple
- ✅ Menos recursos
- ✅ Fácil de probar

### Producción (Pequeña/Mediana Escala)

**Usa el mismo backend**:
- ✅ Más eficiente
- ✅ Menos costos
- ✅ Suficiente para la mayoría de casos

### Producción (Alta Escala o Aislamiento Crítico)

**Usa backends separados**:
- ✅ Si necesitas escalar independientemente
- ✅ Si una app es crítica y no puede fallar
- ✅ Si necesitas diferentes configuraciones

---

## 📝 Configuración Recomendada: Backend Compartido

### Paso 1: Actualizar CORS en el Backend

Modifica `Opalo-ATS/backend/src/server.js` (o `Opalopy/backend/src/server.js` si usas ese):

```javascript
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Permitir múltiples orígenes
const allowedOrigins = [
    'http://localhost:3000',  // Opalopy desarrollo
    'http://localhost:3001', // Opalo ATS desarrollo
    'http://localhost:5173', // Vite por defecto
    process.env.FRONTEND_URL_OPALOPY || 'https://opalo-atsalfaoro.bouasv.easypanel.host',
    process.env.FRONTEND_URL_OPALO_ATS || 'https://tu-frontend-opalo-ats.com',
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Permitir requests sin origin (Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
```

### Paso 2: Variables de Entorno

En el backend compartido, puedes usar:

```env
PORT=5000
# Frontend principal (para redirecciones por defecto)
FRONTEND_URL=http://localhost:3000

# Frontends adicionales (opcional, para CORS)
FRONTEND_URL_OPALOPY=http://localhost:3000
FRONTEND_URL_OPALO_ATS=http://localhost:3001

# Google OAuth (compartido)
GOOGLE_CLIENT_ID=tu_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

### Paso 3: Frontend de Opalo ATS

En `Opalo-ATS/lib/googleDrive.ts`, el frontend ya está configurado para usar:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

Solo asegúrate de que `VITE_API_URL` esté configurado en `.env.local`:

```env
VITE_API_URL=http://localhost:5000
```

---

## ✅ Checklist: Backend Compartido

- [ ] Backend configurado para aceptar múltiples orígenes (CORS)
- [ ] Variables de entorno configuradas
- [ ] Google Cloud Console actualizado con Redirect URI
- [ ] Frontend de Opalopy apunta al backend compartido
- [ ] Frontend de Opalo ATS apunta al backend compartido
- [ ] Probada conexión de Google Drive en Opalopy
- [ ] Probada conexión de Google Drive en Opalo ATS

---

## 🔄 Migración: De Compartido a Separado (Si Necesitas)

Si en el futuro necesitas separar los backends:

1. **Crea un nuevo backend** para Opalo ATS
2. **Configura variables de entorno** separadas
3. **Actualiza Google Cloud Console** con el nuevo Redirect URI
4. **Actualiza `VITE_API_URL`** en el frontend de Opalo ATS
5. **Despliega el nuevo backend**

---

## 📊 Comparación Rápida

| Aspecto | Backend Compartido | Backend Separado |
|---------|-------------------|------------------|
| **Recursos** | Menos (1 servicio) | Más (2 servicios) |
| **Configuración** | Más simple | Más compleja |
| **Mantenimiento** | Más fácil | Más trabajo |
| **Aislamiento** | Menor | Mayor |
| **Escalabilidad** | Conjunta | Independiente |
| **Costo** | Menor | Mayor |
| **Recomendado para** | Desarrollo, pequeña/mediana escala | Alta escala, aislamiento crítico |

---

## 🎯 Conclusión

**Para tu caso, recomiendo usar el mismo backend** porque:

1. ✅ El backend es simple (solo OAuth)
2. ✅ Las apps ya están separadas por `app_name` en la BD
3. ✅ Google Drive crea carpetas separadas automáticamente
4. ✅ Más simple y eficiente
5. ✅ Puedes migrar a separado más adelante si es necesario

**Solo necesitas**:
- Actualizar CORS para permitir ambas URLs del frontend
- Configurar `VITE_API_URL` en Opalo ATS para apuntar al backend compartido

