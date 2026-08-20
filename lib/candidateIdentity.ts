/**
 * Identidad transversal del candidato en todo el ATS.
 *
 * Nombres, Apellido Paterno, Apellido Materno y DNI son campos de sistema
 * (no columnas personalizadas). El nombre completo es siempre la suma de las
 * tres partes de nombre; nunca un texto independiente.
 */

import type { CustomColumn } from '../types';
import { inferReportNamePartFromLabel } from './psycholaboralUtils';

export const GIVEN_NAMES_COLUMN_ID = 'nombres';
export const PATERNAL_SURNAME_COLUMN_ID = 'apellidoPaterno';
export const MATERNAL_SURNAME_COLUMN_ID = 'apellidoMaterno';
export const DNI_COLUMN_ID = 'dni';
export const LEGACY_NAME_COLUMN_ID = 'name';

export const IDENTITY_NAME_COLUMN_IDS = [
    GIVEN_NAMES_COLUMN_ID,
    PATERNAL_SURNAME_COLUMN_ID,
    MATERNAL_SURNAME_COLUMN_ID,
] as const;

export const IDENTITY_SYSTEM_COLUMN_IDS = [
    ...IDENTITY_NAME_COLUMN_IDS,
    DNI_COLUMN_ID,
] as const;

/** Obligatorios al crear/editar. Apellido materno siempre existe pero puede ir vacío. */
export const IDENTITY_REQUIRED_COLUMN_IDS = [
    GIVEN_NAMES_COLUMN_ID,
    PATERNAL_SURNAME_COLUMN_ID,
    DNI_COLUMN_ID,
] as const;

export const IDENTITY_COLUMN_LABELS: Record<(typeof IDENTITY_SYSTEM_COLUMN_IDS)[number], string> = {
    nombres: 'Nombres',
    apellidoPaterno: 'Apellido Paterno',
    apellidoMaterno: 'Apellido Materno',
    dni: 'DNI',
};

export type IdentityNameColumnId = (typeof IDENTITY_NAME_COLUMN_IDS)[number];
export type IdentitySystemColumnId = (typeof IDENTITY_SYSTEM_COLUMN_IDS)[number];

export interface CandidateIdentityParts {
    nombres?: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
}

function trimText(value: unknown): string | undefined {
    if (value === null || value === undefined) return undefined;
    const text = String(value).trim();
    return text || undefined;
}

