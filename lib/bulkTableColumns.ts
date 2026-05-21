import { BulkProcessConfig, CustomColumn } from '../types';

const BULK_NAME_KEY_PREFIX = '__name__';

/** Normaliza nombre de columna para claves estables (sin acentos, minúsculas) */
export function normalizeColumnNameKey(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

/** Clave estable en bulk_column_values basada en el nombre de la columna */
export function bulkColumnNameKey(name: string): string {
    return `${BULK_NAME_KEY_PREFIX}${normalizeColumnNameKey(name)}`;
}

/** IDs de columna conocidos en plantillas guardadas en localStorage */
function loadTemplateColumnIdToName(): Record<string, string> {
    const out: Record<string, string> = {};
    try {
        const saved = localStorage.getItem('bulkProcessesTableTemplates');
        if (!saved) return out;
        const templates = JSON.parse(saved) as { columns?: { id: string; name: string }[] }[];
        for (const t of templates) {
            for (const c of t.columns || []) {
                if (c.id && c.name) out[c.id] = c.name;
            }
        }
    } catch {
        /* ignore */
    }
    return out;
}

/** Mapa id → nombre para resolver valores guardados con IDs antiguos o de plantillas */
export function buildLegacyColumnIdToName(
    bulkConfig: BulkProcessConfig | undefined,
    customColumns: CustomColumn[] = []
): Record<string, string> {
    const out: Record<string, string> = {
        ...loadTemplateColumnIdToName(),
        ...(bulkConfig?.columnKeyAliases || {}),
        ...loadGlobalCustomColumnIdToName(),
        ...buildLegacyFromColumnOrder(bulkConfig, customColumns),
    };
    for (const col of customColumns) {
        out[col.id] = col.name;
    }
    for (const col of bulkConfig?.customColumns || []) {
        out[col.id] = col.name;
    }
    return out;
}

/** Columnas globales guardadas en localStorage (pueden tener IDs históricos) */
function loadGlobalCustomColumnIdToName(): Record<string, string> {
    const out: Record<string, string> = {};
    try {
        const saved = localStorage.getItem('bulkProcessesCustomColumns');
        if (!saved) return out;
        const cols = JSON.parse(saved) as { id: string; name: string }[];
        for (const c of cols) {
            if (c.id && c.name) out[c.id] = c.name;
        }
    } catch {
        /* ignore */
    }
    return out;
}

/**
 * Si columnOrder tiene IDs antiguos (p. ej. tras recrear columnas),
 * mapea cada slot al nombre de la columna en la misma posición.
 */
export function buildLegacyFromColumnOrder(
    bulkConfig: BulkProcessConfig | undefined,
    customColumns: CustomColumn[] = []
): Record<string, string> {
    const aliases: Record<string, string> = {};
    if (!bulkConfig?.columnOrder?.length || customColumns.length === 0) return aliases;

    const customSlotIds = bulkConfig.columnOrder
        .filter(id => id.startsWith('custom_'))
        .map(id => id.slice('custom_'.length));

    customSlotIds.forEach((slotId, idx) => {
        const col = customColumns.find(c => c.id === slotId);
        if (col) {
            aliases[slotId] = col.name;
        } else if (idx < customColumns.length) {
            aliases[slotId] = customColumns[idx].name;
        }
    });
    return aliases;
}

/**
 * Detecta claves huérfanas en bulk_column_values y las asocia a columnas vacías
 * (misma cantidad → emparejamiento por orden de creación del ID).
 */
export function discoverOrphanKeyAliases(
    allDbValues: Record<string, Record<string, unknown>>,
    customColumns: CustomColumn[],
    existingAliases: Record<string, string> = {}
): Record<string, string> {
    const aliases = { ...existingAliases };
    const currentIds = new Set(customColumns.map(c => c.id));

    const orphanKeys = new Set<string>();
    for (const row of Object.values(allDbValues)) {
        for (const [k, v] of Object.entries(row)) {
            if (currentIds.has(k) || k.startsWith(BULK_NAME_KEY_PREFIX) || aliases[k]) continue;
            if (!isEmptyBulkValue(v) || v === false) orphanKeys.add(k);
        }
    }

    const unmappedOrphans = [...orphanKeys].filter(k => !aliases[k]).sort();
    if (unmappedOrphans.length === 0) return aliases;

    const emptyCols = customColumns.filter(col =>
        !Object.values(allDbValues).some(row => {
            const v = resolveColumnValueFromRow(row, col, aliases);
            return !isEmptyBulkValue(v) || v === false;
        })
    );

    if (unmappedOrphans.length !== emptyCols.length) return aliases;

    unmappedOrphans.forEach((key, i) => {
        aliases[key] = emptyCols[i].name;
    });
    return aliases;
}

export function getColumnValuesBackupStorageKey(processId: string): string {
    return `${getColumnValuesStorageKey(processId)}_backup`;
}

/** Lee valores locales (activos + respaldo) sin borrarlos */
export function loadLocalColumnValuesForProcess(
    processId: string
): Record<string, Record<string, any>> {
    const merged: Record<string, Record<string, any>> = {};
    const keys = [
        getColumnValuesStorageKey(processId),
        getColumnValuesBackupStorageKey(processId),
    ];
    for (const key of keys) {
        try {
            const saved = localStorage.getItem(key);
            if (!saved) continue;
            const parsed = JSON.parse(saved) as Record<string, Record<string, any>>;
            for (const [candidateId, values] of Object.entries(parsed)) {
                if (!values) continue;
                merged[candidateId] = { ...(merged[candidateId] || {}), ...values };
            }
        } catch {
            /* ignore */
        }
    }
    return merged;
}

/** Fusiona fuentes: BD + local. No sobrescribe celdas que ya tienen valor. */
export function mergeColumnValueSources(
    dbValues: Record<string, Record<string, any>>,
    localValues: Record<string, Record<string, any>>,
    customColumns: CustomColumn[] = [],
    legacyIdToName: Record<string, string> = {}
): Record<string, Record<string, any>> {
    const candidateIds = new Set([...Object.keys(dbValues), ...Object.keys(localValues)]);
    const merged: Record<string, Record<string, any>> = {};

    for (const candidateId of candidateIds) {
        const dbRow = dbValues[candidateId] || {};
        const localRow = localValues[candidateId] || {};
        const combined = { ...localRow, ...dbRow };

        for (const col of customColumns) {
            const fromDb = resolveColumnValueFromRow(dbRow, col, legacyIdToName);
            const fromLocal = resolveColumnValueFromRow(localRow, col, legacyIdToName);
            const dbHas = !isEmptyBulkValue(fromDb) || fromDb === false;
            const localHas = !isEmptyBulkValue(fromLocal) || fromLocal === false;

            if (dbHas) {
                combined[col.id] = fromDb;
                combined[bulkColumnNameKey(col.name)] = fromDb;
            } else if (localHas) {
                combined[col.id] = fromLocal;
                combined[bulkColumnNameKey(col.name)] = fromLocal;
            }
        }
        merged[candidateId] = combined;
    }

    return normalizeBulkColumnValueKeys(merged, customColumns, legacyIdToName);
}

function isEmptyBulkValue(val: unknown): boolean {
    return val === undefined || val === null || val === '';
}

export function hasBulkCellValue(val: unknown): boolean {
    return !isEmptyBulkValue(val) || val === false;
}

/** Añade claves por nombre además del id de columna (persistencia estable) */
export function enrichBulkColumnValuesForStorage(
    values: Record<string, unknown>,
    customColumns: CustomColumn[] = []
): Record<string, unknown> {
    const out: Record<string, unknown> = { ...values };
    for (const col of customColumns) {
        const v = values[col.id];
        if (!isEmptyBulkValue(v) || v === false) {
            out[col.id] = v;
            out[bulkColumnNameKey(col.name)] = v;
        }
    }
    for (const [key, val] of Object.entries(values)) {
        if (key.startsWith(BULK_NAME_KEY_PREFIX)) continue;
        const col = customColumns.find(c => c.id === key);
        if (col && !isEmptyBulkValue(val)) {
            out[bulkColumnNameKey(col.name)] = val;
        }
    }
    return out;
}

/** Lee un valor de fila JSONB resolviendo id, nombre y IDs legacy */
export function resolveColumnValueFromRow(
    row: Record<string, unknown> | undefined,
    col: CustomColumn,
    legacyIdToName: Record<string, string> = {}
): unknown {
    if (!row) return undefined;

    const idVal = row[col.id];
    if (!isEmptyBulkValue(idVal) || idVal === false) return idVal;

    const nameKey = bulkColumnNameKey(col.name);
    const nameVal = row[nameKey];
    if (!isEmptyBulkValue(nameVal) || nameVal === false) return nameVal;

    const bare = normalizeColumnNameKey(col.name);
    for (const [k, v] of Object.entries(row)) {
        if (k.startsWith(BULK_NAME_KEY_PREFIX)) {
            const nk = k.slice(BULK_NAME_KEY_PREFIX.length);
            if (nk === bare && (!isEmptyBulkValue(v) || v === false)) return v;
            continue;
        }
        if (normalizeColumnNameKey(k) === bare && (!isEmptyBulkValue(v) || v === false)) return v;
    }

    const currentIds = new Set([col.id]);
    for (const [key, val] of Object.entries(row)) {
        if (currentIds.has(key) || key.startsWith(BULK_NAME_KEY_PREFIX)) continue;
        if (isEmptyBulkValue(val) && val !== false) continue;
        const legacyName = legacyIdToName[key];
        if (legacyName && normalizeColumnNameKey(legacyName) === bare) return val;
    }

    return undefined;
}

export interface BaseColumn {
    id: string;
    label: string;
    importKey?: string;
}

export const BASE_COLUMNS: BaseColumn[] = [
    { id: 'name', label: 'Nombre', importKey: 'name' },
    { id: 'dni', label: 'DNI', importKey: 'dni' },
    { id: 'email', label: 'Email', importKey: 'email' },
    { id: 'scoreIa', label: 'Score IA' },
    { id: 'status', label: 'Status' },
    { id: 'phone', label: 'Teléfono', importKey: 'phone' },
    { id: 'source', label: 'Fuente', importKey: 'source' },
    { id: 'province', label: 'Provincia', importKey: 'province' },
    { id: 'district', label: 'Distrito', importKey: 'district' },
    { id: 'createdAt', label: 'Fecha creación' },
    { id: 'lastInteraction', label: 'Última Interacción' },
    { id: 'contact', label: 'Contacto' },
    { id: 'nextInterview', label: 'Próxima Entrevista' },
    { id: 'schedule', label: 'Agendar' },
    { id: 'stage', label: 'Etapa' },
];

export const DEFAULT_COLUMN_ORDER = BASE_COLUMNS.map(c => c.id);

/** Ancho estimado para columnas sticky (px) */
export const CHECKBOX_COL_WIDTH = 32;

export const COLUMN_WIDTHS: Record<string, number> = {
    name: 130,
    dni: 72,
    email: 140,
    scoreIa: 64,
    status: 72,
    phone: 96,
    source: 88,
    province: 88,
    district: 88,
    createdAt: 120,
    lastInteraction: 120,
    contact: 72,
    nextInterview: 100,
    schedule: 56,
    stage: 120,
};

export const COMPACT_TD_CLASS = 'px-1.5 py-0.5 text-xs text-gray-700 whitespace-nowrap leading-tight';
export const COMPACT_TH_CLASS = 'px-1.5 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap';

export function getColumnWidth(colId: string): number {
    if (colId.startsWith('custom_')) return 100;
    return COLUMN_WIDTHS[colId] ?? 96;
}

/** Calcula `left` para position:sticky. null = no sticky */
export function getStickyLeftOffset(
    target: 'checkbox' | string,
    visibleColumns: string[],
    pinnedColumns: string[]
): number | null {
    if (target === 'checkbox') return 0;
    if (!pinnedColumns.includes(target)) return null;

    let left = CHECKBOX_COL_WIDTH;
    for (const colId of visibleColumns) {
        if (colId === target) break;
        if (pinnedColumns.includes(colId)) {
            left += getColumnWidth(colId);
        }
    }
    return left;
}

export function getStickyColumnStyle(
    target: 'checkbox' | string,
    visibleColumns: string[],
    pinnedColumns: string[],
    isHeader: boolean,
    bgColor?: string
): { position: 'sticky'; left: number; top?: number; zIndex: number; minWidth: number; maxWidth: number; backgroundColor: string; boxShadow?: string } | undefined {
    const left = getStickyLeftOffset(target, visibleColumns, pinnedColumns);
    if (left === null && target !== 'checkbox') return undefined;
    const offset = target === 'checkbox' ? 0 : left!;
    const isPinned = target === 'checkbox' || pinnedColumns.includes(target);
    if (!isPinned && target !== 'checkbox') return undefined;

    return {
        position: 'sticky',
        left: offset,
        ...(isHeader ? { top: 0 } : {}),
        zIndex: isHeader
            ? (target === 'checkbox' ? 40 : 35)
            : (target === 'checkbox' ? 20 : 15),
        minWidth: target === 'checkbox' ? CHECKBOX_COL_WIDTH : getColumnWidth(target),
        maxWidth: target === 'checkbox' ? CHECKBOX_COL_WIDTH : getColumnWidth(target),
        backgroundColor: bgColor ?? (isHeader ? '#f9fafb' : '#ffffff'),
        boxShadow: isPinned && (target !== 'checkbox' || pinnedColumns.length > 0)
            ? '2px 0 4px -2px rgba(0,0,0,0.12)'
            : undefined,
    };
}

export const IMPORT_FIELD_ALIASES: Record<string, string> = {
    name: 'name',
    nombre: 'name',
    email: 'email',
    correo: 'email',
    phone: 'phone',
    teléfono: 'phone',
    telefono: 'phone',
    phone2: 'phone2',
    'teléfono 2': 'phone2',
    telefono2: 'phone2',
    'teléfono2': 'phone2',
    description: 'description',
    descripción: 'description',
    descripcion: 'description',
    source: 'source',
    fuente: 'source',
    salaryexpectation: 'salaryExpectation',
    'expectativa salarial': 'salaryExpectation',
    expectativasalarial: 'salaryExpectation',
    agreedsalary: 'agreedSalary',
    'salario acordado': 'agreedSalary',
    salarioacordado: 'agreedSalary',
    age: 'age',
    edad: 'age',
    dni: 'dni',
    linkedinurl: 'linkedinUrl',
    linkedin: 'linkedinUrl',
    address: 'address',
    dirección: 'address',
    direccion: 'address',
    province: 'province',
    provincia: 'province',
    district: 'district',
    distrito: 'district',
};

export const OPTIONAL_IMPORT_FIELDS = [
    'phone', 'phone2', 'description', 'source', 'salaryExpectation',
    'agreedSalary', 'age', 'dni', 'linkedinUrl', 'address', 'province', 'district',
];

export function getCustomColumnIds(customColumns: CustomColumn[] = []): string[] {
    return customColumns.map(c => `custom_${c.id}`);
}

export function buildAllColumnIds(customColumns: CustomColumn[] = []): string[] {
    return [...DEFAULT_COLUMN_ORDER, ...getCustomColumnIds(customColumns)];
}

export function resolveColumnOrder(
    bulkConfig?: BulkProcessConfig,
    customColumns: CustomColumn[] = []
): string[] {
    const allIds = buildAllColumnIds(customColumns);

    if (bulkConfig?.columnOrder?.length) {
        const ordered = bulkConfig.columnOrder.filter(id => allIds.includes(id));
        const missing = allIds.filter(id => !ordered.includes(id));
        return [...ordered, ...missing];
    }

    return allIds;
}

export function getColumnLabel(
    colId: string,
    customColumns: CustomColumn[] = []
): string {
    if (colId.startsWith('custom_')) {
        const customCol = customColumns.find(c => c.id === colId.replace('custom_', ''));
        return customCol?.name || colId;
    }
    return BASE_COLUMNS.find(c => c.id === colId)?.label || colId;
}

export function isColumnVisible(colId: string, bulkConfig?: BulkProcessConfig): boolean {
    const hiddenColumns = new Set(bulkConfig?.hiddenColumns || []);
    return !hiddenColumns.has(colId);
}

export function isScoreIaColumnVisible(bulkConfig?: BulkProcessConfig): boolean {
    return isColumnVisible('scoreIa', bulkConfig);
}

/** Filtrado automático por score IA: solo aplica si la columna Score IA está visible. */
export function shouldApplyScoreAutoFilter(bulkConfig?: BulkProcessConfig): boolean {
    if (!isScoreIaColumnVisible(bulkConfig)) return false;
    return !!(bulkConfig?.autoFilterEnabled && bulkConfig.scoreThreshold !== undefined);
}

export function getImportHeaders(
    bulkConfig?: BulkProcessConfig
): { header: string; field: string; isCustom: boolean; columnId?: string }[] {
    const customColumns = bulkConfig?.customColumns || [];
    const hiddenColumns = new Set(bulkConfig?.hiddenColumns || []);
    const columnOrder = resolveColumnOrder(bulkConfig, customColumns);

    const headers: { header: string; field: string; isCustom: boolean; columnId?: string }[] = [];

    columnOrder.forEach(colId => {
        if (hiddenColumns.has(colId)) return;

        if (colId.startsWith('custom_')) {
            const customCol = customColumns.find(c => c.id === colId.replace('custom_', ''));
            if (customCol) {
                headers.push({
                    header: customCol.name,
                    field: customCol.name,
                    isCustom: true,
                    columnId: customCol.id,
                });
            }
            return;
        }

        const baseCol = BASE_COLUMNS.find(c => c.id === colId);
        if (baseCol?.importKey) {
            headers.push({
                header: baseCol.importKey,
                field: baseCol.importKey,
                isCustom: false,
            });
        }
    });

    return headers;
}

export function mapImportHeader(header: string): string | null {
    const normalized = header.trim().toLowerCase();
    return IMPORT_FIELD_ALIASES[normalized] || null;
}

/** Campos estándar que deben persistir en BD aunque exista columna personalizada con el mismo nombre */
export const DB_PRIORITY_IMPORT_FIELDS = ['source', 'province', 'district'] as const;
export type DbPriorityImportField = typeof DB_PRIORITY_IMPORT_FIELDS[number];

export function isPlaceholderImportEmail(email?: string | null): boolean {
    if (!email) return false;
    return /@import\.opalo$/i.test(email) || /^sin-email\./i.test(email);
}

export function getDisplayEmail(email?: string | null): string | null {
    if (!email || isPlaceholderImportEmail(email)) return null;
    return email;
}

export function resolveStandardFieldValue(
    field: DbPriorityImportField,
    candidateId: string,
    candidate: { source?: string; province?: string; district?: string },
    columnValues: Record<string, Record<string, any>>,
    customColumns: { id: string; name: string }[]
): string {
    const dbValue = candidate[field];
    if (dbValue) return dbValue;
    for (const col of customColumns) {
        if (mapImportHeader(col.name.toLowerCase()) === field) {
            const stored = columnValues[candidateId]?.[col.id];
            if (stored !== undefined && stored !== null && stored !== '') return String(stored);
        }
    }
    return '';
}

export function getColumnValuesStorageKey(processId: string): string {
    return `bulkColumnValues_${processId}`;
}

/** Fusiona valores de BD (bulk_column_values) en el estado de columnValues */
export function mergeColumnValuesFromCandidates(
    prev: Record<string, Record<string, any>>,
    candidates: { id: string; bulkColumnValues?: Record<string, unknown> }[],
    customColumns: CustomColumn[] = [],
    legacyIdToName: Record<string, string> = {}
): Record<string, Record<string, any>> {
    const merged = { ...prev };
    for (const c of candidates) {
        if (!c.bulkColumnValues || Object.keys(c.bulkColumnValues).length === 0) continue;
        const normalized = normalizeBulkColumnValueKeys(
            { [c.id]: c.bulkColumnValues as Record<string, any> },
            customColumns,
            legacyIdToName
        );
        merged[c.id] = { ...(merged[c.id] || {}), ...(normalized[c.id] || {}) };
    }
    return repairDateColumnValues(merged, customColumns);
}

/** Normaliza claves: nombre, IDs legacy y plantillas → id de columna actual */
export function normalizeBulkColumnValueKeys(
    valuesByCandidate: Record<string, Record<string, any>>,
    customColumns: CustomColumn[] = [],
    legacyIdToName: Record<string, string> = {}
): Record<string, Record<string, any>> {
    if (customColumns.length === 0) return valuesByCandidate;

    const currentIds = new Set(customColumns.map(c => c.id));
    const normalized: Record<string, Record<string, any>> = {};

    for (const [candidateId, values] of Object.entries(valuesByCandidate)) {
        const row: Record<string, any> = { ...values };

        for (const col of customColumns) {
            const resolved = resolveColumnValueFromRow(values, col, legacyIdToName);
            if (!isEmptyBulkValue(resolved) || resolved === false) {
                row[col.id] = resolved;
                row[bulkColumnNameKey(col.name)] = resolved;
            }
        }

        for (const [key, val] of Object.entries(values)) {
            if (isEmptyBulkValue(val) && val !== false) continue;
            if (currentIds.has(key) || key.startsWith(BULK_NAME_KEY_PREFIX)) continue;

            const legacyName = legacyIdToName[key];
            if (legacyName) {
                const col = customColumns.find(
                    c => normalizeColumnNameKey(c.name) === normalizeColumnNameKey(legacyName)
                );
                if (col && (isEmptyBulkValue(row[col.id]) && row[col.id] !== false)) {
                    row[col.id] = val;
                    row[bulkColumnNameKey(col.name)] = val;
                }
                continue;
            }

            const colByBareName = customColumns.find(
                c => normalizeColumnNameKey(c.name) === normalizeColumnNameKey(key)
            );
            if (colByBareName && (isEmptyBulkValue(row[colByBareName.id]) && row[colByBareName.id] !== false)) {
                row[colByBareName.id] = val;
                row[bulkColumnNameKey(colByBareName.name)] = val;
            }
        }

        normalized[candidateId] = row;
    }
    return normalized;
}

const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);

