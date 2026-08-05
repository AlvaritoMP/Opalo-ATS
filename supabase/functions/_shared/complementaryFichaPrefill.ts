/**
 * Prefill de ficha complementaria para Edge Function (Deno).
 * Réplica ligera de lib/complementaryFichaMapping.ts sin dependencias de localStorage.
 */

export type FichaMapping = Record<string, string>;

interface CustomColumn {
  id: string;
  name: string;
  reportNamePart?: string;
  dashboardSemanticField?: string;
}

const LOCKED_REQUIRED = ['nombres', 'apellidoPaterno', 'nroDocumento', 'email', 'telefono']

const DEFAULT_REQUIRED = [
  ...LOCKED_REQUIRED,
  'apellidoMaterno',
  'fechaNacimiento',
  'sexo',
  'estadoCivil',
  'direccion',
  'distrito',
  'provincia',
  'emergenciaTelefono',
  'emergenciaParentesco',
]

const FIELD_LABELS: Record<string, string> = {
  nombres: 'Nombres',
  apellidoPaterno: 'Apellido paterno',
  apellidoMaterno: 'Apellido materno',
  fechaNacimiento: 'Fecha de nacimiento',
  tipoDocumento: 'Tipo de documento',
  nroDocumento: 'Nro. de documento',
  nacionalidad: 'Nacionalidad',
  edad: 'Edad',
  sexo: 'Sexo',
  estadoCivil: 'Estado civil',
  email: 'Correo electrónico',
  telefono: 'Teléfono',
  tallaCamisa: 'Talla camisa',
  tallaPantalon: 'Talla pantalón',
  tallaCalzado: 'Talla calzado',
  emergenciaTelefono: 'Teléfono de emergencia',
  emergenciaParentesco: 'Parentesco (emergencia)',
  direccion: 'Dirección',
  distrito: 'Distrito',
  provincia: 'Provincia',
  departamento: 'Departamento',
  unidadDestaque: 'Unidad de destaque',
  puestoContrato: 'Puesto',
  bancoSueldo: 'Banco para sueldo',
  bancoCts: 'Banco para CTS',
  sistemaPensionesAnterior: 'Sistema pensiones anterior',
  sistemaPensionesDeseado: 'Sistema pensiones deseado',
  parienteEnOpalo: 'Pariente en la empresa',
  nombreFamiliarOpalo: 'Nombre del familiar',
}

export function resolveRequiredFields(configured?: string[] | null): string[] {
  const set = new Set<string>(LOCKED_REQUIRED)
  for (const key of configured && configured.length ? configured : DEFAULT_REQUIRED) {
    if (FIELD_LABELS[key] || LOCKED_REQUIRED.includes(key)) set.add(key)
  }
  return [...set]
}

export function getMissingRequired(form: Record<string, unknown>, requiredKeys: string[]): string[] {
  const missing: string[] = []
  for (const key of requiredKeys) {
    const value = form[key]
    if (key === 'parienteEnOpalo') {
      if (value !== true && value !== false) missing.push(FIELD_LABELS[key] || key)
      continue
    }
    if (value === undefined || value === null || String(value).trim() === '') {
      missing.push(FIELD_LABELS[key] || key)
    }
  }
  return missing
}

function normalizeKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function strip(norm: string): string {
  return norm.replace(/\s+/g, '');
}

function trimText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return String(value).trim();
}

function isEmpty(val: unknown): boolean {
  return val === undefined || val === null || val === '';
}

export function toDisplayDateDdMmYyyy(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  const text = String(raw).trim();
  if (!text) return '';

  const dmy = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    let y = dmy[3];
    if (y.length === 2) y = Number(y) > 50 ? `19${y}` : `20${y}`;
    return `${d}/${m}/${y}`;
  }

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const d = String(parsed.getUTCDate()).padStart(2, '0');
    const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const y = String(parsed.getUTCFullYear());
    return `${d}/${m}/${y}`;
  }
  return text;
}

