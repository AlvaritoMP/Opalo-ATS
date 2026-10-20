import { BulkCandidate } from './api/bulkCandidates';
import { CONTACT_STATUS_META, getContactBadgeLabel } from './contactTracking';
import {
    getLatestContactActorFromCandidate,
    formatLatestContactActorDisplay,
} from './contactChannelConfig';
import {
    formatHiredStageActorDisplay,
    type HiredStageActor,
} from './hiringStageTracking';
import { BulkProcessConfig, CustomColumn, Process } from '../types';
import {
    formatCustomCellDisplay,
    getDisplayEmail,
    resolveBulkTableCellValue,
    isPlaceholderImportEmail,
    mapImportHeader,
    resolveStandardFieldValue,
    shouldApplyScoreAutoFilter,
    FICHA_DATOS_COLUMN_ID,
} from './bulkTableColumns';
import { formatRegistrationOrigin, resolveRegistrationOrigin, registrationOriginInputFromBulkCandidate } from './candidateRegistrationOrigin';
import { buildRouteColumnLink } from './transitRouteLinks';
import { extractRouteCostTotal } from './routeCostStorage';

export type BulkExportScope = 'current_view' | 'full_process' | 'selected';

/** Escapa campo para TSV/CSV cuando hay tabuladores o saltos de línea */
export function escapeDelimitedField(value: string, delimiter: string): string {
    const needsQuote =
        value.includes(delimiter) || value.includes('\t') || value.includes('\n') || value.includes('\r') || value.includes('"');
    if (!needsQuote) return value;
    return `"${value.replace(/"/g, '""')}"`;
}

function getCustomStoredValue(
    candidateId: string,
    columnId: string,
    candidate: BulkCandidate | undefined,
    columnValues: Record<string, Record<string, unknown>>,
    customColumns: CustomColumn[]
): unknown {
    const stored = columnValues[candidateId]?.[columnId];
    if (stored !== undefined && stored !== '') return stored;
    if (stored === false) return false;
    const col = customColumns.find(c => c.id === columnId);
    if (col && candidate) {
        const mapped = mapImportHeader(col.name.toLowerCase());
        if (mapped === 'age' && candidate.age != null) return candidate.age;
        if (mapped === 'source' && candidate.source) return candidate.source;
        if (mapped === 'province' && candidate.province) return candidate.province;
        if (mapped === 'district' && candidate.district) return candidate.district;
    }
    return '';
}

