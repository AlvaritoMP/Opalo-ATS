/**
 * Mapeo Tally → candidato (Deno / Edge Functions).
 * Mantener alineado con lib/tallyWebhookMapping.ts
 */

import { normalizeImportTextCase } from './importTextCase.ts';

const BULK_NAME_KEY_PREFIX = '__name__';

export interface BulkProcessConfigLike {
  customColumns?: { id: string; name: string; type: string; options?: string[] }[];
  hiddenColumns?: string[];
  columnOrder?: string[];
  highDensityTableEnabled?: boolean;
}

const BASE_COLUMNS = [
  { id: 'nombres', label: 'Nombres', importKey: 'nombres' },
  { id: 'apellidoPaterno', label: 'Apellido Paterno', importKey: 'apellidoPaterno' },
  { id: 'apellidoMaterno', label: 'Apellido Materno', importKey: 'apellidoMaterno' },
  { id: 'dni', label: 'DNI', importKey: 'dni' },
  { id: 'email', label: 'Email', importKey: 'email' },
  { id: 'phone', label: 'Teléfono', importKey: 'phone' },
  { id: 'source', label: 'Fuente', importKey: 'source' },
  { id: 'province', label: 'Provincia', importKey: 'province' },
  { id: 'district', label: 'Distrito', importKey: 'district' },
];

const CHOICE_TYPES = new Set([
  'MULTIPLE_CHOICE',
  'DROPDOWN',
  'MULTIPLE_CHOICE_SELECT',
  'SELECT',
  'CHECKBOXES',
]);

