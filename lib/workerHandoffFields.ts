import { Candidate, CustomColumn, Process, WorkerSnapshot, WorkerSnapshotIdentity } from '../types';
import { APP_NAME } from './appConfig';
import {
    buildLegacyColumnIdToName,
    mapImportHeader,
    normalizeColumnNameKey,
    resolveColumnValueFromRow,
} from './bulkTableColumns';
import { extractRouteCostTotal } from './routeCostStorage';
import { resolveStructuredWorkerNameParts, composeWorkerFullName } from './workerNameParts';

const BULK_NAME_KEY_PREFIX = '__name__';

export const SNAPSHOT_VERSION = 2;
export const TARGET_APP = 'OpsFlow';

export interface WorkerHandoffFieldDef {
    key: string;
    label: string;
}

export interface WorkerHandoffFieldGroup {
    id: string;
    label: string;
    fields: WorkerHandoffFieldDef[];
}

/** Campos canónicos conocidos (siempre se intentan enviar si tienen valor). */
export const WORKER_HANDOFF_FIELD_GROUPS: WorkerHandoffFieldGroup[] = [
    {
        id: 'identity',
        label: 'Identidad',
        fields: [
            { key: 'fullName', label: 'Nombre completo' },
            { key: 'dni', label: 'DNI' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Teléfono' },
            { key: 'phone2', label: 'Teléfono 2' },
        ],
    },
    {
        id: 'candidate',
        label: 'Datos del candidato',
        fields: [
            { key: 'address', label: 'Dirección' },
            { key: 'province', label: 'Provincia' },
            { key: 'district', label: 'Distrito' },
            { key: 'age', label: 'Edad' },
            { key: 'linkedinUrl', label: 'LinkedIn' },
            { key: 'source', label: 'Fuente' },
            { key: 'description', label: 'Descripción / notas' },
            { key: 'agreedSalary', label: 'Salario acordado' },
            { key: 'agreedSalaryInWords', label: 'Salario en letras' },
            { key: 'hireDate', label: 'Fecha de contratación' },
            { key: 'salaryExpectation', label: 'Expectativa salarial' },
            { key: 'offerAcceptedDate', label: 'Fecha aceptación oferta' },
            { key: 'applicationStartedDate', label: 'Inicio postulación' },
            { key: 'applicationCompletedDate', label: 'Fin postulación' },
            { key: 'registrationOrigin', label: 'Origen de alta' },
            { key: 'createdAt', label: 'Fecha de creación' },
            { key: 'firstApplicationAt', label: 'Primera postulación' },
            { key: 'applicationCount', label: 'Nº postulaciones' },
            { key: 'metadataIa', label: 'Resumen IA' },
            { key: 'googleDriveFolderUrl', label: 'Carpeta Drive' },
            { key: 'attachmentNames', label: 'Adjuntos' },
            { key: 'attachmentUrls', label: 'URLs adjuntos' },
        ],
    },
    {
        id: 'process',
        label: 'Datos del proceso',
        fields: [
            { key: 'processTitle', label: 'Título del proceso' },
            { key: 'serviceOrderCode', label: 'Código orden de servicio' },
            { key: 'clientName', label: 'Cliente' },
            { key: 'processDescription', label: 'Descripción del proceso' },
            { key: 'stageName', label: 'Etapa actual' },
            { key: 'processStatus', label: 'Estado del proceso' },
            { key: 'processStartDate', label: 'Inicio proceso' },
            { key: 'processEndDate', label: 'Fin proceso' },
            { key: 'vacancies', label: 'Vacantes' },
            { key: 'salaryRange', label: 'Rango salarial proceso' },
        ],
    },
    {
        id: 'evaluation',
        label: 'Evaluación',
        fields: [
            { key: 'psycholaboralSuitability', label: 'Idoneidad psicolaboral' },
            { key: 'psycholaboralPositionApplied', label: 'Puesto evaluado' },
            { key: 'psycholaboralReportDate', label: 'Fecha informe psicolaboral' },
            { key: 'psycholaboralConclusions', label: 'Conclusiones psicolaboral' },
            { key: 'scoreIa', label: 'Score IA' },
        ],
    },
];

export const ALL_WORKER_HANDOFF_FIELD_KEYS = WORKER_HANDOFF_FIELD_GROUPS.flatMap(
    group => group.fields.map(field => field.key)
);

const RESERVED_FIELD_KEYS = new Set([
    ...ALL_WORKER_HANDOFF_FIELD_KEYS,
    'nombres',
    'apellidoPaterno',
    'apellidoMaterno',
    'fullName',
    'dni',
    'email',
    'phone',
    'phone2',
]);

const CATALOG_FIELD_LABELS: Record<string, string> = Object.fromEntries(
    WORKER_HANDOFF_FIELD_GROUPS.flatMap(group =>
        group.fields.map(field => [field.key, field.label])
    )
);

function hasValue(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number') return !Number.isNaN(value);
    if (typeof value === 'boolean') return true;
    return false;
}

function asString(value: unknown): string | undefined {
    if (!hasValue(value)) return undefined;
    return String(value).trim();
}

function putField(
    fields: Record<string, string | number | boolean>,
    fieldLabels: Record<string, string>,
    includedFieldKeys: string[],
    key: string,
    raw: unknown,
    label?: string
): void {
    if (!hasValue(raw)) return;
    if (typeof raw === 'number') {
        fields[key] = raw;
    } else if (typeof raw === 'boolean') {
        fields[key] = raw;
    } else {
        const text = asString(raw);
        if (!text) return;
        fields[key] = text;
    }
    includedFieldKeys.push(key);
    if (label) fieldLabels[key] = label;
    else if (CATALOG_FIELD_LABELS[key]) fieldLabels[key] = CATALOG_FIELD_LABELS[key];
}

type FieldExtractor = (ctx: { candidate: Candidate; process?: Process }) => unknown;

const FIELD_CATALOG: Record<string, FieldExtractor> = {
    address: ({ candidate }) => candidate.address,
    province: ({ candidate }) => candidate.province,
    district: ({ candidate }) => candidate.district,
    age: ({ candidate }) => candidate.age,
    linkedinUrl: ({ candidate }) => candidate.linkedinUrl,
    source: ({ candidate }) => candidate.source,
    description: ({ candidate }) => candidate.description,
    agreedSalary: ({ candidate }) => candidate.agreedSalary,
    agreedSalaryInWords: ({ candidate }) => candidate.agreedSalaryInWords,
    hireDate: ({ candidate }) => candidate.hireDate,
    salaryExpectation: ({ candidate }) => candidate.salaryExpectation,
    offerAcceptedDate: ({ candidate }) => candidate.offerAcceptedDate,
    applicationStartedDate: ({ candidate }) => candidate.applicationStartedDate,
    applicationCompletedDate: ({ candidate }) => candidate.applicationCompletedDate,
    registrationOrigin: ({ candidate }) => candidate.registrationOrigin,
    createdAt: ({ candidate }) => candidate.createdAt,
    firstApplicationAt: ({ candidate }) => candidate.firstApplicationAt,
    applicationCount: ({ candidate }) => candidate.applicationCount,
    metadataIa: ({ candidate }) => candidate.metadataIa,
    googleDriveFolderUrl: ({ candidate }) => candidate.googleDriveFolderName || candidate.googleDriveFolderId,
    attachmentNames: ({ candidate }) => {
        const names = (candidate.attachments || []).map(a => a.name).filter(Boolean);
        return names.length ? names.join(', ') : undefined;
    },
    attachmentUrls: ({ candidate }) => {
        const urls = (candidate.attachments || []).map(a => a.url).filter(Boolean);
        return urls.length ? urls.join('; ') : undefined;
    },
    processTitle: ({ process }) => process?.title,
    serviceOrderCode: ({ process }) => process?.serviceOrderCode,
    clientName: ({ process }) => process?.client?.razonSocial,
    processDescription: ({ process }) => process?.description,
    stageName: ({ candidate, process }) =>
        process?.stages.find(stage => stage.id === candidate.stageId)?.name,
    processStatus: ({ process }) => process?.status,
    processStartDate: ({ process }) => process?.startDate,
    processEndDate: ({ process }) => process?.endDate,
    vacancies: ({ process }) => process?.vacancies,
    salaryRange: ({ process }) => process?.salaryRange,
    psycholaboralSuitability: ({ candidate }) =>
        candidate.psycholaboralEvaluation?.suitabilityStatus,
    psycholaboralPositionApplied: ({ candidate }) =>
        candidate.psycholaboralEvaluation?.positionApplied,
    psycholaboralReportDate: ({ candidate }) => candidate.psycholaboralEvaluation?.reportDate,
    psycholaboralConclusions: ({ candidate }) => candidate.psycholaboralEvaluation?.conclusions,
    scoreIa: ({ candidate }) => candidate.scoreIa,
};

const IDENTITY_EXTRACTORS: Record<string, (candidate: Candidate) => unknown> = {
    fullName: candidate => candidate.name,
    dni: candidate => candidate.dni,
    email: candidate => candidate.email,
    phone: candidate => candidate.phone,
    phone2: candidate => candidate.phone2,
};

/** Convierte etiqueta de columna a clave camelCase usable en JSON. */
export function handoffKeyFromColumnName(name: string): string {
    const normalized = normalizeColumnNameKey(name)
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    if (!normalized) return '';
    const parts = normalized.split(/\s+/).filter(Boolean);
    const [first, ...rest] = parts;
    return (
        first +
        rest.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')
    );
}

function uniqueHandoffKey(base: string, used: Set<string>, columnId: string): string {
    let key = base || `col${columnId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}`;
    if (RESERVED_FIELD_KEYS.has(key) || used.has(key)) {
        key = `col_${key || columnId.slice(0, 8)}`;
    }
    let candidate = key;
    let n = 2;
    while (used.has(candidate) || RESERVED_FIELD_KEYS.has(candidate)) {
        candidate = `${key}_${n}`;
        n += 1;
    }
    used.add(candidate);
    return candidate;
}

function serializeCustomColumnValue(col: CustomColumn, raw: unknown): string | number | boolean | undefined {
    if (col.type === 'route') return undefined;
    if (col.type === 'route_cost') {
        const total = extractRouteCostTotal(raw);
        return total == null ? undefined : total;
    }
    if (col.type === 'checkbox') {
        if (raw === true || raw === false) return raw;
        const text = asString(raw)?.toLowerCase();
        if (!text) return undefined;
        if (['si', 'sí', 'true', '1', 'yes', 's'].includes(text)) return true;
        if (['no', 'false', '0', 'n'].includes(text)) return false;
        return undefined;
    }
    if (col.type === 'number') {
        if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
        const n = Number(asString(raw));
        return Number.isNaN(n) ? asString(raw) : n;
    }
    return asString(raw);
}

function collectCustomColumnFields(
    candidate: Candidate,
    process: Process | undefined,
    fields: Record<string, string | number | boolean>,
    fieldLabels: Record<string, string>,
    includedFieldKeys: string[]
): void {
    const customColumns = process?.bulkConfig?.customColumns || [];
    const legacyIdToName = buildLegacyColumnIdToName(process?.bulkConfig, customColumns);
    const row = candidate.bulkColumnValues || {};
    const usedKeys = new Set(Object.keys(fields));
    const coveredNameKeys = new Set<string>();

    for (const col of customColumns) {
        if (!col?.id || !col.name?.trim()) continue;
        if (col.type === 'route') continue;

        const raw = resolveColumnValueFromRow(row, col, legacyIdToName);
        const serialized = serializeCustomColumnValue(col, raw);
        if (!hasValue(serialized)) continue;

        coveredNameKeys.add(normalizeColumnNameKey(col.name));

        // Si la columna mapea a un campo canónico vacío, rellénalo también.
        const mapped = mapImportHeader(col.name.toLowerCase());
        if (
            mapped &&
            ALL_WORKER_HANDOFF_FIELD_KEYS.includes(mapped) &&
            !(mapped in IDENTITY_EXTRACTORS) &&
            !hasValue(fields[mapped])
        ) {
            putField(
                fields,
                fieldLabels,
                includedFieldKeys,
                mapped,
                serialized,
                CATALOG_FIELD_LABELS[mapped]
            );
            usedKeys.add(mapped);
        }

        const baseKey = handoffKeyFromColumnName(col.name);
        const key = uniqueHandoffKey(baseKey, usedKeys, col.id);
        fields[key] = serialized as string | number | boolean;
        fieldLabels[key] = col.name.trim();
        includedFieldKeys.push(key);
    }

    // Volcar el resto de bulk_column_values aunque falte customColumns en el proceso.
    collectRemainingBulkRowFields(
        row,
        fields,
        fieldLabels,
        includedFieldKeys,
        usedKeys,
        coveredNameKeys,
        customColumns.length === 0
    );
}

function serializeLooseBulkValue(raw: unknown): string | number | boolean | undefined {
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
    if (raw && typeof raw === 'object') {
        const total = extractRouteCostTotal(raw);
        if (total != null) return total;
        return undefined;
    }
    return asString(raw);
}

function collectRemainingBulkRowFields(
    row: Record<string, unknown>,
    fields: Record<string, string | number | boolean>,
    fieldLabels: Record<string, string>,
    includedFieldKeys: string[],
    usedKeys: Set<string>,
    coveredNameKeys: Set<string>,
    includeUuidKeys: boolean
): void {
    for (const [rawKey, rawVal] of Object.entries(row)) {
        const serialized = serializeLooseBulkValue(rawVal);
        if (!hasValue(serialized)) continue;

        let label: string;
        if (rawKey.startsWith(BULK_NAME_KEY_PREFIX)) {
            label = rawKey.slice(BULK_NAME_KEY_PREFIX.length);
        } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawKey)) {
            if (!includeUuidKeys) continue;
            label = `columna_${rawKey.slice(0, 8)}`;
        } else {
            label = rawKey;
        }

        const norm = normalizeColumnNameKey(label);
        if (coveredNameKeys.has(norm)) continue;

        const mapped = mapImportHeader(label.toLowerCase()) || mapImportHeader(norm);
        if (
            mapped &&
            ALL_WORKER_HANDOFF_FIELD_KEYS.includes(mapped) &&
            !(mapped in IDENTITY_EXTRACTORS) &&
            !hasValue(fields[mapped])
        ) {
            putField(
                fields,
                fieldLabels,
                includedFieldKeys,
                mapped,
                serialized,
                CATALOG_FIELD_LABELS[mapped]
            );
            usedKeys.add(mapped);
        }

        const baseKey = handoffKeyFromColumnName(label);
        const key = uniqueHandoffKey(baseKey, usedKeys, rawKey);
        fields[key] = serialized as string | number | boolean;
        fieldLabels[key] = label.trim();
        includedFieldKeys.push(key);
        coveredNameKeys.add(norm);
    }
}

