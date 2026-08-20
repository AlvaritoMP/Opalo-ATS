/**
 * Mapeo proceso → campos de ficha complementaria.
 * Fuente: `candidate.*` o `custom.<columnId>`.
 */

import type { CustomColumn } from '../types';
import type { ComplementaryFichaData } from './complementaryFicha';
import { emptyComplementaryFicha, mergePrefill } from './complementaryFicha';
import {
    buildLegacyColumnIdToName,
    normalizeColumnNameKey,
    resolveColumnValueFromRow,
} from './bulkTableColumns';
import type { BulkProcessConfig } from '../types';
import { inferReportNamePartFromLabel } from './psycholaboralUtils';

export type ComplementaryFichaMappableKey = Exclude<
    keyof ComplementaryFichaData,
    | 'version'
    | 'familiares'
    | 'educacion'
    | 'experienciaLaboral'
    | 'antecedentesSalud'
    | 'declaracionAceptada'
    | 'submittedAt'
>;

export interface ComplementaryFichaFieldDef {
    key: ComplementaryFichaMappableKey;
    label: string;
    group: string;
    /** Aliases normalizados para sugerir columnas */
    aliases: string[];
}

/** Campos escalares del formulario que pueden mapearse a columnas del proceso */
export const COMPLEMENTARY_FICHA_MAPPABLE_FIELDS: ComplementaryFichaFieldDef[] = [
    // No incluir "nombre completo": en procesos masivos "Nombre" = nombres propios; el completo es otro campo/export.
    { key: 'nombres', label: 'Nombres', group: 'Personales', aliases: ['nombres', 'nombre', 'givennames', 'firstname', 'nombrespropios'] },
    { key: 'apellidoPaterno', label: 'Apellido paterno', group: 'Personales', aliases: ['apellidopaterno', 'appaterno', 'apaterno', 'apellido1', 'paternalsurname'] },
    { key: 'apellidoMaterno', label: 'Apellido materno', group: 'Personales', aliases: ['apellidomaterno', 'apmaterno', 'amaterno', 'apellido2', 'maternalsurname'] },
    { key: 'fechaNacimiento', label: 'Fecha de nacimiento', group: 'Personales', aliases: ['fechanacimiento', 'fnacimiento', 'fechanac', 'nacimiento', 'birthdate', 'dob', 'fechadenacimiento'] },
    { key: 'tipoDocumento', label: 'Tipo de documento', group: 'Personales', aliases: ['tipodocumento', 'tipodoc', 'documentotype'] },
    { key: 'nroDocumento', label: 'Nro. de documento', group: 'Personales', aliases: ['nrodocumento', 'numerodocumento', 'dni', 'documento', 'nrodni', 'cedula'] },
    { key: 'nacionalidad', label: 'Nacionalidad', group: 'Personales', aliases: ['nacionalidad', 'nationality'] },
    { key: 'edad', label: 'Edad', group: 'Personales', aliases: ['edad', 'age'] },
    { key: 'sexo', label: 'Sexo', group: 'Personales', aliases: ['sexo', 'genero', 'gender'] },
    { key: 'estadoCivil', label: 'Estado civil', group: 'Personales', aliases: ['estadocivil', 'civilstatus'] },
    { key: 'email', label: 'Correo electrónico', group: 'Contacto', aliases: ['email', 'correo', 'correoelectronico', 'mail'] },
    { key: 'telefono', label: 'Teléfono', group: 'Contacto', aliases: ['telefono', 'celular', 'phone', 'movil', 'whatsapp'] },
    { key: 'tallaCamisa', label: 'Talla camisa', group: 'Tallas', aliases: ['tallacamisa', 'camisa', 'tallapolo', 'talladepolo'] },
    { key: 'tallaPantalon', label: 'Talla pantalón', group: 'Tallas', aliases: ['tallapantalon', 'pantalon'] },
    { key: 'tallaCalzado', label: 'Talla calzado', group: 'Tallas', aliases: ['tallacalzado', 'calzado', 'tallazapato', 'zapato'] },
    { key: 'emergenciaNombre', label: 'En caso de emergencia llamar a', group: 'Emergencia', aliases: ['encasodeemergenciallamara', 'emergencianombre', 'contactoemergencianombre', 'llamaremergencia', 'nombreemergencia', 'avisarenemergencia'] },
    { key: 'emergenciaTelefono', label: 'Teléfono de emergencia', group: 'Emergencia', aliases: ['telefonoemergencia', 'contactoemergencia', 'emergencia', 'telefonodeemergencia'] },
    { key: 'emergenciaParentesco', label: 'Parentesco (emergencia)', group: 'Emergencia', aliases: ['parentescoemergencia', 'parentesco', 'parentesco contacto'] },
    { key: 'direccion', label: 'Dirección', group: 'Ubicación', aliases: ['direccion', 'domicilio', 'address', 'direcciondedomicilio'] },
    { key: 'distrito', label: 'Distrito', group: 'Ubicación', aliases: ['distrito', 'district'] },
    { key: 'provincia', label: 'Provincia', group: 'Ubicación', aliases: ['provincia', 'province'] },
    { key: 'departamento', label: 'Departamento', group: 'Ubicación', aliases: ['departamento', 'region', 'department'] },
    { key: 'unidadDestaque', label: 'Unidad de destaque', group: 'Contratación', aliases: ['unidad', 'unidaddestaque', 'destaque'] },
    { key: 'puestoContrato', label: 'Puesto (proceso de selección)', group: 'Contratación', aliases: ['puesto', 'cargo', 'posicion', 'position'] },
    { key: 'bancoSueldo', label: 'Banco para sueldo', group: 'Contratación', aliases: ['bancosueldo', 'banco', 'cuentabanco', 'entidadbancaria'] },
    { key: 'bancoCts', label: 'Banco para CTS', group: 'Contratación', aliases: ['bancocts', 'cts'] },
    { key: 'sistemaPensionesAnterior', label: 'Sistema pensiones anterior', group: 'Contratación', aliases: ['sistemapensionesanterior', 'afpanterior', 'onpanterior', 'pensionanterior'] },
    { key: 'sistemaPensionesDeseado', label: 'Sistema pensiones deseado', group: 'Contratación', aliases: ['sistemapensionesdeseado', 'afp', 'onp', 'pensiondeseada'] },
    { key: 'parienteEnOpalo', label: 'Pariente en la empresa', group: 'Familia', aliases: ['parienteempresa', 'parienteopal', 'familiarempresa', 'tienespariente'] },
    { key: 'nombreFamiliarOpalo', label: 'Nombre del familiar en empresa', group: 'Familia', aliases: ['nombrefamiliar', 'familiaropal', 'nombredelfamiliar'] },
];

