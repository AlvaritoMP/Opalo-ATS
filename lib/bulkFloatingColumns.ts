import type { BulkProcessConfig } from '../types';
import { CONTACT_COLUMN_IDS } from './contactChannelConfig';
import { DEFAULT_FLOATING_COLUMN_IDS, FIDELIZ_COLUMN_IDS } from './trackingScopeConfig';

export { DEFAULT_FLOATING_COLUMN_IDS, FIDELIZ_COLUMN_IDS };

/** Columnas de contacto/fidelización que pueden añadirse al panel flotante */
export const ELIGIBLE_FLOATING_RAIL_COLUMN_IDS = [
    ...FIDELIZ_COLUMN_IDS,
    ...CONTACT_COLUMN_IDS,
];

export function resolveFloatingColumnIds(bulkConfig?: BulkProcessConfig): string[] {
    const fromConfig = bulkConfig?.floatingColumnRail?.columnIds;
    if (fromConfig?.length) return fromConfig;
    return DEFAULT_FLOATING_COLUMN_IDS;
}

export function isFloatingColumnRailEnabled(bulkConfig?: BulkProcessConfig): boolean {
    return bulkConfig?.floatingColumnRail?.enabled === true;
}

export function resolveFloatingRailOffsetX(bulkConfig?: BulkProcessConfig): number {
    return bulkConfig?.floatingColumnRail?.offsetX ?? 280;
}

/** Excluye columnas del riel flotante de las columnas visibles de la tabla principal */
export function excludeFloatingColumnsFromVisible(
    visibleColumnIds: string[],
    floatingColumnIds: string[]
): string[] {
    const floating = new Set(floatingColumnIds);
    return visibleColumnIds.filter(id => !floating.has(id));
}

/** Asegura que las columnas flotantes estén ocultas en la tabla principal */
export function ensureFloatingColumnsHidden(
    hiddenColumns: string[],
    floatingColumnIds: string[]
): string[] {
    const hidden = new Set(hiddenColumns);
    for (const id of floatingColumnIds) {
        hidden.add(id);
    }
    return [...hidden];
}
