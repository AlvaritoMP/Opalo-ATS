/**
 * Mapeo Tally → candidato (Deno / Edge Functions).
 * Mantener alineado con lib/tallyWebhookMapping.ts
 */

const BULK_NAME_KEY_PREFIX = '__name__';

export interface BulkProcessConfigLike {
  customColumns?: { id: string; name: string; type: string; options?: string[] }[];
  hiddenColumns?: string[];
  columnOrder?: string[];
}

const BASE_COLUMNS = [
  { id: 'name', label: 'Nombre', importKey: 'name' },
  { id: 'dni', label: 'DNI', importKey: 'dni' },
  { id: 'email', label: 'Email', importKey: 'email' },
  { id: 'phone', label: 'Teléfono', importKey: 'phone' },
  { id: 'source', label: 'Fuente', importKey: 'source' },
  { id: 'province', label: 'Provincia', importKey: 'province' },
  { id: 'district', label: 'Distrito', importKey: 'district' },
];

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

const IMPORT_FIELD_ALIASES: Record<string, string> = {
  fuente: 'source',
  provincia: 'province',
  distrito: 'district',
};

const CUSTOM_COLUMN_HEADER_ALIASES: Record<string, string[]> = {
  'ap paterno': ['apellido paterno', 'paterno', 'ap. paterno', 'appaterno', 'ap_paterno'],
  'ap materno': ['apellido materno', 'materno', 'ap. materno', 'apmaterno', 'ap_materno'],
  'f nac': ['f. nac', 'f.nac', 'f nac.', 'fecha nacimiento', 'fecha de nacimiento', 'fnac', 'fec nac', 'fec. nac'],
  experiencia: ['exp', 'experiencia laboral', 'exp laboral'],
};

export interface TallyMappingFieldDef {
  key: string;
  label: string;
}

function normalizeColumnNameKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function bulkColumnNameKey(name: string): string {
  return `${BULK_NAME_KEY_PREFIX}${normalizeColumnNameKey(name)}`;
}

function isEmptyBulkValue(v: unknown): boolean {
  return v === undefined || v === null || v === '';
}

function mapImportHeader(header: string): string | null {
  const normalized = header.trim().toLowerCase();
  return IMPORT_FIELD_ALIASES[normalized] || null;
}

function getCustomColumnIds(customColumns: { id: string }[] = []): string[] {
  return customColumns.map((c) => `custom_${c.id}`);
}

function buildAllColumnIds(customColumns: { id: string }[] = []): string[] {
  return [...BASE_COLUMNS.map((c) => c.id), ...getCustomColumnIds(customColumns)];
}

function resolveColumnOrder(bulkConfig?: BulkProcessConfigLike, customColumns: { id: string }[] = []): string[] {
  const allIds = buildAllColumnIds(customColumns);
  if (bulkConfig?.columnOrder?.length) {
    const ordered = bulkConfig.columnOrder.filter((id) => allIds.includes(id));
    const missing = allIds.filter((id) => !ordered.includes(id));
    return [...ordered, ...missing];
  }
  return allIds;
}

function getColumnLabel(colId: string, customColumns: { id: string; name: string }[] = []): string {
  if (colId.startsWith('custom_')) {
    const customCol = customColumns.find((c) => c.id === colId.replace('custom_', ''));
    return customCol?.name || colId;
  }
  return BASE_COLUMNS.find((c) => c.id === colId)?.label || colId;
}

function getImportHeaders(bulkConfig?: BulkProcessConfigLike): {
  header: string;
  field: string;
  isCustom: boolean;
  columnId?: string;
}[] {
  const customColumns = bulkConfig?.customColumns || [];
  const hiddenColumns = new Set(bulkConfig?.hiddenColumns || []);
  const columnOrder = resolveColumnOrder(bulkConfig, customColumns);
  const headers: { header: string; field: string; isCustom: boolean; columnId?: string }[] = [];

  columnOrder.forEach((colId) => {
    if (hiddenColumns.has(colId)) return;
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
      return;
    }
    const baseCol = BASE_COLUMNS.find((c) => c.id === colId);
    if (baseCol?.importKey) {
      headers.push({ header: baseCol.importKey, field: baseCol.importKey, isCustom: false });
    }
  });
  return headers;
}

