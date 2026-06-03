import { BulkCandidate } from './api/bulkCandidates';
import {
    CONTACT_STATUS_META,
    normalizeContactStatus,
} from './contactTracking';
import {
    CONTACT_COLUMN_IDS,
    getLatestContactActorFromCandidate,
    formatLatestContactActorDisplay,
} from './contactChannelConfig';
import {
    formatHiredStageActorDisplay,
    HiredStageActor,
} from './hiringStageTracking';
import {
    CustomColumn,
    BulkProcessConfig,
    BulkProcessStatChart,
    BulkStatChartType,
    IdealProfileConfig,
    Process,
} from '../types';
import {
    getColumnLabel,
    resolveBulkTableCellValue,
    resolveStandardFieldValue,
    formatCustomCellDisplay,
    formatBulkDate,
    shouldApplyScoreAutoFilter,
} from './bulkTableColumns';
import { computeProfileMatch } from './bulkIdealProfileMatch';
import { extractRouteCostTotal } from './routeCostStorage';

export type BulkStatValueKind = 'categorical' | 'numeric' | 'date';

export interface BulkStatColumnOption {
    id: string;
    label: string;
    valueKind: BulkStatValueKind;
    suggestedChart: BulkStatChartType;
}

export interface BulkStatDatum {
    name: string;
    value: number;
}

export interface BulkStatContext {
    process?: Process;
    bulkConfig?: BulkProcessConfig;
    customColumns: CustomColumn[];
    columnValues: Record<string, Record<string, unknown>>;
    legacyColumnIdToName: Record<string, string>;
    hiringStageActors?: Record<string, HiredStageActor>;
    idealProfileConfig?: IdealProfileConfig | null;
}

const NON_CHARTABLE = new Set([
    'name',
    'email',
    'phone',
    'schedule',
    'nextInterview',
]);

const CHARTABLE_BASE = new Set([
    'stage',
    'source',
    'province',
    'district',
    'status',
    'scoreIa',
    'profileMatch',
    'createdAt',
    'dni',
    'contactPhone',
    'contactWhatsapp',
    'contactEmail',
    'contactLastUser',
    'hiredStageUser',
    ...CONTACT_COLUMN_IDS,
]);

const EMPTY_LABEL = 'Sin dato';
const OTHER_LABEL = 'Otros';
const MAX_CATEGORIES = 18;

function inferValueKind(columnId: string, customColumns: CustomColumn[]): BulkStatValueKind {
    if (columnId === 'scoreIa' || columnId === 'profileMatch') return 'numeric';
    if (columnId === 'createdAt') return 'date';
    if (columnId.startsWith('custom_')) {
        const col = customColumns.find(c => c.id === columnId.replace('custom_', ''));
        if (col?.type === 'number' || col?.type === 'route_cost') return 'numeric';
        if (col?.type === 'date') return 'date';
    }
    return 'categorical';
}

function suggestedChartFor(kind: BulkStatValueKind): BulkStatChartType {
    if (kind === 'numeric') return 'bar';
    return 'bar';
}

export function getBulkStatChartableColumns(
    customColumns: CustomColumn[],
    columnOrder: string[]
): BulkStatColumnOption[] {
    const options: BulkStatColumnOption[] = [];
    const seen = new Set<string>();

    for (const colId of columnOrder) {
        if (NON_CHARTABLE.has(colId) || seen.has(colId)) continue;

        if (colId.startsWith('custom_')) {
            const customId = colId.replace('custom_', '');
            const col = customColumns.find(c => c.id === customId);
            if (!col || col.type === 'route') continue;
            const valueKind = inferValueKind(colId, customColumns);
            options.push({
                id: colId,
                label: col.name,
                valueKind,
                suggestedChart: suggestedChartFor(valueKind),
            });
            seen.add(colId);
            continue;
        }

        if (CHARTABLE_BASE.has(colId)) {
            const valueKind = inferValueKind(colId, customColumns);
            options.push({
                id: colId,
                label: getColumnLabel(colId, customColumns),
                valueKind,
                suggestedChart: suggestedChartFor(valueKind),
            });
            seen.add(colId);
        }
    }

    for (const col of customColumns) {
        const colId = `custom_${col.id}`;
        if (seen.has(colId) || col.type === 'route') continue;
        const valueKind = inferValueKind(colId, customColumns);
        options.push({
            id: colId,
            label: col.name,
            valueKind,
            suggestedChart: suggestedChartFor(valueKind),
        });
    }

    return options;
}