const FIELDS: { key: string; aliases: string[]; namePart?: string }[] = [
  { key: 'nombres', aliases: ['nombres', 'nombre', 'firstname'], namePart: 'given_names' },
  { key: 'apellidoPaterno', aliases: ['apellidopaterno', 'appaterno', 'apaterno', 'apellido1'], namePart: 'paternal_surname' },
  { key: 'apellidoMaterno', aliases: ['apellidomaterno', 'apmaterno', 'amaterno', 'apellido2'], namePart: 'maternal_surname' },
  { key: 'fechaNacimiento', aliases: ['fechanacimiento', 'fnacimiento', 'fechanac', 'nacimiento', 'birthdate', 'dob', 'fechadenacimiento'] },
  { key: 'tipoDocumento', aliases: ['tipodocumento', 'tipodoc'] },
  { key: 'nroDocumento', aliases: ['nrodocumento', 'numerodocumento', 'dni', 'documento', 'nrodni'] },
  { key: 'nacionalidad', aliases: ['nacionalidad'] },
  { key: 'edad', aliases: ['edad', 'age'] },
  { key: 'sexo', aliases: ['sexo', 'genero'] },
  { key: 'estadoCivil', aliases: ['estadocivil'] },
  { key: 'email', aliases: ['email', 'correo', 'correoelectronico'] },
  { key: 'telefono', aliases: ['telefono', 'celular', 'phone', 'movil', 'whatsapp'] },
  { key: 'tallaCamisa', aliases: ['tallacamisa', 'camisa', 'tallapolo'] },
  { key: 'tallaPantalon', aliases: ['tallapantalon', 'pantalon'] },
  { key: 'tallaCalzado', aliases: ['tallacalzado', 'calzado', 'zapato'] },
  { key: 'emergenciaTelefono', aliases: ['telefonoemergencia', 'contactoemergencia', 'emergencia'] },
  { key: 'emergenciaParentesco', aliases: ['parentescoemergencia', 'parentesco'] },
  { key: 'direccion', aliases: ['direccion', 'domicilio', 'address'] },
  { key: 'distrito', aliases: ['distrito', 'district'] },
  { key: 'provincia', aliases: ['provincia', 'province'] },
  { key: 'departamento', aliases: ['departamento', 'region'] },
  { key: 'unidadDestaque', aliases: ['unidad', 'unidaddestaque', 'destaque'] },
  { key: 'puestoContrato', aliases: ['puesto', 'cargo', 'posicion'] },
  { key: 'bancoSueldo', aliases: ['bancosueldo', 'banco', 'entidadbancaria'] },
  { key: 'bancoCts', aliases: ['bancocts', 'cts'] },
  { key: 'sistemaPensionesAnterior', aliases: ['sistemapensionesanterior', 'afpanterior', 'onpanterior'] },
  { key: 'sistemaPensionesDeseado', aliases: ['sistemapensionesdeseado', 'afp', 'onp'] },
  { key: 'parienteEnOpalo', aliases: ['parienteempresa', 'parienteopal', 'familiarempresa'] },
  { key: 'nombreFamiliarOpalo', aliases: ['nombrefamiliar', 'familiaropal'] },
];

function inferNamePart(labelNorm: string): string | null {
  const s = strip(labelNorm);
  if (/(nombres|nombrepropia|givenname|firstname|^nombre$)/.test(s) && !/apellido/.test(s)) return 'given_names';
  if (/(apellidopaterno|appaterno|apaterno|paternal)/.test(s)) return 'paternal_surname';
  if (/(apellidomaterno|apmaterno|amaterno|maternal)/.test(s)) return 'maternal_surname';
  if (/^apellidos$|^apellidoscompletos$/.test(s)) return 'surnames_combined';
  return null;
}