export type ComplementaryFichaMapping = Partial<Record<ComplementaryFichaMappableKey, string>>;

/**
 * Campos siempre obligatorios (no se pueden desactivar).
 * La declaración se valida aparte como checkbox.
 */
export const COMPLEMENTARY_FICHA_LOCKED_REQUIRED: ComplementaryFichaMappableKey[] = [
    'nombres',
    'apellidoPaterno',
    'nroDocumento',
    'email',
    'telefono',
];

/** Defaults recomendados al crear/configurar un proceso (editables). */
export const COMPLEMENTARY_FICHA_DEFAULT_REQUIRED: ComplementaryFichaMappableKey[] = [
    ...COMPLEMENTARY_FICHA_LOCKED_REQUIRED,
    'apellidoMaterno',
    'fechaNacimiento',
    'sexo',
    'estadoCivil',
    'direccion',
    'distrito',
    'provincia',
    'emergenciaNombre',
    'emergenciaTelefono',
    'emergenciaParentesco',
];

export function isComplementaryFieldLockedRequired(key: string): boolean {
    return (COMPLEMENTARY_FICHA_LOCKED_REQUIRED as string[]).includes(key);
}

/** Une locked + config del proceso. */
export function resolveComplementaryRequiredFields(
    configured?: string[] | null
): ComplementaryFichaMappableKey[] {
    const set = new Set<string>(COMPLEMENTARY_FICHA_LOCKED_REQUIRED);
    for (const key of configured || COMPLEMENTARY_FICHA_DEFAULT_REQUIRED) {
        if (COMPLEMENTARY_FICHA_MAPPABLE_FIELDS.some((f) => f.key === key)) {
            set.add(key);
        }
    }
    return [...set] as ComplementaryFichaMappableKey[];
}

