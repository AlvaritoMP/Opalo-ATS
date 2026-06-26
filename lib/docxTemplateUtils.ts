import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export function arrayBufferToBase64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

/** Detecta campos {{campo}} en un .docx, incluyendo headers y footers */
export function detectTemplateKeysFromBuffer(buf: ArrayBuffer): string[] {
    const zip = new PizZip(buf);
    const keys = new Set<string>();

    const extractTextFromXML = (xml: string): string => {
        const textMatches = xml.match(/<w:t[^>]*>(.*?)<\/w:t>/gs) || [];
        return textMatches
            .map(match => {
                let text = match.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '');
                text = text.replace(/<[^>]+>/g, '');
                return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            })
            .join('');
    };

    const extractKeys = (text: string) => {
        const pattern = /\{\{([^}]+)\}\}/g;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(text)) !== null) {
            const key = match[1].trim();
            if (key && !key.includes('<') && !key.includes('>') && key.length < 100) {
                keys.add(key);
            }
        }
    };

    const documentXml = zip.file('word/document.xml')?.asText() || '';
    let allText = extractTextFromXML(documentXml);

    const headerFiles = Object.keys(zip.files).filter(n => n.startsWith('word/header') && n.endsWith('.xml'));
    const footerFiles = Object.keys(zip.files).filter(n => n.startsWith('word/footer') && n.endsWith('.xml'));
    headerFiles.forEach(f => { allText += ' ' + extractTextFromXML(zip.file(f)?.asText() || ''); });
    footerFiles.forEach(f => { allText += ' ' + extractTextFromXML(zip.file(f)?.asText() || ''); });

    extractKeys(allText);
    extractKeys(documentXml + headerFiles.map(f => zip.file(f)?.asText() || '').join(''));

    const unique = new Map<string, string>();
    Array.from(keys).forEach(key => {
        const lower = key.toLowerCase();
        if (!unique.has(lower)) unique.set(lower, key);
    });
    return Array.from(unique.values()).sort();
}

function extractParagraphText(paragraphXml: string): string {
    const matches = paragraphXml.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || [];
    return matches
        .map(m => m.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
        .join('')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Quita fragmentos "Etiqueta: " cuando el campo asociado quedó vacío */
export function scrubOrphanLabels(text: string, labelTexts: string[]): string {
    let out = text;
    for (const label of labelTexts) {
        const trimmed = label.trim();
        if (!trimmed) continue;
        const esc = escapeRegExp(trimmed);
        out = out.replace(new RegExp(`(^|[\\s,;|·•\\-])(${esc})\\s*:\\s*`, 'gi'), '$1');
        out = out.replace(new RegExp(`^(${esc})\\s*:\\s*`, 'gi'), '');
    }
    return out
        .replace(/\s{2,}/g, ' ')
        .replace(/^[\s,;|·•\-]+/, '')
        .replace(/[\s,;|·•\-]+$/, '')
        .trim();
}

/**
 * Elementos que NUNCA deben borrarse junto con su párrafo: propiedades de sección,
 * imágenes, dibujos, campos, fórmulas. Borrarlos corrompe el .docx.
 */
const PARAGRAPH_STRUCTURAL_GUARD = /<w:sectPr|<w:drawing|<w:pict|<w:object|<wp:|<a:|<pic:|w:fldChar|w:instrText|<m:|<w:hyperlink/;

/**
 * Elimina, de forma segura, los párrafos que quedaron como "Etiqueta:" sin valor
 * tras reemplazar campos vacíos. SOLO actúa sobre párrafos cuya etiqueta huérfana
 * se eliminó realmente: el texto estático del documento (p. ej. "Tipo de vivienda:")
 * nunca se toca porque no figura en orphanLabelTexts. No toca párrafos con estructura
 * (secciones, imágenes, campos) y repara celdas de tabla que queden sin párrafo.
 */
export function cleanupDocxXml(xml: string, orphanLabelTexts: string[] = []): string {
    if (orphanLabelTexts.length === 0) return xml;

    const withoutOrphans = xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, paragraphXml => {
        if (PARAGRAPH_STRUCTURAL_GUARD.test(paragraphXml)) return paragraphXml;
        const original = extractParagraphText(paragraphXml).trim();
        if (!original) return paragraphXml; // párrafo ya vacío: no tocar (puede ser espaciado)
        const scrubbed = scrubOrphanLabels(original, orphanLabelTexts);
        // Si la limpieza no cambió nada, es texto estático del documento: conservar intacto.
        if (scrubbed === original) return paragraphXml;
        // La etiqueta huérfana se eliminó y el párrafo quedó vacío: eliminarlo.
        if (scrubbed === '') return '';
        // Cambio parcial: conservar el párrafo original para no corromper el formato.
        return paragraphXml;
    });

    return repairEmptyTableCells(withoutOrphans);
}

/** Garantiza que toda celda de tabla conserve al menos un párrafo (docx válido). */
function repairEmptyTableCells(xml: string): string {
    return xml.replace(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/g, cell => {
        if (/<w:p[ \/>]/.test(cell)) return cell;
        return cell.replace(/<\/w:tc>$/, '<w:p/></w:tc>');
    });
}

const DOCX_XML_CLEANUP_PATHS = /^word\/(document|header\d*|footer\d*)\.xml$/;

export interface RenderDocxTemplateOptions {
    /** Etiquetas literales a retirar cuando su campo quedó vacío (p. ej. "Ap Paterno") */
    orphanLabelTexts?: string[];
}

export function renderDocxTemplate(
    buf: ArrayBuffer,
    data: Record<string, string>,
    options?: RenderDocxTemplateOptions
): Blob {
    const zip = new PizZip(buf);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
        nullGetter: () => '',
    });
    doc.setData(data);
    doc.render();

    const zipOut = doc.getZip();
    const orphanLabels = options?.orphanLabelTexts || [];
    for (const path of Object.keys(zipOut.files)) {
        if (!DOCX_XML_CLEANUP_PATHS.test(path)) continue;
        const file = zipOut.file(path);
        if (!file) continue;
        zipOut.file(path, cleanupDocxXml(file.asText(), orphanLabels));
    }

    return zipOut.generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
}

export function safeFileNamePart(value: string | undefined | null): string {
    if (!value) return '';
    return value
        .trim()
        .replace(/[^a-z0-9áéíóúñüÁÉÍÓÚÑÜ_-]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

export function buildBulkDocumentFileName(
    templateName: string,
    candidateName: string,
    apPaterno?: string,
    apMaterno?: string
): string {
    const parts = [
        safeFileNamePart(templateName.replace(/\.docx?$/i, '') || 'documento'),
        safeFileNamePart(candidateName),
        safeFileNamePart(apPaterno),
        safeFileNamePart(apMaterno),
    ].filter(p => p.length > 0);
    return `${parts.join('_')}.docx`;
}

/** @deprecated Use buildBulkDocumentFileName */
export function safeDocxFileName(baseName: string, candidateName: string): string {
    return buildBulkDocumentFileName(baseName, candidateName);
}