function resolveColumnValue(
  row: Record<string, unknown>,
  col: CustomColumn,
  legacyIdToName: Record<string, string>
): unknown {
  const idVal = row[col.id];
  if (!isEmpty(idVal) || idVal === false) return idVal;

  const bare = normalizeKey(col.name);
  const nameKey = `__name__${bare}`;
  if (!isEmpty(row[nameKey]) || row[nameKey] === false) return row[nameKey];

  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith('__name__')) {
      if (k.slice('__name__'.length) === bare && (!isEmpty(v) || v === false)) return v;
      continue;
    }
    if (normalizeKey(k) === bare && (!isEmpty(v) || v === false)) return v;
  }

  for (const [key, val] of Object.entries(row)) {
    if (key === col.id || key.startsWith('__name__')) continue;
    if (isEmpty(val) && val !== false) continue;
    const legacyName = legacyIdToName[key];
    if (legacyName && normalizeKey(legacyName) === bare) return val;
  }
  return undefined;
}

export function suggestMapping(customColumns: CustomColumn[]): FichaMapping {
  const mapping: FichaMapping = {};
  const used = new Set<string>();

  for (const field of FIELDS) {
    if (field.namePart) {
      for (const col of customColumns) {
        const labelNorm = normalizeKey(col.name);
        const part = col.reportNamePart || inferNamePart(labelNorm);
        if (part === field.namePart) {
          const sid = `custom.${col.id}`;
          if (!used.has(sid)) {
            mapping[field.key] = sid;
            used.add(sid);
          }
          break;
        }
      }
    }
    if (mapping[field.key]) continue;

    const aliasSet = new Set(field.aliases.map((a) => strip(normalizeKey(a))));
    for (const col of customColumns) {
      const colNorm = strip(normalizeKey(col.name));
      let hit = aliasSet.has(colNorm);
      if (!hit) {
        for (const a of aliasSet) {
          if (a.length >= 4 && colNorm.length >= 4 && (colNorm.includes(a) || a.includes(colNorm))) {
            hit = true;
            break;
          }
        }
      }
      if (!hit) continue;
      const sid = `custom.${col.id}`;
      if (used.has(sid)) continue;
      mapping[field.key] = sid;
      used.add(sid);
      break;
    }
  }

  const fallbacks: Record<string, string> = {
    nroDocumento: 'candidate.dni',
    email: 'candidate.email',
    telefono: 'candidate.phone',
    edad: 'candidate.age',
    direccion: 'candidate.address',
    provincia: 'candidate.province',
    distrito: 'candidate.district',
  };
  for (const [k, v] of Object.entries(fallbacks)) {
    if (!mapping[k]) mapping[k] = v;
  }
  return mapping;
}

function parseLegacyFullName(fullName: string) {
  const tokens = fullName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return {};
  if (tokens.length === 1) return { nombres: tokens[0] };
  if (tokens.length === 2) return { nombres: tokens[0], apellidoPaterno: tokens[1] };
  return {
    nombres: tokens.slice(0, -2).join(' '),
    apellidoPaterno: tokens[tokens.length - 2],
    apellidoMaterno: tokens[tokens.length - 1],
  };
}

function emptyForm() {
  return {
    version: 1 as const,
    tipoDocumento: 'DNI',
    familiares: [{}],
    educacion: [{}],
    experienciaLaboral: [{}],
    antecedentesSalud: [] as unknown[],
    parienteEnOpalo: null as boolean | null,
    declaracionAceptada: false,
  };
}

