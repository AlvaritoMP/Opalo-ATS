# Configuración de Google Drive para Almacenamiento de Archivos

## 📋 Requisitos Previos

1. **Cuenta de Google** con espacio disponible en Drive
2. **Backend API** (Node.js/Express) - Necesario para autenticación OAuth2
3. **Google Cloud Project** - Para obtener credenciales de API

## 🔧 Paso 1: Configurar Google Cloud Project

### 1.1 Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Nombra el proyecto (ej: "ATS Pro File Storage")

### 1.2 Habilitar Google Drive API

1. En el menú lateral, ve a **APIs & Services** → **Library**
2. Busca "Google Drive API"
3. Haz clic en **Enable**

### 1.3 Crear Credenciales OAuth 2.0

1. Ve a **APIs & Services** → **Credentials**
2. Haz clic en **Create Credentials** → **OAuth client ID**
3. Si es la primera vez, configura la pantalla de consentimiento:
   - Tipo: **External** (o Internal si tienes Google Workspace)
   - Nombre de la app: "ATS Pro"
   - Email de soporte: tu email
   - Scopes: Agrega `https://www.googleapis.com/auth/drive.file`
   - Usuarios de prueba: Agrega tu email (para testing)
4. Tipo de aplicación: **Web application**
5. Nombre: "ATS Pro Backend"
6. **Authorized redirect URIs**: 
   - `http://localhost:5000/api/auth/google/callback` (desarrollo)
   - `https://tu-dominio.com/api/auth/google/callback` (producción)
7. Haz clic en **Create**
8. **Guarda las credenciales**:
   - Client ID
   - Client Secret

### 1.4 Configurar Scopes Necesarios

Los scopes que necesitas:
- `https://www.googleapis.com/auth/drive.file` - Crear y editar archivos
- `https://www.googleapis.com/auth/drive.metadata.readonly` - Leer metadatos (opcional)

## 🔧 Paso 2: Instalar Dependencias en el Backend

```bash
npm install googleapis express-session passport passport-google-oauth20 multer
npm install --save-dev @types/passport @types/passport-google-oauth20 @types/express-session
```

## 🔧 Paso 3: Configurar Backend (Node.js/Express)

### 3.1 Estructura de Archivos

```
backend/
├── src/
│   ├── config/
│   │   └── googleDrive.ts
│   ├── routes/
│   │   └── files.ts
│   ├── middleware/
│   │   └── auth.ts
│   └── server.ts
├── .env
└── package.json
```

### 3.2 Variables de Entorno (.env)

```env
# Google OAuth
GOOGLE_CLIENT_ID=tu_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Session
SESSION_SECRET=tu_secret_super_secreto_aqui

# Server
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### 3.3 Configuración de Google Drive (src/config/googleDrive.ts)

```typescript
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Almacenar tokens por usuario (en producción usa base de datos)
const userTokens: Map<string, any> = new Map();

export const setUserTokens = (userId: string, tokens: any) => {
  userTokens.set(userId, tokens);
  oauth2Client.setCredentials(tokens);
};

export const getUserTokens = (userId: string) => {
  return userTokens.get(userId);
};

export const getDriveClient = (userId: string) => {
  const tokens = getUserTokens(userId);
  if (!tokens) {
    throw new Error('Usuario no autenticado con Google Drive');
  }
  oauth2Client.setCredentials(tokens);
  return google.drive({ version: 'v3', auth: oauth2Client });
};

export const getAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ],
    prompt: 'consent' // Fuerza a pedir permisos para obtener refresh token
  });
};

export const getTokensFromCode = async (code: string) => {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

export { oauth2Client };
```

### 3.4 Rutas de Autenticación (src/routes/auth.ts)

```typescript
import express from 'express';
import { getAuthUrl, getTokensFromCode, setUserTokens } from '../config/googleDrive';

const router = express.Router();

// Iniciar autenticación OAuth
router.get('/google', (req, res) => {
  const authUrl = getAuthUrl();
  res.redirect(authUrl);
});

// Callback después de autenticación
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: 'Código no proporcionado' });
    }

    const tokens = await getTokensFromCode(code as string);
    
    // En producción, guarda estos tokens en la base de datos asociados al usuario
    const userId = req.session.userId || 'default-user';
    setUserTokens(userId, tokens);

    // Redirigir al frontend
    res.redirect(`${process.env.FRONTEND_URL}/settings?drive_connected=true`);
  } catch (error) {
    console.error('Error en callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings?error=auth_failed`);
  }
});

export default router;
```

### 3.5 Rutas de Archivos (src/routes/files.ts)

```typescript
import express from 'express';
import multer from 'multer';
import { getDriveClient } from '../config/googleDrive';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Crear carpeta en Drive si no existe
const getOrCreateFolder = async (drive: any, folderName: string) => {
  // Buscar carpeta existente
  const response = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)'
  });

  if (response.data.files.length > 0) {
    return response.data.files[0].id;
  }

  // Crear carpeta si no existe
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    },
    fields: 'id'
  });

  return folder.data.id;
};