function formatDateParts(day: number, month: number, year: number): string {
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function isLikelyExcelSerial(n: number): boolean {
    return Number.isFinite(n) && n >= 1 && n <= 60000;
}

/** Convierte número serial de Excel (días desde 30/12/1899) a Date UTC */
export function excelSerialToDate(serial: number): Date {
    return new Date(EXCEL_EPOCH_UTC_MS + Math.round(serial) * 86400000);
}

type BulkDateInput = string | number | Date | undefined | null;

/** Formato de visualización: DD/MM/AAAA. Soporta seriales de Excel y fechas corruptas. */
export function formatBulkDate(value: BulkDateInput): string {
    if (value === undefined || value === null || value === '') return '';

    if (value instanceof Date && !isNaN(value.getTime())) {
        return formatDateParts(value.getUTCDate(), value.getUTCMonth() + 1, value.getUTCFullYear());
    }

    if (typeof value === 'number' && isLikelyExcelSerial(value)) {
        const d = excelSerialToDate(value);
        return formatDateParts(d.getUTCDate(), d.getUTCMonth() + 1, d.getUTCFullYear());
    }

    const trimmed = String(value).trim();
    if (!trimmed) return '';

    // Corregir fechas corruptas: 01/01/33970 (serial de Excel usado como año)
    const corrupted = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{5,})$/);
    if (corrupted) {
        const serial = parseInt(corrupted[3], 10);
        if (isLikelyExcelSerial(serial)) {
            const d = excelSerialToDate(serial);
            return formatDateParts(d.getUTCDate(), d.getUTCMonth() + 1, d.getUTCFullYear());
        }
    }

    // Serial de Excel como texto (ej. "33970" o "33970.0")
    if (/^\d{4,5}(\.0+)?$/.test(trimmed)) {
        const serial = Math.round(parseFloat(trimmed));
        if (isLikelyExcelSerial(serial)) {
            const d = excelSerialToDate(serial);
            return formatDateParts(d.getUTCDate(), d.getUTCMonth() + 1, d.getUTCFullYear());
        }
    }

    const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const y = parseInt(year, 10);
        if (y >= 1900 && y <= 2100) {
            return formatDateParts(parseInt(day, 10), parseInt(month, 10), y);
        }
    }

    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
        const [, year, month, day] = iso;
        return formatDateParts(parseInt(day, 10), parseInt(month, 10), parseInt(year, 10));
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        if (y >= 1900 && y <= 2100) {
            return formatDateParts(parsed.getDate(), parsed.getMonth() + 1, y);
        }
    }

    return trimmed;
}

