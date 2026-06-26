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

export function renderDocxTemplate(buf: ArrayBuffer, data: Record<string, string>): Blob {
    const zip = new PizZip(buf);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
        nullGetter: () => '',
    });
    doc.setData(data);
    doc.render();
    return doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
}

export function safeDocxFileName(baseName: string, candidateName: string): string {
    const nameSafe = candidateName.replace(/[^a-z0-9_-]/gi, '_');
    const base = baseName.replace(/\.docx?$/i, '') || 'documento';
    return `${base}_${nameSafe}.docx`;
}
