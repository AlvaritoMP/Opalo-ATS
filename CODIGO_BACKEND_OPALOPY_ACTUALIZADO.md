# 📝 Código Completo para Actualizar Backend de Opalopy

## 🎯 Archivos a Modificar

Estos son los cambios exactos que necesitas hacer en el backend de Opalopy.

---

## 1. `backend/src/server.js` - Actualizar CORS

**Reemplaza la sección de CORS** con este código:

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

## 2. `backend/src/config/googleDrive.js` - Actualizar Función

**Reemplaza la función `getOrCreateRootFolder`** con este código:

```javascript
import { google } from 'googleapis';

/**
 * Obtener o crear la carpeta raíz en Google Drive
 * @param {string} accessToken - Token de acceso de Google
 * @param {object} req - Request object (opcional, para logging)
 * @param {string} folderName - Nombre de la carpeta raíz (default: 'ATS Pro')
 * @returns {Promise<string|null>} - ID de la carpeta raíz o null si hay error
 */
export const getOrCreateRootFolder = async (accessToken, req = null, folderName = 'ATS Pro') => {
    try {
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });
        
        const drive = google.drive({ version: 'v3', auth });

        // Buscar carpeta existente con el nombre exacto (escapar comillas simples en el nombre)
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

---

## 3. `backend/src/routes/auth.js` - Actualizar Callback

**Reemplaza la función del callback** con este código:

```javascript
// Callback de OAuth
router.get('/google/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        const frontendUrl = state || process.env.FRONTEND_URL || 'http://localhost:3000';

        if (!code) {
            return res.redirect(`${frontendUrl}/google-drive-callback.html?error=no_code&message=No se recibió código de autorización`);
        }

        // Crear OAuth2 client (lee las variables de entorno en este momento)
        const oauth2Client = getOAuth2Client();

        // Intercambiar código por tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Obtener información del usuario
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        // Detectar qué app está haciendo la petición basándose en el frontend URL
        let rootFolderName = 'ATS Pro'; // Por defecto para Opalopy
        if (frontendUrl.includes('opalo-ats') || frontendUrl.includes('3001') || frontendUrl === process.env.FRONTEND_URL_OPALO_ATS) {
            rootFolderName = 'Opalo ATS';
        } else if (frontendUrl.includes('opalopy') || frontendUrl.includes('3000') || frontendUrl === process.env.FRONTEND_URL_OPALOPY) {
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
        // Usar google-drive-callback.html en lugar de /settings
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

**Nota**: También necesitas actualizar la función `getOAuth2Client()` si no existe. Ver el archivo completo en `Opalo-ATS/backend/src/routes/auth.js`.

---

## 4. `backend/.env` - Agregar Variables

**Agrega estas variables** al archivo `.env` del backend de Opalopy:

```env
# URLs de frontends (para CORS y detección de app)
FRONTEND_URL=https://url-de-opalopy.com
FRONTEND_URL_OPALOPY=https://url-de-opalopy.com
FRONTEND_URL_OPALO_ATS=https://url-de-opalo-ats.com
```

**Reemplaza**:
- `https://url-de-opalopy.com` → URL real de Opalopy en producción
- `https://url-de-opalo-ats.com` → URL real de Opalo ATS en producción

---

## 5. Copiar `google-drive-callback.html` (Opcional)

Si el frontend de Opalopy no tiene este archivo, cópialo desde `Opalo-ATS/public/google-drive-callback.html` al `public/` del frontend de Opalopy.

**Opcional**: Si Opalopy ya tiene su propio manejo de callback, puedes mantenerlo, pero asegúrate de que redirija correctamente.

---

## ✅ Pasos para Aplicar

1. **Hacer backup** del backend de Opalopy (por si acaso)
2. **Actualizar los archivos** según el código de arriba
3. **Actualizar `.env`** con las nuevas variables
4. **Reiniciar el backend** de Opalopy
5. **Probar Opalopy** (debe seguir funcionando)
6. **Probar Opalo ATS** (debe funcionar con Google Drive)

---

## 🔍 Verificación

### Verificar CORS

1. Intenta conectar Google Drive desde Opalo ATS
2. No debería haber errores de CORS
3. El backend debería aceptar la petición

### Verificar Carpetas

1. **Opalopy**: Debe crear/usar carpeta "ATS Pro"
2. **Opalo ATS**: Debe crear/usar carpeta "Opalo ATS"
3. Ambas deben funcionar independientemente

---

## 🐛 Troubleshooting

### Error: "CORS bloqueado"

**Solución**: Verifica que `FRONTEND_URL_OPALO_ATS` esté en las variables de entorno y en `allowedOrigins`.

### Opalo ATS crea carpeta "ATS Pro" en lugar de "Opalo ATS"

**Solución**: Verifica la lógica de detección de app en el callback. Asegúrate de que detecte correctamente la URL de Opalo ATS.

### Opalopy deja de funcionar

**Solución**: Verifica que el valor por defecto de `folderName` sea `'ATS Pro'` y que `FRONTEND_URL` apunte a Opalopy.

---

## 📝 Resumen

**Cambios mínimos necesarios**:
1. ✅ CORS para múltiples orígenes
2. ✅ Detección de app en callback
3. ✅ Crear carpeta correcta según la app
4. ✅ Variables de entorno actualizadas

**No necesitas**:
- ❌ Crear otro backend
- ❌ Cambiar credenciales de Google OAuth
- ❌ Modificar la base de datos

