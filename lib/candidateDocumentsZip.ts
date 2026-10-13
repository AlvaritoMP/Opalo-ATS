import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { BulkDocumentTemplate, CustomColumn, GoogleDriveConfig, Process } from '../types';
import type { BulkCandidate } from './api/bulkCandidates';
import { generateBulkDocument } from './bulkDocumentData';
import { googleDriveService, type GoogleDriveFile } from './googleDrive';
import { supabase } from './supabase';
import { APP_NAME } from './appConfig';
import { isMissingColumnError } from './supabaseColumnErrors';

export interface CandidatesDocumentsZipResult {
    fileCount: number;
    failureCount: number;
    candidatesWithFiles: number;
}

interface AttachmentRow {
    candidate_id: string;
    name: string | null;
    url: string | null;
    type: string | null;
}

function safeZipSegment(name: string): string {
    const cleaned = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/\.+$/g, '').trim();
    return (cleaned || 'archivo').slice(0, 120);
}

function allocatePath(used: Set<string>, path: string): string {
    const normalized = path.split('/').filter(Boolean).map(safeZipSegment).join('/');
    if (!used.has(normalized.toLowerCase())) {
        used.add(normalized.toLowerCase());
        return normalized;
    }
    const slash = normalized.lastIndexOf('/');
    const dir = slash >= 0 ? normalized.slice(0, slash + 1) : '';
    const file = slash >= 0 ? normalized.slice(slash + 1) : normalized;
    const dot = file.lastIndexOf('.');
    const stem = dot > 0 ? file.slice(0, dot) : file;
    const ext = dot > 0 ? file.slice(dot) : '';
    let n = 2;
    let next = `${dir}${stem} (${n})${ext}`;
    while (used.has(next.toLowerCase())) {
        n += 1;
        next = `${dir}${stem} (${n})${ext}`;
    }
    used.add(next.toLowerCase());
    return next;
}

function withDownloadedName(relativePath: string, downloadedName: string): string {
    const fileName = downloadedName.split('/').pop() || downloadedName;
    const slash = relativePath.lastIndexOf('/');
    if (slash < 0) return fileName;
    return `${relativePath.slice(0, slash + 1)}${fileName}`;
}

function extractDriveFileId(url: string | null | undefined): string | null {
    if (!url) return null;
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /[?&]id=([a-zA-Z0-9_-]+)/,
        /\/document\/d\/([a-zA-Z0-9_-]+)/,
        /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
        /\/presentation\/d\/([a-zA-Z0-9_-]+)/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match?.[1]) return match[1];
    }
    return null;
}

function dataUrlToBytes(dataUrl: string): Uint8Array | null {
    const comma = dataUrl.indexOf(',');
    if (comma < 0) return null;
    const header = dataUrl.slice(0, comma);
    const payload = dataUrl.slice(comma + 1);
    try {
        if (/;base64/i.test(header)) {
            const binary = atob(payload);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return bytes;
        }
        return new TextEncoder().encode(decodeURIComponent(payload));
    } catch {
        return null;
    }
}

async function loadAttachmentRows(ids: string[]): Promise<AttachmentRow[]> {
    const out: AttachmentRow[] = [];
    for (let offset = 0; offset < ids.length; offset += 100) {
        const chunk = ids.slice(offset, offset + 100);
        const { data, error } = await supabase
            .from('attachments')
            .select('candidate_id, name, url, type')
            .in('candidate_id', chunk)
            .is('comment_id', null);
        if (error) throw error;
        out.push(...((data || []) as AttachmentRow[]));
    }
    return out;
}

async function loadFolderIds(ids: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for (let offset = 0; offset < ids.length; offset += 100) {
        const chunk = ids.slice(offset, offset + 100);
        const { data, error } = await supabase
            .from('candidates')
            .select('id, google_drive_folder_id')
            .in('id', chunk)
            .eq('app_name', APP_NAME);
        if (error) {
            if (isMissingColumnError(error)) return map;
            throw error;
        }
        for (const row of data || []) {
            const folderId = row.google_drive_folder_id as string | null;
            if (folderId) map.set(row.id as string, folderId);
        }
    }
    return map;
}

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
    if (items.length === 0) return;
    let cursor = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (cursor < items.length) {
            const item = items[cursor];
            cursor += 1;
            await fn(item);
        }
    });
    await Promise.all(workers);
}

/**
 * Arma un ZIP con los archivos de los candidatos seleccionados:
 * adjuntos, archivos de su carpeta de Google Drive y documentos generados por plantilla.
 */
