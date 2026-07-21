import type { Candidate, CustomColumn, Process, PsycholaboralReportNamePart } from '../types';
import {
    buildLegacyColumnIdToName,
    resolveColumnValueFromRow,
} from './bulkTableColumns';
import {
    inferReportNamePartFromLabel,
    normalizeColumnHeaderForMatching,
} from './psycholaboralUtils';

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

/**
 * Fallback cuando ATS solo tiene un nombre completo legacy.
 * Convención habitual (PE): últimos 2 tokens = apellidos; el resto = nombres.
 */
export function parseLegacyFullName(fullName: string): Omit<StructuredWorkerNameParts, 'fullName'> {
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
    // Quitar de atrás hacia adelante
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
    let nombres: string | undefined;
    let apellidoPaterno: string | undefined;
    let apellidoMaterno: string | undefined;
    let surnamesCombined: string | undefined;

    for (const col of customColumns) {
        const label = (col.name || '').trim();
        if (!label) continue;
        const val = trimText(getCellValue(col.id));
        if (!val) continue;

        const labelNorm = normalizeColumnHeaderForMatching(label);
        const part: PsycholaboralReportNamePart | null =
            col.reportNamePart || inferReportNamePartFromLabel(labelNorm);

        if (part === 'given_names') nombres = val;
        else if (part === 'paternal_surname') apellidoPaterno = val;
        else if (part === 'maternal_surname') apellidoMaterno = val;
        else if (part === 'surnames_combined') surnamesCombined = val;
    }

    const hasStructured = Boolean(
        nombres || apellidoPaterno || apellidoMaterno || surnamesCombined
    );
    return { nombres, apellidoPaterno, apellidoMaterno, surnamesCombined, hasStructured };
}

/**
 * Resuelve nombres / apellidos para el handoff a OpsFlow.
 * Preferencia: columnas bulk estructuradas; fallback: parsear candidates.name.
 */
export function resolveStructuredWorkerNameParts(
    candidate: Candidate,
    process?: Process
): StructuredWorkerNameParts {
    const customColumns = process?.bulkConfig?.customColumns || [];
    const legacyIdToName = buildLegacyColumnIdToName(process?.bulkConfig, customColumns);
    const row = candidate.bulkColumnValues || {};

    const fromColumns = readNamePartFromColumns(customColumns, columnId => {
        const col = customColumns.find(c => c.id === columnId);
        if (!col) return undefined;
        return resolveColumnValueFromRow(row, col, legacyIdToName);
    });

    let { nombres, apellidoPaterno, apellidoMaterno } = fromColumns;
    const legacyFull = trimText(candidate.name);

    if (!fromColumns.hasStructured) {
        if (!legacyFull) return { fullName: '' };
        const parsed = parseLegacyFullName(legacyFull);
        const fullName =
            composeWorkerFullName(parsed.nombres, parsed.apellidoPaterno, parsed.apellidoMaterno) ||
            legacyFull;
        return { ...parsed, fullName };
    }

    if (!apellidoPaterno && !apellidoMaterno && fromColumns.surnamesCombined) {
        const split = splitCombinedSurnames(fromColumns.surnamesCombined);
        apellidoPaterno = split.apellidoPaterno;
        apellidoMaterno = split.apellidoMaterno;
    }

    if (!nombres && legacyFull) {
        const lower = legacyFull.toLowerCase();
        const embedsPaterno =
            Boolean(apellidoPaterno) && lower.includes(apellidoPaterno!.toLowerCase());
        const embedsMaterno =
            Boolean(apellidoMaterno) && lower.includes(apellidoMaterno!.toLowerCase());
        if (embedsPaterno || embedsMaterno) {
            nombres = stripTrailingSurnames(legacyFull, apellidoPaterno, apellidoMaterno);
        } else {
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
