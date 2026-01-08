# 🔧 Actualizar Backend de Opalopy para Soportar Opalo ATS

## 🎯 Objetivo

Actualizar el backend de Opalopy para que pueda servir a **ambas apps**:
- ✅ Opalopy (frontend existente)
- ✅ Opalo ATS (nuevo frontend)

---

## 📋 Cambios Necesarios en el Backend de Opalopy

### 1. Actualizar CORS para Múltiples Orígenes

**Archivo**: `backend/src/server.js` (o donde esté el servidor de Opalopy)

**Cambio necesario**: Agregar el origen de Opalo ATS a la lista de orígenes permitidos.

**Código actual** (probablemente):
```javascript
app.use(cors({
    origin: 'http://localhost:3000', // Solo Opalopy
    credentials: true,
}));
```

**Código actualizado**:
```javascript
// Permitir múltiples orígenes para que el mismo backend sirva a Opalopy y Opalo ATS
const allowedOrigins = [
    'http://localhost:3000',  // Opalopy desarrollo
    'http://localhost:3001',  // Opalo ATS desarrollo
    'http://localhost:5173',  // Vite por defecto
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_OPALOPY,
    process.env.FRONTEND_URL_OPALO_ATS,
].filter(Boolean); // Eliminar valores undefined/null

// Middleware CORS
app.use(cors({
    origin: (origin, callback) => {
        // Permitir requests sin origin (Postman, curl, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`⚠️  CORS bloqueado para origen: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
