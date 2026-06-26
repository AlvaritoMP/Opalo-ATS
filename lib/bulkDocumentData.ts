import type { BulkDocumentTemplate, CustomColumn, Process } from '../types';
import type { BulkCandidate } from './api/bulkCandidates';
import { obtenerFechaEmision } from './dateFormatter';
import { formatCustomCellDisplay, findCustomColumnByHeader, CUSTOM_COLUMN_HEADER_ALIASES, normalizeColumnNameKey } from './bulkTableColumns';
import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
    detectTemplateKeysFromBuffer,
    renderDocxTemplate,
    buildBulkDocumentFileName,
} from './docxTemplateUtils';
import {
    parseDecomposedTemplateKey,
    getDecomposedBaseKey,
    resolveDecomposedValue,
    isDecomposedTemplateKey,
} from './bulkDocumentDecomposition';

export const BULK_DOCUMENTS_COLUMN_ID = 'bulkDocuments';

export interface BulkDocumentFieldSource {
    id: string;
    label: string;
    group: 'Candidato' | 'Proceso' | 'Sistema' | 'Columnas';
}

const CANDIDATE_SOURCES: BulkDocumentFieldSource[] = [
    { id: 'candidate.name', label: 'Nombre', group: 'Candidato' },
    { id: 'candidate.dni', label: 'DNI', group: 'Candidato' },
    { id: 'candidate.email', label: 'Email', group: 'Candidato' },
    { id: 'candidate.phone', label: 'Teléfono', group: 'Candidato' },
    { id: 'candidate.source', label: 'Fuente', group: 'Candidato' },
    { id: 'candidate.province', label: 'Provincia', group: 'Candidato' },
    { id: 'candidate.district', label: 'Distrito', group: 'Candidato' },
    { id: 'candidate.age', label: 'Edad', group: 'Candidato' },
    { id: 'candidate.hireDate', label: 'Fecha de contratación', group: 'Candidato' },
    { id: 'candidate.offerAcceptedDate', label: 'Fecha aceptación oferta', group: 'Candidato' },
    { id: 'candidate.scoreIa', label: 'Score IA', group: 'Candidato' },
];

const PROCESS_SOURCES: BulkDocumentFieldSource[] = [
    { id: 'process.title', label: 'Título del proceso', group: 'Proceso' },
    { id: 'process.description', label: 'Descripción del proceso', group: 'Proceso' },
    { id: 'stage.name', label: 'Etapa actual', group: 'Proceso' },
    { id: 'company.name', label: 'Empresa', group: 'Proceso' },
];

const SYSTEM_SOURCES: BulkDocumentFieldSource[] = [
    { id: 'system.fechaEmision', label: 'Fecha de emisión (hoy, formato largo)', group: 'Sistema' },
    { id: 'system.fechaActual', label: 'Fecha actual (corta)', group: 'Sistema' },
];

/** Fuentes fijas + columnas personalizadas del proceso */
export function buildDocumentFieldSources(customColumns: CustomColumn[] = []): BulkDocumentFieldSource[] {
    const custom: BulkDocumentFieldSource[] = customColumns.map(col => ({
        id: `custom.${col.id}`,
        label: col.name,
        group: 'Columnas' as const,
    }));
    return [...CANDIDATE_SOURCES, ...PROCESS_SOURCES, ...SYSTEM_SOURCES, ...custom];
}

