# Almacenamiento de Archivos - ATS Pro

## ⚠️ Problema Actual

**Los archivos actualmente se almacenan como Base64 en localStorage/estado de React.**

Esto significa:
- ❌ Los archivos se convierten a texto (Base64) y ocupan ~33% más espacio
- ❌ Se almacenan en el navegador (localStorage tiene límite de ~5-10MB)
- ❌ No se pueden compartir entre usuarios
- ❌ Se pierden al limpiar el navegador
- ❌ No escalable: un CV de 2MB se convierte en ~2.7MB de texto
- ❌ Ralentiza la aplicación al cargar muchos archivos

## ✅ Soluciones para Producción

Necesitas un **servicio de almacenamiento de archivos** (file storage) donde subir los archivos reales.

### Opción 1: Cloud Storage (Recomendado)

#### A. AWS S3 (Amazon Simple Storage Service)
- **Costo**: ~$0.023/GB/mes + transferencia
- **Ventajas**: 
  - Muy escalable y confiable
  - CDN incluido (CloudFront)
  - Control de acceso granular
  - Muy usado en producción
- **Desventajas**: 
  - Configuración más compleja
  - Puede ser costoso con mucho tráfico
- **Ideal para**: Aplicaciones empresariales, alto volumen

#### B. Supabase Storage
- **Costo**: Gratis hasta 1GB, luego $0.021/GB/mes
- **Ventajas**:
  - Muy fácil de integrar
  - Incluye autenticación
  - API simple
  - Genera URLs públicas/privadas automáticamente
- **Desventajas**: 
  - Dependes del servicio
- **Ideal para**: MVP, startups, aplicaciones pequeñas/medianas

#### C. Cloudinary
- **Costo**: Gratis hasta 25GB, luego planes desde $89/mes
- **Ventajas**:
  - Optimización automática de imágenes
  - Transformaciones on-the-fly
  - CDN global
  - Bueno para imágenes y videos
- **Desventajas**: 
  - Más caro que S3
  - Mejor para medios que documentos
- **Ideal para**: Aplicaciones con muchas imágenes

#### D. Google Drive Personal (Ya tienes espacio disponible)
- **Costo**: Gratis (usa tu espacio existente)
- **Ventajas**:
  - Ya tienes espacio disponible
  - No necesitas cuenta adicional
  - Integración con Google Workspace
  - Fácil de acceder desde cualquier lugar
- **Desventajas**: 
  - Requiere OAuth2 (más complejo que S3)
  - Límites de API (1,000 requests/100 segundos)
  - No es un servicio de almacenamiento "puro" (es un sistema de archivos)
- **Ideal para**: Si ya tienes Google Drive con espacio disponible
- **Nota**: Ya tienes UI para esto en Settings.tsx

📋 **Guía completa**: `GOOGLE_DRIVE_SETUP.md`

#### E. Google Cloud Storage
- **Costo**: Similar a S3 (~$0.020/GB/mes)
- **Ventajas**:
  - Integración con Google Workspace
  - Muy confiable
  - CDN incluido
- **Desventajas**: 
  - Configuración similar a S3
- **Ideal para**: Si ya usas Google Cloud

#### F. Azure Blob Storage
- **Costo**: ~$0.018/GB/mes
- **Ventajas**:
  - Integración con Microsoft ecosystem
  - Muy confiable
- **Desventajas**: 
  - Menos popular que S3
- **Ideal para**: Si ya usas Azure

### Opción 2: Self-Hosted (Alojado en tu servidor)

#### A. Almacenamiento Local en el Servidor
- **Costo**: Solo el espacio del servidor
- **Ventajas**:
  - Control total
  - Sin costos adicionales
  - Privacidad total
- **Desventajas**:
  - Necesitas gestionar backups
  - No hay CDN (más lento)
  - Escalabilidad limitada
  - Necesitas configurar servidor de archivos
- **Ideal para**: Aplicaciones internas, bajo volumen

#### B. MinIO (S3-compatible)
- **Costo**: Gratis (self-hosted)
- **Ventajas**:
  - API compatible con S3
  - Puedes migrar a S3 después fácilmente
  - Control total
- **Desventajas**:
  - Necesitas mantener el servidor
  - Sin CDN incluido
- **Ideal para**: Si quieres control pero con API tipo S3

### Opción 3: Servicios Especializados

#### A. Uploadcare
- **Costo**: Gratis hasta 3GB, luego desde $49/mes
- **Ventajas**:
  - Optimización automática
  - CDN global
  - Widget de upload listo
- **Ideal para**: Aplicaciones que necesitan uploads rápidos

#### B. Filestack
- **Costo**: Desde $99/mes
- **Ventajas**:
  - Muchas integraciones
  - Transformaciones avanzadas
- **Ideal para**: Aplicaciones enterprise

## 🏗️ Arquitectura Recomendada

### Flujo de Upload:

