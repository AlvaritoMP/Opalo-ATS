import { BulkProcessConfig, CustomColumn, FieldMapping, Process } from '../types';
import { normalizeImportTextCase } from './importTextCase.js';
import { migrateBulkColumnOrder, CONTACT_COLUMN_IDS, CONTACT_LAST_USER_COLUMN_ID } from './contactChannelConfig';
import { ensureHiredStageUserColumnInOrder, HIRED_STAGE_USER_COLUMN_ID } from './hiringStageTracking';
import { APP_NAME } from './appConfig';

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

/** Lee valores locales (activos + respaldo + cualquier clave bulkColumnValues del proceso) */
export function loadLocalColumnValuesForProcess(
    processId: string
): Record<string, Record<string, any>> {
    const merged: Record<string, Record<string, any>> = {};
    const prefix = getColumnValuesStorageKey(processId);
    const keys = new Set<string>([
        prefix,
        getColumnValuesBackupStorageKey(processId),
    ]);

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (key === prefix || key.startsWith(`${prefix}_`)) {
                keys.add(key);
            }
        }
    } catch {
        /* ignore */
    }

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

export interface LocalColumnBackupInfo {
    storageKey: string;
    candidateCount: number;
    valueCount: number;
    sampleColumns: string[];
}

/** Escanea todas las copias locales de columnas para un proceso */
export function scanLocalColumnBackups(
    processId: string,
    legacyIdToName: Record<string, string> = {},
    customColumns: CustomColumn[] = []
): LocalColumnBackupInfo[] {
    const prefix = getColumnValuesStorageKey(processId);
    const found: LocalColumnBackupInfo[] = [];

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || (!key.startsWith(prefix) && key !== prefix)) continue;
            try {
                const parsed = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, Record<string, any>>;
                let valueCount = 0;
                const colNames = new Set<string>();
                for (const row of Object.values(parsed)) {
                    if (!row) continue;
                    for (const [k, v] of Object.entries(row)) {
                        if (!hasBulkCellValue(v)) continue;
                        valueCount++;
                        const name = legacyIdToName[k] || customColumns.find(c => c.id === k)?.name || k;
                        colNames.add(name);
                    }
                }
                found.push({
                    storageKey: key,
                    candidateCount: Object.keys(parsed).length,
                    valueCount,
                    sampleColumns: [...colNames].slice(0, 8),
                });
            } catch {
                /* ignore */
            }
        }
    } catch {
        /* ignore */
    }
    return found.sort((a, b) => b.valueCount - a.valueCount);
}

/** Guarda copia local de columnas (respaldo en navegador) */
export function persistLocalColumnValues(
    processId: string,
    values: Record<string, Record<string, any>>
): void {
    if (Object.keys(values).length === 0) return;
    try {
        const key = getColumnValuesStorageKey(processId);
        localStorage.setItem(key, JSON.stringify(values));
        localStorage.setItem(getColumnValuesBackupStorageKey(processId), JSON.stringify(values));
    } catch {
        /* ignore quota errors */
    }
}

/** Cuenta celdas recuperables para columnas concretas */
export function countRecoverableForColumns(
    localValues: Record<string, Record<string, any>>,
    customColumns: CustomColumn[],
    legacyIdToName: Record<string, string> = {}
): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const col of customColumns) counts[col.name] = 0;
    for (const row of Object.values(localValues)) {
        for (const col of customColumns) {
            const v = resolveColumnValueFromRow(row, col, legacyIdToName);
            if (hasBulkCellValue(v)) counts[col.name]++;
        }
    }
    return counts;
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
    { id: 'contactEmail', label: 'Correo' },
    { id: 'scoreIa', label: 'Score IA' },
    { id: 'profileMatch', label: '% Perfil' },
    { id: 'status', label: 'Status' },
    { id: 'phone', label: 'Teléfono', importKey: 'phone' },
    { id: 'contactPhone', label: 'Llamadas' },
    { id: 'contactWhatsapp', label: 'WhatsApp' },
    { id: 'contactLastUser', label: 'Últ. contacto por' },
    { id: 'source', label: 'Fuente', importKey: 'source' },
    { id: 'province', label: 'Provincia', importKey: 'province' },
    { id: 'district', label: 'Distrito', importKey: 'district' },
    { id: 'createdAt', label: 'Fecha creación' },
    { id: 'nextInterview', label: 'Próxima Entrevista' },
    { id: 'schedule', label: 'Agendar' },
    { id: 'stage', label: 'Etapa' },
    { id: 'hiredStageUser', label: 'Ingreso por' },
];

