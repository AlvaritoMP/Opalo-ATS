import type { BulkProcessConfig, Candidate, CustomColumn } from '../types';
import {
    buildLegacyColumnIdToName,
    enrichBulkColumnValuesForStorage,
    hasBulkCellValue,
    normalizeColumnNameKey,
    resolveBulkColumnValuesFromRow,
    resolveColumnValueFromRow,
} from './bulkTableColumns';

export type BulkCandidateTransferMode = 'move' | 'duplicate';

/** Remapea valores de columnas personalizadas por nombre de columna al proceso destino. */
export function remapBulkColumnValuesBetweenProcesses(
    sourceValues: Record<string, unknown>,
    sourceColumns: CustomColumn[],
    sourceConfig: BulkProcessConfig | undefined,
    targetColumns: CustomColumn[]
): Record<string, unknown> {
    if (targetColumns.length === 0) return {};

    const legacy = buildLegacyColumnIdToName(sourceConfig, sourceColumns);
    const targetByName = new Map(
        targetColumns.map(c => [normalizeColumnNameKey(c.name), c])
    );
    const result: Record<string, unknown> = {};

    for (const col of sourceColumns) {
        const val = resolveColumnValueFromRow(sourceValues, col, legacy);
        if (!hasBulkCellValue(val)) continue;
        const target = targetByName.get(normalizeColumnNameKey(col.name));
        if (target) result[target.id] = val;
    }

    for (const [key, raw] of Object.entries(sourceValues)) {
        if (!hasBulkCellValue(raw)) continue;
        const col = sourceColumns.find(c => c.id === key);
        if (col) continue;
        const label = legacy[key] || key;
        const target = targetByName.get(normalizeColumnNameKey(label));
        if (target && result[target.id] === undefined) {
            result[target.id] = raw;
        }
    }

    return enrichBulkColumnValuesForStorage(result, targetColumns);
}

export function extractBulkColumnValuesFromRow(
    row: Record<string, unknown>,
    sourceColumns: CustomColumn[],
    sourceConfig?: BulkProcessConfig
): Record<string, unknown> {
    const legacy = buildLegacyColumnIdToName(sourceConfig, sourceColumns);
    const fromJson = (row.bulk_column_values as Record<string, unknown>) || {};
    const result: Record<string, unknown> = { ...fromJson };
    for (const col of sourceColumns) {
        const val = resolveColumnValueFromRow(fromJson, col, legacy);
        if (hasBulkCellValue(val)) {
            result[col.id] = val;
        }
    }
    return result;
}

function textOrUndefined(value: unknown): string | undefined {
    if (value === null || value === undefined) return undefined;
    const text = String(value).trim();
    return text || undefined;
}

export function buildDuplicateCandidatePayload(
    row: Record<string, unknown>,
    targetProcessId: string,
    targetStageId: string,
    rowIndex: number
): Omit<Candidate, 'id' | 'history'> {
    const nombres = textOrUndefined(row.nombres);
    const apellidoPaterno = textOrUndefined(row.apellido_paterno);
    const apellidoMaterno = textOrUndefined(row.apellido_materno);
    const name = String(row.name || '').trim() || 'Sin nombre';
    const dni = textOrUndefined(row.dni);
    const phone = textOrUndefined(row.phone);
    const rawEmail = textOrUndefined(row.email);

    let email = rawEmail || '';
    if (!email || !email.includes('@')) {
        const slug = (dni || phone || `${rowIndex + 1}`).replace(/\W/g, '').slice(0, 24);
        email = `sin-email-${slug}-${Date.now()}@bulk.local`;
    }

    return {
        name,
        nombres,
        apellidoPaterno,
        apellidoMaterno,
        email,
        phone,
        phone2: textOrUndefined(row.phone2),
        processId: targetProcessId,
        stageId: targetStageId,
        description: textOrUndefined(row.description),
        attachments: [],
        source: textOrUndefined(row.source),
        salaryExpectation: textOrUndefined(row.salary_expectation),
        agreedSalary: textOrUndefined(row.agreed_salary),
        age: row.age != null ? Number(row.age) : undefined,
        dni,
        linkedinUrl: textOrUndefined(row.linkedin_url),
        address: textOrUndefined(row.address),
        province: textOrUndefined(row.province),
        district: textOrUndefined(row.district),
        discarded: false,
        archived: false,
        registrationOrigin: 'masivo',
    };
}
