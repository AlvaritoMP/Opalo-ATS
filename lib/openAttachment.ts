/**
 * Abre o descarga un adjunto. Chrome bloquea la navegación de nivel superior
 * a URLs `data:`, así que esos archivos se convierten a Blob antes de abrirlos.
 */

export type OpenableAttachment = {
    name?: string;
    url?: string | null;
    type?: string;
};

export type OpenAttachmentMode = 'view' | 'download';

function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
    const comma = dataUrl.indexOf(',');
    if (comma < 0) return null;

    const header = dataUrl.slice(0, comma);
    const payload = dataUrl.slice(comma + 1);
    const mime = header.match(/^data:([^;,]+)/i)?.[1] || 'application/octet-stream';
    const isBase64 = /;base64/i.test(header);

    try {
        if (isBase64) {
            const binary = atob(payload);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return { mime, bytes };
        }
        return { mime, bytes: new TextEncoder().encode(decodeURIComponent(payload)) };
    } catch {
        return null;
    }
}

function isPreviewable(mime: string, name?: string): boolean {
    if (mime.startsWith('image/')) return true;
    if (mime === 'application/pdf' || mime === 'text/plain') return true;
    const lower = (name || '').toLowerCase();
    return lower.endsWith('.pdf') || lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp');
}

function triggerDownload(objectUrl: string, filename: string) {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename || 'documento';
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
}

function openHttpUrl(url: string): boolean {
    try {
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (win) return true;
    } catch {
        /* ignore */
    }

    try {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        return true;
    } catch {
        return false;
    }
}

/**
 * Abre el adjunto en una pestaña (PDF/imagen) o lo descarga (Word, Excel, etc.).
 * Devuelve false si no hay URL o no se pudo abrir.
 */
export function openAttachment(
    attachment: OpenableAttachment,
    mode: OpenAttachmentMode = 'view'
): boolean {
    try {
        const url = attachment.url?.trim();
        if (!url) return false;

        if (url.startsWith('data:')) {
            const parsed = parseDataUrl(url);
            if (!parsed) return false;

            const mime = parsed.mime || attachment.type || 'application/octet-stream';
            const blob = new Blob([parsed.bytes.slice()], { type: mime });
            const objectUrl = URL.createObjectURL(blob);
            const filename = attachment.name || 'documento';
            const shouldPreview = mode === 'view' && isPreviewable(blob.type, filename);

            if (shouldPreview) {
                const win = window.open(objectUrl, '_blank');
                if (!win) triggerDownload(objectUrl, filename);
            } else {
                triggerDownload(objectUrl, filename);
            }
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
            return true;
        }

        if (mode === 'download' && !/drive\.google\.com/i.test(url)) {
            triggerDownload(url, attachment.name || 'documento');
            return true;
        }

        return openHttpUrl(url);
    } catch (error) {
        console.error('Error abriendo documento:', error);
        return false;
    }
}
