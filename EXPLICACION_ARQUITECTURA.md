# 🏗️ Explicación: ¿Por Qué un Backend Separado?

## 🎯 Tu Pregunta

> "¿Por qué creamos un backend separado si Supabase ya es el backend de la app?"

**Excelente pregunta.** Déjame explicar la arquitectura:

---

## 📊 Arquitectura Completa

### 1. **Supabase = Backend Principal de la App** ✅

**Supabase maneja**:
- ✅ **Base de datos PostgreSQL**
  - Usuarios, procesos, candidatos, configuraciones
  - Todos los datos estructurados de la aplicación
- ✅ **Autenticación de usuarios** de la app
  - Login, registro, sesiones
- ✅ **API REST** para CRUD
  - `GET /users`, `POST /candidates`, etc.

**Supabase NO puede manejar**:
- ❌ Google OAuth2 (autenticación con Google)
- ❌ Google Drive API (interacción con Google Drive)

---

### 2. **Backend Express = Servicio Especializado para Google** 🔐

**Este backend SOLO hace 2 cosas**:

#### A) **Google OAuth2** (Autenticación con Google)

**¿Por qué necesitamos esto?**
- Google requiere un `CLIENT_SECRET` para OAuth2
- El `CLIENT_SECRET` **NUNCA puede estar en el frontend** (es un secreto)
- Solo un servidor puede guardarlo de forma segura

**Flujo**:
```
Usuario → Frontend → Backend Express → Google → Usuario autoriza → Backend obtiene tokens
```

#### B) **Google Drive API** (Subir/Leer Archivos)

**¿Por qué necesitamos esto?**
- El frontend necesita tokens de Google para acceder a Drive
- El backend maneja el intercambio seguro de tokens
- Actúa como intermediario seguro

---

## 🔐 Razón Principal: Seguridad

### El Problema del CLIENT_SECRET

**Google OAuth requiere**:
- `GOOGLE_CLIENT_ID` → Puede estar en el frontend (es público)
- `GOOGLE_CLIENT_SECRET` → ⚠️ **NUNCA puede estar en el frontend** (es secreto)

**Si el CLIENT_SECRET estuviera en el frontend**:
```javascript
// ❌ INCORRECTO - Cualquiera puede ver esto en el código
const clientSecret = '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';
// Cualquiera que abra las DevTools puede copiarlo
```

**Con el CLIENT_SECRET en el backend**:
```javascript
// ✅ CORRECTO - Solo el servidor lo ve
// backend/.env (nunca se sube a Git)
GOOGLE_CLIENT_SECRET=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
```

---

## 📁 ¿Dónde se Guardan los Archivos?

### Flujo Completo de Subida de Archivo

```
1. Usuario sube un PDF (ej: CV de un candidato)
   ↓
2. Frontend → Supabase:
   - Guarda METADATA: { name: "CV_Juan.pdf", candidateId: "123", uploadedAt: "2026-01-07" }
   ↓
3. Frontend → Backend Express:
   - Envía el archivo PDF
   - Usa el access_token de Google (obtenido en OAuth)
   ↓
4. Backend Express → Google Drive API:
   - Sube el PDF a la carpeta del proceso
   - Recibe: { fileId: "abc123", webViewLink: "https://drive.google.com/..." }
   ↓
5. Backend Express → Frontend:
   - Devuelve: { fileId: "abc123", link: "https://..." }
   ↓
6. Frontend → Supabase:
   - Actualiza metadata: { googleDriveFileId: "abc123", googleDriveLink: "https://..." }
```

**Resultado**:
- ✅ **Metadata** (nombre, fecha, candidato, etc.) → **Supabase**
- ✅ **Archivo físico** (PDF, imagen, etc.) → **Google Drive**

---

## 🎯 ¿Qué Hace Exactamente el Backend Express?

### Endpoints Creados:

1. **`GET /api/auth/google/drive`**
   - Inicia el flujo OAuth
   - Redirige a Google para que el usuario autorice