export function getMissingRequiredComplementaryFields(
    form: Partial<ComplementaryFichaData>,
    requiredKeys: string[]
): string[] {
    const missing: string[] = [];
    for (const key of requiredKeys) {
        const def = COMPLEMENTARY_FICHA_MAPPABLE_FIELDS.find((f) => f.key === key);
        const label = def?.label || key;
        const value = (form as Record<string, unknown>)[key];
        if (key === 'parienteEnOpalo') {
            if (value !== true && value !== false) missing.push(label);
            continue;
        }
        if (value === undefined || value === null || String(value).trim() === '') {
            missing.push(label);
        }
    }
    return missing;
}

const CANDIDATE_SOURCE_OPTIONS: { id: string; label: string }[] = [
    // Columna fija "Nombre" de la tabla de alta densidad (= candidates.name = nombres propios en masivos).
    { id: 'candidate.name', label: 'Candidato · Nombre (columna del proceso)' },
    { id: 'candidate.dni', label: 'Candidato · DNI' },
    { id: 'candidate.email', label: 'Candidato · Email' },
    { id: 'candidate.phone', label: 'Candidato · Teléfono' },
    { id: 'candidate.phone2', label: 'Candidato · Teléfono 2' },
    { id: 'candidate.age', label: 'Candidato · Edad' },
    { id: 'candidate.address', label: 'Candidato · Dirección' },
    { id: 'candidate.province', label: 'Candidato · Provincia' },
    { id: 'candidate.district', label: 'Candidato · Distrito' },
];

/** Columnas de exportación / nombre completo compuesto: no mapear a "Nombres". */
export function isNombreCompletoColumnLabel(name: string): boolean {
    const s = stripSpaces(normalizeColumnNameKey(name));
    return /nombrecompleto|nombrescompletos|fullnamecompleto|^fullname$/.test(s);
}

export function complementaryFichaSourceOptions(customColumns: CustomColumn[]): { id: string; label: string }[] {
    return [
        { id: '', label: '— Sin mapear —' },
        ...CANDIDATE_SOURCE_OPTIONS,
        ...customColumns.map((c) => ({
            id: `custom.${c.id}`,
            label: `Columna · ${c.name}`,
        })),
    ];
}

function stripSpaces(norm: string): string {
    return norm.replace(/\s+/g, '');
}

/** Sugiere fuente para un campo del formulario según nombres de columnas. */
export function suggestSourceForFichaField(
    field: ComplementaryFichaFieldDef,
    customColumns: CustomColumn[]
): string {
    // Nombre estructurado vía reportNamePart / inferencia
    if (field.key === 'nombres' || field.key === 'apellidoPaterno' || field.key === 'apellidoMaterno') {
        const want =
            field.key === 'nombres'
                ? 'given_names'
                : field.key === 'apellidoPaterno'
                  ? 'paternal_surname'
                  : 'maternal_surname';
        for (const col of customColumns) {
            if (field.key === 'nombres' && isNombreCompletoColumnLabel(col.name)) continue;
            const labelNorm = normalizeColumnNameKey(col.name);
            const part = col.reportNamePart || inferReportNamePartFromLabel(labelNorm);
            if (part === want) return `custom.${col.id}`;
        }
    }

    const aliasSet = new Set(field.aliases.map((a) => stripSpaces(normalizeColumnNameKey(a))));
    // 1) Match exacto de alias (p. ej. columna "Nombre" → nombres)
    for (const col of customColumns) {
        if (field.key === 'nombres' && isNombreCompletoColumnLabel(col.name)) continue;
        const colNorm = stripSpaces(normalizeColumnNameKey(col.name));
        if (aliasSet.has(colNorm)) return `custom.${col.id}`;
    }
    // 2) Match parcial solo si no es "nombre completo" ni demasiado ambiguo
    for (const col of customColumns) {
        if (field.key === 'nombres' && isNombreCompletoColumnLabel(col.name)) continue;
        const colNorm = stripSpaces(normalizeColumnNameKey(col.name));
        for (const alias of field.aliases) {
            const a = stripSpaces(normalizeColumnNameKey(alias));
            if (a.length < 4 || colNorm.length < 4) continue;
            if (colNorm === a) return `custom.${col.id}`;
            // Evitar que "nombre" coincida dentro de "nombrecompleto"
            if (field.key === 'nombres' && /completo/.test(colNorm)) continue;
            if (colNorm.includes(a) || a.includes(colNorm)) return `custom.${col.id}`;
        }
    }

    // Fallbacks a campos estándar del candidato
    const candidateFallback: Partial<Record<ComplementaryFichaMappableKey, string>> = {
        // Columna fija "Nombre" del proceso masivo = nombres propios (no el compuesto).
        nombres: 'candidate.name',
        nroDocumento: 'candidate.dni',
        email: 'candidate.email',
        telefono: 'candidate.phone',
        edad: 'candidate.age',
        direccion: 'candidate.address',
        provincia: 'candidate.province',
        distrito: 'candidate.district',
    };
    return candidateFallback[field.key] || '';
}