const PLACEHOLDER_ALIASES: Record<string, string> = {
    candidatename: 'candidate.name',
    nombre: 'candidate.name',
    name: 'candidate.name',
    dni: 'candidate.dni',
    cedula: 'candidate.dni',
    email: 'candidate.email',
    correo: 'candidate.email',
    telefono: 'candidate.phone',
    teléfono: 'candidate.phone',
    phone: 'candidate.phone',
    fuente: 'candidate.source',
    source: 'candidate.source',
    provincia: 'candidate.province',
    province: 'candidate.province',
    distrito: 'candidate.district',
    district: 'candidate.district',
    edad: 'candidate.age',
    age: 'candidate.age',
    puesto: 'process.title',
    posicion: 'process.title',
    posición: 'process.title',
    processtitle: 'process.title',
    positiontitle: 'process.title',
    empresa: 'company.name',
    companyname: 'company.name',
    fechaemision: 'system.fechaEmision',
    fechaemisión: 'system.fechaEmision',
    fechaactual: 'system.fechaActual',
    fecha: 'system.fechaActual',
    etapa: 'stage.name',
    stage: 'stage.name',
    appaterno: 'custom.apPaterno',
    apellidopaterno: 'custom.apPaterno',
    apmaterno: 'custom.apMaterno',
    apellidomaterno: 'custom.apMaterno',
    fnac: 'custom.fNac',
    fechanacimiento: 'custom.fNac',
    fechadenacimiento: 'custom.fNac',
};

function normalizeKey(key: string): string {
    return key.toLowerCase().replace(/[_\s-]/g, '');
}

/** Valores de UI sin dato (guión, pendiente, etc.) → vacío en el documento Word */
const DOCUMENT_EMPTY_DISPLAY_VALUES = new Set([
    '-',
    '—',
    '–',
    '−',
    'n/a',
    'na',
    's/n',
    'sin dato',
    'sin datos',
    'pendiente',
    'null',
    'undefined',
]);

/**
 * Convierte a texto para Word: sin guiones de tabla, sin espacios residuales.
 * Un campo vacío en el ATS debe dejar el marcador {{...}} sin ocupar espacio visible.
 */
export function sanitizeDocumentFieldValue(value: unknown): string {
    if (value === undefined || value === null) return '';
    const str = String(value).replace(/\u00a0/g, ' ').trim();
    if (!str) return '';
    if (DOCUMENT_EMPTY_DISPLAY_VALUES.has(str.toLowerCase())) return '';
    return str;
}

/** Sugiere mapeo automático para un campo de plantilla (incluye campos descompuestos) */
export function suggestFieldMapping(
    templateKey: string,
    customColumns: CustomColumn[] = []
): string {
    const baseKey = getDecomposedBaseKey(templateKey);
    const norm = normalizeKey(baseKey);
    if (PLACEHOLDER_ALIASES[norm]) {
        const alias = PLACEHOLDER_ALIASES[norm];
        if (alias === 'custom.apPaterno') {
            const col = findCustomColumnByHeader('Ap Paterno', customColumns);
            return col ? `custom.${col.id}` : '';
        }
        if (alias === 'custom.apMaterno') {
            const col = findCustomColumnByHeader('Ap Materno', customColumns);
            return col ? `custom.${col.id}` : '';
        }
        if (alias === 'custom.fNac') {
            const col = findCustomColumnByHeader('F Nac', customColumns)
                || findCustomColumnByHeader('F. Nac', customColumns);
            return col ? `custom.${col.id}` : '';
        }
        return alias;
    }

    for (const col of customColumns) {
        if (normalizeKey(col.name) === norm) return `custom.${col.id}`;
    }
    return '';
}

export function suggestFieldMappings(
    keys: string[],
    customColumns: CustomColumn[] = []
): Record<string, string> {
    const out: Record<string, string> = {};
    for (const key of keys) {
        const baseKey = getDecomposedBaseKey(key);
        const suggested = suggestFieldMapping(baseKey, customColumns);
        if (suggested) out[key] = suggested;
    }
    return out;
}

export interface BulkDocumentContext {
    candidate: BulkCandidate;
    process?: Process;
    companyName: string;
    customColumns?: CustomColumn[];
    getColumnValue?: (candidateId: string, columnId: string, candidate?: BulkCandidate) => unknown;
}

