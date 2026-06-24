import type { BulkProcessConfig, CustomColumn } from '../types';
import { normalizeColumnNameKey } from './bulkTableColumns';
import { readBulkTableTemplatesCache } from './bulkTableTemplates';

export interface BulkConfigSnapshot {
    bulkConfig: BulkProcessConfig;
    savedAt: string;
    source?: string;
}

const SNAPSHOT_PREFIX = 'opalo_bulk_config_snapshot_v1_';

export function getBulkConfigSnapshotKey(processId: string): string {
    return `${SNAPSHOT_PREFIX}${processId}`;
}

export function saveBulkConfigSnapshot(
    processId: string,
    bulkConfig: BulkProcessConfig,
    source = 'app'
): void {
    if (!processId || !bulkConfig) return;
    try {
        const snapshot: BulkConfigSnapshot = {
            bulkConfig,
            savedAt: new Date().toISOString(),
            source,
        };
        localStorage.setItem(getBulkConfigSnapshotKey(processId), JSON.stringify(snapshot));
    } catch {
        /* ignore quota */
    }
}

export function loadBulkConfigSnapshot(processId: string): BulkConfigSnapshot | null {
    try {
        const raw = localStorage.getItem(getBulkConfigSnapshotKey(processId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as BulkConfigSnapshot;
        if (!parsed?.bulkConfig) return null;
        return parsed;
    } catch {
        return null;
    }
}

function scoreColumnDef(col: CustomColumn): number {
    let s = 1;
    if (col.type !== 'text') s += 3;
    if (col.options?.length) s += col.options.length;
    if (col.routeDestination) s += 2;
    if (col.dashboardSemanticField) s += 1;
    return s;
}

export function scoreBulkConfigRichness(config?: BulkProcessConfig): number {
    if (!config) return 0;
    let score = 0;
    score += (config.customColumns?.length ?? 0) * 10;
    score += (config.columnOrder?.length ?? 0) * 3;
    score += (config.hiddenColumns?.length ?? 0);
    score += (config.quickReplies?.length ?? 0) * 12;
    score += (config.infoPins?.length ?? 0) * 12;
    score += (config.contactMessageTemplates?.length ?? 0) * 8;
    score += (config.customStats?.length ?? 0) * 6;
    score += config.idealProfile?.enabled ? 50 : 0;
    score += (config.idealProfile?.criteria?.length ?? 0) * 8;
    score += Object.keys(config.columnKeyAliases ?? {}).length * 2;
    score += Object.keys(config.columnWidths ?? {}).length;
    if (config.floatingColumnRail?.columnIds?.length) score += 10;
    if (config.whatsappEnabled) score += 5;
    if (config.killerQuestions?.length) score += 5;
    return score;
}

function mergeCustomColumnsByName(
    current: CustomColumn[] = [],
    backup: CustomColumn[] = []
): CustomColumn[] {
    const byName = new Map<string, CustomColumn>();
    for (const col of current) {
        byName.set(normalizeColumnNameKey(col.name), col);
    }
    for (const col of backup) {
        const norm = normalizeColumnNameKey(col.name);
        const existing = byName.get(norm);
        if (!existing) {
            byName.set(norm, col);
            continue;
        }
        if (scoreColumnDef(col) > scoreColumnDef(existing)) {
            byName.set(norm, { ...col, id: existing.id });
        }
    }
    return [...byName.values()];
}

function pickRicherArray<T>(current: T[] | undefined, backup: T[] | undefined): T[] | undefined {
    const cur = current ?? [];
    const bak = backup ?? [];
    if (bak.length > cur.length) return bak;
    if (bak.length === cur.length && bak.length > 0 && JSON.stringify(bak) !== JSON.stringify(cur)) {
        return bak;
    }
    return current;
}

function pickRicherObject<T extends Record<string, unknown>>(
    current: T | undefined,
    backup: T | undefined
): T | undefined {
    const curKeys = Object.keys(current ?? {}).length;
    const bakKeys = Object.keys(backup ?? {}).length;
    if (bakKeys > curKeys) return backup;
    if (bakKeys === curKeys && bakKeys > 0) {
        return { ...(current ?? {}), ...(backup ?? {}) } as T;
    }
    return current ?? backup;
}

/** Prefiere el backup cuando el config actual perdió campos de personalización. */
export function mergeBulkConfigPreferRicher(
    current: BulkProcessConfig | undefined,
    backup: BulkProcessConfig | undefined
): { config: BulkProcessConfig; restoredFields: string[] } {
    const restoredFields: string[] = [];
    if (!backup) return { config: { ...(current || {}) }, restoredFields };

    const out: BulkProcessConfig = { ...(current || {}) };
    const mark = (key: keyof BulkProcessConfig, value: unknown) => {
        const prev = current?.[key];
        if (JSON.stringify(prev) !== JSON.stringify(value)) {
            (out as Record<string, unknown>)[key as string] = value;
            restoredFields.push(key as string);
        }
    };

    const mergedColumns = mergeCustomColumnsByName(current?.customColumns, backup.customColumns);
    if (JSON.stringify(mergedColumns) !== JSON.stringify(current?.customColumns ?? [])) {
        mark('customColumns', mergedColumns);
    }

    const backupScore = scoreBulkConfigRichness(backup);
    const currentScore = scoreBulkConfigRichness(current);

    if ((backup.columnOrder?.length ?? 0) > (current?.columnOrder?.length ?? 0)) {
        mark('columnOrder', backup.columnOrder);
    } else if (
        backup.columnOrder?.length &&
        current?.columnOrder?.length &&
        backupScore > currentScore + 15
    ) {
        mark('columnOrder', backup.columnOrder);
    }

    if ((backup.hiddenColumns?.length ?? 0) > (current?.hiddenColumns?.length ?? 0)) {
        mark('hiddenColumns', backup.hiddenColumns);
    }

    if ((backup.pinnedColumns?.length ?? 0) > (current?.pinnedColumns?.length ?? 0)) {
        mark('pinnedColumns', backup.pinnedColumns);
    }

    const mergedWidths = pickRicherObject(
        current?.columnWidths as Record<string, unknown> | undefined,
        backup.columnWidths as Record<string, unknown> | undefined
    );
    if (mergedWidths && JSON.stringify(mergedWidths) !== JSON.stringify(current?.columnWidths ?? {})) {
        mark('columnWidths', mergedWidths as BulkProcessConfig['columnWidths']);
    }

    const mergedAliases = pickRicherObject(
        current?.columnKeyAliases as Record<string, unknown> | undefined,
        backup.columnKeyAliases as Record<string, unknown> | undefined
    );
    if (mergedAliases && JSON.stringify(mergedAliases) !== JSON.stringify(current?.columnKeyAliases ?? {})) {
        mark('columnKeyAliases', mergedAliases as BulkProcessConfig['columnKeyAliases']);
    }

    const backupIdealCriteria = backup.idealProfile?.criteria?.length ?? 0;
    const currentIdealCriteria = current?.idealProfile?.criteria?.length ?? 0;
    if (backupIdealCriteria > currentIdealCriteria || (backup.idealProfile?.enabled && !current?.idealProfile?.enabled)) {
        mark('idealProfile', backup.idealProfile);
    }

    const quickReplies = pickRicherArray(current?.quickReplies, backup.quickReplies);
    if (quickReplies && quickReplies !== current?.quickReplies) mark('quickReplies', quickReplies);

    const infoPins = pickRicherArray(current?.infoPins, backup.infoPins);
    if (infoPins && infoPins !== current?.infoPins) mark('infoPins', infoPins);

    const contactMessageTemplates = pickRicherArray(
        current?.contactMessageTemplates,
        backup.contactMessageTemplates
    );
    if (contactMessageTemplates && contactMessageTemplates !== current?.contactMessageTemplates) {
        mark('contactMessageTemplates', contactMessageTemplates);
    }

    const customStats = pickRicherArray(current?.customStats, backup.customStats);
    if (customStats && customStats !== current?.customStats) mark('customStats', customStats);

    if (backup.floatingColumnRail && !current?.floatingColumnRail) {
        mark('floatingColumnRail', backup.floatingColumnRail);
    } else if (
        (backup.floatingColumnRail?.columnIds?.length ?? 0) >
        (current?.floatingColumnRail?.columnIds?.length ?? 0)
    ) {
        mark('floatingColumnRail', backup.floatingColumnRail);
    }

    if (backup.whatsappEnabled && !current?.whatsappEnabled) mark('whatsappEnabled', true);
    if (backup.whatsappMessageTemplate && !current?.whatsappMessageTemplate) {
        mark('whatsappMessageTemplate', backup.whatsappMessageTemplate);
    }

    if ((backup.killerQuestions?.length ?? 0) > (current?.killerQuestions?.length ?? 0)) {
        mark('killerQuestions', backup.killerQuestions);
    }

    if (backup.psycholaboral && !current?.psycholaboral) mark('psycholaboral', backup.psycholaboral);

    if (backup.aiPrompt && !current?.aiPrompt) mark('aiPrompt', backup.aiPrompt);
    if (backup.scoreThreshold != null && current?.scoreThreshold == null) {
        mark('scoreThreshold', backup.scoreThreshold);
    }

    return { config: out, restoredFields };
}

/** Busca la mejor copia local: snapshot completo, plantilla o layout parcial. */
export function findBestLocalBulkConfigBackup(processId: string): BulkConfigSnapshot | null {
    const direct = loadBulkConfigSnapshot(processId);
    if (direct && scoreBulkConfigRichness(direct.bulkConfig) > 40) return direct;

    let best: BulkConfigSnapshot | null = direct;
    let bestScore = scoreBulkConfigRichness(direct?.bulkConfig);

    try {
        const layoutRaw = localStorage.getItem(`opalo_bulk_table_layout_v1_${processId}`);
        if (layoutRaw) {
            const layout = JSON.parse(layoutRaw) as {
                columnOrder?: string[];
                hiddenColumns?: string[];
                pinnedColumns?: string[];
                columnWidths?: Record<string, number>;
            };
            const partial: BulkProcessConfig = {
                columnOrder: layout.columnOrder,
                hiddenColumns: layout.hiddenColumns,
                pinnedColumns: layout.pinnedColumns,
                columnWidths: layout.columnWidths,
            };
            const score = scoreBulkConfigRichness(partial);
            if (score > bestScore) {
                bestScore = score;
                best = {
                    bulkConfig: partial,
                    savedAt: new Date().toISOString(),
                    source: 'layout_backup',
                };
            }
        }
    } catch {
        /* ignore */
    }

    const templates = readBulkTableTemplatesCache();
    for (const t of templates) {
        const partial: BulkProcessConfig = {
            customColumns: t.columns,
            columnOrder: t.columnOrder,
            hiddenColumns: t.hiddenColumns,
            pinnedColumns: t.pinnedColumns,
            columnWidths: t.columnWidths,
        };
        const score = scoreBulkConfigRichness(partial);
        if (score > bestScore) {
            bestScore = score;
            best = {
                bulkConfig: partial,
                savedAt: t.createdAt,
                source: `template:${t.name}`,
            };
        }
    }

    return best;
}
