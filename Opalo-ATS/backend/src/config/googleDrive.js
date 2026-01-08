import { google } from 'googleapis';

/**
 * Obtener o crear la carpeta raíz en Google Drive
 * @param {string} accessToken - Token de acceso de Google
 * @param {object} req - Request object (opcional, para logging)
 * @param {string} folderName - Nombre de la carpeta raíz (default: 'Opalo ATS')
 * @returns {Promise<string|null>} - ID de la carpeta raíz o null si hay error
 */
export const getOrCreateRootFolder = async (accessToken, req = null, folderName = 'Opalo ATS') => {
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