function normalizeIdentityLabel(label: string): string {
    return label
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

/** Une partes no vacías: Nombres + Apellido Paterno + Apellido Materno. */
export function composeWorkerFullName(
    nombres?: string,
    apellidoPaterno?: string,
    apellidoMaterno?: string
): string {
    return [nombres, apellidoPaterno, apellidoMaterno]
        .map(part => (part || '').trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function composeIdentityFullName(parts: CandidateIdentityParts): string {
    return composeWorkerFullName(parts.nombres, parts.apellidoPaterno, parts.apellidoMaterno);
}

/**
 * Fallback cuando ATS solo tiene un nombre completo legacy.
 * Convención habitual (PE): últimos 2 tokens = apellidos; el resto = nombres.
 */
export function parseLegacyFullName(fullName: string): CandidateIdentityParts {
    const tokens = fullName.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return {};
    if (tokens.length === 1) return { nombres: tokens[0] };
    if (tokens.length === 2) {
        return { nombres: tokens[0], apellidoPaterno: tokens[1] };
    }
    return {
        nombres: tokens.slice(0, -2).join(' '),
        apellidoPaterno: tokens[tokens.length - 2],
        apellidoMaterno: tokens[tokens.length - 1],
    };
}

export function isIdentitySystemColumnId(colId: string): boolean {
    return (IDENTITY_SYSTEM_COLUMN_IDS as readonly string[]).includes(colId);
}

export function isIdentityNameColumnId(colId: string): colId is IdentityNameColumnId {
    return (IDENTITY_NAME_COLUMN_IDS as readonly string[]).includes(colId);
}

export function isIdentityRequiredColumnId(colId: string): boolean {
    return (IDENTITY_REQUIRED_COLUMN_IDS as readonly string[]).includes(colId);
}

export function identityColumnIdFromLabel(label: string): IdentitySystemColumnId | null {
    const n = normalizeIdentityLabel(label);
    if (!n) return null;
    if (n === 'dni' || n === 'nro documento' || n === 'nro. documento' || n === 'numero de documento' || n === 'nro documento de identidad' || n === 'documento de identidad') {
        return 'dni';
    }
    if (/completo/.test(n)) return null;
    const part = inferReportNamePartFromLabel(n);
    if (part === 'given_names') return 'nombres';
    if (part === 'paternal_surname') return 'apellidoPaterno';
    if (part === 'maternal_surname') return 'apellidoMaterno';
    return null;
}

export function isIdentityCustomColumn(col: {
    name?: string;
    reportNamePart?: string | null;
}): boolean {
    return canonicalIdentityMappingKeyFromCustomColumn(col) != null;
}

/**
 * Columna personalizada histórica de Nombres / apellidos / DNI → campo de sistema.
 * No crea columnas nuevas: reusa la identidad canónica del candidato.
 */
export function canonicalIdentityMappingKeyFromCustomColumn(col: {
    id?: string;
    name?: string;
    reportNamePart?: string | null;
}): IdentitySystemColumnId | null {
    if (col.reportNamePart === 'given_names') return 'nombres';
    if (col.reportNamePart === 'paternal_surname') return 'apellidoPaterno';
    if (col.reportNamePart === 'maternal_surname') return 'apellidoMaterno';
    return identityColumnIdFromLabel(col.name || '');
}

/**
 * Reasigna mapeos Tally guardados en `custom_<uuid>` (o snake_case) a las claves
 * de sistema `nombres` / `apellidoPaterno` / `apellidoMaterno` / `dni`.
 * Conserva `name` como legado: un solo campo Tally de nombre completo.
 */
export function migrateIdentityTallyFieldMapping(
    mapping: Record<string, string> = {},
    customColumns: Array<{ id: string; name?: string; reportNamePart?: string | null }> = []
): Record<string, string> {
    const out: Record<string, string> = { ...mapping };
    if (out.apellido_paterno && !out.apellidoPaterno) {
        out.apellidoPaterno = out.apellido_paterno;
        delete out.apellido_paterno;
    }
    if (out.apellido_materno && !out.apellidoMaterno) {
        out.apellidoMaterno = out.apellido_materno;
        delete out.apellido_materno;
    }
    for (const col of customColumns) {
        const canonical = canonicalIdentityMappingKeyFromCustomColumn(col);
        if (!canonical) continue;
        const customKey = `custom_${col.id}`;
        const val = typeof out[customKey] === 'string' ? out[customKey].trim() : '';
        if (val && !String(out[canonical] || '').trim()) {
            out[canonical] = val;
        }
        delete out[customKey];
    }
    return out;
}

/**
 * Sustituye la columna legacy `name` por Nombres + apellidos + DNI y garantiza
 * que esas cuatro queden juntas al inicio del bloque de identidad.
 */
export function ensureIdentityColumnsInOrder(order: string[]): string[] {
    const identity = [...IDENTITY_SYSTEM_COLUMN_IDS];
    const identitySet = new Set<string>(identity);
    const result: string[] = [];
    let inserted = false;

    for (const id of order) {
        if (!id || id === LEGACY_NAME_COLUMN_ID || identitySet.has(id)) {
            if (!inserted) {
                result.push(...identity);
                inserted = true;
            }
            continue;
        }
        result.push(id);
    }
    if (!inserted) result.unshift(...identity);
    return result;
}

export function remapLegacyNameColumnId(colId: string): string {
    return colId === LEGACY_NAME_COLUMN_ID ? GIVEN_NAMES_COLUMN_ID : colId;
}

export function remapPinnedIdentityColumnIds(pinned: string[] | undefined): string[] {
    const mapped = (pinned || [])
        .map(remapLegacyNameColumnId)
        .filter((id, idx, arr) => id && arr.indexOf(id) === idx);
    if (mapped.length === 0) return [GIVEN_NAMES_COLUMN_ID];
    if (mapped.includes(LEGACY_NAME_COLUMN_ID)) {
        return mapped.map(remapLegacyNameColumnId);
    }
    return mapped;
}

/** Las columnas de identidad de sistema no se pueden ocultar. */
export function stripIdentitySystemIdsFromHidden(hidden: string[] | undefined): string[] {
    const identity = new Set<string>(IDENTITY_SYSTEM_COLUMN_IDS);
    identity.add(LEGACY_NAME_COLUMN_ID);
    return (hidden || []).filter(id => id && !identity.has(id));
}

/** Oculta custom homónimas de Nombres / apellidos / DNI para no duplicar la tabla. */
export function hideIdentityDuplicateCustomColumns(
    hidden: string[] | undefined,
    customColumns: CustomColumn[] = []
): string[] {
    const next = stripIdentitySystemIdsFromHidden(hidden);
    const seen = new Set(next);
    for (const col of customColumns) {
        if (!isIdentityCustomColumn(col)) continue;
        const id = `custom_${col.id}`;
        if (!seen.has(id)) {
            next.push(id);
            seen.add(id);
        }
    }
    return next;
}

export function identityFromDbRow(row: Record<string, unknown>): CandidateIdentityParts & {
    name: string;
} {
    const nombres = trimText(row.nombres);
    const apellidoPaterno = trimText(row.apellido_paterno);
    const apellidoMaterno = trimText(row.apellido_materno);
    const composed = composeWorkerFullName(nombres, apellidoPaterno, apellidoMaterno);
    return {
        ...(nombres ? { nombres } : {}),
        ...(apellidoPaterno ? { apellidoPaterno } : {}),
        ...(apellidoMaterno ? { apellidoMaterno } : {}),
        name: composed || trimText(row.name) || '',
    };
}

export function identityFieldsToDb(parts: CandidateIdentityParts & { name?: string }): {
    nombres?: string | null;
    apellido_paterno?: string | null;
    apellido_materno?: string | null;
    name?: string;
} {
    const out: {
        nombres?: string | null;
        apellido_paterno?: string | null;
        apellido_materno?: string | null;
        name?: string;
    } = {};
    if (parts.nombres !== undefined) out.nombres = trimText(parts.nombres) || null;
    if (parts.apellidoPaterno !== undefined) out.apellido_paterno = trimText(parts.apellidoPaterno) || null;
    if (parts.apellidoMaterno !== undefined) out.apellido_materno = trimText(parts.apellidoMaterno) || null;
    const composed = composeIdentityFullName({
        nombres: parts.nombres,
        apellidoPaterno: parts.apellidoPaterno,
        apellidoMaterno: parts.apellidoMaterno,
    });
    if (composed) out.name = composed;
    else if (parts.name !== undefined) out.name = parts.name || '';
    return out;
}

export function buildIdentityFieldPatch(
    current: CandidateIdentityParts,
    field: IdentityNameColumnId,
    value: string
): CandidateIdentityParts & { name: string } {
    const next: CandidateIdentityParts = {
        nombres: current.nombres,
        apellidoPaterno: current.apellidoPaterno,
        apellidoMaterno: current.apellidoMaterno,
        [field]: trimText(value),
    };
    return {
        ...next,
        name: composeIdentityFullName(next),
    };
}

export function validateRequiredIdentity(
    parts: CandidateIdentityParts & { dni?: string }
): string | null {
    if (!trimText(parts.nombres)) return 'Indique los nombres.';
    if (!trimText(parts.apellidoPaterno)) return 'Indique el apellido paterno.';
    if (!trimText(parts.dni)) return 'Indique el DNI.';
    return null;
}