export async function downloadCandidatesDocumentsZip(args: {
    candidates: BulkCandidate[];
    process?: Process;
    processTitle: string;
    googleDriveConfig?: GoogleDriveConfig;
    templates: BulkDocumentTemplate[];
    companyName: string;
    customColumns: CustomColumn[];
    getColumnValue: (candidateId: string, columnId: string, candidate?: BulkCandidate) => unknown;
}): Promise<CandidatesDocumentsZipResult> {
    const ids = args.candidates.map(c => c.id);
    const [attachments, folderIds] = await Promise.all([
        loadAttachmentRows(ids),
        loadFolderIds(ids),
    ]);

    const attachmentsByCandidate = new Map<string, AttachmentRow[]>();
    for (const row of attachments) {
        const list = attachmentsByCandidate.get(row.candidate_id) || [];
        list.push(row);
        attachmentsByCandidate.set(row.candidate_id, list);
    }

    const failures: string[] = [];
    let driveReady = false;
    if (args.googleDriveConfig?.connected && args.googleDriveConfig.accessToken) {
        try {
            await googleDriveService.initialize(args.googleDriveConfig);
            driveReady = true;
        } catch (error) {
            console.error('Google Drive no disponible para el ZIP:', error);
            failures.push('Google Drive no estuvo disponible. Los enlaces de Drive no se pudieron descargar.');
            driveReady = false;
        }
    }

    const zip = new JSZip();
    const usedRoot = new Set<string>();
    let fileCount = 0;
    let candidatesWithFiles = 0;

    for (const candidate of args.candidates) {
        const usedPaths = new Set<string>();
        const seenDriveIds = new Set<string>();
        let folderLabel: string | null = null;
        let added = 0;

        const addFile = (relativePath: string, data: Blob | Uint8Array | ArrayBuffer) => {
            if (!folderLabel) folderLabel = allocatePath(usedRoot, candidate.name || candidate.id);
            const path = allocatePath(usedPaths, `${folderLabel}/${relativePath}`);
            zip.file(path, data);
            added += 1;
            fileCount += 1;
        };

        const noteFailure = (label: string) => {
            failures.push(`${candidate.name || 'Candidato'}: ${label}`);
        };

        if (driveReady && args.process?.googleDriveFolderId) {
            try {
                const folder = await googleDriveService.findCandidateFolder(
                    candidate.name || '',
                    args.process.googleDriveFolderId,
                    folderIds.get(candidate.id)
                );
                if (folder) {
                    const driveFiles = await googleDriveService.listFilesRecursive(folder.id);
                    await mapPool(driveFiles, 3, async (file: GoogleDriveFile & { relativePath: string }) => {
                        try {
                            const downloaded = await googleDriveService.downloadFileContent(file);
                            seenDriveIds.add(file.id);
                            addFile(withDownloadedName(file.relativePath, downloaded.fileName), downloaded.blob);
                        } catch (error) {
                            console.error('Error descargando archivo de Drive:', error);
                            noteFailure(file.relativePath || file.name);
                        }
                    });
                }
            } catch (error) {
                console.error('Error listando carpeta de Drive:', error);
                noteFailure('no se pudo leer su carpeta de Google Drive');
            }
        }

        const candidateAttachments = attachmentsByCandidate.get(candidate.id) || [];
        for (const attachment of candidateAttachments) {
            const name = attachment.name || 'documento';
            const url = attachment.url?.trim();
            if (!url) continue;
            const driveId = extractDriveFileId(url);
            if (driveId && seenDriveIds.has(driveId)) continue;

            try {
                if (url.startsWith('data:')) {
                    const bytes = dataUrlToBytes(url);
                    if (!bytes) throw new Error('data url inválida');
                    addFile(name, bytes);
                    continue;
                }
                if (driveId) {
                    if (!driveReady) {
                        noteFailure(`${name} (requiere Google Drive conectado)`);
                        continue;
                    }
                    const downloaded = await googleDriveService.downloadFileContent({
                        id: driveId,
                        name,
                        mimeType: attachment.type || 'application/octet-stream',
                    });
                    seenDriveIds.add(driveId);
                    addFile(downloaded.fileName || name, downloaded.blob);
                    continue;
                }
                if (/^https?:\/\//i.test(url)) {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    addFile(name, await response.blob());
                }
            } catch (error) {
                console.error('Error agregando adjunto al ZIP:', error);
                noteFailure(name);
            }
        }

        for (const template of args.templates) {
            try {
                const generated = await generateBulkDocument(template, {
                    candidate,
                    process: args.process,
                    companyName: args.companyName,
                    customColumns: args.customColumns,
                    getColumnValue: args.getColumnValue,
                });
                addFile(`Documentos generados/${generated.fileName}`, generated.blob);
            } catch (error) {
                console.error('Error generando documento de plantilla:', error);
                noteFailure(template.name);
            }
        }

        if (added > 0) candidatesWithFiles += 1;
    }

    if (fileCount === 0) {
        return { fileCount: 0, failureCount: failures.length, candidatesWithFiles: 0 };
    }

    if (failures.length > 0) {
        const lines = [
            'Estos archivos no se pudieron incluir en el ZIP:',
            '',
            ...failures.slice(0, 80),
        ];
        if (failures.length > 80) lines.push(`… y ${failures.length - 80} más`);
        zip.file('avisos.txt', lines.join('\n'));
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const safeTitle = safeZipSegment(args.processTitle).replace(/\s+/g, '_') || 'proceso';
    saveAs(blob, `${safeTitle}_documentos.zip`);

    return { fileCount, failureCount: failures.length, candidatesWithFiles };
}