/** Normaliza entrada del usuario o importación a DD/MM/AAAA */
export function normalizeBulkDateInput(value: BulkDateInput): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string' && !value.trim()) return '';
    return formatBulkDate(value);
}

/** Repara fechas almacenadas en columnValues para columnas tipo date */
export function repairDateColumnValues(
    columnValues: Record<string, Record<string, any>>,
    customColumns: CustomColumn[]
): Record<string, Record<string, any>> {
    const dateCols = customColumns.filter(c => c.type === 'date');
    if (dateCols.length === 0) return columnValues;

    let changed = false;
    const repaired: Record<string, Record<string, any>> = {};

    for (const [candidateId, values] of Object.entries(columnValues)) {
        const row = { ...values };
        for (const col of dateCols) {
            const raw = row[col.id];
            if (raw === undefined || raw === null || raw === '') continue;
            const fixed = normalizeBulkDateInput(raw);
            if (fixed && fixed !== raw) {
                row[col.id] = fixed;
                changed = true;
            }
        }
        repaired[candidateId] = row;
    }

    return changed ? repaired : columnValues;
}

/** Columnas donde se permite pegar desde portapapeles */
export function isPasteEditableColumn(colId: string): boolean {
    if (colId.startsWith('custom_')) return true;
    return ['name', 'dni', 'email', 'phone', 'source', 'province', 'district', 'lastInteraction'].includes(colId);
}