/** Genera mapa sugerido completo (solo campos con match). */
export function suggestComplementaryFichaMapping(
    customColumns: CustomColumn[]
): ComplementaryFichaMapping {
    const mapping: ComplementaryFichaMapping = {};
    const used = new Set<string>();
    for (const field of COMPLEMENTARY_FICHA_MAPPABLE_FIELDS) {
        const suggested = suggestSourceForFichaField(field, customColumns);
        if (!suggested) continue;
        if (suggested.startsWith('custom.') && used.has(suggested)) continue;
        mapping[field.key] = suggested;
        if (suggested.startsWith('custom.')) used.add(suggested);
    }
    return mapping;
}

/** Une mapeo guardado con sugerencias para campos aún vacíos. */
export function resolveComplementaryFichaMapping(
    saved: ComplementaryFichaMapping | undefined,
    customColumns: CustomColumn[]
): ComplementaryFichaMapping {
    const suggested = suggestComplementaryFichaMapping(customColumns);
    return { ...suggested, ...(saved || {}) };
}

/** Convierte fechas varias a dd/mm/yyyy para el formulario. */
export function toDisplayDateDdMmYyyy(raw: unknown): string {
    if (raw === null || raw === undefined) return '';
    const text = String(raw).trim();
    if (!text) return '';

    // Ya dd/mm/yyyy
    const dmy = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (dmy) {
        const d = dmy[1].padStart(2, '0');
        const m = dmy[2].padStart(2, '0');
        let y = dmy[3];
        if (y.length === 2) y = Number(y) > 50 ? `19${y}` : `20${y}`;
        return `${d}/${m}/${y}`;
    }

    // yyyy-mm-dd o ISO
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
        const d = String(parsed.getUTCDate()).padStart(2, '0');
        const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
        const y = parsed.getUTCFullYear();
        return `${d}/${m}/${y}`;
    }

    return text;
}

function trimText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    return String(value).trim();
}

