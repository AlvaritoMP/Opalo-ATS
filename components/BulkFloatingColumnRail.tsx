import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { COMPACT_TD_CLASS, COMPACT_TH_CLASS, getColumnLabel, getColumnWidth } from '../lib/bulkTableColumns';

export interface BulkFloatingColumnRailProps {
    columnIds: string[];
    customColumns: import('../types').CustomColumn[];
    columnWidths?: Record<string, number>;
    rowKeys: string[];
    selectedRowIds?: Set<string>;
    offsetX: number;
    onOffsetXChange: (offsetX: number) => void;
    onOffsetXCommit?: (offsetX: number) => void;
    renderCell: (colId: string, rowKey: string, rowIndex: number) => React.ReactNode;
    renderHeader?: (colId: string) => React.ReactNode;
    scrollContainerRef: React.RefObject<HTMLElement | null>;
}

const GRIP_WIDTH = 6;
const RAIL_MIN_LEFT = 0;

interface RowMetric {
    top: number;
    height: number;
}

function measureTableLayout(
    container: HTMLElement,
    rowKeys: string[]
): { headerHeight: number; rowMetrics: Map<string, RowMetric>; contentHeight: number } {
    const thead = container.querySelector('thead');
    const headerHeight = thead?.getBoundingClientRect().height ?? 52;
    const containerRect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;

    const rowMetrics = new Map<string, RowMetric>();
    for (const id of rowKeys) {
        const tr = container.querySelector(`tr[data-bulk-candidate-row="${CSS.escape(id)}"]`);
        if (!tr) continue;
        const rect = tr.getBoundingClientRect();
        rowMetrics.set(id, {
            top: rect.top - containerRect.top + scrollTop,
            height: rect.height,
        });
    }

    return {
        headerHeight,
        rowMetrics,
        contentHeight: container.scrollHeight,
    };
}