const SIMPLE_MAPPING_FIELDS: TallyMappingFieldDef[] = [
  { key: 'nombres', label: 'Nombres' },
  { key: 'apellido_paterno', label: 'Apellido Paterno' },
  { key: 'apellido_materno', label: 'Apellido Materno' },
  { key: 'name', label: 'Nombre completo (un solo campo Tally)' },
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

const SIMPLE_AUTO_ALIASES: Record<string, string[]> = {
  nombres: ['nombres'],
  apellido_paterno: ['apellido paterno', 'ap paterno', 'ap. paterno', 'paterno'],
  apellido_materno: ['apellido materno', 'ap materno', 'ap. materno', 'materno'],
  name: ['name', 'nombre_completo', 'nombre completo'],
  email: ['email', 'correo', 'e-mail'],
  phone: ['phone', 'telefono', 'teléfono'],
  source: ['source', 'fuente'],
  dni: ['dni', 'documento'],
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
  'apellido paterno': ['ap paterno', 'paterno', 'ap. paterno', 'appaterno', 'ap_paterno'],
  'ap materno': ['apellido materno', 'materno', 'ap. materno', 'apmaterno', 'ap_materno'],
  'apellido materno': ['ap materno', 'materno', 'ap. materno', 'apmaterno', 'ap_materno'],
  'f nac': ['f. nac', 'f.nac', 'f nac.', 'fecha nacimiento', 'fecha de nacimiento', 'fnac', 'fec nac', 'fec. nac'],
  experiencia: ['exp', 'experiencia laboral', 'exp laboral'],
  disponibilidad: ['disponibilidad horaria', 'horario', 'disponibilidad de horario'],
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

function compactColumnRef(name: string): string {
  return normalizeColumnNameKey(name).replace(/\s+/g, '');
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

function parseBulkConfig(process: {
  is_bulk_process?: boolean | number;
  isBulkProcess?: boolean;
  bulk_config?: BulkProcessConfigLike | string | null;
  bulkConfig?: BulkProcessConfigLike;
}): BulkProcessConfigLike | undefined {
  const raw = process.bulk_config ?? process.bulkConfig;
  if (!raw) return undefined;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as BulkProcessConfigLike;
    } catch {
      return undefined;
    }
  }
  return raw;
}

function processUsesTableMapping(process: {
  is_bulk_process?: boolean | number;
  isBulkProcess?: boolean;
  bulk_config?: BulkProcessConfigLike | string | null;
  bulkConfig?: BulkProcessConfigLike;
}): boolean {
  const isBulk =
    process.isBulkProcess === true ||
    process.is_bulk_process === true ||
    process.is_bulk_process === 1;
  const cfg = parseBulkConfig(process);
  return isBulk || !!(cfg?.customColumns?.length) || !!cfg?.highDensityTableEnabled;
}

export function getProcessMappingFields(process: {
  is_bulk_process?: boolean | number;
  isBulkProcess?: boolean;
  bulk_config?: BulkProcessConfigLike | string | null;
  bulkConfig?: BulkProcessConfigLike;
}): TallyMappingFieldDef[] {
  if (!processUsesTableMapping(process)) {
    return [...SIMPLE_MAPPING_FIELDS];
  }

  const bulkConfig = parseBulkConfig(process);
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
  for (const col of customColumns) {
    const key = `custom_${col.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    fields.push({ key, label: col.name });
  }
  for (const simple of SIMPLE_MAPPING_FIELDS) {
    if (seen.has(simple.key)) continue;
    seen.add(simple.key);
    fields.push(simple);
  }
  return fields;
}

type TallyFieldRow = {
  key?: string;
  label?: string;
  title?: string;
  type?: string;
  value?: unknown;
  options?: { id?: string; text?: string; label?: string }[];
};

export function extractTallyFieldText(field: TallyFieldRow): string {
  const { value, type, options } = field;
  if (value === undefined || value === null) return '';

  if (type && CHOICE_TYPES.has(type) && options?.length) {
    if (Array.isArray(value)) {
      return value
        .map((id) => {
          const opt = options.find((o) => o.id === id);
          return opt?.text || opt?.label || '';
        })
        .filter(Boolean)
        .join(', ');
    }
    const opt = options.find((o) => o.id === value);
    if (opt?.text) return String(opt.text).trim();
    if (opt?.label) return String(opt.label).trim();
  }

  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((v) => extractTallyFieldText({ value: v, options })).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.text === 'string') return o.text.trim();
    if (typeof o.label === 'string') return o.label.trim();
  }
  return String(value).trim();
}

export interface TallyFieldsIndex {
  byRef: Record<string, string>;
  usedRefs: Set<string>;
}

export function buildTallyFieldsIndex(tallyData: unknown): TallyFieldsIndex {
  const byRef: Record<string, string> = {};
  const tally = tallyData as { data?: { fields?: TallyFieldRow[] }; fields?: TallyFieldRow[] };
  const fieldsArray = Array.isArray(tally?.data?.fields)
    ? tally.data.fields
    : Array.isArray(tally?.fields)
      ? tally.fields
      : [];

  for (const field of fieldsArray) {
    const text = extractTallyFieldText(field);
    if (!text) continue;
    const key = (field.key || '').trim();
    const label = (field.label || field.title || '').trim();
    const refs = new Set<string>();
    if (key) {
      refs.add(key.toLowerCase());
      refs.add(normalizeColumnNameKey(key));
      refs.add(compactColumnRef(key));
    }
    if (label) {
      refs.add(label.toLowerCase());
      refs.add(normalizeColumnNameKey(label));
      refs.add(compactColumnRef(label));
    }
    for (const ref of refs) {
      if (!byRef[ref]) byRef[ref] = text;
    }
  }
  return { byRef, usedRefs: new Set() };
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
    let raw: unknown = integration.field_mapping;
    if (typeof raw === 'string') {
      raw = JSON.parse(raw);
      if (typeof raw === 'string') raw = JSON.parse(raw);
    }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return normalizeFieldMapping(raw as Record<string, string>);
    }
  } catch {
    /* ignore */
  }
  return {};
}

function markRefUsed(index: TallyFieldsIndex, ref: string): void {
  index.usedRefs.add(ref.trim().toLowerCase());
  index.usedRefs.add(normalizeColumnNameKey(ref));
  index.usedRefs.add(compactColumnRef(ref));
}

function isRefUsed(index: TallyFieldsIndex, ref: string): boolean {
  return (
    index.usedRefs.has(ref.trim().toLowerCase()) ||
    index.usedRefs.has(normalizeColumnNameKey(ref)) ||
    index.usedRefs.has(compactColumnRef(ref))
  );
}

function lookupTallyValue(index: TallyFieldsIndex, tallyFieldRef: string, allowReuse = false): string {
  const trimmed = tallyFieldRef.trim();
  if (!trimmed) return '';
  const candidates = [trimmed.toLowerCase(), normalizeColumnNameKey(trimmed), compactColumnRef(trimmed)];
  for (const c of candidates) {
    if (index.byRef[c] !== undefined && index.byRef[c] !== '' && (allowReuse || !isRefUsed(index, c))) {
      if (!allowReuse) markRefUsed(index, trimmed);
      return index.byRef[c];
    }
  }
  const normTarget = normalizeColumnNameKey(trimmed);
  for (const [k, v] of Object.entries(index.byRef)) {
    if (normalizeColumnNameKey(k) === normTarget && v !== '' && (allowReuse || !isRefUsed(index, k))) {
      if (!allowReuse) markRefUsed(index, trimmed);
      return v;
    }
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

function autoMatchRefsForField(
  mappingKey: string,
  customColumns: { id: string; name: string; type: string }[],
  isBulk: boolean
): string[] {
  if (mappingKey.startsWith('custom_')) {
    const colId = mappingKey.replace('custom_', '');
    const col = customColumns.find((c) => c.id === colId);
    if (!col) return [];
    const refs = new Set([
      col.name,
      col.name.toLowerCase(),
      normalizeColumnNameKey(col.name),
      compactColumnRef(col.name),
    ]);
    const matched = findCustomColumnByHeader(col.name, customColumns);
    if (matched) refs.add(normalizeColumnNameKey(matched.name));
    const colNorm = normalizeColumnNameKey(col.name);
    for (const alias of CUSTOM_COLUMN_HEADER_ALIASES[colNorm] || []) {
      refs.add(alias);
      refs.add(alias.toLowerCase());
      refs.add(normalizeColumnNameKey(alias));
      refs.add(compactColumnRef(alias));
    }
    return [...refs];
  }
  const baseCol = BASE_COLUMNS.find((c) => c.importKey === mappingKey || c.id === mappingKey);
  if (baseCol) {
    const extraByKey: Record<string, string[]> = {
      nombres: ['nombres'],
      apellidoPaterno: ['apellido_paterno', 'apellido paterno', 'ap paterno', 'ap. paterno', 'paterno'],
      apellidoMaterno: ['apellido_materno', 'apellido materno', 'ap materno', 'ap. materno', 'materno'],
      name: ['nombre_completo', 'nombre completo'],
      email: ['correo', 'e-mail'],
      phone: ['telefono', 'teléfono'],
    };
    const refs = new Set([
      baseCol.importKey || mappingKey,
      baseCol.label,
      baseCol.label.toLowerCase(),
      normalizeColumnNameKey(baseCol.label),
      ...(extraByKey[mappingKey] || extraByKey[baseCol.id] || []),
    ]);
    return [...refs];
  }
  if (!isBulk) return SIMPLE_AUTO_ALIASES[mappingKey] || [mappingKey];
  return [mappingKey];
}

function shouldRejectSourceAutoMatch(
  value: string,
  integration?: { form_name?: string },
  tallyData?: unknown
): boolean {
  const tally = tallyData as { data?: { formName?: string }; formName?: string } | undefined;
  const names = [
    integration?.form_name,
    tally?.data?.formName,
    tally?.formName,
  ].filter(Boolean) as string[];
  const normVal = normalizeColumnNameKey(value);
  return names.some((n) => normalizeColumnNameKey(n) === normVal);
}

function resolveCustomMappingRef(
  mappingKey: string,
  customMapping: Record<string, string>,
  customColumns: { id: string; name: string }[]
): string {
  const direct = customMapping[mappingKey];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  if (!mappingKey.startsWith('custom_')) return '';
  const colId = mappingKey.replace('custom_', '');
  const col = customColumns.find((c) => c.id === colId);
  if (!col) return '';
  const nameNorm = normalizeColumnNameKey(col.name);
  const nameCompact = compactColumnRef(col.name);
  for (const [k, v] of Object.entries(customMapping)) {
    if (typeof v !== 'string' || !v.trim()) continue;
    if (k.startsWith('custom_')) continue;
    if (normalizeColumnNameKey(k) === nameNorm || compactColumnRef(k) === nameCompact) return v.trim();
  }
  return '';
}

function getMappedValue(
  mappingKey: string,
  index: TallyFieldsIndex,
  customMapping: Record<string, string>,
  customColumns: { id: string; name: string; type: string }[],
  isBulk: boolean,
  integration?: { form_name?: string },
  tallyData?: unknown
): string {
  const mappedRef = resolveCustomMappingRef(mappingKey, customMapping, customColumns);
  if (mappedRef) {
    return lookupTallyValue(index, mappedRef, true);
  }
  for (const ref of autoMatchRefsForField(mappingKey, customColumns, isBulk)) {
    const v = lookupTallyValue(index, ref);
    if (!v) continue;
    if (mappingKey === 'source' && shouldRejectSourceAutoMatch(v, integration, tallyData)) {
      continue;
    }
    return v;
  }
  return '';
}

function fillEmptyCustomColumnsFromTally(
  bulkRaw: Record<string, unknown>,
  customColumns: { id: string; name: string; type: string; options?: string[] }[],
  index: TallyFieldsIndex,
  customMapping: Record<string, string>
): void {
  for (const col of customColumns) {
    if (!isEmptyBulkValue(bulkRaw[col.id])) continue;
    const mappedRef = resolveCustomMappingRef(`custom_${col.id}`, customMapping, customColumns);
    let raw = mappedRef ? lookupTallyValue(index, mappedRef, true) : '';
    if (!raw) {
      for (const ref of autoMatchRefsForField(`custom_${col.id}`, customColumns, true)) {
        raw = lookupTallyValue(index, ref, true);
        if (raw) break;
      }
    }
    if (raw) bulkRaw[col.id] = parseValueForCustomColumn(raw, col);
  }
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
    if (bulkValues[col.id] !== undefined && bulkValues[col.id] !== '') continue;
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
  const mapped = mapImportHeader((col as { name?: string }).name?.toLowerCase() ?? '');
  return normalizeImportTextCase(trimmed, {
    columnType: col.type,
    field: mapped ?? undefined,
  });
}

function givenNamesFromTableColumns(
  bulkRaw: Record<string, unknown>,
  customColumns: { id: string; name: string }[]
): string {
  let nombres = '';
  let nombre = '';
  for (const col of customColumns) {
    const compact = compactColumnRef(col.name);
    if (compact.includes('completo') || compact.includes('apellid')) continue;
    const text = bulkRaw[col.id] == null ? '' : String(bulkRaw[col.id]).trim();
    if (!text) continue;
    if (compact === 'nombres') nombres = text;
    else if (compact === 'nombre') nombre = text;
  }
  return nombres || nombre;
}

function applyCanonicalIdentityFromForm(
  candidate: Record<string, unknown>,
  bulkRaw: Record<string, unknown>,
  customColumns: { id: string; name: string }[]
): void {
  const givenFromCols = givenNamesFromTableColumns(bulkRaw, customColumns);
  let apP = String(candidate.apellido_paterno || '').trim();
  let apM = String(candidate.apellido_materno || '').trim();
  for (const col of customColumns) {
    const compact = compactColumnRef(col.name);
    const text = bulkRaw[col.id] == null ? '' : String(bulkRaw[col.id]).trim();
    if (!text) continue;
    if (!apP && (compact.includes('apellidopaterno') || compact === 'appaterno' || compact === 'paterno')) {
      apP = text;
    } else if (!apM && (compact.includes('apellidomaterno') || compact === 'apmaterno' || compact === 'materno')) {
      apM = text;
    }
  }

  let nombres = String(candidate.nombres || '').trim() || givenFromCols;
  const mappedFull = String(candidate.name || '').trim();

  if (!nombres && mappedFull) {
    const parsed = mappedFull.trim().split(/\s+/).filter(Boolean);
    if (!apP && !apM && parsed.length >= 2) {
      if (parsed.length === 2) {
        nombres = parsed[0];
        apP = parsed[1];
      } else {
        nombres = parsed.slice(0, -2).join(' ');
        apP = parsed[parsed.length - 2];
        apM = parsed[parsed.length - 1];
      }
    } else {
      nombres = mappedFull;
    }
  }

  if (nombres) candidate.nombres = nombres;
  if (apP) candidate.apellido_paterno = apP;
  if (apM) candidate.apellido_materno = apM;
  const composed = [nombres, apP, apM].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (composed) candidate.name = composed;
}

export function buildTallyCandidateFromSubmission(
  tallyData: unknown,
  integration: { field_mapping?: string | Record<string, string> | null },
  process: {
    is_bulk_process?: boolean | number;
    isBulkProcess?: boolean;
    bulk_config?: BulkProcessConfigLike | string | null;
    bulkConfig?: BulkProcessConfigLike;
  }
): Record<string, unknown> {
  const index = buildTallyFieldsIndex(tallyData);
  const customMapping = parseIntegrationFieldMapping(integration);
  const bulkConfig = parseBulkConfig(process);
  const customColumns = bulkConfig?.customColumns || [];
  const isBulk =
    process.isBulkProcess === true ||
    process.is_bulk_process === true ||
    process.is_bulk_process === 1;
  const mappingFields = getProcessMappingFields(process);
  const mappedKeys = new Set(mappingFields.map((f) => f.key));
  for (const key of Object.keys(customMapping)) {
    if (!key.startsWith('custom_') || mappedKeys.has(key)) continue;
    mappingFields.push({ key, label: key });
    mappedKeys.add(key);
  }

  const candidate: Record<string, unknown> = {
    name: '',
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    email: '',
    phone: '',
    phone2: '',
    description: '',
    source: '',
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
    const raw = getMappedValue(
      field.key,
      index,
      customMapping,
      customColumns,
      !!isBulk,
      integration as { form_name?: string },
      tallyData
    );
    if (!raw) continue;

    if (field.key.startsWith('custom_')) {
      const colId = field.key.replace('custom_', '');
      const col = customColumns.find((c) => c.id === colId);
      if (col) bulkRaw[col.id] = parseValueForCustomColumn(raw, col);
    } else {
      switch (field.key) {
        case 'nombres':
          candidate.nombres = raw;
          break;
        case 'apellido_paterno':
        case 'apellidoPaterno':
          candidate.apellido_paterno = raw;
          break;
        case 'apellido_materno':
        case 'apellidoMaterno':
          candidate.apellido_materno = raw;
          break;
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

  if (!String(candidate.source || '').trim()) {
    candidate.source = 'Tally';
  }

  if (customColumns.length > 0) {
    fillEmptyCustomColumnsFromTally(bulkRaw, customColumns, index, customMapping);
    syncHomonymCustomColumns(bulkRaw, customColumns, candidate);
  }
  applyCanonicalIdentityFromForm(candidate, bulkRaw, customColumns);
  if (customColumns.length > 0) {
    const enriched = enrichBulkColumnValuesForStorage(bulkRaw, customColumns);
    if (Object.keys(enriched).length > 0) {
      candidate.bulk_column_values = enriched;
    }
  }

  return candidate;
}