function parseLegacyFullName(fullName: string): {
    nombres?: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
} {
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

export interface ComplementaryPrefillCandidateRow {
    name?: string | null;
    nombres?: string | null;
    apellidoPaterno?: string | null;
    apellidoMaterno?: string | null;
    apellido_paterno?: string | null;
    apellido_materno?: string | null;
    dni?: string | null;
    email?: string | null;
    phone?: string | null;
    phone2?: string | null;
    age?: number | string | null;
    address?: string | null;
    province?: string | null;
    district?: string | null;
    bulk_column_values?: Record<string, unknown> | null;
    complementary_data?: ComplementaryFichaData | Record<string, unknown> | null;
}

function resolveMappedRawValue(
    sourceId: string,
    candidate: ComplementaryPrefillCandidateRow,
    customColumns: CustomColumn[],
    legacyIdToName: Record<string, string>
): unknown {
    if (!sourceId) return undefined;

    if (sourceId.startsWith('candidate.')) {
        const field = sourceId.slice('candidate.'.length);
        const map: Record<string, unknown> = {
            name: candidate.name,
            nombres: candidate.nombres,
            apellidoPaterno: candidate.apellidoPaterno || candidate.apellido_paterno,
            apellidoMaterno: candidate.apellidoMaterno || candidate.apellido_materno,
            dni: candidate.dni,
            email: candidate.email,
            phone: candidate.phone,
            phone2: candidate.phone2,
            age: candidate.age,
            address: candidate.address,
            province: candidate.province,
            district: candidate.district,
        };
        return map[field];
    }

    if (sourceId.startsWith('custom.')) {
        const colId = sourceId.slice('custom.'.length);
        const col = customColumns.find((c) => c.id === colId);
        const row = (candidate.bulk_column_values || {}) as Record<string, unknown>;
        if (!col) return row[colId];
        return resolveColumnValueFromRow(row, col, legacyIdToName);
    }

    return undefined;
}

function formatMappedValue(fieldKey: ComplementaryFichaMappableKey, raw: unknown): string | boolean | null {
    if (raw === undefined || raw === null || raw === '') return '';
    if (fieldKey === 'fechaNacimiento') return toDisplayDateDdMmYyyy(raw);
    if (fieldKey === 'parienteEnOpalo') {
        const t = trimText(raw).toLowerCase();
        if (['si', 'sí', 'true', '1', 'yes'].includes(t)) return true;
        if (['no', 'false', '0'].includes(t)) return false;
        return null;
    }
    return trimText(raw);
}

/**
 * Construye el objeto de precarga del formulario usando mapeo del proceso + datos del candidato.
 */
export function buildComplementaryPrefillFromMapping(params: {
    candidate: ComplementaryPrefillCandidateRow;
    customColumns: CustomColumn[];
    mapping?: ComplementaryFichaMapping;
    bulkConfig?: BulkProcessConfig | null;
}): ComplementaryFichaData {
    const { candidate, customColumns, bulkConfig } = params;
    const mapping = resolveComplementaryFichaMapping(params.mapping || bulkConfig?.complementaryFichaMapping, customColumns);
    const legacyIdToName = buildLegacyColumnIdToName(bulkConfig || undefined, customColumns);

    const fromMapped: Partial<ComplementaryFichaData> = {};
    for (const field of COMPLEMENTARY_FICHA_MAPPABLE_FIELDS) {
        const sourceId = mapping[field.key];
        if (!sourceId) continue;
        const raw = resolveMappedRawValue(sourceId, candidate, customColumns, legacyIdToName);
        const formatted = formatMappedValue(field.key, raw);
        if (formatted === '' || formatted === null) continue;
        (fromMapped as Record<string, unknown>)[field.key] = formatted;
    }

    // Si faltan nombres: en masivos `candidate.name` suele ser solo nombres propios.
    // Solo partir como "nombre completo" cuando no hay apellidos ya resueltos por mapeo.
    if (!fromMapped.nombres && candidate.name) {
        const hasStructuredSurnames = Boolean(
            fromMapped.apellidoPaterno ||
                fromMapped.apellidoMaterno ||
                mapping.apellidoPaterno ||
                mapping.apellidoMaterno
        );
        if (hasStructuredSurnames || mapping.nombres === 'candidate.name') {
            fromMapped.nombres = String(candidate.name).trim();
        } else if (!fromMapped.apellidoPaterno) {
            Object.assign(fromMapped, parseLegacyFullName(String(candidate.name)));
        }
    }

    // Fallbacks mínimos si el mapeo no cubrió campos estándar
    if (!fromMapped.nombres && candidate.nombres) fromMapped.nombres = String(candidate.nombres);
    if (!fromMapped.apellidoPaterno && (candidate.apellidoPaterno || candidate.apellido_paterno)) {
        fromMapped.apellidoPaterno = String(candidate.apellidoPaterno || candidate.apellido_paterno);
    }
    if (!fromMapped.apellidoMaterno && (candidate.apellidoMaterno || candidate.apellido_materno)) {
        fromMapped.apellidoMaterno = String(candidate.apellidoMaterno || candidate.apellido_materno);
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

    const saved =
        candidate.complementary_data && typeof candidate.complementary_data === 'object'
            ? (candidate.complementary_data as ComplementaryFichaData)
            : emptyComplementaryFicha();

    // Prioridad: lo ya enviado por el candidato > mapeo/columnas del proceso
    return mergePrefill(
        { ...emptyComplementaryFicha(), ...saved, version: 1 },
        fromMapped as ComplementaryFichaData
    );
}