// Subir archivo
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    const userId = req.session.userId || 'default-user';
    const drive = getDriveClient(userId);

    // Crear o obtener carpeta "ATS Pro Files"
    const folderId = await getOrCreateFolder(drive, 'ATS Pro Files');

    // Subir archivo
    const fileMetadata = {
      name: `${Date.now()}-${req.file.originalname}`,
      parents: [folderId]
    };

    const media = {
      mimeType: req.file.mimetype,
      body: req.file.buffer
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink'
    });

    // Hacer el archivo accesible públicamente (opcional)
    await drive.permissions.create({
      fileId: file.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    // Obtener URL pública
    const fileUrl = `https://drive.google.com/file/d/${file.data.id}/view`;

    res.json({
      id: file.data.id,
      name: file.data.name,
      url: fileUrl,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${file.data.id}`
    });
  } catch (error: any) {
    console.error('Error subiendo archivo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Descargar archivo
router.get('/:fileId/download', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.session.userId || 'default-user';
    const drive = getDriveClient(userId);

    // Obtener información del archivo
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'name, mimeType'
    });

    // Descargar archivo
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    res.setHeader('Content-Type', file.data.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.data.name}"`);
    
    response.data.pipe(res);
  } catch (error: any) {
    console.error('Error descargando archivo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar archivo
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.session.userId || 'default-user';
    const drive = getDriveClient(userId);

    await drive.files.delete({ fileId: fileId });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error eliminando archivo:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 3.6 Servidor Principal (src/server.ts)

```typescript
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import authRoutes from './routes/auth';
import fileRoutes from './routes/files';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
```

## 🔧 Paso 4: Actualizar Frontend

### 4.1 Actualizar Settings.tsx

```typescript
// En components/Settings.tsx

const handleGoogleDriveConnect = () => {
  // Redirigir al backend para iniciar OAuth
  window.location.href = 'http://localhost:5000/api/auth/google';
};

const handleFileStorageToggle = async () => {
  if (!settings.fileStorage.connected) {
    // Conectar con Google Drive
    handleGoogleDriveConnect();
  } else {
    // Desconectar (implementar lógica de desconexión)
    setSettings({
      ...settings,
      fileStorage: {
        ...settings.fileStorage,
        connected: false,
      }
    });
  }
};
```

### 4.2 Crear servicio de archivos (lib/fileService.ts)

```typescript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const uploadFile = async (file: File): Promise<{ url: string; id: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/files/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include' // Para enviar cookies de sesión
  });

  if (!response.ok) {
    throw new Error('Error subiendo archivo');
  }

  return response.json();
};

export const downloadFile = async (fileId: string, fileName: string) => {
  const response = await fetch(`${API_URL}/api/files/${fileId}/download`, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Error descargando archivo');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const deleteFile = async (fileId: string) => {
  const response = await fetch(`${API_URL}/api/files/${fileId}`, {
    method: 'DELETE',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Error eliminando archivo');
  }

  return response.json();
};
```

### 4.3 Actualizar componentes para usar Google Drive

```typescript
// En components/CandidateDetailsModal.tsx o ProcessEditorModal.tsx

import { uploadFile } from '../lib/fileService';

const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    try {
      // Subir a Google Drive
      const { url, id } = await uploadFile(file);
      
      const newAttachment: Attachment = {
        id: id,
        name: file.name,
        url: url,
        type: file.type,
        size: file.size,
      };
      
      // Guardar en el estado/candidato
      const updatedCandidate = { 
        ...editableCandidate, 
        attachments: [...editableCandidate.attachments, newAttachment] 
      };
      setEditableCandidate(updatedCandidate);
      await actions.updateCandidate(updatedCandidate, state.currentUser?.name);
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      alert('Error al subir el archivo. Verifica que Google Drive esté conectado.');
    }
  }
};
```

## 🔒 Consideraciones de Seguridad

1. **Tokens de Refresh**: Guarda los refresh tokens en la base de datos de forma segura
2. **Permisos**: Solo da acceso a la carpeta específica, no a todo Drive
3. **Validación**: Valida tipos y tamaños de archivo en el backend
4. **HTTPS**: Usa HTTPS en producción para proteger los tokens
5. **Rate Limiting**: Implementa límites de subida por usuario

## 📝 Notas Importantes

- **Límites de Google Drive API**: 1,000 requests/100 segundos por usuario
- **Tamaño máximo**: 5TB por archivo (pero limita a 10-50MB para CVs)
- **Carpeta**: Los archivos se guardan en una carpeta "ATS Pro Files" en Drive
- **Tokens**: Los tokens expiran, necesitas refresh tokens para renovarlos automáticamente

## 🚀 Próximos Pasos

1. Configura el proyecto en Google Cloud Console
2. Crea el backend con las rutas mostradas
3. Actualiza el frontend para usar el servicio de archivos
4. Prueba la conexión y subida de archivos
5. Implementa refresh tokens automáticos

¿Quieres que te ayude a implementar alguna parte específica?