```

---

### 2. Actualizar Función de Crear Carpeta Raíz

**Archivo**: `backend/src/config/googleDrive.js` (o donde esté la función)

**Cambio necesario**: Asegurar que la función acepte el nombre de carpeta como parámetro.

**Código actualizado**:
```javascript
export const getOrCreateRootFolder = async (accessToken, req = null, folderName = 'ATS Pro') => {
    try {
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });
        
        const drive = google.drive({ version: 'v3', auth });

        // Buscar carpeta existente con el nombre exacto (escapar comillas simples)
        const escapedFolderName = folderName.replace(/'/g, "\\'");
        const searchQuery = `name='${escapedFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`;
        
        const searchResponse = await drive.files.list({
            q: searchQuery,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        if (searchResponse.data.files && searchResponse.data.files.length > 0) {
            // Verificar que el nombre coincida exactamente (case-sensitive)
            const exactMatch = searchResponse.data.files.find(f => f.name === folderName);
            if (exactMatch) {
                const folderId = exactMatch.id;
                if (req) {
                    console.log(`📁 Carpeta raíz "${folderName}" encontrada: ${folderId}`);
                }
                return folderId;
            }
        }

        // Crear carpeta si no existe
        const createResponse = await drive.files.create({
            requestBody: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
            },
            fields: 'id, name',
        });

        const newFolderId = createResponse.data.id;
        if (req) {
            console.log(`✅ Carpeta raíz "${folderName}" creada: ${newFolderId}`);
        }
        return newFolderId;
    } catch (error) {
        console.error('Error obteniendo/creando carpeta raíz:', error);
        return null;
    }
};
```

**Nota**: El parámetro `folderName` debe tener un valor por defecto de `'ATS Pro'` para mantener compatibilidad con Opalopy.

---

### 3. Actualizar Callback de OAuth para Detectar la App

**Archivo**: `backend/src/routes/auth.js` (o donde esté el callback)

**Cambio necesario**: Detectar qué app está haciendo la petición y crear la carpeta correspondiente.

**Código actualizado** (en la función del callback):
```javascript
router.get('/google/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        const frontendUrl = state || process.env.FRONTEND_URL || 'http://localhost:3000';

        if (!code) {
            return res.redirect(`${frontendUrl}/google-drive-callback.html?error=no_code&message=No se recibió código de autorización`);
        }

        // Crear OAuth2 client
        const oauth2Client = getOAuth2Client();

        // Intercambiar código por tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Obtener información del usuario
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        // Detectar qué app está haciendo la petición basándose en el frontend URL
        let rootFolderName = 'ATS Pro'; // Por defecto para Opalopy
        if (frontendUrl.includes('opalo-ats') || frontendUrl.includes('3001')) {
            rootFolderName = 'Opalo ATS';
        } else if (frontendUrl.includes('opalopy') || frontendUrl.includes('3000')) {
            rootFolderName = 'ATS Pro';
        }

        // Crear o obtener carpeta raíz
        const rootFolderId = await getOrCreateRootFolder(tokens.access_token, req, rootFolderName);
        
        // Obtener nombre de la carpeta raíz
        let actualRootFolderName = rootFolderName;
        if (rootFolderId) {
            try {
                const drive = google.drive({ version: 'v3', auth: oauth2Client });
                const folderInfo = await drive.files.get({
                    fileId: rootFolderId,
                    fields: 'name'
                });
                actualRootFolderName = folderInfo.data.name || rootFolderName;
            } catch (e) {
                console.warn('No se pudo obtener nombre de carpeta raíz:', e.message);
            }
        }

        // Construir URL de redirección con los tokens
        const redirectUrl = new URL(`${frontendUrl}/google-drive-callback.html`);
        redirectUrl.searchParams.set('drive_connected', 'true');
        redirectUrl.searchParams.set('access_token', tokens.access_token);
        if (tokens.refresh_token) {
            redirectUrl.searchParams.set('refresh_token', tokens.refresh_token);
        }
        if (tokens.expiry_date) {
            redirectUrl.searchParams.set('expires_in', Math.floor((tokens.expiry_date - Date.now()) / 1000).toString());
        }
        redirectUrl.searchParams.set('user_email', userInfo.data.email || '');
        redirectUrl.searchParams.set('user_name', userInfo.data.name || '');
        if (rootFolderId) {
            redirectUrl.searchParams.set('root_folder_id', rootFolderId);
            redirectUrl.searchParams.set('root_folder_name', actualRootFolderName);
        }

        console.log(`✅ OAuth completado para: ${userInfo.data.email} (App: ${rootFolderName})`);
        res.redirect(redirectUrl.toString());
    } catch (error) {
        console.error('Error en /google/callback:', error);
        const frontendUrl = req.query.state || process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/google-drive-callback.html?error=oauth_failed&message=${encodeURIComponent(error.message)}`);
    }
});
```

---

### 4. Actualizar Variables de Entorno

**Archivo**: `.env` del backend de Opalopy

**Agregar estas variables**:
```env
# URLs de frontends (para CORS y detección de app)
FRONTEND_URL_OPALOPY=https://url-de-opalopy.com
FRONTEND_URL_OPALO_ATS=https://url-de-opalo-ats.com
```

O si prefieres usar una sola variable:
```env
FRONTEND_URL=https://url-de-opalopy.com
FRONTEND_URL_OPALOPY=https://url-de-opalopy.com
FRONTEND_URL_OPALO_ATS=https://url-de-opalo-ats.com
```

---

## 📋 Resumen de Archivos a Modificar

1. **`backend/src/server.js`**:
   - ✅ Actualizar CORS para múltiples orígenes

2. **`backend/src/config/googleDrive.js`**:
   - ✅ Actualizar `getOrCreateRootFolder` para búsqueda exacta

3. **`backend/src/routes/auth.js`**:
   - ✅ Actualizar callback para detectar app y crear carpeta correcta
   - ✅ Redirigir a `google-drive-callback.html` en lugar de `/settings`

4. **`backend/.env`**:
   - ✅ Agregar `FRONTEND_URL_OPALO_ATS`

---

## 🔄 Opción Alternativa: Copiar Código del Nuevo Backend

Si prefieres, puedes **copiar directamente** los archivos del backend de Opalo ATS:

1. **Copiar `Opalo-ATS/backend/src/server.js`** → Backend de Opalopy
   - Ajustar el valor por defecto de `FRONTEND_URL` si es necesario

2. **Copiar `Opalo-ATS/backend/src/routes/auth.js`** → Backend de Opalopy
   - Ajustar la lógica de detección de app si es necesario

3. **Copiar `Opalo-ATS/backend/src/config/googleDrive.js`** → Backend de Opalopy
   - Ajustar el valor por defecto de `folderName` a `'ATS Pro'`

---

## ✅ Verificación

Después de hacer los cambios:

1. **Reiniciar el backend de Opalopy**
2. **Verificar que Opalopy sigue funcionando** (debe crear/usar carpeta "ATS Pro")
3. **Probar Opalo ATS** (debe crear/usar carpeta "Opalo ATS")

---

## 🎯 Lógica de Detección de App

El backend detecta qué app está haciendo la petición basándose en:

1. **URL del frontend** (del parámetro `state` o `FRONTEND_URL`)
2. **Si contiene "opalo-ats" o puerto 3001** → Carpeta "Opalo ATS"
3. **Si contiene "opalopy" o puerto 3000** → Carpeta "ATS Pro"
4. **Por defecto** → Carpeta "ATS Pro" (para mantener compatibilidad)

---

## 📝 Notas Importantes

1. **No rompe Opalopy**: Los cambios son compatibles hacia atrás
2. **Mismo backend**: Un solo backend sirve a ambas apps
3. **Carpetas separadas**: Cada app tiene su propia carpeta en Google Drive
4. **Mismas credenciales**: Ambas apps usan las mismas credenciales de Google OAuth

---

## ✅ Checklist

- [ ] CORS actualizado para múltiples orígenes
- [ ] `getOrCreateRootFolder` actualizado con búsqueda exacta
- [ ] Callback de OAuth actualizado para detectar app
- [ ] Variables de entorno actualizadas
- [ ] Backend reiniciado
- [ ] Opalopy sigue funcionando
- [ ] Opalo ATS funciona correctamente