```
1. Usuario selecciona archivo (CV, imagen, etc.)
   ↓
2. Frontend → Backend API: POST /api/files/upload
   ↓
3. Backend valida el archivo (tipo, tamaño, virus scan opcional)
   ↓
4. Backend sube el archivo a Cloud Storage (S3, Supabase, etc.)
   ↓
5. Cloud Storage devuelve URL pública/privada
   ↓
6. Backend guarda la URL en la base de datos
   ↓
7. Backend devuelve la URL al frontend
   ↓
8. Frontend muestra el archivo usando la URL
```

### Flujo de Download:

```
1. Usuario hace clic en "Descargar"
   ↓
2. Frontend → Backend API: GET /api/files/:id/download
   ↓
3. Backend verifica permisos del usuario
   ↓
4. Backend genera URL firmada (signed URL) si es privado
   ↓
5. Frontend descarga desde Cloud Storage usando la URL
```

## 📋 Implementación por Opción

### Opción A: Supabase Storage (Más Fácil)

**Backend (Node.js/Express):**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Upload file
app.post('/api/files/upload', async (req, res) => {
  const file = req.files.file;
  const { data, error } = await supabase.storage
    .from('candidate-attachments')
    .upload(`${Date.now()}-${file.name}`, file.data, {
      contentType: file.mimetype
    });
  
  if (error) return res.status(500).json({ error });
  
  const { data: { publicUrl } } = supabase.storage
    .from('candidate-attachments')
    .getPublicUrl(data.path);
  
  res.json({ url: publicUrl, path: data.path });
});
```

**Frontend:**

```typescript
const handleFileUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const { url } = await response.json();
  // Guardar URL en la base de datos
};
```

### Opción B: AWS S3

**Backend (Node.js/Express):**

```typescript
import AWS from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'ats-pro-files',
    acl: 'private', // o 'public-read'
    key: (req, file, cb) => {
      cb(null, `candidates/${Date.now()}-${file.originalname}`);
    }
  })
});

app.post('/api/files/upload', upload.single('file'), (req, res) => {
  res.json({ 
    url: req.file.location,
    key: req.file.key 
  });
});

// Generar URL firmada para descarga
app.get('/api/files/:key/download', async (req, res) => {
  const url = s3.getSignedUrl('getObject', {
    Bucket: 'ats-pro-files',
    Key: req.params.key,
    Expires: 3600 // 1 hora
  });
  res.json({ url });
});
```

### Opción C: Almacenamiento Local

**Backend (Node.js/Express):**

```typescript
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

app.post('/api/files/upload', upload.single('file'), (req, res) => {
  const fileUrl = `/files/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// Servir archivos
app.use('/files', express.static('uploads'));
```

## 🔒 Seguridad

### Validaciones Necesarias:

1. **Tipo de archivo**: Solo permitir PDFs, imágenes, documentos
2. **Tamaño máximo**: Limitar tamaño (ej: 10MB)
3. **Nombre de archivo**: Sanitizar nombres para prevenir path traversal
4. **Permisos**: Verificar que el usuario tenga permiso para subir
5. **Virus scanning**: Opcional pero recomendado (ClamAV, VirusTotal API)
6. **Rate limiting**: Limitar uploads por usuario/tiempo

### Ejemplo de Validación:

```typescript
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const validateFile = (file: Express.Multer.File) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error('Tipo de archivo no permitido');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('Archivo demasiado grande');
  }
  // Sanitizar nombre
  file.originalname = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
};
```

## 📊 Comparación Rápida

| Opción | Facilidad | Costo | Escalabilidad | CDN | Recomendado Para |
|--------|-----------|-------|---------------|-----|------------------|
| **Google Drive** | ⭐⭐⭐ | Gratis* | ⭐⭐⭐ | ✅ | Si ya tienes espacio |
| **Supabase** | ⭐⭐⭐⭐⭐ | $ | ⭐⭐⭐⭐ | ✅ | MVP, Startups |
| **AWS S3** | ⭐⭐⭐ | $$ | ⭐⭐⭐⭐⭐ | ✅ | Producción Enterprise |
| **Cloudinary** | ⭐⭐⭐⭐ | $$$ | ⭐⭐⭐⭐⭐ | ✅ | Muchas imágenes |
| **Local** | ⭐⭐ | Gratis | ⭐⭐ | ❌ | Apps internas |
| **MinIO** | ⭐⭐⭐ | Gratis | ⭐⭐⭐ | ❌ | Self-hosted S3 |

*Gratis si ya tienes espacio en Google Drive

## 🚀 Próximos Pasos

1. **Elige tu opción** según tus necesidades
2. **Configura el servicio** (crea cuenta, obtén credenciales)
3. **Implementa el backend** para upload/download
4. **Actualiza el frontend** para usar URLs en lugar de Base64
5. **Migra datos existentes** (si los hay)

## 💡 Recomendación

Para empezar: **Supabase Storage**
- Fácil de configurar
- Generoso plan gratuito
- Buena documentación
- Puedes migrar a S3 después si creces

Para producción enterprise: **AWS S3**
- Máxima escalabilidad
- Muy confiable
- Control total
- Estándar de la industria

¿Quieres que te ayude a implementar alguna de estas opciones?

