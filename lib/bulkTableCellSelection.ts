import type { CellCoord } from './bulkTableTypes';

export const BULK_CELL_ACTIVE_ATTR = 'data-bulk-cell-active';
export const BULK_CELL_SELECTED_ATTR = 'data-bulk-cell-selected';

export function parseBulkCellKey(key: string): CellCoord {
    const sep = key.indexOf('::');
    return { candidateId: key.slice(0, sep), colId: key.slice(sep + 2) };
}

export function toBulkCellKey(coord: CellCoord): string {
    return `${coord.candidateId}::${coord.colId}`;
}

function findCellElement(container: HTMLElement, coord: CellCoord): HTMLElement | null {
    return container.querySelector(
        `[data-cell-row="${coord.candidateId}"][data-cell-col="${coord.colId}"]`
    ) as HTMLElement | null;
}

/** Resalta celdas en el DOM de inmediato, sin esperar al re-render de React. */
export function applyBulkCellDomSelection(
    container: HTMLElement | null,
    active: CellCoord | null,
    selected: Set<string>
): void {
    if (!container) return;

    container.querySelectorAll(`[${BULK_CELL_ACTIVE_ATTR}]`).forEach(el => {
        el.removeAttribute(BULK_CELL_ACTIVE_ATTR);
    });
    container.querySelectorAll(`[${BULK_CELL_SELECTED_ATTR}]`).forEach(el => {
        el.removeAttribute(BULK_CELL_SELECTED_ATTR);
    });

    if (active) {
        findCellElement(container, active)?.setAttribute(BULK_CELL_ACTIVE_ATTR, 'true');
    }

    for (const key of selected) {
        const coord = parseBulkCellKey(key);
        if (active && coord.candidateId === active.candidateId && coord.colId === active.colId) {
            continue;
        }
        findCellElement(container, coord)?.setAttribute(BULK_CELL_SELECTED_ATTR, 'true');
    }
}
