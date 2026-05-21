import type { BulkProcessConfig, CustomColumn, FieldMapping, Process } from '../types';
import {
    enrichBulkColumnValuesForStorage,
    findCustomColumnByHeader,
    getTallyIntegrationMappingFields,
    mapImportHeader,
    normalizeBulkDateInput,
    normalizeColumnNameKey,
    normalizeTallyFieldMapping,
    parseCustomCellInput,
    type TallyMappingField,
} from './bulkTableColumns';
import { applyImportTextCaseToCandidate } from './importTextCase';

export interface TallyWebhookProcess {
    id: string;
    isBulkProcess?: boolean;
    bulkConfig?: BulkProcessConfig;
}

export interface TallyCandidateInsert {
    name: string;
    email: string;
    phone: string;
    phone2: string;
    description: string;
    source: string;
    salary_expectation: string;
    dni: string;
    linkedin_url: string;
    address: string;
    province: string;
    district: string;
    age: number | null;
    bulk_column_values?: Record<string, unknown>;
}

const STANDARD_FIELD_NAMES: Record<string, string[]> = {
    name: ['name', 'nombre', 'nombre_completo', 'full_name', 'nombre_y_apellidos'],
    email: ['email', 'correo', 'e-mail'],
    phone: ['phone', 'telefono', 'teléfono', 'mobile', 'celular'],
    phone2: ['phone2', 'telefono2', 'teléfono_secundario', 'secondary_phone'],
    description: ['description', 'descripcion', 'notas', 'comments'],
    source: ['source', 'fuente', 'origen'],
    salary_expectation: ['salaryexpectation', 'expectativa_salarial', 'salario_esperado'],
    dni: ['dni', 'documento', 'documento_identidad', 'id_number'],
    linkedin_url: ['linkedinurl', 'linkedin', 'perfil_linkedin'],
    address: ['address', 'direccion', 'dirección'],
    province: ['province', 'provincia'],
    district: ['district', 'distrito'],
    age: ['age', 'edad'],
};

/** Convierte el valor de un campo Tally a texto */
export function tallyFieldValueToString(value: unknown): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
        return value.map(tallyFieldValueToString).filter(Boolean).join(', ');
    }
    if (typeof value === 'object') {
        const o = value as Record<string, unknown>;
        if (typeof o.text === 'string') return o.text.trim();
        if (typeof o.label === 'string') return o.label.trim();
        if (typeof o.value === 'string') return o.value.trim();
        if (Array.isArray(o.value)) return tallyFieldValueToString(o.value);
    }
    return String(value).trim();
}

/** Mapa label/key Tally (minúsculas) → valor */
export function buildTallyFieldsMap(tallyData: unknown): Record<string, string> {
    const fieldsMap: Record<string, string> = {};
    const tally = tallyData as { data?: { fields?: unknown[] }; fields?: unknown[] };
    const fieldsArray = Array.isArray(tally?.data?.fields)
        ? tally.data.fields
        : Array.isArray(tally?.fields)
          ? tally.fields
          : [];

    for (const field of fieldsArray) {
        const f = field as { key?: string; label?: string; value?: unknown };
        const text = tallyFieldValueToString(f.value);
        if (!text) continue;

        const key = (f.key || '').trim().toLowerCase();
        const label = (f.label || '').trim().toLowerCase();

        if (key) {
            fieldsMap[key] = text;
            fieldsMap[normalizeColumnNameKey(key)] = text;
        }
        if (label) {
            fieldsMap[label] = text;
            fieldsMap[normalizeColumnNameKey(label)] = text;
        }
    }
    return fieldsMap;
}

export function parseIntegrationFieldMapping(integration: {
    field_mapping?: string | FieldMapping | null;
}): FieldMapping {
    if (!integration.field_mapping) return {};
    try {
        if (typeof integration.field_mapping === 'string') {
            return normalizeTallyFieldMapping(JSON.parse(integration.field_mapping));
        }
        if (typeof integration.field_mapping === 'object') {
            return normalizeTallyFieldMapping(integration.field_mapping as FieldMapping);
        }
    } catch {
        /* ignore */
    }
    return {};
}

function lookupTallyValue(fieldsMap: Record<string, string>, tallyFieldName: string): string {
    const trimmed = tallyFieldName.trim();
    if (!trimmed) return '';

    const candidates = [
        trimmed.toLowerCase(),
        normalizeColumnNameKey(trimmed),
    ];

    for (const c of candidates) {
        if (fieldsMap[c] !== undefined && fieldsMap[c] !== '') return fieldsMap[c];
    }

    const normTarget = normalizeColumnNameKey(trimmed);
    for (const [k, v] of Object.entries(fieldsMap)) {
        if (normalizeColumnNameKey(k) === normTarget && v !== '') return v;
    }
    return '';
}