export function fieldHasDataForCandidate(
    fieldKey: string,
    candidate: Candidate,
    process?: Process
): boolean {
    if (fieldKey === 'fullName') {
        const parts = resolveStructuredWorkerNameParts(candidate, process);
        return Boolean(parts.fullName);
    }
    if (fieldKey in IDENTITY_EXTRACTORS) {
        return hasValue(IDENTITY_EXTRACTORS[fieldKey](candidate));
    }
    const extract = FIELD_CATALOG[fieldKey];
    if (!extract) return false;
    return hasValue(extract({ candidate, process }));
}

export function countCandidatesWithFieldData(
    fieldKey: string,
    candidates: Candidate[],
    processById: Map<string, Process>
): number {
    let count = 0;
    for (const candidate of candidates) {
        const process = processById.get(candidate.processId);
        if (fieldHasDataForCandidate(fieldKey, candidate, process)) count++;
    }
    return count;
}

/** Cuenta cuántos campos con valor se enviarían (catálogo + columnas del proceso). */
export function countSendableFieldsForCandidate(
    candidate: Candidate,
    process?: Process
): number {
    const snapshot = buildWorkerSnapshot(candidate, process);
    return snapshot.meta.includedFieldKeys.length;
}

export interface BuildWorkerSnapshotOptions {
    /**
     * @deprecated Se ignoran: el handoff siempre envía todos los campos con valor.
     * Se mantiene por compatibilidad con callers existentes.
     */
    includedFields?: Iterable<string>;
}

