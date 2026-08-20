import type { Attachment, Candidate, CustomColumn, DocumentCategory, Process } from '../types';
import type { PsycholaboralReportNamePart } from '../types';
import type { BulkCandidate } from './api/bulkCandidates';
import { fileToBase64 } from './fileUtils';
import { applyImportTextCaseToCandidate } from './importTextCase';
import {
    BASE_COLUMNS,
    enrichBulkColumnValuesForStorage,
    getColumnLabel,
    mapImportHeader,
    resolveBulkCandidateEmail,
} from './bulkTableColumns';
import { BULK_DOCUMENTS_COLUMN_ID } from './bulkDocumentData';
import { parseLegacyFullName } from './workerNameParts';
import {
    inferReportNamePartFromLabel,
    normalizeColumnHeaderForMatching,
} from './psycholaboralUtils';
import {
    extractCvFields,
    type CvExtractedFields,
    type CvExtractLocationOptions,
} from './cvFieldExtractor';
import {
    SCAN_PDF_MESSAGE,
    CV_PDF_WARN_BYTES,
    extractPdfContent,
    isExtractedTextUsable,
    validateCvPdfFile,
} from './cvPdfText';

export { SCAN_PDF_MESSAGE, CV_PDF_MAX_BYTES, CV_PDF_WARN_BYTES, isPdfFile, validateCvPdfFile } from './cvPdfText';
export type { CvExtractedFields } from './cvFieldExtractor';

export type CvImportMode = 'standard' | 'bulk';

export function resolveCvCandidateSource(candidateSources?: string[]): string {
    const sources =
        candidateSources && candidateSources.length > 0
            ? candidateSources
            : ['LinkedIn', 'Referencia', 'Sitio web', 'Otro'];
    const cvLike = sources.find(s => /^(cv|curr[ií]culum|curriculum)(\s|$)/i.test(s.trim()));
    return cvLike || sources[0] || 'Otro';
}

export function findCvDocumentCategory(
    categories?: DocumentCategory[]
): DocumentCategory | undefined {
    if (!categories?.length) return undefined;
    return categories.find(c => /cv|curr[ií]culum|curriculum/i.test(c.name || ''));
}

export async function buildCvAttachment(file: File, categoryId?: string): Promise<Attachment> {
    const url = await fileToBase64(file);
    return {
        id: crypto.randomUUID(),
        name: file.name,
        url,
        type: file.type || 'application/pdf',
        size: file.size,
        category: categoryId,
        uploadedAt: new Date().toISOString(),
    };
}