function scoreStatusLabel(score: number | undefined, bulkConfig?: BulkProcessConfig): string {
    if (score === undefined || score === null) return EMPTY_LABEL;
    if (shouldApplyScoreAutoFilter(bulkConfig)) return 'Apto (filtro automático)';
    if (score >= 70) return 'Alto';
    if (score >= 50) return 'Medio';
    return 'Bajo';
}

function bucketScore(score: number, step = 10): string {
    const low = Math.floor(score / step) * step;
    const high = Math.min(low + step - 1, 100);
    return `${low}–${high}`;
}

function bucketNumeric(value: number, step: number): string {
    const low = Math.floor(value / step) * step;
    return `${low}–${low + step - 1}`;
}

function chooseNumericStep(min: number, max: number): number {
    const span = max - min;
    if (span <= 10) return 1;
    if (span <= 50) return 5;
    if (span <= 200) return 10;
    return Math.ceil(span / 10);
}

function formatMonthLabel(isoDate: string): string {
    try {
        const d = new Date(isoDate);
        if (Number.isNaN(d.getTime())) return isoDate;
        return d.toLocaleDateString('es-PE', { month: 'short', year: 'numeric' });
    } catch {
        return isoDate;
    }
}

/** Etiqueta agrupable para gráficos (sin fechas/horas extensas en contacto). */
export function resolveBulkStatCellLabel(
    candidate: BulkCandidate,
    columnId: string,
    ctx: BulkStatContext
): string {
    const {
        process,
        bulkConfig,
        customColumns,
        columnValues,
        legacyColumnIdToName,
        hiringStageActors,
        idealProfileConfig,
    } = ctx;

    if (columnId === 'stage') {
        const stage = process?.stages.find(s => s.id === candidate.stageId);
        return stage?.name || EMPTY_LABEL;
    }
    if (columnId === 'status') {
        return scoreStatusLabel(candidate.scoreIa, bulkConfig);
    }
    if (columnId === 'scoreIa') {
        if (candidate.scoreIa === undefined || candidate.scoreIa === null) return EMPTY_LABEL;
        return bucketScore(candidate.scoreIa);
    }
    if (columnId === 'profileMatch') {
        if (!idealProfileConfig?.enabled) return 'Perfil ideal desactivado';
        const match = computeProfileMatch(
            candidate,
            idealProfileConfig,
            customColumns,
            columnValues,
            legacyColumnIdToName,
            bulkConfig
        );
        if (!match) return EMPTY_LABEL;
        return bucketScore(match.score);
    }
    if (columnId === 'source') {
        const v = resolveStandardFieldValue('source', candidate.id, candidate, columnValues, customColumns);
        return v.trim() || EMPTY_LABEL;
    }
    if (columnId === 'province') {
        const v = resolveStandardFieldValue('province', candidate.id, candidate, columnValues, customColumns);
        return v.trim() || EMPTY_LABEL;
    }
    if (columnId === 'district') {
        const v = resolveStandardFieldValue('district', candidate.id, candidate, columnValues, customColumns);
        return v.trim() || EMPTY_LABEL;
    }
    if (columnId === 'dni') {
        return candidate.dni?.trim() || EMPTY_LABEL;
    }
    if (columnId === 'createdAt') {
        if (!candidate.createdAt) return EMPTY_LABEL;
        return formatMonthLabel(candidate.createdAt);
    }
    if (columnId === 'contactPhone' || columnId === 'contactWhatsapp' || columnId === 'contactEmail') {
        const summary =
            columnId === 'contactPhone' ? candidate.contactPhone
            : columnId === 'contactWhatsapp' ? candidate.contactWhatsapp
            : candidate.contactEmail;
        if (!summary) return CONTACT_STATUS_META.por_contactar.label;
        const status = normalizeContactStatus(summary.status);
        return CONTACT_STATUS_META[status].label;
    }
    if (columnId === 'contactLastUser') {
        const actor = getLatestContactActorFromCandidate(candidate);
        const who = formatLatestContactActorDisplay(actor);
        return who === '-' ? EMPTY_LABEL : who;
    }
    if (columnId === 'hiredStageUser') {
        const actor = hiringStageActors?.[candidate.id];
        const who = formatHiredStageActorDisplay(actor);
        return who === '-' ? EMPTY_LABEL : who;
    }
    if (columnId.startsWith('custom_')) {
        const customId = columnId.replace('custom_', '');
        const col = customColumns.find(c => c.id === customId);
        if (!col) return EMPTY_LABEL;
        const raw = resolveBulkTableCellValue(
            candidate,
            customId,
            customColumns,
            columnValues,
            legacyColumnIdToName
        );
        const display = formatCustomCellDisplay(raw, col);
        if (display === '-' || !display.trim()) return EMPTY_LABEL;
        if (col.type === 'number' && typeof raw === 'number') {
            return bucketNumeric(raw, chooseNumericStep(raw, raw));
        }
        if (col.type === 'route_cost') {
            const total = extractRouteCostTotal(raw);
            if (total == null) return EMPTY_LABEL;
            return bucketNumeric(total, chooseNumericStep(total, total));
        }
        if (col.type === 'date') {
            const formatted = formatBulkDate(raw);
            return formatted || EMPTY_LABEL;
        }
        return display;
    }

    return EMPTY_LABEL;
}