function mergePrefill(base: Record<string, unknown>, fromMapped: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...emptyForm(), ...base };
  for (const [key, value] of Object.entries(fromMapped)) {
    if (
      key === 'version' ||
      key === 'familiares' ||
      key === 'educacion' ||
      key === 'experienciaLaboral' ||
      key === 'antecedentesSalud'
    ) {
      continue;
    }
    const current = out[key];
    const empty = current === undefined || current === null || current === '';
    if (empty && value !== undefined && value !== null && value !== '') {
      out[key] = value;
    }
  }
  if (!Array.isArray(out.familiares) || out.familiares.length === 0) out.familiares = [{}];
  if (!Array.isArray(out.educacion) || out.educacion.length === 0) out.educacion = [{}];
  if (!Array.isArray(out.experienciaLaboral) || out.experienciaLaboral.length === 0) {
    out.experienciaLaboral = [{}];
  }
  if (!Array.isArray(out.antecedentesSalud)) out.antecedentesSalud = [];
  return out;
}

export function buildPrefillForm(params: {
  candidate: Record<string, unknown>;
  customColumns: CustomColumn[];
  savedMapping?: FichaMapping;
  columnKeyAliases?: Record<string, string>;
  processTitle?: string;
}): Record<string, unknown> {
  const { candidate, customColumns } = params;
  const mapping = { ...suggestMapping(customColumns), ...(params.savedMapping || {}) };
  const legacyIdToName: Record<string, string> = { ...(params.columnKeyAliases || {}) };
  for (const col of customColumns) legacyIdToName[col.id] = col.name;

  const row = (candidate.bulk_column_values || {}) as Record<string, unknown>;
  const fromMapped: Record<string, unknown> = {};

  for (const field of FIELDS) {
    const sourceId = mapping[field.key];
    if (!sourceId) continue;
    let raw: unknown;
    if (sourceId.startsWith('candidate.')) {
      const f = sourceId.slice('candidate.'.length);
      raw = candidate[f];
    } else if (sourceId.startsWith('custom.')) {
      const colId = sourceId.slice('custom.'.length);
      const col = customColumns.find((c) => c.id === colId);
      raw = col ? resolveColumnValue(row, col, legacyIdToName) : row[colId];
    }
    if (isEmpty(raw) && raw !== false) continue;

    if (field.key === 'fechaNacimiento') {
      fromMapped[field.key] = toDisplayDateDdMmYyyy(raw);
    } else if (field.key === 'parienteEnOpalo') {
      const t = trimText(raw).toLowerCase();
      if (['si', 'sí', 'true', '1', 'yes'].includes(t)) fromMapped[field.key] = true;
      else if (['no', 'false', '0'].includes(t)) fromMapped[field.key] = false;
    } else if (field.key !== 'puestoContrato') {
      // puestoContrato se fuerza desde el título del proceso
      fromMapped[field.key] = trimText(raw);
    }
  }

  if (!fromMapped.nombres && !fromMapped.apellidoPaterno && candidate.name) {
    Object.assign(fromMapped, parseLegacyFullName(String(candidate.name)));
  }
  if (!fromMapped.nroDocumento && candidate.dni) fromMapped.nroDocumento = String(candidate.dni);
  if (!fromMapped.email && candidate.email) fromMapped.email = String(candidate.email);
  if (!fromMapped.telefono && (candidate.phone || candidate.phone2)) {
    fromMapped.telefono = String(candidate.phone || candidate.phone2);
  }
  if (!fromMapped.edad && candidate.age != null && candidate.age !== '') {
    fromMapped.edad = String(candidate.age);
  }
  if (!fromMapped.direccion && candidate.address) fromMapped.direccion = String(candidate.address);
  if (!fromMapped.provincia && candidate.province) fromMapped.provincia = String(candidate.province);
  if (!fromMapped.distrito && candidate.district) fromMapped.distrito = String(candidate.district);

  const processTitle = trimText(params.processTitle);
  if (processTitle) {
    fromMapped.puestoContrato = processTitle;
  }

  const saved =
    candidate.complementary_data && typeof candidate.complementary_data === 'object'
      ? (candidate.complementary_data as Record<string, unknown>)
      : {};

  const merged = mergePrefill({ ...emptyForm(), ...saved }, fromMapped);
  if (processTitle) {
    merged.puestoContrato = processTitle;
  }
  return merged;
}