export function getProcessMappingFields(process: {
  is_bulk_process?: boolean;
  bulk_config?: BulkProcessConfigLike | string | null;
}): TallyMappingFieldDef[] {
  const isBulk = process.is_bulk_process === true || process.is_bulk_process === 1;
  if (!isBulk) {
    return [
      { key: 'name', label: 'Nombre' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'phone2', label: 'Teléfono 2' },
      { key: 'description', label: 'Descripción' },
      { key: 'source', label: 'Fuente' },
      { key: 'salary_expectation', label: 'Expectativa salarial' },
      { key: 'dni', label: 'DNI' },
      { key: 'linkedin_url', label: 'LinkedIn' },
      { key: 'address', label: 'Dirección' },
      { key: 'province', label: 'Provincia' },
      { key: 'district', label: 'Distrito' },
      { key: 'age', label: 'Edad' },
    ];
  }

  let bulkConfig: BulkProcessConfigLike | undefined;
  if (process.bulk_config) {
    bulkConfig =
      typeof process.bulk_config === 'string'
        ? JSON.parse(process.bulk_config)
        : process.bulk_config;
  }
  const customColumns = bulkConfig?.customColumns || [];
  const seen = new Set<string>();
  const fields: TallyMappingFieldDef[] = [];

  for (const h of getImportHeaders(bulkConfig)) {
    const key = h.isCustom ? `custom_${h.columnId}` : h.field;
    if (seen.has(key)) continue;
    seen.add(key);
    fields.push({
      key,
      label: h.isCustom ? h.header : getColumnLabel(h.field, customColumns),
    });
  }
  return fields;
}

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

