import type {
    BulkClipboardFieldPreset,
    BulkClipboardFieldSeparator,
    BulkProcessConfig,
    CustomColumn,
    Process,
} from '../types';
import type { BulkCandidate } from './api/bulkCandidates';
import type { HiredStageActor } from './hiringStageTracking';
import {
    escapeDelimitedField,
    getBulkExportCellValue,
} from './bulkTableExport';
import { getColumnLabel } from './bulkTableColumns';

const FIELD_SEPARATOR_CHAR: Record<Exclude<BulkClipboardFieldSeparator, 'newline'>, string> = {
    tab: '\t',
    comma: ', ',
    pipe: ' | ',
};

export function createBulkClipboardFieldPreset(
    partial?: Partial<BulkClipboardFieldPreset>
): BulkClipboardFieldPreset {
    return {
        id: partial?.id || `cfp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: partial?.title ?? 'Copiar datos',
        color: partial?.color ?? 'green',
        columnIds: partial?.columnIds ?? ['name', 'phone'],
        fieldSeparator: partial?.fieldSeparator ?? 'tab',
        includeHeader: partial?.includeHeader ?? false,
    };
}

export function resolveClipboardFieldSeparator(
    preset: BulkClipboardFieldPreset
): BulkClipboardFieldSeparator {
    return preset.fieldSeparator ?? 'tab';
}

export function buildClipboardPresetText(
    preset: BulkClipboardFieldPreset,
    candidates: BulkCandidate[],
    opts: {
        columnValues: Record<string, Record<string, unknown>>;
        customColumns: CustomColumn[];
        process?: Process;
        bulkConfig?: BulkProcessConfig;
        hiringStageActors?: Record<string, HiredStageActor>;
    }
): string {
    const columnIds = preset.columnIds.filter(Boolean);
    if (columnIds.length === 0 || candidates.length === 0) return '';

    const cellOpts = {
        columnValues: opts.columnValues,
        customColumns: opts.customColumns,
        process: opts.process,
        bulkConfig: opts.bulkConfig,
        hiringStageActors: opts.hiringStageActors,
    };

    const separator = resolveClipboardFieldSeparator(preset);

    if (separator === 'newline') {
        const blocks = candidates.map(cand =>
            columnIds
                .map(colId => getBulkExportCellValue(colId, cand, cellOpts))
                .join('\n')
        );
        return blocks.join('\n\n');
    }

    const delimChar = FIELD_SEPARATOR_CHAR[separator];
    const delimForEscape = separator === 'tab' ? '\t' : separator === 'comma' ? ',' : '|';
    const lines: string[] = [];

    if (preset.includeHeader) {
        const headers = columnIds.map(id => getColumnLabel(id, opts.customColumns));
        lines.push(headers.map(h => escapeDelimitedField(h, delimForEscape)).join(delimChar));
    }

    for (const cand of candidates) {
        const values = columnIds.map(colId =>
            escapeDelimitedField(getBulkExportCellValue(colId, cand, cellOpts), delimForEscape)
        );
        lines.push(values.join(delimChar));
    }

    return lines.join('\n');
}

export async function copyClipboardPresetToClipboard(text: string): Promise<{
    success: boolean;
    message: string;
}> {
    if (!text.trim()) {
        return { success: false, message: 'No hay datos para copiar' };
    }
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return { success: true, message: 'Datos copiados al portapapeles' };
        }
    } catch {
        /* fallback abajo */
    }
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) {
            return { success: true, message: 'Datos copiados al portapapeles' };
        }
    } catch {
        /* ignore */
    }
    return {
        success: false,
        message: 'No se pudo copiar. Prueba con Ctrl+C manualmente.',
    };
}