function standardNamesForField(
    mappingKey: string,
    customColumns: CustomColumn[]
): string[] {
    if (mappingKey.startsWith('custom_')) {
        const colId = mappingKey.replace('custom_', '');
        const col = customColumns.find(c => c.id === colId);
        if (!col) return [mappingKey];
        const names = new Set<string>([
            col.name.toLowerCase(),
            normalizeColumnNameKey(col.name),
        ]);
        const matched = findCustomColumnByHeader(col.name, customColumns);
        if (matched) names.add(normalizeColumnNameKey(matched.name));
        return [...names];
    }
    return STANDARD_FIELD_NAMES[mappingKey] || [mappingKey];
}

function getMappedValue(
    mappingKey: string,
    fieldsMap: Record<string, string>,
    customMapping: FieldMapping,
    customColumns: CustomColumn[]
): string {
    if (customMapping[mappingKey]) {
        const fromCustom = lookupTallyValue(fieldsMap, customMapping[mappingKey]);
        if (fromCustom) return fromCustom;
    }
    for (const name of standardNamesForField(mappingKey, customColumns)) {
        const v = lookupTallyValue(fieldsMap, name);
        if (v) return v;
    }
    return '';
}

function parseValueForCustomColumn(raw: string, col: CustomColumn): unknown {
    if (!raw) return '';
    if (col.type === 'date') return normalizeBulkDateInput(raw);
    return parseCustomCellInput(raw, col);
}

function assignStandardField(target: TallyCandidateInsert, key: string, value: string): void {
    if (!value) return;
    switch (key) {
        case 'name':
            target.name = value;
            break;
        case 'email':
            target.email = value;
            break;
        case 'phone':
            target.phone = value;
            break;
        case 'phone2':
            target.phone2 = value;
            break;
        case 'description':
            target.description = value;
            break;
        case 'source':
            target.source = value;
            break;
        case 'salary_expectation':
            target.salary_expectation = value;
            break;
        case 'dni':
            target.dni = value;
            break;
        case 'linkedin_url':
            target.linkedin_url = value;
            break;
        case 'address':
            target.address = value;
            break;
        case 'province':
            target.province = value;
            break;
        case 'district':
            target.district = value;
            break;
        case 'age': {
            const ageNum = parseInt(value, 10);
            if (!isNaN(ageNum)) target.age = ageNum;
            break;
        }
        default:
            break;
    }
}

function syncHomonymCustomColumns(
    bulkValues: Record<string, unknown>,
    customColumns: CustomColumn[],
    candidate: TallyCandidateInsert
): void {
    for (const col of customColumns) {
        const mapped = mapImportHeader(col.name.toLowerCase());
        if (mapped === 'source' && candidate.source) {
            bulkValues[col.id] = candidate.source;
        } else if (mapped === 'province' && candidate.province) {
            bulkValues[col.id] = candidate.province;
        } else if (mapped === 'district' && candidate.district) {
            bulkValues[col.id] = candidate.district;
        }
    }
}

/**
 * Mapea payload Tally → fila candidates (+ bulk_column_values si es proceso masivo).
 * Usa las mismas claves que el UI de integración (getTallyIntegrationMappingFields).
 */
export function buildTallyCandidateFromSubmission(
    tallyData: unknown,
    integration: { field_mapping?: string | FieldMapping | null; form_name?: string },
    process?: TallyWebhookProcess | Process | null
): TallyCandidateInsert {
    const fieldsMap = buildTallyFieldsMap(tallyData);
    const customMapping = parseIntegrationFieldMapping(integration);
    const customColumns = process?.bulkConfig?.customColumns || [];
    const mappingFields: TallyMappingField[] = getTallyIntegrationMappingFields(
        process as Process | undefined
    );

    const candidate: TallyCandidateInsert = {
        name: '',
        email: '',
        phone: '',
        phone2: '',
        description: '',
        source: 'Tally',
        salary_expectation: '',
        dni: '',
        linkedin_url: '',
        address: '',
        province: '',
        district: '',
        age: null,
    };

    const bulkRaw: Record<string, unknown> = {};

    for (const field of mappingFields) {
        const raw = getMappedValue(field.key, fieldsMap, customMapping, customColumns);
        if (!raw) continue;

        if (field.key.startsWith('custom_')) {
            const colId = field.key.replace('custom_', '');
            const col = customColumns.find(c => c.id === colId);
            if (col) {
                bulkRaw[col.id] = parseValueForCustomColumn(raw, col);
            }
        } else {
            assignStandardField(candidate, field.key, raw);
        }
    }

    applyImportTextCaseToCandidate(candidate as Record<string, unknown>);

    if (process?.isBulkProcess && customColumns.length > 0) {
        syncHomonymCustomColumns(bulkRaw, customColumns, candidate);
        const enriched = enrichBulkColumnValuesForStorage(bulkRaw, customColumns);
        if (Object.keys(enriched).length > 0) {
            candidate.bulk_column_values = enriched;
        }
    }

    return candidate;
}
