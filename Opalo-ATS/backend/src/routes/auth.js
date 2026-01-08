import express from 'express';
import { google } from 'googleapis';
import { getOrCreateRootFolder } from '../config/googleDrive.js';

const router = express.Router();

// OAuth2 client (se inicializa con las credenciales del .env)
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
);

// Scopes necesarios para Google Drive
const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

// Ruta para iniciar el flujo OAuth
router.get('/google/drive', (req, res) => {
    try {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            return res.status(500).json({ 
                error: 'Google OAuth no configurado',
                message: 'GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET deben estar en .env'
            });
        }

        // Obtener el frontend URL desde el query o usar el default
        const frontendUrl = req.query.frontend_url || process.env.FRONTEND_URL || 'http://localhost:3001';
        
        // Generar URL de autorización
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent', // Forzar consent para obtener refresh_token
            state: frontendUrl, // Pasar el frontend URL en el state
        });

        console.log(`🔗 Redirigiendo a Google OAuth para: ${frontendUrl}`);
        res.redirect(authUrl);
    } catch (error) {
        console.error('Error en /google/drive:', error);
        res.status(500).json({ error: 'Error al iniciar OAuth', message: error.message });
    }
});

// Callback de OAuth
router.get('/google/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        const frontendUrl = state || process.env.FRONTEND_URL || 'http://localhost:3001';

        if (!code) {
            return res.redirect(`${frontendUrl}/settings?error=no_code`);
        }

        // Intercambiar código por tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Obtener información del usuario
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        // Crear o obtener carpeta raíz "Opalo ATS" (por defecto)
        const rootFolderId = await getOrCreateRootFolder(tokens.access_token, req, 'Opalo ATS');
        
        // Obtener nombre de la carpeta raíz
        let rootFolderName = 'Opalo ATS';
        if (rootFolderId) {
            try {
                const drive = google.drive({ version: 'v3', auth: oauth2Client });
                const folderInfo = await drive.files.get({
                    fileId: rootFolderId,
                    fields: 'name'
                });
                rootFolderName = folderInfo.data.name || 'Opalo ATS';
            } catch (e) {
                console.warn('No se pudo obtener nombre de carpeta raíz:', e.message);
            }
        }

        // Construir URL de redirección con los tokens
        const redirectUrl = new URL(`${frontendUrl}/settings`);
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
            redirectUrl.searchParams.set('root_folder_name', rootFolderName);
        }

        console.log(`✅ OAuth completado para: ${userInfo.data.email}`);
        res.redirect(redirectUrl.toString());
    } catch (error) {
        console.error('Error en /google/callback:', error);
        const frontendUrl = req.query.state || process.env.FRONTEND_URL || 'http://localhost:3001';
        res.redirect(`${frontendUrl}/settings?error=oauth_failed&message=${encodeURIComponent(error.message)}`);
    }
});

// Ruta para refrescar token
router.post('/google/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({ error: 'refresh_token requerido' });
        }

        oauth2Client.setCredentials({ refresh_token });
        const { credentials } = await oauth2Client.refreshAccessToken();

        res.json({
            access_token: credentials.access_token,
            expires_in: credentials.expiry_date ? Math.floor((credentials.expiry_date - Date.now()) / 1000) : null,
        });
    } catch (error) {
        console.error('Error refrescando token:', error);
        res.status(500).json({ error: 'Error al refrescar token', message: error.message });
    }
});

export default router;

