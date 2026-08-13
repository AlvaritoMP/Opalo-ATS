/** Límite alineado al patrón de adjuntos en base64 (FILE_STORAGE / Drive ~10 MB). */
export const CV_PDF_MAX_BYTES = 10 * 1024 * 1024;
export const CV_PDF_WARN_BYTES = 5 * 1024 * 1024;

export const SCAN_PDF_MESSAGE =
    'Este PDF no tiene texto seleccionable; no se puede leer sin OCR.';

export function isPdfFile(file: File): boolean {
    const type = (file.type || '').toLowerCase();
    if (type === 'application/pdf' || type === 'application/x-pdf') return true;
    return file.name.toLowerCase().endsWith('.pdf');
}

export function validateCvPdfFile(file: File): { ok: boolean; error?: string; oversized?: boolean } {
    if (!isPdfFile(file)) {
        return { ok: false, error: 'Solo se aceptan archivos PDF.' };
    }
    if (file.size > CV_PDF_MAX_BYTES) {
        return {
            ok: false,
            error: `El archivo es muy grande (${(file.size / (1024 * 1024)).toFixed(1)} MB). El máximo es 10 MB.`,
            oversized: true,
        };
    }
    return { ok: true };
}

export function isExtractedTextUsable(text: string): boolean {
    const chars = text.match(/[a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ]/g) || [];
    return chars.length >= 8;
}

type PdfTextItem = { str: string; hasEOL?: boolean };

function isPdfTextItem(item: unknown): item is PdfTextItem {
    return typeof item === 'object' && item !== null && 'str' in item && typeof (item as PdfTextItem).str === 'string';
}

/**
 * Extrae texto seleccionable de un PDF en el cliente (pdf.js).
 * No hace OCR: un escaneado/imagen queda vacío.
 * pdf.js se carga bajo demanda para no inflar el bundle inicial.
 */
export async function extractPdfText(file: File): Promise<string> {
    const [{ getDocument, GlobalWorkerOptions }, workerMod] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    GlobalWorkerOptions.workerSrc = workerMod.default;

    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const loadingTask = getDocument({ data, useSystemFonts: true });
    const pdf = await loadingTask.promise;
    try {
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const parts: string[] = [];
            for (const item of content.items) {
                if (!isPdfTextItem(item) || !item.str) continue;
                parts.push(item.str);
                if (item.hasEOL) parts.push('\n');
                else parts.push(' ');
            }
            pages.push(parts.join('').replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim());
        }
        return pages.join('\n\n').trim();
    } finally {
        await pdf.destroy();
    }
}