function resolveCustomColumnValue(
    header: string,
    ctx: BulkDocumentContext
): string {
    const { candidate, customColumns = [], getColumnValue } = ctx;
    const col = findCustomColumnByHeader(header, customColumns);
    if (!col || !getColumnValue) return '';
    const raw = getColumnValue(candidate.id, col.id, candidate);
    return sanitizeDocumentFieldValue(formatCustomCellDisplay(raw, col as CustomColumn));
}

/** Apellidos desde columnas personalizadas del proceso masivo */
export function resolveCandidateApellidos(ctx: BulkDocumentContext): { apPaterno: string; apMaterno: string } {
    return {
        apPaterno: resolveCustomColumnValue('Ap Paterno', ctx),
        apMaterno: resolveCustomColumnValue('Ap Materno', ctx),
    };
}

/** Etiquetas literales a retirar del Word cuando el campo quedó vacío */
function buildOrphanLabelTexts(
    emptyKeys: string[],
    template: BulkDocumentTemplate,
    customColumns: CustomColumn[] = []
): string[] {
    const labels = new Set<string>();
    for (const key of emptyKeys) {
        if (key.trim()) labels.add(key.trim());
        const mapped = template.fieldMappings?.[key] || suggestFieldMapping(key, customColumns);
        if (mapped?.startsWith('custom.')) {
            const colId = mapped.slice('custom.'.length);
            const col = customColumns.find(c => c.id === colId);
            if (col?.name) labels.add(col.name);
        }
        const norm = normalizeColumnNameKey(key);
        for (const [canonical, aliases] of Object.entries(CUSTOM_COLUMN_HEADER_ALIASES)) {
            const canonNorm = normalizeColumnNameKey(canonical);
            if (norm === canonNorm || aliases.some(a => normalizeColumnNameKey(a) === norm)) {
                labels.add(canonical);
                aliases.forEach(a => labels.add(a));
            }
        }
    }
    return [...labels];
}

function resolveSourceValue(sourceId: string, ctx: BulkDocumentContext): string {
    const { candidate, process, companyName, customColumns = [], getColumnValue } = ctx;

    if (sourceId.startsWith('custom.')) {
        const colId = sourceId.slice('custom.'.length);
        const col = customColumns.find(c => c.id === colId);
        if (!col || !getColumnValue) return '';
        const raw = getColumnValue(candidate.id, colId, candidate);
        return sanitizeDocumentFieldValue(formatCustomCellDisplay(raw, col));
    }

    switch (sourceId) {
        case 'candidate.name': return sanitizeDocumentFieldValue(candidate.name);
        case 'candidate.dni': return sanitizeDocumentFieldValue(candidate.dni);
        case 'candidate.email': return sanitizeDocumentFieldValue(candidate.email);
        case 'candidate.phone': return sanitizeDocumentFieldValue(candidate.phone);
        case 'candidate.source': return sanitizeDocumentFieldValue(candidate.source);
        case 'candidate.province': return sanitizeDocumentFieldValue(candidate.province);
        case 'candidate.district': return sanitizeDocumentFieldValue(candidate.district);
        case 'candidate.age': return candidate.age != null ? sanitizeDocumentFieldValue(candidate.age) : '';
        case 'candidate.hireDate': return sanitizeDocumentFieldValue(candidate.hireDate);
        case 'candidate.offerAcceptedDate': return sanitizeDocumentFieldValue(candidate.offerAcceptedDate);
        case 'candidate.scoreIa': return candidate.scoreIa != null ? sanitizeDocumentFieldValue(candidate.scoreIa) : '';
        case 'process.title': return sanitizeDocumentFieldValue(process?.title);
        case 'process.description': return sanitizeDocumentFieldValue(process?.description);
        case 'stage.name': {
            const stage = process?.stages?.find(s => s.id === candidate.stageId);
            return sanitizeDocumentFieldValue(stage?.name);
        }
        case 'company.name': return sanitizeDocumentFieldValue(companyName);
        case 'system.fechaEmision': return obtenerFechaEmision();
        case 'system.fechaActual': return new Date().toLocaleDateString('es-PE');
        default: return '';
    }
}

