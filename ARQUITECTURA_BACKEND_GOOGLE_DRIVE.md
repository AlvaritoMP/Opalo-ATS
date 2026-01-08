# 🏗️ Arquitectura: ¿Por Qué un Backend Separado para Google Drive?

## 🎯 Pregunta Importante

**"¿Por qué necesitamos un backend separado si Supabase ya es el backend de la app?"**

Excelente pregunta. Déjame explicar la arquitectura completa:

---

## 📊 Arquitectura de la Aplicación

### 1. **Supabase = Backend Principal** ✅

**Supabase maneja**:
- ✅ **Base de datos** (PostgreSQL)
  - Usuarios, procesos, candidatos, configuraciones
  - Todos los datos estructurados de la app
- ✅ **Autenticación de usuarios** de la app
  - Login, registro, sesiones
- ✅ **API REST** para CRUD de datos
  - `GET /users`, `POST /candidates`, etc.

**Supabase NO maneja**:
- ❌ Google OAuth2 (autenticación con Google)
- ❌ Google Drive API (guardar/leer archivos en Google Drive)

---

### 2. **Backend Express = Backend de Google Drive** 🔐

**Este backend SOLO maneja**:
- ✅ **Google OAuth2** (autenticación con Google)
  - Flujo de autorización
  - Intercambio de código por tokens
  - Refresh tokens
- ✅ **Google Drive API** (interacción con Google Drive)
  - Crear carpetas
  - Subir archivos
  - Leer archivos

**Este backend NO maneja**:
- ❌ Datos de la aplicación (eso lo hace Supabase)
- ❌ Autenticación de usuarios de la app (eso lo hace Supabase)

---

## 🔐 ¿Por Qué Necesitamos Este Backend?

### Razón 1: Seguridad - Credenciales OAuth

**Problema**: Google OAuth requiere:
- `GOOGLE_CLIENT_ID` (puede estar en frontend)
- `GOOGLE_CLIENT_SECRET` (⚠️ **NUNCA debe estar en frontend**)

**Solución**: El backend Express guarda el `CLIENT_SECRET` de forma segura en el servidor.

```javascript
// ❌ INCORRECTO: En el frontend (exponería el secret)
const clientSecret = 'GOCSPX-...'; // ¡NUNCA!

// ✅ CORRECTO: En el backend (solo el servidor lo ve)
// backend/.env
GOOGLE_CLIENT_SECRET=GOCSPX-... // Seguro en el servidor
```

---

### Razón 2: Flujo OAuth2 Requiere un Servidor

**El flujo OAuth2 de Google funciona así**:

```
1. Usuario hace clic en "Conectar con Google Drive"
   ↓
2. Frontend → Backend Express: "Inicia OAuth"
   ↓
3. Backend Express → Google: "Autoriza esta app"
   ↓
4. Google → Usuario: "¿Autorizas esta app?"
   ↓
5. Usuario: "Sí"
   ↓
6. Google → Backend Express: "Aquí está el código de autorización"
   ↓
7. Backend Express → Google: "Intercambia código por tokens" (usa CLIENT_SECRET)
   ↓
8. Google → Backend Express: "Aquí están los tokens"
   ↓
9. Backend Express → Frontend: "Aquí están los tokens" (sin el secret)
   ↓
10. Frontend guarda tokens y los usa para acceder a Google Drive
```

**Punto crítico**: El paso 7 requiere el `CLIENT_SECRET`, que **NO puede estar en el frontend**.

---

### Razón 3: Google Drive API - Límites de CORS

**Problema**: Google Drive API tiene restricciones de CORS que pueden bloquear requests directos desde el navegador.

**Solución**: El backend Express actúa como proxy, haciendo las requests desde el servidor.

---

## 📁 ¿Dónde se Guardan los Archivos?

### Flujo Completo:

```
1. Usuario sube un PDF en la app
   ↓
2. Frontend → Supabase: Guarda metadata (nombre, tamaño, fecha)
   ↓
3. Frontend → Backend Express: "Sube este archivo a Google Drive"
   ↓
4. Backend Express → Google Drive API: Sube el archivo
   ↓
5. Google Drive API → Backend Express: "Archivo subido, ID: abc123"
   ↓
6. Backend Express → Frontend: "Archivo subido, ID: abc123"
   ↓
7. Frontend → Supabase: Actualiza metadata con Google Drive ID
```

**Resultado**:
- ✅ **Metadata** (nombre, fecha, etc.) → Supabase
- ✅ **Archivo físico** (PDF, imagen, etc.) → Google Drive

---