/**
 * Congela un snapshot con toda la información disponible del candidato/proceso.
 * OpsFlow decide qué campos consumir; ATS no filtra por selección de UI.
 */
export function buildWorkerSnapshot(
    candidate: Candidate,
    process?: Process,
    _options?: BuildWorkerSnapshotOptions
): WorkerSnapshot {
    const identity: WorkerSnapshotIdentity = {};
    const includedFieldKeys: string[] = [];
    const fieldLabels: Record<string, string> = {};
    const nameParts = resolveStructuredWorkerNameParts(candidate, process);

    if (nameParts.nombres) identity.nombres = nameParts.nombres;
    if (nameParts.apellidoPaterno) identity.apellidoPaterno = nameParts.apellidoPaterno;
    if (nameParts.apellidoMaterno) identity.apellidoMaterno = nameParts.apellidoMaterno;

    for (const [key, extract] of Object.entries(IDENTITY_EXTRACTORS)) {
        if (key === 'fullName') {
            const composed =
                nameParts.fullName || asString(extract(candidate)) || undefined;
            if (composed) {
                identity.fullName = composed;
                includedFieldKeys.push(key);
                fieldLabels[key] = CATALOG_FIELD_LABELS[key] || 'Nombre completo';
            }
            continue;
        }

        const raw = extract(candidate);
        const text = asString(raw);
        if (key === 'dni' && text) identity.dni = text;
        if (key === 'email' && text) identity.email = text;
        if (key === 'phone' && text) identity.phone = text;
        if (key === 'phone2' && text) identity.phone2 = text;
        if (hasValue(raw)) {
            includedFieldKeys.push(key);
            if (CATALOG_FIELD_LABELS[key]) fieldLabels[key] = CATALOG_FIELD_LABELS[key];
        }
    }

    if (!identity.fullName && nameParts.fullName) {
        identity.fullName = nameParts.fullName;
        if (!includedFieldKeys.includes('fullName')) includedFieldKeys.push('fullName');
        fieldLabels.fullName = CATALOG_FIELD_LABELS.fullName || 'Nombre completo';
    }

    const fields: Record<string, string | number | boolean> = {};
    const ctx = { candidate, process };

    for (const [key, extract] of Object.entries(FIELD_CATALOG)) {
        putField(fields, fieldLabels, includedFieldKeys, key, extract(ctx));
    }

    collectCustomColumnFields(candidate, process, fields, fieldLabels, includedFieldKeys);

    return {
        identity,
        fields,
        meta: {
            sourceCandidateId: candidate.id,
            sourceProcessId: candidate.processId,
            sourceApp: APP_NAME,
            snapshotVersion: SNAPSHOT_VERSION,
            includedFieldKeys,
            fieldLabels,
            capturedAt: new Date().toISOString(),
        },
    };
}