2. **`GET /api/auth/google/callback`**
   - Google redirige aquí después de autorizar
   - Intercambia código por tokens (usa CLIENT_SECRET aquí)
   - Crea carpeta raíz "Opalo ATS" en Google Drive
   - Redirige al frontend con los tokens

3. **`POST /api/auth/google/refresh`**
   - Refresca el token cuando expira
   - Usa refresh_token (sin exponer CLIENT_SECRET)

4. **`GET /health`**
   - Health check

**Eso es TODO.** No maneja datos de la app, solo OAuth y Drive.

---

## 📊 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    OPALO ATS APP                        │
│                  (Frontend React)                       │
│                                                         │
│  - Interfaz de usuario                                 │
│  - Lógica de negocio                                   │
│  - Manejo de archivos                                  │
└──────────────┬──────────────────┬──────────────────────┘
               │                  │
               │                  │
    ┌──────────▼──────────┐  ┌─────▼──────────────────────┐
    │   SUPABASE          │  │  BACKEND EXPRESS          │
    │   (Backend Principal)│  │  (Solo Google OAuth/Drive)│
    │                     │  │                           │
    │ ✅ Usuarios         │  │ ✅ Google OAuth2          │
    │ ✅ Procesos         │  │ ✅ Google Drive API       │
    │ ✅ Candidatos       │  │ ✅ Manejo de tokens       │
    │ ✅ Configuraciones  │  │                           │
    │ ✅ Metadata archivos│  │ ❌ NO maneja datos app    │
    │                     │  │ ❌ NO es BD principal     │
    └─────────────────────┘  └───────────┬───────────────┘
                                          │
                                          │
                                  ┌───────▼────────┐
                                  │  GOOGLE DRIVE  │
                                  │                │
                                  │ ✅ Archivos PDF │
                                  │ ✅ Imágenes     │
                                  │ ✅ Documentos   │
                                  │                │
                                  │ ❌ NO metadata  │
                                  └────────────────┘
```

---

## ✅ Resumen

### Supabase (Backend Principal)
- **Base de datos** de toda la app
- **Autenticación** de usuarios de la app
- **API REST** para todos los datos
- **Metadata** de archivos (nombre, fecha, etc.)

### Backend Express (Servicio Especializado)
- **Solo** Google OAuth2 (autenticación con Google)
- **Solo** Google Drive API (subir/leer archivos)
- **NO** maneja datos de la app
- **NO** es una base de datos

### Google Drive (Almacenamiento)
- **Solo** archivos físicos (PDFs, imágenes, etc.)
- **NO** guarda metadata (eso va en Supabase)

---

## 🔍 Analogía Simple

Imagina que tienes una biblioteca:

- **Supabase** = El catálogo de la biblioteca (qué libros hay, quién los tiene, cuándo se prestaron)
- **Backend Express** = El sistema de seguridad (verifica que tengas permiso para entrar)
- **Google Drive** = Los estantes físicos (donde están los libros reales)

El catálogo (Supabase) sabe qué libros hay y dónde están, pero los libros físicos (archivos) están en los estantes (Google Drive). El sistema de seguridad (Backend Express) solo verifica que tengas permiso para acceder.

---

## 🎯 Conclusión

**El backend Express NO reemplaza a Supabase**. Es un **servicio complementario** que:

1. Maneja OAuth2 de forma segura (sin exponer secrets)
2. Interactúa con Google Drive API
3. Actúa como intermediario entre el frontend y Google

**Supabase sigue siendo el backend principal** para todos los datos de la aplicación.

**Google Drive es solo el almacenamiento** de archivos físicos.

---

## 📝 ¿Necesitas Este Backend?

**Sí, si quieres**:
- ✅ Conectar con Google Drive
- ✅ Subir archivos a Google Drive
- ✅ Guardar documentos en Google Drive

**No, si**:
- ❌ Solo usas Supabase Storage para archivos
- ❌ No necesitas Google Drive
- ❌ Guardas archivos en otro lugar

Pero como Opalopy ya usa Google Drive, y queremos la misma funcionalidad, **necesitamos este backend**.


