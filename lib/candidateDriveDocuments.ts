import type { Attachment, GoogleDriveConfig, Process } from '../types';
import { googleDriveService } from './googleDrive';
import { processesApi } from './api/processes';

export function driveFolderUrl(folderId: string): string {
    return `https://drive.google.com/drive/folders/${folderId}`;
}

export function isGoogleDriveReady(config?: GoogleDriveConfig): boolean {
    return !!(config?.connected && config.accessToken);
}

/**
 * Garantiza la carpeta del proceso en Drive. Si no existía, la crea y la guarda en el proceso.
 */
export async function ensureProcessDriveFolder(
    process: Pick<Process, 'id' | 'title' | 'googleDriveFolderId' | 'googleDriveFolderName'>,
    config: GoogleDriveConfig
): Promise<{ folderId: string; folderName: string; created: boolean }> {
    await googleDriveService.initialize(config);
    if (process.googleDriveFolderId) {
        return {
            folderId: process.googleDriveFolderId,
            folderName: process.googleDriveFolderName || process.title || 'Proceso',
            created: false,
        };
    }

    const folder = await googleDriveService.createFolder(
        process.title || `Proceso ${Date.now()}`,
        config.rootFolderId
    );
    await processesApi.update(process.id, {
        googleDriveFolderId: folder.id,
        googleDriveFolderName: folder.name,
    });
    return { folderId: folder.id, folderName: folder.name, created: true };
}

/**
 * Sube un archivo a la carpeta del candidato, dentro de la carpeta del proceso.
 * No reutiliza carpetas de otros homónimos cuando el candidato aún no tiene carpeta propia.
 */
export async function storeFileInCandidateDriveFolder(opts: {
    process: Pick<Process, 'id' | 'title' | 'googleDriveFolderId' | 'googleDriveFolderName'>;
    config: GoogleDriveConfig;
    candidateName: string;
    existingFolderId?: string;
    file: File;
    categoryId?: string;
}): Promise<{
    attachment: Attachment;
    folderId: string;
    folderName: string;
    processFolderId: string;
    processFolderName: string;
    processFolderCreated: boolean;
}> {
    const processFolder = await ensureProcessDriveFolder(opts.process, opts.config);
    const folder = await googleDriveService.getOrCreateCandidateFolder(
        opts.candidateName || `Candidato_${Date.now()}`,
        processFolder.folderId,
        opts.existingFolderId,
        opts.existingFolderId ? undefined : { exactOnly: true }
    );

    const existingFile = await googleDriveService.findFileInFolder(opts.file.name, folder.id);
    const uploaded = existingFile
        ? existingFile
        : await googleDriveService.uploadFile(opts.file, folder.id, opts.file.name);

    const url = uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`;

    return {
        attachment: {
            id: crypto.randomUUID(),
            name: opts.file.name,
            url,
            type: opts.file.type || 'application/octet-stream',
            size: opts.file.size,
            category: opts.categoryId,
            uploadedAt: new Date().toISOString(),
        },
        folderId: folder.id,
        folderName: folder.name,
        processFolderId: processFolder.folderId,
        processFolderName: processFolder.folderName,
        processFolderCreated: processFolder.created,
    };
}