export function getWorkerDisplayName(snapshot: WorkerSnapshot): string {
    const composed = composeWorkerFullName(
        snapshot.identity.nombres,
        snapshot.identity.apellidoPaterno,
        snapshot.identity.apellidoMaterno
    );
    return composed || snapshot.identity.fullName || snapshot.identity.dni || 'Sin nombre';
}

export function validateSnapshotForSend(snapshot: WorkerSnapshot): string | null {
    if (
        snapshot.identity.fullName ||
        snapshot.identity.nombres ||
        snapshot.identity.dni
    ) {
        return null;
    }
    return 'El candidato debe tener al menos nombre o DNI.';
}

export const ACTIVE_PACKAGE_STATUSES = ['sent', 'received', 'processing'] as const;

export const PACKAGE_STATUS_LABELS: Record<string, string> = {
    sent: 'Enviado',
    received: 'Recibido',
    processing: 'En proceso',
    completed: 'Completado',
    rejected: 'Rechazado',
    partially_completed: 'Parcialmente completado',
};

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
    pending: 'Entregando…',
    delivered: 'Entregado a OpsFlow',
    failed: 'Error de entrega',
};

/** @deprecated Preferencias de selección ya no se usan; el envío incluye todos los campos. */
export function getDefaultWorkerHandoffFieldKeys(): string[] {
    return [...ALL_WORKER_HANDOFF_FIELD_KEYS];
}

/** @deprecated */
export function loadSavedWorkerHandoffFieldKeys(): string[] {
    return getDefaultWorkerHandoffFieldKeys();
}

/** @deprecated */
export function saveWorkerHandoffFieldKeys(_keys: string[]): void {
    // no-op: siempre se envían todos los campos con valor
}

/** @deprecated */
export function validateFieldSelection(_includedFields: Set<string>): string | null {
    return null;
}