export const DEFAULT_COLUMN_ORDER = BASE_COLUMNS.map(c => c.id);

/** Ancho estimado para columnas sticky (px) */
export const CHECKBOX_COL_WIDTH = 32;

export const COLUMN_WIDTHS: Record<string, number> = {
    name: 130,
    dni: 72,
    email: 140,
    scoreIa: 64,
    profileMatch: 72,
    status: 72,
    phone: 96,
    contactPhone: 100,
    contactWhatsapp: 100,
    contactEmail: 100,
    contactLastUser: 108,
    source: 88,
    province: 88,
    district: 88,
    createdAt: 120,
    nextInterview: 100,
    schedule: 56,
    stage: 120,
    hiredStageUser: 112,
};

export const COMPACT_TD_CLASS = 'px-1.5 py-0.5 text-xs text-gray-700 whitespace-nowrap leading-tight';
export const COMPACT_TH_CLASS = 'px-1.5 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap';

export function getColumnWidth(colId: string, overrides?: Record<string, number>): number {
    if (overrides?.[colId] != null) return overrides[colId];
    if (colId.startsWith('custom_')) return 100;
    return COLUMN_WIDTHS[colId] ?? 96;
}

export function getColumnWidthStyle(colId: string, overrides?: Record<string, number>): {
    width: number;
    minWidth: number;
    maxWidth: number;
} {
    const w = getColumnWidth(colId, overrides);
    return { width: w, minWidth: w, maxWidth: w };
}

/** Calcula `left` para position:sticky. null = no sticky */
export function getStickyLeftOffset(
    target: 'checkbox' | string,
    visibleColumns: string[],
    pinnedColumns: string[],
    columnWidthOverrides?: Record<string, number>
): number | null {
    if (target === 'checkbox') return 0;
    if (!pinnedColumns.includes(target)) return null;

    let left = CHECKBOX_COL_WIDTH;
    for (const colId of visibleColumns) {
        if (colId === target) break;
        if (pinnedColumns.includes(colId)) {
            left += getColumnWidth(colId, columnWidthOverrides);
        }
    }
    return left;
}

