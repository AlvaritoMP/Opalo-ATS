import type { Attachment, Candidate, DocumentCategory, Process } from '../types';
import type { BulkCandidate } from './api/bulkCandidates';
import { fileToBase64 } from './fileUtils';
import { applyImportTextCaseToCandidate } from './importTextCase';
import { resolveBulkCandidateEmail } from './bulkTableColumns';
import {
    extractCvFields,
    type CvExtractedFields,
    type CvExtractLocationOptions,
} from './cvFieldExtractor';
import {
    SCAN_PDF_MESSAGE,
    CV_PDF_WARN_BYTES,
    extractPdfText,
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
        const text = await extractPdfText(file);
        if (!isExtractedTextUsable(text)) {
            return { fields: {}, error: SCAN_PDF_MESSAGE };
        }
        return {
            fields: extractCvFields(text, options),
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
    };
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