export const BulkFloatingColumnRail: React.FC<BulkFloatingColumnRailProps> = ({
    columnIds,
    customColumns,
    columnWidths,
    rowKeys,
    selectedRowIds,
    offsetX,
    onOffsetXChange,
    onOffsetXCommit,
    renderCell,
    renderHeader,
    scrollContainerRef,
}) => {
    const liveOffsetRef = useRef(offsetX);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, offset: 0 });
    const [headerHeight, setHeaderHeight] = useState(52);
    const [rowMetrics, setRowMetrics] = useState<Map<string, RowMetric>>(new Map());
    const [contentHeight, setContentHeight] = useState(0);

    useEffect(() => {
        liveOffsetRef.current = offsetX;
    }, [offsetX]);

    const columnsWidth = useMemo(
        () => columnIds.reduce((sum, id) => sum + getColumnWidth(id, columnWidths), 0),
        [columnIds, columnWidths]
    );
    const totalWidth = columnsWidth + GRIP_WIDTH;

    const remeasure = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const layout = measureTableLayout(container, rowKeys);
        setHeaderHeight(layout.headerHeight);
        setRowMetrics(layout.rowMetrics);
        setContentHeight(layout.contentHeight);
    }, [scrollContainerRef, rowKeys]);

    useLayoutEffect(() => {
        remeasure();
        const container = scrollContainerRef.current;
        if (!container) return;

        const ro = new ResizeObserver(() => remeasure());
        ro.observe(container);
        const table = container.querySelector('table');
        if (table) ro.observe(table);

        const mo = new MutationObserver(() => remeasure());
        mo.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });

        window.addEventListener('resize', remeasure);
        return () => {
            ro.disconnect();
            mo.disconnect();
            window.removeEventListener('resize', remeasure);
        };
    }, [remeasure, rowKeys.join(',')]);

    const clampOffset = useCallback(
        (next: number) => {
            const container = scrollContainerRef.current;
            if (!container) return Math.max(RAIL_MIN_LEFT, next);
            const maxLeft = Math.max(RAIL_MIN_LEFT, container.clientWidth - totalWidth);
            return Math.min(maxLeft, Math.max(RAIL_MIN_LEFT, next));
        },
        [scrollContainerRef, totalWidth]
    );

    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, offset: offsetX };
    };

    useEffect(() => {
        if (!isDragging) return;

        const onMove = (e: MouseEvent) => {
            const delta = e.clientX - dragStartRef.current.x;
            const next = clampOffset(dragStartRef.current.offset + delta);
            liveOffsetRef.current = next;
            onOffsetXChange(next);
        };
        const onUp = () => {
            setIsDragging(false);
            onOffsetXCommit?.(liveOffsetRef.current);
            requestAnimationFrame(remeasure);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
    }, [isDragging, onOffsetXChange, onOffsetXCommit, clampOffset, remeasure]);

    if (columnIds.length === 0 || rowKeys.length === 0) return null;

    const headerCells = (
        <>
            <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Arrastrar columnas de fidelización"
                onMouseDown={handleDragStart}
                className={`shrink-0 border-r border-gray-200 bg-gray-100 hover:bg-primary-100 active:bg-primary-200 ${
                    isDragging ? 'bg-primary-200 cursor-grabbing' : 'cursor-grab'
                }`}
                style={{ width: GRIP_WIDTH }}
            />
            {columnIds.map(colId => (
                <div
                    key={colId}
                    className={`${COMPACT_TH_CLASS} bg-gray-50 border-r border-gray-200 last:border-r-0`}
                    style={{
                        width: getColumnWidth(colId, columnWidths),
                        minWidth: getColumnWidth(colId, columnWidths),
                    }}
                >
                    {renderHeader ? renderHeader(colId) : getColumnLabel(colId, customColumns)}
                </div>
            ))}
        </>
    );

    return (
        <div
            className="absolute left-0 top-0 w-full pointer-events-none z-[25]"
            style={{ height: contentHeight || '100%' }}
            aria-hidden={false}
        >
            {/* Encabezado sticky: tapa los encabezados de la tabla al deslizar */}
            <div
                className="sticky top-0 z-[30] pointer-events-none"
                style={{ height: headerHeight }}
            >
                <div
                    className="absolute flex items-stretch border-b border-gray-200 bg-gray-50 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)] pointer-events-auto"
                    style={{
                        left: offsetX,
                        width: totalWidth,
                        height: headerHeight,
                        minHeight: headerHeight,
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {headerCells}
                </div>
            </div>

            {/* Filas alineadas con cada candidato de la tabla principal */}
            {rowKeys.map((rowKey, rowIndex) => {
                const metric = rowMetrics.get(rowKey);
                if (!metric) return null;
                const isSelected = selectedRowIds?.has(rowKey);

                return (
                    <div
                        key={rowKey}
                        className={`absolute flex items-stretch border-b border-gray-100 pointer-events-auto ${
                            isSelected ? 'bg-primary-50' : 'bg-white'
                        } hover:bg-gray-50`}
                        style={{
                            top: metric.top,
                            left: offsetX,
                            width: totalWidth,
                            height: metric.height,
                            minHeight: metric.height,
                            boxShadow: '2px 0 6px -2px rgba(0,0,0,0.08)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div
                            className="shrink-0 border-r border-gray-100 bg-inherit"
                            style={{ width: GRIP_WIDTH }}
                        />
                        {columnIds.map(colId => (
                            <div
                                key={`${rowKey}-${colId}`}
                                className={`${COMPACT_TD_CLASS} shrink-0 overflow-hidden border-r border-gray-100 last:border-r-0 bg-inherit`}
                                style={{
                                    width: getColumnWidth(colId, columnWidths),
                                    minWidth: getColumnWidth(colId, columnWidths),
                                }}
                            >
                                {renderCell(colId, rowKey, rowIndex)}
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
};