/** Formato: "lun 15/05/2026 14:30" */
export function formatBulkDateTime(iso?: string | null): string {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    const dayName = d.toLocaleDateString('es-PE', { weekday: 'short' });
    const date = d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    return `${dayName} ${date} ${time}`;
}

export function isoToDatetimeLocalValue(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToIso(value: string): string | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
}

export function parseBulkDateTimeInput(value: string): string | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (ddmmyyyy) {
        const [, day, month, year, hour = '0', minute = '0'] = ddmmyyyy;
        const d = new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            parseInt(hour, 10),
            parseInt(minute, 10)
        );
        if (!isNaN(d.getTime())) return d.toISOString();
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString();
    return undefined;
}

/** Parsea texto copiado de Excel/Sheets (TSV) o una columna simple */
export function parseClipboardGrid(text: string): string[][] {
    return text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .filter(row => row.length > 0)
        .map(row => row.split('\t'));
}

export function formatCustomCellDisplay(value: any, col: CustomColumn): string {
    if (col.type === 'checkbox') {
        if (value === true) return 'Sí';
        if (value === false) return 'No';
        return '-';
    }
    if (col.type === 'date') return formatBulkDate(value) || '-';
    if (value === undefined || value === null || value === '') return '-';
    return String(value);
}

export function parseCustomCellInput(rawValue: string, col: CustomColumn): any {
    const trimmed = rawValue.trim();
    if (!trimmed) return '';
    if (col.type === 'number') {
        const n = Number(trimmed);
        return isNaN(n) ? trimmed : n;
    }
    if (col.type === 'checkbox') {
        return ['true', '1', 'si', 'sí', 'yes', 's'].includes(trimmed.toLowerCase());
    }
    if (col.type === 'date') return normalizeBulkDateInput(trimmed);
    if (col.type === 'select' && col.options?.length) {
        const match = col.options.find(o => o.toLowerCase() === trimmed.toLowerCase());
        return match ?? trimmed;
    }
    return trimmed;
}
