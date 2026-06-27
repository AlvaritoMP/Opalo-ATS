import { PDFDocument, PDFCheckBox, PDFTextField, PDFDropdown, PDFRadioGroup } from 'pdf-lib';
import { arrayBufferToBase64, base64ToArrayBuffer } from './docxTemplateUtils';

export type PdfFormFieldType = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'other';

export interface PdfFormFieldInfo {
    name: string;
    type: PdfFormFieldType;
}

const PDF_CHECK_FIELD_RE = /^(?:marcar|marca|check|opt):(.+?)=(.+)$/i;

/** Campo checkbox PDF con convención marcar:Columna=Valor (p. ej. marcar:Distrito=Lima) */
export function parsePdfCheckboxFieldName(fieldName: string): { baseKey: string; expectedValues: string[] } | null {
    const match = fieldName.trim().match(PDF_CHECK_FIELD_RE);
    if (!match) return null;
    const baseKey = match[1].trim();
    const expectedValues = match[2].split('|').map(v => v.trim()).filter(Boolean);
    if (!baseKey || expectedValues.length === 0) return null;
    return { baseKey, expectedValues };
}

function normalizeComparable(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

export function matchesPdfCheckboxExpected(actualValue: string, expectedValues: string[]): boolean {
    const actual = normalizeComparable(actualValue);
    if (!actual) return false;
    return expectedValues.some(exp => actual === normalizeComparable(exp));
}

function classifyField(field: { constructor: { name: string } }): PdfFormFieldType {
    const cn = field.constructor.name;
    if (cn === 'PDFTextField') return 'text';
    if (cn === 'PDFCheckBox') return 'checkbox';
    if (cn === 'PDFRadioGroup') return 'radio';
    if (cn === 'PDFDropdown') return 'dropdown';
    return 'other';
}

/** Lista campos AcroForm de un PDF rellenable */
export async function detectPdfFormFields(buf: ArrayBuffer): Promise<PdfFormFieldInfo[]> {
    const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    const out: PdfFormFieldInfo[] = [];
    const seen = new Set<string>();

    for (const field of fields) {
        const name = field.getName();
        if (!name || seen.has(name)) continue;
        seen.add(name);
        out.push({ name, type: classifyField(field) });
    }

    return out.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export async function readPdfFileAsBase64(file: File): Promise<{ pdfBase64: string; buf: ArrayBuffer }> {
    const buf = await file.arrayBuffer();
    return { pdfBase64: arrayBufferToBase64(buf), buf };
}

/**
 * Rellena un PDF AcroForm. fieldValues: nombre de campo → texto o 'true'/'false' para checkboxes.
 * flatten: deja el PDF sin campos editables; usar false para permitir edición manual posterior.
 */
export async function fillPdfFormTemplate(
    buf: ArrayBuffer,
    fieldValues: Record<string, string>,
    fieldTypes: Record<string, PdfFormFieldType> = {},
    options?: { flatten?: boolean }
): Promise<Blob> {
    const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const form = pdfDoc.getForm();

    for (const [name, rawValue] of Object.entries(fieldValues)) {
        const value = rawValue ?? '';
        let field;
        try {
            field = form.getField(name);
        } catch {
            continue;
        }

        const type = fieldTypes[name] ?? classifyField(field);

        if (type === 'checkbox' && field instanceof PDFCheckBox) {
            const shouldCheck = value === 'true' || value === '1' || value.toUpperCase() === 'X';
            if (shouldCheck) field.check();
            else field.uncheck();
            continue;
        }

        if (field instanceof PDFTextField) {
            if (!value) {
                field.setText('');
            } else {
                field.setText(value);
            }
            continue;
        }

        if (field instanceof PDFDropdown && value) {
            try {
                field.select(value);
            } catch {
                /* valor no listado en opciones */
            }
            continue;
        }

        if (field instanceof PDFRadioGroup && value) {
            try {
                field.select(value);
            } catch {
                /* opción no válida */
            }
        }
    }

    if (options?.flatten !== false) {
        try {
            form.flatten();
        } catch {
            /* algunos PDF no permiten flatten */
        }
    }

    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
}

export function getPdfTemplateBuffer(template: { pdfBase64?: string }): ArrayBuffer {
    if (!template.pdfBase64) throw new Error('La plantilla PDF no tiene archivo cargado.');
    return base64ToArrayBuffer(template.pdfBase64);
}
