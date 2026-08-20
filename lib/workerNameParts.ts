import type { Candidate, CustomColumn, Process, PsycholaboralReportNamePart } from '../types';
import {
    buildLegacyColumnIdToName,
    normalizeColumnNameKey,
    resolveColumnValueFromRow,
} from './bulkTableColumns';
import {
    composeWorkerFullName,
    parseLegacyFullName,
} from './candidateIdentity';
import {
    inferReportNamePartFromLabel,
    normalizeColumnHeaderForMatching,
} from './psycholaboralUtils';

export { composeWorkerFullName, parseLegacyFullName } from './candidateIdentity';

const BULK_NAME_KEY_PREFIX = '__name__';

export interface StructuredWorkerNameParts {
    nombres?: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
    fullName: string;
}

function trimText(value: unknown): string | undefined {
    if (value === null || value === undefined) return undefined;
    const text = String(value).trim();
    return text || undefined;
}

function stripTrailingSurnames(
    fullName: string,
    apellidoPaterno?: string,
    apellidoMaterno?: string
): string | undefined {
    let remaining = fullName.trim();
    const stripOnce = (surname?: string) => {
        if (!surname) return;
        const escaped = surname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(?:^|\\s+)${escaped}\\s*$`, 'i');
        remaining = remaining.replace(re, '').trim();
    };
    stripOnce(apellidoMaterno);
    stripOnce(apellidoPaterno);
    return remaining || undefined;
}

function splitCombinedSurnames(combined: string): {
    apellidoPaterno?: string;
    apellidoMaterno?: string;
} {
    const tokens = combined.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return {};
    if (tokens.length === 1) return { apellidoPaterno: tokens[0] };
    return {
        apellidoPaterno: tokens[0],
        apellidoMaterno: tokens.slice(1).join(' '),
    };
}

function applyNamePart(
    target: {
        nombres?: string;
        apellidoPaterno?: string;
        apellidoMaterno?: string;
        surnamesCombined?: string;
    },
    part: PsycholaboralReportNamePart | null,
    val: string
): void {
    if (part === 'given_names') target.nombres = val;
    else if (part === 'paternal_surname') target.apellidoPaterno = val;
    else if (part === 'maternal_surname') target.apellidoMaterno = val;
    else if (part === 'surnames_combined') target.surnamesCombined = val;
}

function readNamePartFromColumns(
    customColumns: CustomColumn[],
    getCellValue: (columnId: string) => unknown
): {
    nombres?: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
    surnamesCombined?: string;
    hasStructured: boolean;
} {
    const target: {
        nombres?: string;
        apellidoPaterno?: string;
        apellidoMaterno?: string;
        surnamesCombined?: string;
    } = {};

    for (const col of customColumns) {
        const label = (col.name || '').trim();
        if (!label) continue;
        const val = trimText(getCellValue(col.id));
        if (!val) continue;

        const labelNorm = normalizeColumnHeaderForMatching(label);
        const part: PsycholaboralReportNamePart | null =
            col.reportNamePart || inferReportNamePartFromLabel(labelNorm);
        applyNamePart(target, part, val);
    }

    const hasStructured = Boolean(
        target.nombres || target.apellidoPaterno || target.apellidoMaterno || target.surnamesCombined
    );
    return { ...target, hasStructured };
}

/**
 * Fallback: lee apellidos/nombres desde claves `__name__…` en bulk_column_values
 * aunque el proceso no traiga customColumns en memoria.
 */
function readNamePartFromBulkRow(row: Record<string, unknown>): {
    nombres?: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
    surnamesCombined?: string;
    hasStructured: boolean;
} {
    const target: {
        nombres?: string;
        apellidoPaterno?: string;
        apellidoMaterno?: string;
        surnamesCombined?: string;
    } = {};

    for (const [rawKey, rawVal] of Object.entries(row)) {
        const val = trimText(rawVal);
        if (!val) continue;

        let label: string | undefined;
        if (rawKey.startsWith(BULK_NAME_KEY_PREFIX)) {
            label = rawKey.slice(BULK_NAME_KEY_PREFIX.length);
        } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawKey)) {
            label = rawKey;
        }
        if (!label) continue;

        const labelNorm = normalizeColumnHeaderForMatching(label);
        // También probar sin acentos (las claves __name__ ya vienen normalizadas)
        const labelNoAccents = normalizeColumnNameKey(label);
        const part =
            inferReportNamePartFromLabel(labelNorm) ||
            inferReportNamePartFromLabel(labelNoAccents);
        applyNamePart(target, part, val);
    }

    const hasStructured = Boolean(
        target.nombres || target.apellidoPaterno || target.apellidoMaterno || target.surnamesCombined
    );
    return { ...target, hasStructured };
}

function mergeNameParts(
    primary: ReturnType<typeof readNamePartFromColumns>,
    fallback: ReturnType<typeof readNamePartFromBulkRow>
): ReturnType<typeof readNamePartFromColumns> {
    return {
        nombres: primary.nombres || fallback.nombres,
        apellidoPaterno: primary.apellidoPaterno || fallback.apellidoPaterno,
        apellidoMaterno: primary.apellidoMaterno || fallback.apellidoMaterno,
        surnamesCombined: primary.surnamesCombined || fallback.surnamesCombined,
        hasStructured: primary.hasStructured || fallback.hasStructured,
    };
}

/**
 * Resuelve nombres / apellidos para UI, informes y handoff a OpsFlow.
 * Preferencia: campos de sistema; luego columnas bulk / claves __name__;
 * fallback: parsear candidates.name (en masivos sin partes, name = solo nombres).
 */
export function resolveStructuredWorkerNameParts(
    candidate: Candidate,
    process?: Process
): StructuredWorkerNameParts {
    const fromFields = {
        nombres: trimText(candidate.nombres),
        apellidoPaterno: trimText(candidate.apellidoPaterno),
        apellidoMaterno: trimText(candidate.apellidoMaterno),
        hasStructured: Boolean(
            trimText(candidate.nombres) ||
                trimText(candidate.apellidoPaterno) ||
                trimText(candidate.apellidoMaterno)
        ),
    };

    const customColumns = process?.bulkConfig?.customColumns || [];
    const legacyIdToName = buildLegacyColumnIdToName(process?.bulkConfig, customColumns);
    const row = candidate.bulkColumnValues || {};

    const fromColumns = readNamePartFromColumns(customColumns, columnId => {
        const col = customColumns.find(c => c.id === columnId);
        if (!col) return undefined;
        return resolveColumnValueFromRow(row, col, legacyIdToName);
    });
    const fromRow = readNamePartFromBulkRow(row);
    const fromStructured = mergeNameParts(fromColumns, fromRow);

    let nombres = fromFields.nombres || fromStructured.nombres;
    let apellidoPaterno = fromFields.apellidoPaterno || fromStructured.apellidoPaterno;
    let apellidoMaterno = fromFields.apellidoMaterno || fromStructured.apellidoMaterno;
    const hasStructured = fromFields.hasStructured || fromStructured.hasStructured;
    const legacyFull = trimText(candidate.name);

    if (!hasStructured) {
        if (!legacyFull) return { fullName: '' };
        if (process?.isBulkProcess) {
            return { nombres: legacyFull, fullName: legacyFull };
        }
        const parsed = parseLegacyFullName(legacyFull);
        const fullName =
            composeWorkerFullName(parsed.nombres, parsed.apellidoPaterno, parsed.apellidoMaterno) ||
            legacyFull;
        return { ...parsed, fullName };
    }

    if (!apellidoPaterno && !apellidoMaterno && fromStructured.surnamesCombined) {
        const split = splitCombinedSurnames(fromStructured.surnamesCombined);
        apellidoPaterno = split.apellidoPaterno;
        apellidoMaterno = split.apellidoMaterno;
    }

    if (!fromFields.nombres && !nombres && legacyFull) {
        const lower = legacyFull.toLowerCase();
        const embedsPaterno =
            Boolean(apellidoPaterno) && lower.includes(apellidoPaterno!.toLowerCase());
        const embedsMaterno =
            Boolean(apellidoMaterno) && lower.includes(apellidoMaterno!.toLowerCase());
        if (embedsPaterno || embedsMaterno) {
            nombres = stripTrailingSurnames(legacyFull, apellidoPaterno, apellidoMaterno);
        } else if (!process?.isBulkProcess) {
            nombres = legacyFull;
        }
    }

    const fullName =
        composeWorkerFullName(nombres, apellidoPaterno, apellidoMaterno) || legacyFull || '';

    return {
        ...(nombres ? { nombres } : {}),
        ...(apellidoPaterno ? { apellidoPaterno } : {}),
        ...(apellidoMaterno ? { apellidoMaterno } : {}),
        fullName,
    };
}

/** Completa partes vacías desde columnas custom / parseo y deja `name` como compuesto. */
export function hydrateCandidateIdentity<T extends Pick<Candidate, 'name'> & Partial<Candidate>>(
    candidate: T,
    process?: Process
): T {
    const parts = resolveStructuredWorkerNameParts(candidate as Candidate, process);
    return {
        ...candidate,
        nombres: parts.nombres,
        apellidoPaterno: parts.apellidoPaterno,
        apellidoMaterno: parts.apellidoMaterno,
        name: parts.fullName || candidate.name,
    };
}