function resolveMappingForKey(
    key: string,
    template: BulkDocumentTemplate,
    customColumns: CustomColumn[]
): string {
    const baseKey = getDecomposedBaseKey(key);
    return (
        template.fieldMappings?.[key]
        || template.fieldMappings?.[baseKey]
        || suggestFieldMapping(baseKey, customColumns)
    );
}

/** Construye datos para docxtemplater a partir del mapeo configurado */
export function buildDocumentData(
    template: BulkDocumentTemplate,
    ctx: BulkDocumentContext
): { data: Record<string, string>; emptyKeys: string[] } {
    const keys = template.detectedKeys?.length
        ? template.detectedKeys
        : detectTemplateKeysFromBuffer(base64ToArrayBuffer(template.docxBase64));

    const customColumns = ctx.customColumns || [];
    const data: Record<string, string> = {};
    const baseValueCache = new Map<string, string>();

    const getBaseValue = (baseKey: string): string => {
        if (baseValueCache.has(baseKey)) return baseValueCache.get(baseKey)!;
        const mapped = resolveMappingForKey(baseKey, template, customColumns);
        const value = mapped ? resolveSourceValue(mapped, ctx) : '';
        const sanitized = sanitizeDocumentFieldValue(value);
        baseValueCache.set(baseKey, sanitized);
        return sanitized;
    };

    for (const key of keys) {
        const decomposed = parseDecomposedTemplateKey(key);
        if (decomposed) {
            const baseValue = getBaseValue(decomposed.baseKey);
            data[key] = resolveDecomposedValue(baseValue, decomposed);
            continue;
        }

        const mapped = resolveMappingForKey(key, template, customColumns);
        data[key] = mapped ? getBaseValue(key) : '';
    }

    const extras: Record<string, string> = {
        Nombre: sanitizeDocumentFieldValue(data.Nombre ?? ctx.candidate.name),
        nombre: sanitizeDocumentFieldValue(data.nombre ?? ctx.candidate.name),
        DNI: sanitizeDocumentFieldValue(data.DNI ?? ctx.candidate.dni),
        dni: sanitizeDocumentFieldValue(data.dni ?? ctx.candidate.dni),
        Fechaemision: obtenerFechaEmision(),
        fechaEmision: obtenerFechaEmision(),
    };

    const merged = { ...extras, ...data };
    for (const key of Object.keys(merged)) {
        merged[key] = sanitizeDocumentFieldValue(merged[key]);
    }

    const emptyKeys = [...keys, ...Object.keys(extras)].filter(
        key => !isDecomposedTemplateKey(key) && !merged[key]
    );
    return { data: merged, emptyKeys: [...new Set(emptyKeys)] };
}

export function generateBulkDocument(
    template: BulkDocumentTemplate,
    ctx: BulkDocumentContext
): { blob: Blob; fileName: string } {
    const buf = base64ToArrayBuffer(template.docxBase64);
    const { data, emptyKeys } = buildDocumentData(template, ctx);
    const orphanLabelTexts = buildOrphanLabelTexts(emptyKeys, template, ctx.customColumns);
    const blob = renderDocxTemplate(buf, data, { orphanLabelTexts });
    const { apPaterno, apMaterno } = resolveCandidateApellidos(ctx);
    const fileName = buildBulkDocumentFileName(template.name, ctx.candidate.name, apPaterno, apMaterno);
    return { blob, fileName };
}

export function createDocumentTemplateId(): string {
    return `doctpl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function readDocxFileAsTemplate(
    file: File,
    customColumns: CustomColumn[] = []
): Promise<Pick<BulkDocumentTemplate, 'docxBase64' | 'detectedKeys' | 'fieldMappings'>> {
    const buf = await file.arrayBuffer();
    const detectedKeys = detectTemplateKeysFromBuffer(buf);
    return {
        docxBase64: arrayBufferToBase64(buf),
        detectedKeys,
        fieldMappings: suggestFieldMappings(detectedKeys, customColumns),
    };
}