export async function parseCvFileForImport(
    file: File,
    options?: CvExtractLocationOptions
): Promise<{ fields: CvExtractedFields; error?: string; oversized?: boolean; warnLarge?: boolean }> {
    const validation = validateCvPdfFile(file);
    if (!validation.ok) {
        return { fields: {}, error: validation.error, oversized: validation.oversized };
    }

    try {
        const extracted = await extractPdfContent(file);
        if (!isExtractedTextUsable(extracted.text)) {
            return { fields: {}, error: SCAN_PDF_MESSAGE };
        }
        return {
            fields: extractCvFields(extracted.text, {
                ...options,
                visualLines: extracted.visualLines,
            }),
            warnLarge: file.size > CV_PDF_WARN_BYTES,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo leer el PDF';
        return { fields: {}, error: message };
    }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidCandidateEmail(email?: string): boolean {
    return !!email && EMAIL_REGEX.test(email.trim());
}

export function buildCandidateFromCvDraft(opts: {
    process: Process;
    fields: CvExtractedFields;
    attachment?: Attachment;
    source: string;
    mode: CvImportMode;
    rowNumber: number;
}): { candidate?: Omit<Candidate, 'id' | 'history'>; error?: string; usedPlaceholder?: boolean } {
    const firstStageId = opts.process.stages[0]?.id;
    if (!firstStageId) {
        return { error: 'Este proceso no tiene etapas configuradas.' };
    }

    const name = (opts.fields.name || '').trim();
    const emailRaw = (opts.fields.email || '').trim();
    const phone = (opts.fields.phone || '').trim() || undefined;
    const dni = (opts.fields.dni || '').trim() || undefined;

    if (!name) {
        return { error: 'Falta el nombre.' };
    }

    let email = emailRaw;
    let usedPlaceholder = false;

    if (opts.mode === 'standard') {
        if (!isValidCandidateEmail(email)) {
            return { error: 'Falta un correo electrónico válido.' };
        }
    } else {
        const resolved = resolveBulkCandidateEmail(email || undefined, opts.rowNumber, name, dni, phone, 'cv');
        email = resolved.email;
        usedPlaceholder = resolved.usedPlaceholder;
    }

    const draft: Record<string, unknown> = {
        name,
        email,
        phone,
        phone2: (opts.fields.phone2 || '').trim() || undefined,
        dni,
        linkedinUrl: (opts.fields.linkedinUrl || '').trim() || undefined,
        address: (opts.fields.address || '').trim() || undefined,
        province: (opts.fields.province || '').trim() || undefined,
        district: (opts.fields.district || '').trim() || undefined,
        age: opts.fields.age,
        salaryExpectation: (opts.fields.salaryExpectation || '').trim() || undefined,
        description: (opts.fields.description || '').trim() || undefined,
        source: opts.source,
        processId: opts.process.id,
        stageId: firstStageId,
        attachments: opts.attachment ? [opts.attachment] : [],
        applicationStartedDate: new Date().toISOString(),
        registrationOrigin: 'masivo',
    };

    applyImportTextCaseToCandidate(draft);
    return {
        candidate: draft as Omit<Candidate, 'id' | 'history'>,
        usedPlaceholder,
    };
}

export function candidateToBulkRow(c: Candidate): BulkCandidate {
    return {
        id: c.id,
        name: c.name || '',
        email: c.email,
        phone: c.phone,
        dni: c.dni,
        source: c.source,
        province: c.province,
        district: c.district,
        age: c.age,
        stageId: c.stageId,
        processId: c.processId,
        createdAt: c.applicationStartedDate || c.createdAt || new Date().toISOString(),
        registrationOrigin: c.registrationOrigin || 'masivo',
        createdBy: c.createdBy,
        description: c.description,
        attachments: c.attachments,
        scoreIa: c.scoreIa,
        metadataIa: c.metadataIa,
        bulkColumnValues: c.bulkColumnValues,
    };
}

const CV_FIELD_KEYS: (keyof CvExtractedFields)[] = [
    'name',
    'nombres',
    'apellidoPaterno',
    'apellidoMaterno',
    'email',
    'phone',
    'phone2',
    'dni',
    'linkedinUrl',
    'address',
    'province',
    'district',
    'age',
    'salaryExpectation',
    'description',
];

function isCvField(id: string): id is keyof CvExtractedFields {
    return (CV_FIELD_KEYS as string[]).includes(id);
}

const SKIP_TABLE_COL_IDS = new Set([
    'status',
    'contactEmail',
    'contactPhone',
    'contactWhatsapp',
    'contactLastUser',
    'fidelizPhone',
    'fidelizWhatsapp',
    'fidelizEmail',
    'scoreIa',
    'profileMatch',
    'createdAt',
    'nextInterview',
    'schedule',
    'stage',
    'hiredStageUser',
    'registrationOrigin',
    BULK_DOCUMENTS_COLUMN_ID,
]);

export type CvPreviewColumn = {
    id: string;
    label: string;
    field?: keyof CvExtractedFields;
    namePart?: PsycholaboralReportNamePart;
    customColumnId?: string;
    wide?: boolean;
};

export type CvTableLayout = {
    customColumns: CustomColumn[];
    visibleColumns: string[];
};

/** Columnas de la preview: las de la tabla visible que se pueden rellenar desde el CV. */
export function buildCvPreviewColumns(tableLayout?: CvTableLayout): CvPreviewColumn[] {
    if (!tableLayout?.visibleColumns?.length) {
        return [
            { id: 'name', label: 'Nombre', field: 'name' },
            { id: 'email', label: 'Email', field: 'email' },
            { id: 'phone', label: 'Teléfono', field: 'phone' },
            { id: 'phone2', label: 'Tel. 2', field: 'phone2' },
            { id: 'dni', label: 'DNI', field: 'dni' },
            { id: 'linkedinUrl', label: 'LinkedIn', field: 'linkedinUrl', wide: true },
            { id: 'address', label: 'Dirección', field: 'address', wide: true },
            { id: 'province', label: 'Provincia', field: 'province' },
            { id: 'district', label: 'Distrito', field: 'district' },
            { id: 'age', label: 'Edad', field: 'age' },
            { id: 'salaryExpectation', label: 'Sueldo', field: 'salaryExpectation' },
            { id: 'description', label: 'Resumen', field: 'description', wide: true },
        ];
    }

    const { visibleColumns, customColumns } = tableLayout;
    const cols: CvPreviewColumn[] = [];
    const seen = new Set<string>();

    for (const colId of visibleColumns) {
        if (SKIP_TABLE_COL_IDS.has(colId) || seen.has(colId)) continue;

        if (colId.startsWith('custom_')) {
            const rawId = colId.replace(/^custom_/, '');
            const col = customColumns.find(c => c.id === rawId || `custom_${c.id}` === colId);
            if (!col) continue;
            const mapped = mapImportHeader(col.name);
            const field = mapped && isCvField(mapped) ? mapped : undefined;
            const namePart = field
                ? undefined
                : inferReportNamePartFromLabel(normalizeColumnHeaderForMatching(col.name)) || undefined;
            if (!field && !namePart) continue;
            seen.add(colId);
            cols.push({
                id: colId,
                label: col.name,
                field,
                namePart: namePart || undefined,
                customColumnId: col.id,
                wide: field === 'address' || field === 'description' || field === 'linkedinUrl',
            });
            continue;
        }

        const base = BASE_COLUMNS.find(c => c.id === colId);
        const importKey = base?.importKey;
        if (importKey && isCvField(importKey)) {
            seen.add(colId);
            cols.push({
                id: colId,
                label: getColumnLabel(colId, customColumns),
                field: importKey,
                wide: importKey === 'address' || importKey === 'description',
            });
        }
    }

    if (!cols.some(c => c.field === 'nombres' || c.field === 'name' || c.namePart === 'given_names')) {
        cols.unshift({ id: 'nombres', label: 'Nombres', field: 'nombres' });
    }
    if (!cols.some(c => c.field === 'email')) {
        const nameIdx = cols.findIndex(c => c.field === 'nombres' || c.field === 'name');
        cols.splice(nameIdx + 1, 0, { id: 'email', label: 'Email', field: 'email' });
    }
    return cols;
}

export function namePartValue(
    part: PsycholaboralReportNamePart,
    name?: string
): string {
    if (!name?.trim()) return '';
    const parsed = parseLegacyFullName(name);
    if (part === 'given_names') return parsed.nombres || '';
    if (part === 'paternal_surname') return parsed.apellidoPaterno || '';
    if (part === 'maternal_surname') return parsed.apellidoMaterno || '';
    if (part === 'surnames_combined') {
        return [parsed.apellidoPaterno, parsed.apellidoMaterno].filter(Boolean).join(' ');
    }
    return '';
}

export function previewColumnValue(
    col: CvPreviewColumn,
    fields: CvExtractedFields,
    customValues?: Record<string, string>
): string {
    if (col.customColumnId && customValues?.[col.customColumnId] !== undefined) {
        return customValues[col.customColumnId];
    }
    if (col.namePart) return namePartValue(col.namePart, fields.name);
    if (col.field === 'age') return fields.age != null ? String(fields.age) : '';
    if (col.field) return String(fields[col.field] ?? '');
    return '';
}

export function mapCvFieldsToCustomValues(
    fields: CvExtractedFields,
    columns: CvPreviewColumn[]
): Record<string, string> {
    const out: Record<string, string> = {};
    for (const col of columns) {
        if (!col.customColumnId) continue;
        if (col.namePart) {
            const v = namePartValue(col.namePart, fields.name);
            if (v) out[col.customColumnId] = v;
            continue;
        }
        if (col.field) {
            const v = col.field === 'age' ? fields.age : fields[col.field];
            if (v !== undefined && v !== null && String(v).trim() !== '') {
                out[col.customColumnId] = String(v);
            }
        }
    }
    return out;
}

export function customValuesForStorage(
    customValues: Record<string, string>,
    customColumns: CustomColumn[]
): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};
    for (const [id, value] of Object.entries(customValues)) {
        if (value != null && String(value).trim() !== '') cleaned[id] = String(value).trim();
    }
    return enrichBulkColumnValuesForStorage(cleaned, customColumns);
}

export type CvRowWarning = 'missingName' | 'missingEmail' | 'scannedPdf' | 'placeholderEmail' | 'largeFile';

export function cvRowWarnings(opts: {
    fields: CvExtractedFields;
    error?: string;
    mode: CvImportMode;
    warnLarge?: boolean;
}): CvRowWarning[] {
    const warnings: CvRowWarning[] = [];
    if (opts.error === SCAN_PDF_MESSAGE) warnings.push('scannedPdf');
    if (!(opts.fields.name || '').trim()) warnings.push('missingName');
    const email = (opts.fields.email || '').trim();
    if (!isValidCandidateEmail(email)) {
        warnings.push(opts.mode === 'bulk' ? 'placeholderEmail' : 'missingEmail');
    }
    if (opts.warnLarge) warnings.push('largeFile');
    return warnings;
}

export const CV_WARNING_LABELS: Record<CvRowWarning, string> = {
    missingName: 'Falta nombre',
    missingEmail: 'Falta email',
    scannedPdf: 'PDF sin texto',
    placeholderEmail: 'Email placeholder',
    largeFile: 'Archivo grande',
};