## 🎯 Resumen de la Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                     │
│  - Interfaz de usuario                                  │
│  - Lógica de negocio                                    │
└──────────────┬──────────────────┬───────────────────────┘
               │                  │
               │                  │
    ┌──────────▼──────────┐  ┌─────▼──────────────────────┐
    │   SUPABASE (BD)     │  │  BACKEND EXPRESS          │
    │                     │  │  (Google OAuth/Drive)     │
    │ - Usuarios          │  │                           │
    │ - Procesos           │  │ - OAuth2 con Google       │
    │ - Candidatos         │  │ - Google Drive API        │
    │ - Configuraciones    │  │ - Manejo de tokens        │
    │ - Metadata de archivos│ │                           │
    └─────────────────────┘  └───────────┬───────────────┘
                                          │
                                          │
                                  ┌───────▼────────┐
                                  │  GOOGLE DRIVE  │
                                  │                │
                                  │ - Archivos PDF │
                                  │ - Imágenes     │
                                  │ - Documentos   │
                                  └────────────────┘
```

---

## ✅ ¿Qué Hace Exactamente el Backend Express?

### Endpoints:

1. **`GET /api/auth/google/drive`**
   - Inicia el flujo OAuth
   - Redirige a Google para autorización

2. **`GET /api/auth/google/callback`**
   - Recibe el código de autorización de Google
   - Intercambia código por tokens (usa CLIENT_SECRET)
   - Obtiene información del usuario
   - Crea carpeta raíz en Google Drive
   - Redirige al frontend con los tokens

3. **`POST /api/auth/google/refresh`**
   - Refresca el token de acceso cuando expira
   - Usa el refresh_token (sin exponer CLIENT_SECRET)

4. **`GET /health`**
   - Health check del backend

---

## 🔒 Seguridad

### ¿Por Qué el CLIENT_SECRET Debe Estar en el Backend?

**Si el CLIENT_SECRET estuviera en el frontend**:
- ❌ Cualquiera podría verlo en el código fuente
- ❌ Cualquiera podría usarlo para crear tokens falsos
- ❌ Google podría revocar las credenciales por exposición

**Con el CLIENT_SECRET en el backend**:
- ✅ Solo el servidor lo ve
- ✅ No se expone al cliente
- ✅ Google Drive API valida correctamente

---

## 📝 Ejemplo Práctico

### Escenario: Usuario sube un CV

1. **Usuario hace clic en "Subir CV"** en la app
2. **Frontend**:
   - Muestra el selector de archivos
   - Usuario selecciona `CV_Juan_Perez.pdf`
3. **Frontend → Supabase**:
   - Guarda metadata: `{ name: "CV_Juan_Perez.pdf", candidateId: "123", uploadedAt: "2026-01-07" }`
4. **Frontend → Backend Express**:
   - Envía el archivo PDF
   - Usa el `access_token` de Google (obtenido en OAuth)
5. **Backend Express → Google Drive API**:
   - Sube el PDF a la carpeta del proceso
   - Recibe: `{ fileId: "abc123xyz", webViewLink: "https://..." }`
6. **Backend Express → Frontend**:
   - Devuelve el `fileId` y `webViewLink`
7. **Frontend → Supabase**:
   - Actualiza el registro con: `{ googleDriveFileId: "abc123xyz", googleDriveLink: "https://..." }`

**Resultado**:
- ✅ Metadata en Supabase (búsqueda, filtros, etc.)
- ✅ Archivo físico en Google Drive (almacenamiento)

---

## 🎯 Conclusión

**El backend Express NO es un backend completo de la app**. Es un **servicio especializado** que:

1. **Maneja OAuth2** de forma segura (sin exponer secrets)
2. **Interactúa con Google Drive API** (subir/leer archivos)
3. **Actúa como proxy** entre el frontend y Google

**Supabase sigue siendo el backend principal** para:
- Todos los datos de la aplicación
- Autenticación de usuarios
- Lógica de negocio

**Google Drive es solo el almacenamiento** de archivos físicos (PDFs, imágenes, etc.).

---

## 📋 Resumen Visual

```
┌─────────────────────────────────────────────────────────┐
│                    OPALO ATS APP                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐         ┌──────────────┐             │
│  │   SUPABASE   │         │   EXPRESS    │             │
│  │              │         │   BACKEND    │             │
│  │ - Datos      │         │              │             │
│  │ - Usuarios   │         │ - OAuth2     │             │
│  │ - Procesos   │         │ - Drive API  │             │
│  │ - Metadata   │         │              │             │
│  └──────────────┘         └──────┬───────┘             │
│                                   │                     │
│                                   ▼                     │
│                          ┌──────────────┐              │
│                          │ GOOGLE DRIVE │              │
│                          │              │              │
│                          │ - Archivos   │              │
│                          │ - PDFs       │              │
│                          └──────────────┘              │
└─────────────────────────────────────────────────────────┘
```

**En resumen**: 
- **Supabase** = Base de datos y backend principal
- **Backend Express** = Servicio especializado para Google OAuth/Drive
- **Google Drive** = Almacenamiento de archivos


