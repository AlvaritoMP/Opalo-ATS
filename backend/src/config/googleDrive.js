import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// Crear cliente OAuth2
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Scopes necesarios para Google Drive
const SCOPES = [
    'https://www.googleapis.com/auth/drive.file', // Crear y editar archivos
    'https://www.googleapis.com/auth/drive.metadata.readonly', // Leer metadatos
    'https://www.googleapis.com/auth/userinfo.email', // Obtener email del usuario
    'https://www.googleapis.com/auth/userinfo.profile', // Obtener perfil del usuario
];

/**
 * Genera la URL de autenticación de Google
 */
export const getAuthUrl = () => {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline', // Necesario para obtener refresh token
        scope: SCOPES,
        prompt: 'consent', // Fuerza a pedir permisos para obtener refresh token
    });
};

/**
 * Intercambia el código de autorización por tokens
 */
export const getTokensFromCode = async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        return tokens;
    } catch (error) {
        console.error('Error obteniendo tokens:', error);
        throw error;
    }
};

/**
 * Refresca el access token usando el refresh token
 */
export const refreshAccessToken = async (refreshToken) => {
    try {
        oauth2Client.setCredentials({
            refresh_token: refreshToken,
        });
        const { credentials } = await oauth2Client.refreshAccessToken();
        return credentials;
    } catch (error) {
        console.error('Error refrescando token:', error);
        throw error;
    }
};

/**
 * Obtiene información del usuario desde Google
 */
export const getUserInfo = async (accessToken) => {
    try {
        oauth2Client.setCredentials({
            access_token: accessToken,
        });
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data } = await oauth2.userinfo.get();
        return {
            email: data.email,
            name: data.name || data.email,
            picture: data.picture,
        };
    } catch (error) {
        console.error('Error obteniendo información del usuario:', error);
        throw error;
    }
};

/**
 * Crea o obtiene la carpeta raíz "ATS Pro" en Google Drive
 */
export const getOrCreateRootFolder = async (accessToken) => {
    try {
        oauth2Client.setCredentials({
            access_token: accessToken,
        });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // Buscar carpeta existente
        const response = await drive.files.list({
            q: "name='ATS Pro' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: 'files(id, name)',
        });

        if (response.data.files && response.data.files.length > 0) {
            return response.data.files[0].id;
        }

        // Crear carpeta si no existe
        const folder = await drive.files.create({
            requestBody: {
                name: 'ATS Pro',
                mimeType: 'application/vnd.google-apps.folder',
            },
            fields: 'id',
        });

        return folder.data.id;
    } catch (error) {
        console.error('Error creando/obteniendo carpeta raíz:', error);
        throw error;
    }
};

export { oauth2Client };

