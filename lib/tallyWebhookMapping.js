/**
 * Mapeo Tally → candidato (Node / Easypanel backend).
 * Mantener alineado con lib/tallyWebhookMapping.ts y supabase/functions/_shared/tallyMapping.ts
 */

const BULK_NAME_KEY_PREFIX = '__name__';

const BASE_COLUMNS = [
    { id: 'name', importKey: 'name', label: 'Nombre' },
    { id: 'dni', importKey: 'dni', label: 'DNI' },
    { id: 'email', importKey: 'email', label: 'Email' },
    { id: 'phone', importKey: 'phone', label: 'Teléfono' },
    { id: 'source', importKey: 'source', label: 'Fuente' },
    { id: 'province', importKey: 'province', label: 'Provincia' },
    { id: 'district', importKey: 'district', label: 'Distrito' },
];

const STANDARD_FIELD_NAMES = {
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

const IMPORT_FIELD_ALIASES = { fuente: 'source', provincia: 'province', distrito: 'district' };

const CUSTOM_COLUMN_HEADER_ALIASES = {
    'ap paterno': ['apellido paterno', 'paterno', 'ap. paterno', 'appaterno', 'ap_paterno'],
    'ap materno': ['apellido materno', 'materno', 'ap. materno', 'apmaterno', 'ap_materno'],
    'f nac': ['f. nac', 'f.nac', 'f nac.', 'fecha nacimiento', 'fecha de nacimiento', 'fnac', 'fec nac', 'fec. nac'],
    experiencia: ['exp', 'experiencia laboral', 'exp laboral'],
};

function normalizeColumnNameKey(name) {
    return name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

function bulkColumnNameKey(name) {
    return `${BULK_NAME_KEY_PREFIX}${normalizeColumnNameKey(name)}`;
}

function isEmptyBulkValue(v) {
    return v === undefined || v === null || v === '';
}

function mapImportHeader(header) {
    return IMPORT_FIELD_ALIASES[header.trim().toLowerCase()] || null;
}

function tallyFieldValueToString(value) {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(tallyFieldValueToString).filter(Boolean).join(', ');
    if (typeof value === 'object') {
        if (typeof value.text === 'string') return value.text.trim();
        if (typeof value.label === 'string') return value.label.trim();
        if (typeof value.value === 'string') return value.value.trim();
        if (Array.isArray(value.value)) return tallyFieldValueToString(value.value);
    }
    return String(value).trim();
}

export function buildTallyFieldsMap(tallyData) {
    const fieldsMap = {};
    const fieldsArray = Array.isArray(tallyData?.data?.fields)
        ? tallyData.data.fields
        : Array.isArray(tallyData?.fields)
          ? tallyData.fields
          : [];

    for (const field of fieldsArray) {
        const text = tallyFieldValueToString(field.value);
        if (!text) continue;
        const key = (field.key || '').trim().toLowerCase();
        const label = (field.label || '').trim().toLowerCase();
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

function getImportHeaders(bulkConfig) {
    const customColumns = bulkConfig?.customColumns || [];
    const hiddenColumns = new Set(bulkConfig?.hiddenColumns || []);
    const allIds = [...BASE_COLUMNS.map((c) => c.id), ...customColumns.map((c) => `custom_${c.id}`)];
    let columnOrder = bulkConfig?.columnOrder?.length
        ? bulkConfig.columnOrder.filter((id) => allIds.includes(id))
        : allIds;
    const missing = allIds.filter((id) => !columnOrder.includes(id));
    columnOrder = [...columnOrder, ...missing];

    const headers = [];
    for (const colId of columnOrder) {
        if (hiddenColumns.has(colId)) continue;
        if (colId.startsWith('custom_')) {
            const customCol = customColumns.find((c) => c.id === colId.replace('custom_', ''));
            if (customCol) {
                headers.push({
                    header: customCol.name,
                    field: customCol.name,
                    isCustom: true,
                    columnId: customCol.id,
                });
            }
            continue;
        }
        const baseCol = BASE_COLUMNS.find((c) => c.id === colId);
        if (baseCol?.importKey) {
            headers.push({ header: baseCol.importKey, field: baseCol.importKey, isCustom: false });
        }
    }
    return headers;
}

function getProcessMappingFields(process) {
    const isBulk = process.is_bulk_process === true || process.is_bulk_process === 1;
    if (!isBulk) {
        return Object.keys(STANDARD_FIELD_NAMES).map((key) => ({
            key,
            label: key,
        }));
    }
    let bulkConfig = process.bulk_config;
    if (typeof bulkConfig === 'string') bulkConfig = JSON.parse(bulkConfig);
    const customColumns = bulkConfig?.customColumns || [];
    const seen = new Set();
    const fields = [];
    for (const h of getImportHeaders(bulkConfig)) {
        const key = h.isCustom ? `custom_${h.columnId}` : h.field;
        if (seen.has(key)) continue;
        seen.add(key);
        fields.push({ key, label: h.isCustom ? h.header : h.field });
    }
    return fields;
}

function normalizeFieldMapping(mapping) {
    const out = { ...mapping };
    if (out.salaryExpectation && !out.salary_expectation) {
        out.salary_expectation = out.salaryExpectation;
        delete out.salaryExpectation;
    }
    if (out.linkedinUrl && !out.linkedin_url) {
        out.linkedin_url = out.linkedinUrl;
        delete out.linkedinUrl;
    }
    return out;
}

export function parseIntegrationFieldMapping(integration) {
    if (!integration.field_mapping) return {};
    try {
        if (typeof integration.field_mapping === 'string') {
            return normalizeFieldMapping(JSON.parse(integration.field_mapping));
        }
        if (typeof integration.field_mapping === 'object') {
            return normalizeFieldMapping(integration.field_mapping);
        }
    } catch {
        /* ignore */
    }
    return {};
}

function lookupTallyValue(fieldsMap, tallyFieldName) {
    const trimmed = tallyFieldName.trim();
    if (!trimmed) return '';
    const candidates = [trimmed.toLowerCase(), normalizeColumnNameKey(trimmed)];
    for (const c of candidates) {
        if (fieldsMap[c] !== undefined && fieldsMap[c] !== '') return fieldsMap[c];
    }
    const normTarget = normalizeColumnNameKey(trimmed);
    for (const [k, v] of Object.entries(fieldsMap)) {
        if (normalizeColumnNameKey(k) === normTarget && v !== '') return v;
    }
    return '';
}

function standardNamesForField(mappingKey, customColumns) {
    if (mappingKey.startsWith('custom_')) {
        const colId = mappingKey.replace('custom_', '');
        const col = customColumns.find((c) => c.id === colId);
        if (!col) return [mappingKey];
        const names = new Set([col.name.toLowerCase(), normalizeColumnNameKey(col.name)]);
        const colNorm = normalizeColumnNameKey(col.name);
        const aliases = CUSTOM_COLUMN_HEADER_ALIASES[colNorm] || [];
        aliases.forEach((a) => names.add(normalizeColumnNameKey(a)));
        return [...names];
    }
    return STANDARD_FIELD_NAMES[mappingKey] || [mappingKey];
}

function getMappedValue(mappingKey, fieldsMap, customMapping, customColumns) {
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

function enrichBulkColumnValuesForStorage(values, customColumns) {
    const out = { ...values };
    for (const col of customColumns) {
        const v = values[col.id];
        if (!isEmptyBulkValue(v) || v === false) {
            out[col.id] = v;
            out[bulkColumnNameKey(col.name)] = v;
        }
    }
    return out;
}

function syncHomonymCustomColumns(bulkValues, customColumns, candidate) {
    for (const col of customColumns) {
        const mapped = mapImportHeader(col.name.toLowerCase());
        if (mapped === 'source' && candidate.source) bulkValues[col.id] = candidate.source;
        else if (mapped === 'province' && candidate.province) bulkValues[col.id] = candidate.province;
        else if (mapped === 'district' && candidate.district) bulkValues[col.id] = candidate.district;
    }
}

function parseValueForCustomColumn(raw, col) {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (col.type === 'number') {
        const n = Number(trimmed);
        return isNaN(n) ? trimmed : n;
    }
    if (col.type === 'checkbox') {
        return ['true', '1', 'si', 'sí', 'yes', 's'].includes(trimmed.toLowerCase());
    }
    if (col.type === 'date') {
        const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (ddmmyyyy) return trimmed;
        const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
        return trimmed;
    }
    return trimmed;
}

export function buildTallyCandidateFromSubmission(tallyData, integration, process) {
    const fieldsMap = buildTallyFieldsMap(tallyData);
    const customMapping = parseIntegrationFieldMapping(integration);

    let bulkConfig = process?.bulk_config;
    if (typeof bulkConfig === 'string') bulkConfig = JSON.parse(bulkConfig);
    const customColumns = bulkConfig?.customColumns || [];
    const mappingFields = getProcessMappingFields(process || {});

    const candidate = {
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

    const bulkRaw = {};

    for (const field of mappingFields) {
        const raw = getMappedValue(field.key, fieldsMap, customMapping, customColumns);
        if (!raw) continue;

        if (field.key.startsWith('custom_')) {
            const colId = field.key.replace('custom_', '');
            const col = customColumns.find((c) => c.id === colId);
            if (col) bulkRaw[col.id] = parseValueForCustomColumn(raw, col);
        } else {
            switch (field.key) {
                case 'name': candidate.name = raw; break;
                case 'email': candidate.email = raw; break;
                case 'phone': candidate.phone = raw; break;
                case 'phone2': candidate.phone2 = raw; break;
                case 'description': candidate.description = raw; break;
                case 'source': candidate.source = raw; break;
                case 'salary_expectation': candidate.salary_expectation = raw; break;
                case 'dni': candidate.dni = raw; break;
                case 'linkedin_url': candidate.linkedin_url = raw; break;
                case 'address': candidate.address = raw; break;
                case 'province': candidate.province = raw; break;
                case 'district': candidate.district = raw; break;
                case 'age': {
                    const ageNum = parseInt(raw, 10);
                    if (!isNaN(ageNum)) candidate.age = ageNum;
                    break;
                }
            }
        }
    }

    const isBulk = process?.is_bulk_process === true || process?.is_bulk_process === 1;
    if (isBulk && customColumns.length > 0) {
        syncHomonymCustomColumns(bulkRaw, customColumns, candidate);
        const enriched = enrichBulkColumnValuesForStorage(bulkRaw, customColumns);
        if (Object.keys(enriched).length > 0) {
            candidate.bulk_column_values = enriched;
        }
    }

    return candidate;
}
