/**
 * Subconjunto de helpers de lib/bulkTableColumns.ts para el webhook Tally en Docker.
 * El backend se construye solo con Opalo-ATS/backend; no tiene el lib/ del frontend.
 */

const BULK_NAME_KEY_PREFIX = '__name__';

function normalizeColumnNameKey(name) {
    return String(name || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

function bulkColumnNameKey(name) {
    return `${BULK_NAME_KEY_PREFIX}${normalizeColumnNameKey(name)}`;
}

function isEmptyBulkValue(val) {
    return val === undefined || val === null || val === '';
}

export function hasBulkCellValue(val) {
    return !isEmptyBulkValue(val) || val === false;
}

export function enrichBulkColumnValuesForStorage(values, customColumns = []) {
    const out = { ...(values || {}) };
    for (const col of customColumns) {
        const v = values?.[col.id];
        if (!isEmptyBulkValue(v) || v === false) {
            out[col.id] = v;
            out[bulkColumnNameKey(col.name)] = v;
        }
    }
    for (const [key, val] of Object.entries(values || {})) {
        if (key.startsWith(BULK_NAME_KEY_PREFIX)) continue;
        const col = customColumns.find((c) => c.id === key);
        if (col && !isEmptyBulkValue(val)) {
            out[bulkColumnNameKey(col.name)] = val;
        }
    }
    return out;
}

export function normalizeDniKey(dni) {
    return String(dni || '').replace(/\D/g, '');
}

function normalizePhoneKey(phone) {
    return String(phone || '').replace(/\D/g, '');
}

function normalizePhoneKeyForMatch(phone) {
    const digits = normalizePhoneKey(phone);
    if (!digits) return '';
    return digits.length > 9 ? digits.slice(-9) : digits;
}

export function collectPhoneMatchKeys(...phones) {
    const keys = new Set();
    for (const phone of phones) {
        const key = normalizePhoneKeyForMatch(phone);
        if (key) keys.add(key);
    }
    return [...keys];
}

export function isPlaceholderImportEmail(email) {
    if (!email) return false;
    return /@import\.opalo$/i.test(email) || /^sin-email\./i.test(email);
}

export function buildBulkPlaceholderEmail({
    rowNumber,
    name,
    dni,
    phone,
    suffix = 'manual',
} = {}) {
    const slug = (dni || phone || name || 'candidato')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'candidato';

    return `sin-email.${slug}.fila${rowNumber}.${suffix}@import.opalo`;
}
