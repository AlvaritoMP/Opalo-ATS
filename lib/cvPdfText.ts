/** Límite alineado al patrón de adjuntos en base64 (FILE_STORAGE / Drive ~10 MB). */
export const CV_PDF_MAX_BYTES = 10 * 1024 * 1024;
export const CV_PDF_WARN_BYTES = 5 * 1024 * 1024;

export const SCAN_PDF_MESSAGE =
    'Este PDF no tiene texto seleccionable; no se puede leer sin OCR.';

export type ExtractedPdfContent = {
    /** Texto completo (todas las páginas) para buscar email/teléfono/DNI en cualquier parte. */
    text: string;
    /** Líneas en orden visual (arriba → abajo) para inferir el nombre. */
    visualLines: string[];
};

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

type PdfTextItem = {
    str: string;
    hasEOL?: boolean;
    transform?: number[];
    width?: number;
    height?: number;
};

function isPdfTextItem(item: unknown): item is PdfTextItem {
    return typeof item === 'object' && item !== null && 'str' in item && typeof (item as PdfTextItem).str === 'string';
}

type PositionedItem = { str: string; x: number; y: number; w: number; h: number };

function itemsToVisualLines(items: PositionedItem[]): string[] {
    if (items.length === 0) return [];
    const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: PositionedItem[][] = [];
    let current: PositionedItem[] = [];
    let lineY = sorted[0].y;
    let lineH = sorted[0].h || 10;

    for (const item of sorted) {
        const threshold = Math.max(3, 0.45 * Math.max(lineH, item.h || 10));
        if (current.length > 0 && Math.abs(item.y - lineY) > threshold) {
            lines.push(current);
            current = [item];
            lineY = item.y;
            lineH = item.h || 10;
        } else {
            current.push(item);
            lineY = (lineY * (current.length - 1) + item.y) / current.length;
            lineH = Math.max(lineH, item.h || 10);
        }
    }
    if (current.length) lines.push(current);

    return lines
        .map(lineItems => {
            const ordered = [...lineItems].sort((a, b) => a.x - b.x);
            let out = '';
            let prev: PositionedItem | undefined;
            for (const it of ordered) {
                const piece = it.str;
                if (!piece) continue;
                if (!prev) {
                    out = piece;
                    prev = it;
                    continue;
                }
                const gap = it.x - (prev.x + prev.w);
                const letterGap = 0.18 * Math.max(prev.h, it.h, 8);
                if (gap < letterGap) out += piece;
                else out += ` ${piece}`;
                prev = it;
            }
            return out.replace(/[ \t]{2,}/g, ' ').trim();
        })
        .filter(Boolean);
}

/**
 * Extrae texto seleccionable de un PDF en el cliente (pdf.js).
 * Agrupa por posición visual para que el nombre del encabezado salga primero
 * aunque el PDF lo haya escrito en otro orden de contenido.
 */
export async function extractPdfContent(file: File): Promise<ExtractedPdfContent> {
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
        const allLines: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const positioned: PositionedItem[] = [];
            const fallbackParts: string[] = [];
            for (const raw of content.items) {
                if (!isPdfTextItem(raw) || !raw.str) continue;
                fallbackParts.push(raw.str);
                if (raw.hasEOL) fallbackParts.push('\n');
                else fallbackParts.push(' ');
                const t = raw.transform;
                if (t && t.length >= 6) {
                    positioned.push({
                        str: raw.str,
                        x: t[4],
                        y: t[5],
                        w: raw.width || Math.abs(t[0]) * raw.str.length || 8,
                        h: raw.height || Math.abs(t[3]) || 10,
                    });
                }
            }
            const visual = positioned.length > 0
                ? itemsToVisualLines(positioned)
                : fallbackParts.join('').split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
            allLines.push(...visual);
        }
        return {
            visualLines: allLines,
            text: allLines.join('\n'),
        };
    } finally {
        await pdf.destroy();
    }
}

export async function extractPdfText(file: File): Promise<string> {
    return (await extractPdfContent(file)).text;
}