export function getBulkExportCellValue(
    colId: string,
    candidate: BulkCandidate,
    opts: {
        columnValues: Record<string, Record<string, unknown>>;
        customColumns: CustomColumn[];
        process?: Process;
        bulkConfig?: BulkProcessConfig;
        hiringStageActors?: Record<string, HiredStageActor>;
    }
): string {
    const { columnValues, customColumns, process, bulkConfig, hiringStageActors } = opts;
    const stages = process?.stages ?? [];

    if (colId === 'name') return candidate.name || '';
    if (colId === 'dni') return candidate.dni || '';
    if (colId === FICHA_DATOS_COLUMN_ID) return candidate.complementaryFilledAt ? 'Sí' : 'No';
    if (colId === 'email') {
        const em = getDisplayEmail(candidate.email);
        return em || '';
    }
    if (colId === 'scoreIa') {
        return candidate.scoreIa !== undefined && candidate.scoreIa !== null ? String(candidate.scoreIa) : '';
    }
    if (colId === 'status') {
        if (candidate.scoreIa === undefined || candidate.scoreIa === null) return '';
        if (shouldApplyScoreAutoFilter(bulkConfig)) return 'Apto (filtro automático)';
        if (candidate.scoreIa >= 70) return 'Alto';
        if (candidate.scoreIa >= 50) return 'Medio';
        return 'Bajo';
    }
    if (colId === 'phone') return candidate.phone || '';
    if (colId === 'source') {
        return resolveStandardFieldValue('source', candidate.id, candidate, columnValues, customColumns) || '';
    }
    if (colId === 'registrationOrigin') {
        const { origin, inferred } = resolveRegistrationOrigin(
            registrationOriginInputFromBulkCandidate(candidate)
        );
        return formatRegistrationOrigin(origin, inferred);
    }
    if (colId === 'province') {
        return resolveStandardFieldValue('province', candidate.id, candidate, columnValues, customColumns) || '';
    }
    if (colId === 'district') {
        return resolveStandardFieldValue('district', candidate.id, candidate, columnValues, customColumns) || '';
    }
    if (colId === 'createdAt') {
        if (!candidate.createdAt) return '';
        try {
            return new Date(candidate.createdAt).toLocaleString('es-PE');
        } catch {
            return candidate.createdAt;
        }
    }
    if (colId === 'contactPhone' || colId === 'contactWhatsapp' || colId === 'contactEmail' ||
        colId === 'fidelizPhone' || colId === 'fidelizWhatsapp' || colId === 'fidelizEmail') {
        const ch =
            colId === 'contactPhone' ? candidate.contactPhone
            : colId === 'contactWhatsapp' ? candidate.contactWhatsapp
            : colId === 'contactEmail' ? candidate.contactEmail
            : colId === 'fidelizPhone' ? candidate.fidelizPhone
            : colId === 'fidelizWhatsapp' ? candidate.fidelizWhatsapp
            : candidate.fidelizEmail;
        if (!ch) return '';
        const label = getContactBadgeLabel(ch.status, ch.attemptCount);
        const when = ch.lastAttemptAt
            ? new Date(ch.lastAttemptAt).toLocaleString('es-PE')
            : '';
        const who = ch.lastUserName ? ` · ${ch.lastUserName}` : '';
        return `${CONTACT_STATUS_META[ch.status].label}: ${label}${when ? ` · ${when}` : ''}${who}`;
    }
    if (colId === 'contactLastUser') {
        const actor = getLatestContactActorFromCandidate(candidate);
        if (!actor) return '';
        const who = formatLatestContactActorDisplay(actor);
        if (who === '-') return '';
        const when = actor.lastAttemptAt
            ? new Date(actor.lastAttemptAt).toLocaleString('es-PE')
            : '';
        const ch = actor.channelLabel ? `${actor.channelLabel} · ` : '';
        return `${ch}${who}${when ? ` · ${when}` : ''}`;
    }
    if (colId === 'hiredStageUser') {
        const actor = hiringStageActors?.[candidate.id];
        if (!actor) return '';
        const who = formatHiredStageActorDisplay(actor);
        if (who === '-') return '';
        const when = actor.movedAt ? new Date(actor.movedAt).toLocaleString('es-PE') : '';
        return when ? `${who} · ${when}` : who;
    }
    if (colId === 'nextInterview') {
        if (!candidate.nextInterviewAt) return '';
        try {
            return new Date(candidate.nextInterviewAt).toLocaleString('es-PE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return candidate.nextInterviewAt;
        }
    }
    if (colId === 'schedule') {
        return '';
    }
    if (colId === 'stage') {
        const st = stages.find(s => s.id === candidate.stageId);
        return st?.name || candidate.stageId || '';
    }
    if (colId.startsWith('custom_')) {
        const cid = colId.replace('custom_', '');
        const col = customColumns.find(c => c.id === cid);
        if (!col) return '';
        if (col.type === 'route') {
            return buildRouteColumnLink(candidate, col, customColumns, columnValues) || '';
        }
        if (col.type === 'route_cost') {
            const raw = getCustomStoredValue(candidate.id, cid, candidate, columnValues, customColumns);
            const total = extractRouteCostTotal(raw);
            return total != null ? total.toFixed(2) : '';
        }
        const raw = col.tracksAssessment
            ? resolveBulkTableCellValue(candidate, cid, customColumns, columnValues)
            : getCustomStoredValue(candidate.id, cid, candidate, columnValues, customColumns);
        return formatCustomCellDisplay(raw, col);
    }
    return '';
}

type BulkExportCellOpts = {
    columnValues: Record<string, Record<string, unknown>>;
    customColumns: CustomColumn[];
    process?: Process;
    bulkConfig?: BulkProcessConfig;
    hiringStageActors?: Record<string, HiredStageActor>;
};

export type BulkSelectionCell = { candidateId: string; colId: string };

function buildBulkSelectionGrid(
    cells: BulkSelectionCell[],
    displayCandidates: BulkCandidate[],
    visibleColumns: string[],
    opts: BulkExportCellOpts
): string[][] {
    if (cells.length === 0) return [];

    const sorted = [...cells].sort((a, b) => {
        const ra = displayCandidates.findIndex(c => c.id === a.candidateId);
        const rb = displayCandidates.findIndex(c => c.id === b.candidateId);
        if (ra !== rb) return ra - rb;
        return visibleColumns.indexOf(a.colId) - visibleColumns.indexOf(b.colId);
    });

    const rowIndices = sorted.map(c => displayCandidates.findIndex(cand => cand.id === c.candidateId));
    const colIndices = sorted.map(c => visibleColumns.indexOf(c.colId));
    const validRows = rowIndices.filter(i => i >= 0);
    const validCols = colIndices.filter(i => i >= 0);
    if (validRows.length === 0 || validCols.length === 0) return [];

    const minR = Math.min(...validRows);
    const maxR = Math.max(...validRows);
    const minC = Math.min(...validCols);
    const maxC = Math.max(...validCols);

    const selectedSet = new Set(sorted.map(c => `${c.candidateId}::${c.colId}`));
    const grid: string[][] = [];

    for (let r = minR; r <= maxR; r++) {
        const candidate = displayCandidates[r];
        if (!candidate) continue;
        const rowCells: string[] = [];
        let rowHasSelection = false;
        for (let c = minC; c <= maxC; c++) {
            const colId = visibleColumns[c];
            const key = `${candidate.id}::${colId}`;
            if (!selectedSet.has(key) || !colId) {
                rowCells.push('');
                continue;
            }
            rowHasSelection = true;
            rowCells.push(getBulkExportCellValue(colId, candidate, opts));
        }
        if (rowHasSelection) grid.push(rowCells);
    }

    return grid;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Texto TSV + tabla HTML a partir de una matriz ya ordenada (filas y columnas visibles). */
export function clipboardPayloadFromMatrix(grid: string[][]): { text: string; html: string } {
    const rows = grid.filter(row => row.length > 0);
    if (rows.length === 0) return { text: '', html: '' };
    const width = Math.max(...rows.map(row => row.length));
    const normalized = rows.map(row => {
        const next = row.map(cell => cell.replace(/\s+/g, ' ').trim());
        while (next.length < width) next.push('');
        return next;
    });
    const text = normalized
        .map(row => row.map(cell => escapeDelimitedField(cell, '\t')).join('\t'))
        .join('\r\n');
    const htmlRows = normalized
        .map(row => {
            const cells = row
                .map(cell => `<td>${cell ? escapeHtml(cell) : '&nbsp;'}</td>`)
                .join('');
            return `<tr>${cells}</tr>`;
        })
        .join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><!--StartFragment--><table><tbody>${htmlRows}</tbody></table><!--EndFragment--></body></html>`;
    return { text, html };
}

/** Construye texto TSV desde celdas seleccionadas (Excel, bloc de notas, WhatsApp). */
export function buildBulkSelectionClipboardText(
    cells: BulkSelectionCell[],
    displayCandidates: BulkCandidate[],
    visibleColumns: string[],
    opts: BulkExportCellOpts
): string {
    const grid = buildBulkSelectionGrid(cells, displayCandidates, visibleColumns, opts);
    if (grid.length === 0) return '';
    return grid
        .map(row => row.map(cell => escapeDelimitedField(cell, '\t')).join('\t'))
        .join('\r\n');
}

/**
 * Tabla HTML de la misma selección.
 * El correo y Word usan este formato; si solo va texto con tabuladores, suelen pegar solo la última columna.
 */
export function buildBulkSelectionClipboardHtml(
    cells: BulkSelectionCell[],
    displayCandidates: BulkCandidate[],
    visibleColumns: string[],
    opts: BulkExportCellOpts
): string {
    const grid = buildBulkSelectionGrid(cells, displayCandidates, visibleColumns, opts);
    if (grid.length === 0) return '';
    const rows = grid
        .map(row => {
            const cellsHtml = row
                .map(cell => `<td>${escapeHtml(cell).replace(/\r\n|\r|\n/g, '<br>')}</td>`)
                .join('');
            return `<tr>${cellsHtml}</tr>`;
        })
        .join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><!--StartFragment--><table>${rows}</table><!--EndFragment--></body></html>`;
}

export function buildBulkTableExportDocument(
    columnIds: string[],
    candidates: BulkCandidate[],
    headerLabels: string[],
    opts: {
        columnValues: Record<string, Record<string, unknown>>;
        customColumns: CustomColumn[];
        process?: Process;
        bulkConfig?: BulkProcessConfig;
        delimiter?: '\t' | ';';
        hiringStageActors?: Record<string, HiredStageActor>;
    }
): string {
    const delimiter = opts.delimiter ?? '\t';
    const rows: string[] = [];
    rows.push(headerLabels.map(h => escapeDelimitedField(h, delimiter)).join(delimiter));
    for (const cand of candidates) {
        const line = columnIds
            .map(colId =>
                escapeDelimitedField(
                    getBulkExportCellValue(colId, cand, {
                        columnValues: opts.columnValues,
                        customColumns: opts.customColumns,
                        process: opts.process,
                        bulkConfig: opts.bulkConfig,
                        hiringStageActors: opts.hiringStageActors,
                    }),
                    delimiter
                )
            )
            .join(delimiter);
        rows.push(line);
    }
    return rows.join('\n');
}

/** Columnas que suelen omitirse en una “lista para cliente” (solo UI) */
export const CLIENT_EXPORT_EXCLUDE_COLUMN_IDS = ['contact', 'schedule'] as const;