function aggregateNumericLabels(values: number[]): Map<string, number> {
    const valid = values.filter(v => !Number.isNaN(v));
    if (valid.length === 0) return new Map([[EMPTY_LABEL, 0]]);

    const unique = new Set(valid.map(v => String(v)));
    if (unique.size <= 15) {
        const counts = new Map<string, number>();
        for (const v of valid) {
            const key = String(v);
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return counts;
    }

    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const step = chooseNumericStep(min, max);
    const counts = new Map<string, number>();
    for (const v of valid) {
        const key = bucketNumeric(v, step);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
}

export function aggregateBulkStatData(
    candidates: BulkCandidate[],
    columnId: string,
    ctx: BulkStatContext
): BulkStatDatum[] {
    if (candidates.length === 0) return [];

    const kind = inferValueKind(columnId, ctx.customColumns);

    if (kind === 'numeric' && columnId.startsWith('custom_')) {
        const customId = columnId.replace('custom_', '');
        const col = ctx.customColumns.find(c => c.id === customId);
        const nums: number[] = [];
        let empty = 0;
        for (const c of candidates) {
            const raw = resolveBulkTableCellValue(
                c,
                customId,
                ctx.customColumns,
                ctx.columnValues,
                ctx.legacyColumnIdToName
            );
            if (raw === undefined || raw === null || raw === '') {
                empty += 1;
                continue;
            }
            const n = typeof raw === 'number' ? raw : Number(raw);
            if (Number.isNaN(n)) {
                empty += 1;
            } else {
                nums.push(n);
            }
        }
        const counts = aggregateNumericLabels(nums);
        if (empty > 0) counts.set(EMPTY_LABEL, (counts.get(EMPTY_LABEL) ?? 0) + empty);
        return mapCountsToSortedData(counts);
    }

    const counts = new Map<string, number>();
    for (const candidate of candidates) {
        const label = resolveBulkStatCellLabel(candidate, columnId, ctx);
        counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    return collapseTopCategories(counts, MAX_CATEGORIES);
}

function mapCountsToSortedData(counts: Map<string, number>): BulkStatDatum[] {
    const entries = [...counts.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    return entries;
}

function collapseTopCategories(counts: Map<string, number>, max: number): BulkStatDatum[] {
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length <= max) {
        return sorted.map(([name, value]) => ({ name, value }));
    }

    const top = sorted.slice(0, max - 1);
    const rest = sorted.slice(max - 1).reduce((sum, [, v]) => sum + v, 0);
    const data: BulkStatDatum[] = top.map(([name, value]) => ({ name, value }));
    if (rest > 0) data.push({ name: OTHER_LABEL, value: rest });
    return data;
}

export function createDefaultStatChart(columnId: string, chartType?: BulkStatChartType): BulkProcessStatChart {
    return {
        id: `stat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        columnId,
        chartType: chartType ?? 'bar',
    };
}

export function getStatChartTitle(
    chart: BulkProcessStatChart,
    columnOptions: BulkStatColumnOption[]
): string {
    if (chart.title?.trim()) return chart.title.trim();
    const col = columnOptions.find(c => c.id === chart.columnId);
    return col?.label ?? chart.columnId;
}