function normalizeFieldMapping(mapping: Record<string, string>): Record<string, string> {
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

export function parseIntegrationFieldMapping(integration: {
  field_mapping?: string | Record<string, string> | null;
}): Record<string, string> {
  if (!integration.field_mapping) return {};
  try {
    if (typeof integration.field_mapping === 'string') {
      return normalizeFieldMapping(JSON.parse(integration.field_mapping));
    }
    if (typeof integration.field_mapping === 'object') {
      return normalizeFieldMapping(integration.field_mapping as Record<string, string>);
    }
  } catch {
    /* ignore */
  }
  return {};
}

function lookupTallyValue(fieldsMap: Record<string, string>, tallyFieldName: string): string {
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

function findCustomColumnByHeader(
  header: string,
  customColumns: { name: string; id: string; type: string }[]
): { name: string; id: string; type: string } | undefined {
  const norm = normalizeColumnNameKey(header);
  if (!norm) return undefined;
  const exact = customColumns.find((c) => normalizeColumnNameKey(c.name) === norm);
  if (exact) return exact;
  for (const col of customColumns) {
    const colNorm = normalizeColumnNameKey(col.name);
    const aliases = CUSTOM_COLUMN_HEADER_ALIASES[colNorm] || [];
    if (aliases.some((a) => normalizeColumnNameKey(a) === norm)) return col;
  }
  return undefined;
}

function standardNamesForField(
  mappingKey: string,
  customColumns: { id: string; name: string; type: string }[]
): string[] {
  if (mappingKey.startsWith('custom_')) {
    const colId = mappingKey.replace('custom_', '');
    const col = customColumns.find((c) => c.id === colId);
    if (!col) return [mappingKey];
    const names = new Set([col.name.toLowerCase(), normalizeColumnNameKey(col.name)]);
    const matched = findCustomColumnByHeader(col.name, customColumns);
    if (matched) names.add(normalizeColumnNameKey(matched.name));
    return [...names];
  }
  return STANDARD_FIELD_NAMES[mappingKey] || [mappingKey];
}

function getMappedValue(
  mappingKey: string,
  fieldsMap: Record<string, string>,
  customMapping: Record<string, string>,
  customColumns: { id: string; name: string; type: string }[]
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

function enrichBulkColumnValuesForStorage(
  values: Record<string, unknown>,
  customColumns: { id: string; name: string }[] = []
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const col of customColumns) {
    const v = values[col.id];
    if (!isEmptyBulkValue(v) || v === false) {
      out[col.id] = v;
      out[bulkColumnNameKey(col.name)] = v;
    }
  }
  return out;
}

function syncHomonymCustomColumns(
  bulkValues: Record<string, unknown>,
  customColumns: { id: string; name: string }[],
  candidate: Record<string, unknown>
): void {
  for (const col of customColumns) {
    const mapped = mapImportHeader(col.name.toLowerCase());
    if (mapped === 'source' && candidate.source) bulkValues[col.id] = candidate.source;
    else if (mapped === 'province' && candidate.province) bulkValues[col.id] = candidate.province;
    else if (mapped === 'district' && candidate.district) bulkValues[col.id] = candidate.district;
  }
}

function formatBulkDateSimple(value: string): string {
  const trimmed = value.trim();
  const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) return trimmed;
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${d}/${m}/${y}`;
  }
  return trimmed;
}

function parseValueForCustomColumn(
  raw: string,
  col: { type: string; options?: string[] }
): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (col.type === 'number') {
    const n = Number(trimmed);
    return isNaN(n) ? trimmed : n;
  }
  if (col.type === 'checkbox') {
    return ['true', '1', 'si', 'sí', 'yes', 's'].includes(trimmed.toLowerCase());
  }
  if (col.type === 'date') return formatBulkDateSimple(trimmed);
  if (col.type === 'select' && col.options?.length) {
    const match = col.options.find((o) => o.toLowerCase() === trimmed.toLowerCase());
    return match ?? trimmed;
  }
  return trimmed;
}

export function buildTallyCandidateFromSubmission(
  tallyData: unknown,
  integration: { field_mapping?: string | Record<string, string> | null },
  process: { is_bulk_process?: boolean; bulk_config?: BulkProcessConfigLike | string | null }
): Record<string, unknown> {
  const fieldsMap = buildTallyFieldsMap(tallyData);
  const customMapping = parseIntegrationFieldMapping(integration);

  let bulkConfig: BulkProcessConfigLike | undefined;
  if (process.bulk_config) {
    bulkConfig =
      typeof process.bulk_config === 'string'
        ? JSON.parse(process.bulk_config)
        : process.bulk_config;
  }
  const customColumns = bulkConfig?.customColumns || [];
  const mappingFields = getProcessMappingFields(process);

  const candidate: Record<string, unknown> = {
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
      const col = customColumns.find((c) => c.id === colId);
      if (col) bulkRaw[col.id] = parseValueForCustomColumn(raw, col);
    } else {
      switch (field.key) {
        case 'name':
          candidate.name = raw;
          break;
        case 'email':
          candidate.email = raw;
          break;
        case 'phone':
          candidate.phone = raw;
          break;
        case 'phone2':
          candidate.phone2 = raw;
          break;
        case 'description':
          candidate.description = raw;
          break;
        case 'source':
          candidate.source = raw;
          break;
        case 'salary_expectation':
          candidate.salary_expectation = raw;
          break;
        case 'dni':
          candidate.dni = raw;
          break;
        case 'linkedin_url':
          candidate.linkedin_url = raw;
          break;
        case 'address':
          candidate.address = raw;
          break;
        case 'province':
          candidate.province = raw;
          break;
        case 'district':
          candidate.district = raw;
          break;
        case 'age': {
          const ageNum = parseInt(raw, 10);
          if (!isNaN(ageNum)) candidate.age = ageNum;
          break;
        }
      }
    }
  }

  const isBulk = process.is_bulk_process === true || process.is_bulk_process === 1;
  if (isBulk && customColumns.length > 0) {
    syncHomonymCustomColumns(bulkRaw, customColumns, candidate);
    const enriched = enrichBulkColumnValuesForStorage(bulkRaw, customColumns);
    if (Object.keys(enriched).length > 0) {
      candidate.bulk_column_values = enriched;
    }
  }

  return candidate;
}