export function getStickyColumnStyle(
    target: 'checkbox' | string,
    visibleColumns: string[],
    pinnedColumns: string[],
    isHeader: boolean,
    bgColor?: string,
    columnWidthOverrides?: Record<string, number>
): { position: 'sticky'; left: number; top?: number; zIndex: number; minWidth: number; maxWidth: number; width: number; backgroundColor: string; boxShadow?: string } | undefined {
    const left = getStickyLeftOffset(target, visibleColumns, pinnedColumns, columnWidthOverrides);
    if (left === null && target !== 'checkbox') return undefined;
    const offset = target === 'checkbox' ? 0 : left!;
    const isPinned = target === 'checkbox' || pinnedColumns.includes(target);
    if (!isPinned && target !== 'checkbox') return undefined;

    const w = target === 'checkbox' ? CHECKBOX_COL_WIDTH : getColumnWidth(target, columnWidthOverrides);
    return {
        position: 'sticky',
        left: offset,
        ...(isHeader ? { top: 0 } : {}),
        zIndex: isHeader
            ? (target === 'checkbox' ? 40 : 35)
            : (target === 'checkbox' ? 20 : 15),
        width: w,
        minWidth: w,
        maxWidth: w,
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

/** Campo mapeable en integraciones Tally (UI + webhook) */
export interface TallyMappingField {
    key: string;
    label: string;
    placeholder: string;
}

const SIMPLE_TALLY_MAPPING_FIELDS: TallyMappingField[] = [
    { key: 'name', label: 'Nombre', placeholder: 'nombre, name, nombre_completo' },
    { key: 'email', label: 'Email', placeholder: 'email, correo, e-mail' },
    { key: 'phone', label: 'Teléfono', placeholder: 'phone, telefono, teléfono' },
    { key: 'phone2', label: 'Teléfono 2', placeholder: 'phone2, telefono2, teléfono_secundario' },
    { key: 'description', label: 'Descripción', placeholder: 'description, descripcion, notas' },
    { key: 'source', label: 'Fuente', placeholder: 'source, fuente, origen' },
    { key: 'salary_expectation', label: 'Expectativa salarial', placeholder: 'salary_expectation, expectativa_salarial' },
    { key: 'dni', label: 'DNI', placeholder: 'dni, documento, documento_identidad' },
    { key: 'linkedin_url', label: 'LinkedIn', placeholder: 'linkedin_url, linkedin, perfil_linkedin' },
    { key: 'address', label: 'Dirección', placeholder: 'address, direccion, dirección' },
    { key: 'province', label: 'Provincia', placeholder: 'province, provincia' },
    { key: 'district', label: 'Distrito', placeholder: 'district, distrito' },
    { key: 'age', label: 'Edad', placeholder: 'age, edad' },
];

/**
 * Campos disponibles para mapeo Tally según el proceso seleccionado.
 * Masivo: solo columnas visibles del proceso (bulkConfig). Simple: campos estándar del ATS.
 */
export function getTallyIntegrationMappingFields(process?: Process): TallyMappingField[] {
    if (!process?.isBulkProcess) {
        return SIMPLE_TALLY_MAPPING_FIELDS;
    }

    const bulkConfig = process.bulkConfig;
    const customColumns = bulkConfig?.customColumns || [];
    const fields: TallyMappingField[] = [];
    const seen = new Set<string>();

    for (const h of getImportHeaders(bulkConfig)) {
        const key = h.isCustom ? `custom_${h.columnId}` : h.field;
        if (seen.has(key)) continue;
        seen.add(key);
        const label = h.isCustom ? h.header : getColumnLabel(h.field, customColumns);
        fields.push({
            key,
            label,
            placeholder: h.isCustom
                ? h.header.toLowerCase()
                : `${h.field}, ${label.toLowerCase()}`,
        });
    }

    return fields;
}

/** Normaliza claves legacy (camelCase) al formato que usa el webhook */
export function normalizeTallyFieldMapping(mapping: FieldMapping = {}): FieldMapping {
    const legacyToSnake: Record<string, string> = {
        salaryExpectation: 'salary_expectation',
        linkedinUrl: 'linkedin_url',
    };
    const out: FieldMapping = { ...mapping };
    for (const [oldKey, newKey] of Object.entries(legacyToSnake)) {
        if (out[oldKey] !== undefined && out[newKey] === undefined) {
            out[newKey] = out[oldKey];
            delete out[oldKey];
        }
    }
    return out;
}

/** Conserva solo entradas cuyas claves existen en los campos del proceso actual */
export function filterTallyFieldMapping(
    mapping: FieldMapping,
    allowedKeys: Set<string>
): FieldMapping {
    return Object.fromEntries(
        Object.entries(mapping).filter(([key]) => allowedKeys.has(key))
    );
}

export {
    isImportTextAllCaps,
    toImportProperCase,
    normalizeImportTextCase,
    applyImportTextCaseToCandidate,
    IMPORT_TEXT_CASE_CANDIDATE_FIELDS,
} from './importTextCase';
export type { NormalizeImportTextCaseOptions } from './importTextCase';

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
        const migrated = migrateBulkColumnOrder(bulkConfig.columnOrder);
        const ordered = migrated.filter(id => allIds.includes(id));
        let missing = allIds.filter(id => !ordered.includes(id));

        if (missing.includes(CONTACT_LAST_USER_COLUMN_ID)) {
            missing = missing.filter(id => id !== CONTACT_LAST_USER_COLUMN_ID);
            let lastContactIdx = -1;
            for (let i = 0; i < ordered.length; i++) {
                if (CONTACT_COLUMN_IDS.includes(ordered[i])) lastContactIdx = i;
            }
            ordered.splice(lastContactIdx >= 0 ? lastContactIdx + 1 : ordered.length, 0, CONTACT_LAST_USER_COLUMN_ID);
        }

        if (missing.includes(HIRED_STAGE_USER_COLUMN_ID)) {
            missing = missing.filter(id => id !== HIRED_STAGE_USER_COLUMN_ID);
        }
        const withHiredCol = ensureHiredStageUserColumnInOrder(ordered);
        ordered.length = 0;
        ordered.push(...withHiredCol.filter(id => allIds.includes(id) || id === HIRED_STAGE_USER_COLUMN_ID));

        return [...ordered, ...missing.filter(id => id !== HIRED_STAGE_USER_COLUMN_ID)];
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

export function isProfileMatchColumnVisible(bulkConfig?: BulkProcessConfig): boolean {
    return !!(bulkConfig?.idealProfile?.enabled && isColumnVisible('profileMatch', bulkConfig));
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

export function normalizeDniKey(dni?: string | null): string {
    return (dni || '').replace(/\D/g, '');
}

export function normalizePhoneKey(phone?: string | null): string {
    return (phone || '').replace(/\D/g, '');
}

/** Alias de encabezados Excel / Tally → nombre normalizado de columna custom */
export const CUSTOM_COLUMN_HEADER_ALIASES: Record<string, string[]> = {
    'ap paterno': ['apellido paterno', 'paterno', 'ap. paterno', 'appaterno', 'ap_paterno'],
    'ap materno': ['apellido materno', 'materno', 'ap. materno', 'apmaterno', 'ap_materno'],
    'f nac': ['f. nac', 'f.nac', 'f nac.', 'fecha nacimiento', 'fecha de nacimiento', 'fnac', 'fec nac', 'fec. nac'],
    'experiencia': ['exp', 'experiencia laboral', 'exp laboral'],
    'edad': ['age'],
};

/** Empareja encabezado de Excel con columna personalizada del proceso */
export function findCustomColumnByHeader(
    header: string,
    customColumns: { name: string; id: string; type: string }[]
): { name: string; id: string; type: string } | undefined {
    const norm = normalizeColumnNameKey(header);
    if (!norm) return undefined;

    const exact = customColumns.find(c => normalizeColumnNameKey(c.name) === norm);
    if (exact) return exact;

    for (const col of customColumns) {
        const colNorm = normalizeColumnNameKey(col.name);
        const aliases = CUSTOM_COLUMN_HEADER_ALIASES[colNorm] || [];
        if (aliases.some(a => normalizeColumnNameKey(a) === norm)) return col;
        if (norm === colNorm) return col;
    }
    return undefined;
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

const BULK_PLACEHOLDER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Supabase exige email NOT NULL: placeholder único si falta o es inválido (importación / fila manual) */
export function buildBulkPlaceholderEmail(params: {
    rowNumber: number;
    name?: string;
    dni?: string;
    phone?: string;
    suffix?: string;
}): string {
    const { rowNumber, name, dni, phone, suffix = 'manual' } = params;
    const slug = (dni || phone || name || 'candidato')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'candidato';

    return `sin-email.${slug}.fila${rowNumber}.${suffix}@import.opalo`;
}

/** Resuelve email real o placeholder para altas manuales / importación masiva */
export function resolveBulkCandidateEmail(
    email: string | undefined,
    rowNumber: number,
    name: string,
    dni?: string,
    phone?: string,
    suffix?: string
): { email: string; usedPlaceholder: boolean } {
    const trimmed = email?.trim();
    if (trimmed && BULK_PLACEHOLDER_EMAIL_REGEX.test(trimmed)) {
        return { email: trimmed, usedPlaceholder: false };
    }
    return {
        email: buildBulkPlaceholderEmail({ rowNumber, name, dni, phone, suffix }),
        usedPlaceholder: true,
    };
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

type HomonymCandidateFields = {
    id: string;
    age?: number;
    source?: string;
    province?: string;
    district?: string;
    bulkColumnValues?: Record<string, unknown>;
};

export function isAgeLikeColumn(col: CustomColumn): boolean {
    const norm = normalizeColumnNameKey(col.name);
    if (norm === 'edad' || norm === 'age') return true;
    if (mapImportHeader(col.name.toLowerCase()) === 'age') return true;
    if (/^edad(\b|\s)/.test(norm)) return true;
    return false;
}

function columnMatchesHomonymField(
    col: CustomColumn,
    field: 'age' | 'source' | 'province' | 'district'
): boolean {
    if (field === 'age') return isAgeLikeColumn(col);
    return mapImportHeader(col.name.toLowerCase()) === field;
}

export function getCandidateColumnRow(
    candidate: HomonymCandidateFields,
    columnValues: Record<string, Record<string, unknown>> = {}
): Record<string, unknown> {
    return {
        ...(candidate.bulkColumnValues || {}),
        ...(columnValues[candidate.id] || {}),
    };
}

export function getCandidateCustomColumnValue(
    candidate: HomonymCandidateFields,
    columnId: string,
    customColumns: CustomColumn[],
    columnValues: Record<string, Record<string, unknown>> = {},
    legacyColumnIdToName: Record<string, string> = {}
): unknown {
    const col = customColumns.find(c => c.id === columnId);
    if (!col) return columnValues[candidate.id]?.[columnId];
    const row = getCandidateColumnRow(candidate, columnValues);
    const resolved = resolveColumnValueFromRow(row, col, legacyColumnIdToName);
    if (resolved !== undefined && resolved !== '') return resolved;
    if (resolved === false) return false;
    return undefined;
}

/** Resuelve un campo estándar (edad, fuente, etc.) desde columnas personalizadas o el candidato. */
export function resolveCandidateHomonymField(
    candidate: HomonymCandidateFields,
    field: 'age' | 'source' | 'province' | 'district',
    customColumns: CustomColumn[],
    columnValues: Record<string, Record<string, unknown>> = {},
    legacyColumnIdToName: Record<string, string> = {}
): unknown {
    const row = getCandidateColumnRow(candidate, columnValues);

    for (const col of customColumns) {
        if (!columnMatchesHomonymField(col, field)) continue;
        const resolved = resolveColumnValueFromRow(row, col, legacyColumnIdToName);
        if (resolved !== undefined && resolved !== '' && resolved !== null) return resolved;
        if (resolved === false) return false;
    }

    const direct = candidate[field];
    if (direct != null && direct !== '') return direct;
    return undefined;
}

/** Edad para informes: misma fuente que la tabla (columna Edad, fecha nac., candidates.age). */
function parseAgeLikeValue(raw: unknown): number | undefined {
    const fromNumber = parseAgeNumber(raw);
    if (fromNumber != null) return fromNumber;
    return ageFromBirthDateValue(raw);
}

function isAgeLikeRowKey(key: string): boolean {
    const bare = key.startsWith(BULK_NAME_KEY_PREFIX)
        ? key.slice(BULK_NAME_KEY_PREFIX.length)
        : normalizeColumnNameKey(key);
    if (bare === 'edad' || bare === 'age') return true;
    if (/^edad(\b|\s)/.test(bare)) return true;
    return mapImportHeader(bare) === 'age';
}

function scanBulkRowForAge(
    candidate: HomonymCandidateFields,
    columnValues: Record<string, Record<string, unknown>> = {}
): number | undefined {
    const row = getCandidateColumnRow(candidate, columnValues);
    for (const [key, val] of Object.entries(row)) {
        if (!isAgeLikeRowKey(key)) continue;
        const parsed = parseAgeLikeValue(val);
        if (parsed != null) return parsed;
    }
    return undefined;
}

export function resolveCandidateAge(
    candidate: HomonymCandidateFields,
    customColumns: CustomColumn[],
    columnValues: Record<string, Record<string, unknown>> = {},
    legacyColumnIdToName: Record<string, string> = {}
): number | undefined {
    for (const col of customColumns) {
        if (!isAgeLikeColumn(col)) continue;
        const raw = resolveBulkTableCellValue(
            candidate,
            col.id,
            customColumns,
            columnValues,
            legacyColumnIdToName
        );
        const parsed = parseAgeLikeValue(raw);
        if (parsed != null) return parsed;
    }

    const homonymRaw = resolveCandidateHomonymField(
        candidate,
        'age',
        customColumns,
        columnValues,
        legacyColumnIdToName
    );
    const fromHomonym = parseAgeLikeValue(homonymRaw);
    if (fromHomonym != null) return fromHomonym;

    for (const col of customColumns) {
        if (!isBirthDateColumn(col)) continue;
        const raw = resolveBulkTableCellValue(
            candidate,
            col.id,
            customColumns,
            columnValues,
            legacyColumnIdToName
        );
        const fromBirth = ageFromBirthDateValue(raw);
        if (fromBirth != null) return fromBirth;
    }

    const fromRowScan = scanBulkRowForAge(candidate, columnValues);
    if (fromRowScan != null) return fromRowScan;

    if (candidate.age != null && candidate.age > 0) return candidate.age;
    return undefined;
}

/** Edad para panel/dashboard: misma lógica que la tabla en procesos masivos. */
export function resolveCandidateAgeForProcess(
    candidate: HomonymCandidateFields,
    process?: Process,
    columnValues: Record<string, Record<string, unknown>> = {}
): number | undefined {
    if (process?.isBulkProcess) {
        const customColumns = process.bulkConfig?.customColumns || [];
        const legacy = buildLegacyColumnIdToName(process.bulkConfig, customColumns);
        const localValues = loadLocalColumnValuesForProcess(process.id);
        const mergedColumnValues = { ...localValues, ...columnValues };
        return resolveCandidateAge(candidate, customColumns, mergedColumnValues, legacy);
    }
    if (candidate.age != null && candidate.age > 0) return candidate.age;
    return undefined;
}

/** @deprecated use getBulkSelectedProcessStorageKey(userId) */
export const BULK_SELECTED_PROCESS_STORAGE_KEY = 'bulkProcessesSelectedId';

export function getBulkSelectedProcessStorageKey(userId?: string | null): string {
    const appSlug = APP_NAME.replace(/\s+/g, '_');
    const userSlug = userId || 'anon';
    return `bulkProcessesSelectedId_${appSlug}_${userSlug}`;
}

export function getBulkSelectedProcessId(userId?: string | null): string | null {
    try {
        const scoped = getBulkSelectedProcessStorageKey(userId);
        const scopedVal = localStorage.getItem(scoped);
        if (scopedVal !== null) return scopedVal;
        return localStorage.getItem(BULK_SELECTED_PROCESS_STORAGE_KEY);
    } catch {
        return null;
    }
}

export function setBulkSelectedProcessId(processId: string, userId?: string | null): void {
    try {
        localStorage.setItem(getBulkSelectedProcessStorageKey(userId), processId);
    } catch {
        /* ignore */
    }
}

function parseAgeNumber(raw: unknown): number | undefined {
    if (raw === undefined || raw === null || raw === '') return undefined;
    if (typeof raw === 'number' && !isNaN(raw) && raw > 0 && raw < 150) return Math.round(raw);
    const cleaned = String(raw).trim().replace(/[^\d.,]/g, '').replace(',', '.');
    if (!cleaned) return undefined;
    const n = parseFloat(cleaned);
    if (!isNaN(n) && n > 0 && n < 150) return Math.round(n);
    return undefined;
}

export function isBirthDateColumn(col: CustomColumn): boolean {
    const norm = normalizeColumnNameKey(col.name);
    if (!norm) return false;
    if (norm === 'f nac' || norm.includes('fecha nac') || norm.includes('fnac') || norm.includes('fec nac')) {
        return true;
    }
    const aliases = CUSTOM_COLUMN_HEADER_ALIASES['f nac'] || [];
    return aliases.some(a => normalizeColumnNameKey(a) === norm);
}

function ageFromBirthDateValue(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const raw = String(value).trim();
    let birth: Date | null = null;

    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
        birth = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    } else {
        const dmy = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
        if (dmy) {
            let year = Number(dmy[3]);
            if (year < 100) year += year >= 50 ? 1900 : 2000;
            birth = new Date(year, Number(dmy[2]) - 1, Number(dmy[1]));
        }
    }

    if (!birth || isNaN(birth.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
    return age > 0 && age < 120 ? age : undefined;
}

/** Misma resolución que la celda de la tabla masiva (custom + legacy + homónimos). */
export function resolveBulkTableCellValue(
    candidate: HomonymCandidateFields,
    columnId: string,
    customColumns: CustomColumn[],
    columnValues: Record<string, Record<string, unknown>> = {},
    legacyColumnIdToName: Record<string, string> = {}
): unknown {
    const col = customColumns.find(c => c.id === columnId);
    const row = getCandidateColumnRow(candidate, columnValues);

    if (col) {
        const resolved = resolveColumnValueFromRow(row, col, legacyColumnIdToName);
        if (resolved !== undefined && resolved !== '') return resolved;
        if (resolved === false) return false;

        if (isAgeLikeColumn(col) && candidate.age != null && candidate.age > 0) return candidate.age;
        const mapped = mapImportHeader(col.name.toLowerCase());
        if (mapped === 'age' && candidate.age != null && candidate.age > 0) return candidate.age;
        if (mapped === 'source' && candidate.source) return candidate.source;
        if (mapped === 'province' && candidate.province) return candidate.province;
        if (mapped === 'district' && candidate.district) return candidate.district;
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

/** Campos estándar de candidato que se normalizan en tabla masiva */
export const BULK_TEXT_CASE_STANDARD_FIELDS = [
    'name',
    'source',
    'province',
    'district',
] as const;

/** Normaliza mayúsculas palabra a palabra en celdas de texto */
export function normalizeTextCaseCellValue(
    value: unknown,
    opts: { field?: string; columnType?: string; selectOptions?: string[] } = {}
): unknown {
    if (value === undefined || value === null || value === '') return value;
    if (typeof value !== 'string') return value;
    return normalizeImportTextCase(value, opts);
}

/** Repara texto en bulk_column_values (p. ej. "CALLE Italia" → "Calle Italia") */
export function repairTextCaseColumnValues(
    columnValues: Record<string, Record<string, any>>,
    customColumns: CustomColumn[],
    legacyIdToName: Record<string, string> = {}
): { repaired: Record<string, Record<string, any>>; changed: boolean } {
    let changed = false;
    const repaired: Record<string, Record<string, any>> = {};

    for (const [candidateId, values] of Object.entries(columnValues)) {
        const row = { ...values };

        for (const col of customColumns) {
            if (col.type === 'number' || col.type === 'date' || col.type === 'checkbox') continue;
            const raw = resolveColumnValueFromRow(row, col, legacyIdToName);
            if (typeof raw !== 'string' || !raw.trim()) continue;
            const fixed = normalizeImportTextCase(raw, {
                columnType: col.type,
                selectOptions: col.options,
            });
            if (fixed !== raw) {
                row[col.id] = fixed;
                row[bulkColumnNameKey(col.name)] = fixed;
                changed = true;
            }
        }

        for (const [key, val] of Object.entries(row)) {
            if (!key.startsWith(BULK_NAME_KEY_PREFIX) || typeof val !== 'string' || !val.trim()) continue;
            const fixed = normalizeImportTextCase(val, { columnType: 'text' });
            if (fixed !== val) {
                row[key] = fixed;
                changed = true;
            }
        }

        repaired[candidateId] = row;
    }

    return { repaired: changed ? repaired : columnValues, changed };
}

/** Calcula parches de campos estándar del candidato (name, source, etc.) */
export function buildStandardFieldTextCasePatch(
    candidate: { name?: string; source?: string; province?: string; district?: string }
): Partial<Record<(typeof BULK_TEXT_CASE_STANDARD_FIELDS)[number], string>> {
    const patch: Partial<Record<(typeof BULK_TEXT_CASE_STANDARD_FIELDS)[number], string>> = {};
    for (const field of BULK_TEXT_CASE_STANDARD_FIELDS) {
        const val = candidate[field];
        if (typeof val !== 'string' || !val.trim()) continue;
        const fixed = normalizeImportTextCase(val, { field });
        if (fixed !== val) patch[field] = fixed;
    }
    return patch;
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
export function isPasteEditableColumn(colId: string, customColumns: CustomColumn[] = []): boolean {
    if (colId.startsWith('custom_')) {
        const customColId = colId.replace('custom_', '');
        const col = customColumns.find(c => c.id === customColId);
        if (col?.type === 'route') return false;
        return true;
    }
    return ['name', 'dni', 'email', 'phone', 'source', 'province', 'district'].includes(colId);
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
    if (col.type === 'route') return '-';
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
    if (col.type === 'route') return '';
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
    return normalizeImportTextCase(trimmed, { columnType: col.type });
}
