import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GripHorizontal, Plus, X } from 'lucide-react';
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
    onClose?: () => void;
    addableColumnIds?: string[];
    onAddColumn?: (colId: string) => void;
    onRemoveColumn?: (colId: string) => void;
    renderCell: (colId: string, rowKey: string, rowIndex: number) => React.ReactNode;
    renderHeader?: (colId: string) => React.ReactNode;
    scrollContainerRef: React.RefObject<HTMLElement | null>;
}

const DRAG_BAR_HEIGHT = 22;
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

function isInteractiveDragTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return !!target.closest('button, input, select, textarea, a, [role="listbox"], [data-no-drag]');
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
    onClose,
    addableColumnIds = [],
    onAddColumn,
    onRemoveColumn,
    renderCell,
    renderHeader,
    scrollContainerRef,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const isDraggingRef = useRef(false);
    const [dragX, setDragX] = useState<number | null>(null);
    const [showAddColumnMenu, setShowAddColumnMenu] = useState(false);
    const addColumnMenuRef = useRef<HTMLDivElement>(null);
    const addColumnButtonRef = useRef<HTMLButtonElement>(null);
    const [addColumnMenuPos, setAddColumnMenuPos] = useState<{
        top: number;
        left: number;
        maxHeight: number;
    } | null>(null);
    const dragStartRef = useRef({ x: 0, offset: 0 });
    const rafRef = useRef<number | null>(null);
    const pendingXRef = useRef<number | null>(null);
    const [headerHeight, setHeaderHeight] = useState(52);
    const [rowMetrics, setRowMetrics] = useState<Map<string, RowMetric>>(new Map());
    const [contentHeight, setContentHeight] = useState(0);

    const displayX = dragX ?? offsetX;
    const offsetXRef = useRef(offsetX);
    offsetXRef.current = offsetX;

    useEffect(() => {
        if (dragX != null && !isDragging && dragX === offsetX) {
            setDragX(null);
        }
    }, [offsetX, dragX, isDragging]);

    useEffect(() => {
        if (!showAddColumnMenu) return;
        const onDocClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (addColumnMenuRef.current?.contains(target)) return;
            if (addColumnButtonRef.current?.contains(target)) return;
            setShowAddColumnMenu(false);
        };
        const onScrollOrResize = () => setShowAddColumnMenu(false);
        document.addEventListener('mousedown', onDocClick);
        window.addEventListener('resize', onScrollOrResize);
        window.addEventListener('scroll', onScrollOrResize, true);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            window.removeEventListener('resize', onScrollOrResize);
            window.removeEventListener('scroll', onScrollOrResize, true);
        };
    }, [showAddColumnMenu]);

    const openAddColumnMenu = useCallback(() => {
        const btn = addColumnButtonRef.current;
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        setAddColumnMenuPos({
            top: rect.bottom + 4,
            left: rect.left,
            maxHeight: Math.max(120, window.innerHeight - rect.bottom - 12),
        });
        setShowAddColumnMenu(true);
    }, []);

    const totalWidth = useMemo(
        () => columnIds.reduce((sum, id) => sum + getColumnWidth(id, columnWidths), 0),
        [columnIds, columnWidths]
    );

    const columnHeaderHeight = Math.max(28, headerHeight - DRAG_BAR_HEIGHT);
    const stickyHeight = DRAG_BAR_HEIGHT + columnHeaderHeight;

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

        const ro = new ResizeObserver(() => {
            if (!isDraggingRef.current) remeasure();
        });
        ro.observe(container);
        const table = container.querySelector('table');
        if (table) ro.observe(table);

        const mo = new MutationObserver(() => {
            if (!isDraggingRef.current) remeasure();
        });
        mo.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });

        const onScroll = () => {
            if (!isDraggingRef.current) remeasure();
        };

        window.addEventListener('resize', remeasure);
        container.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            ro.disconnect();
            mo.disconnect();
            window.removeEventListener('resize', remeasure);
            container.removeEventListener('scroll', onScroll);
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

    const flushDragPosition = useCallback(() => {
        if (pendingXRef.current == null) return;
        setDragX(pendingXRef.current);
        pendingXRef.current = null;
        rafRef.current = null;
    }, []);

    const scheduleDragPosition = useCallback(
        (next: number) => {
            pendingXRef.current = next;
            if (rafRef.current != null) return;
            rafRef.current = requestAnimationFrame(flushDragPosition);
        },
        [flushDragPosition]
    );

    const beginDrag = useCallback(
        (clientX: number) => {
            const startOffset = dragX ?? offsetXRef.current;
            isDraggingRef.current = true;
            setIsDragging(true);
            setDragX(startOffset);
            dragStartRef.current = { x: clientX, offset: startOffset };
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
        },
        [dragX]
    );

    const moveDrag = useCallback(
        (clientX: number) => {
            const delta = clientX - dragStartRef.current.x;
            const next = clampOffset(dragStartRef.current.offset + delta);
            scheduleDragPosition(next);
        },
        [clampOffset, scheduleDragPosition]
    );

    const endDrag = useCallback(() => {
        isDraggingRef.current = false;
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        const finalX = pendingXRef.current ?? dragX ?? offsetXRef.current;
        pendingXRef.current = null;
        setDragX(finalX);
        onOffsetXChange(finalX);
        onOffsetXCommit?.(finalX);
        requestAnimationFrame(remeasure);
    }, [dragX, onOffsetXChange, onOffsetXCommit, remeasure]);

    const handleDragMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0 || isInteractiveDragTarget(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        beginDrag(e.clientX);
    };

    useEffect(() => {
        if (!isDragging) return;

        const onMouseMove = (e: MouseEvent) => moveDrag(e.clientX);
        const onMouseUp = () => endDrag();
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                e.preventDefault();
                moveDrag(e.touches[0].clientX);
            }
        };
        const onTouchEnd = () => endDrag();

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
        document.addEventListener('touchcancel', onTouchEnd);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            document.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [isDragging, moveDrag, endDrag]);

    useEffect(() => {
        return () => {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, []);

    const railTransform = {
        transform: `translate3d(${displayX}px, 0, 0)`,
        width: totalWidth,
        willChange: isDragging ? ('transform' as const) : undefined,
    };

    const dragSurfaceClass = isDragging
        ? 'cursor-grabbing bg-violet-100/90'
        : 'cursor-grab bg-violet-50 hover:bg-violet-100/80 active:bg-violet-100';

    if (columnIds.length === 0 || rowKeys.length === 0) return null;

    return (
        <div
            className="absolute left-0 top-0 w-full pointer-events-none z-[25]"
            style={{ height: contentHeight || '100%' }}
        >
            <div
                className="sticky top-0 z-[30] pointer-events-none"
                style={{ height: stickyHeight }}
            >
                <div
                    className="absolute top-0 left-0 pointer-events-auto shadow-[2px_0_8px_-2px_rgba(0,0,0,0.14)] border border-gray-200 border-t-0 bg-gray-50 overflow-visible"
                    style={railTransform}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Barra de arrastre: título + cierre */}
                    <div
                        className={`flex items-center gap-1 px-1.5 border-b border-violet-200/80 select-none touch-none ${dragSurfaceClass}`}
                        style={{ height: DRAG_BAR_HEIGHT }}
                        onMouseDown={handleDragMouseDown}
                        onTouchStart={e => {
                            if (isInteractiveDragTarget(e.target)) return;
                            beginDrag(e.touches[0].clientX);
                        }}
                        title="Arrastrar para deslizar las columnas de fidelización"
                    >
                        <GripHorizontal className="w-3.5 h-3.5 text-violet-600 shrink-0 opacity-70" aria-hidden />
                        <span className="flex-1 text-[10px] font-semibold uppercase tracking-wide text-violet-900 truncate">
                            Fidelización
                        </span>
                        {onAddColumn && addableColumnIds.length > 0 && (
                            <div className="relative shrink-0">
                                <button
                                    ref={addColumnButtonRef}
                                    type="button"
                                    data-no-drag
                                    onClick={e => {
                                        e.stopPropagation();
                                        if (showAddColumnMenu) {
                                            setShowAddColumnMenu(false);
                                        } else {
                                            openAddColumnMenu();
                                        }
                                    }}
                                    className="p-0.5 rounded text-violet-600 hover:text-violet-800 hover:bg-white/80"
                                    title="Añadir columna al panel"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                                {showAddColumnMenu && addColumnMenuPos && createPortal(
                                    <div
                                        ref={addColumnMenuRef}
                                        className="fixed z-[200] min-w-[160px] max-w-[min(280px,calc(100vw-16px))] bg-white border border-gray-200 rounded-md shadow-xl py-1 overflow-y-auto"
                                        style={{
                                            top: addColumnMenuPos.top,
                                            left: addColumnMenuPos.left,
                                            maxHeight: addColumnMenuPos.maxHeight,
                                        }}
                                        onMouseDown={e => e.stopPropagation()}
                                    >
                                        <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100">
                                            Añadir columna
                                        </div>
                                        {addableColumnIds.map(colId => (
                                            <button
                                                key={colId}
                                                type="button"
                                                data-no-drag
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    onAddColumn(colId);
                                                    setShowAddColumnMenu(false);
                                                }}
                                                className="w-full text-left px-2.5 py-1.5 text-[11px] text-gray-700 hover:bg-violet-50 truncate"
                                                title={getColumnLabel(colId, customColumns)}
                                            >
                                                {getColumnLabel(colId, customColumns)}
                                            </button>
                                        ))}
                                    </div>,
                                    document.body
                                )}
                            </div>
                        )}
                        {onClose && (
                            <button
                                type="button"
                                data-no-drag
                                onClick={e => {
                                    e.stopPropagation();
                                    onClose();
                                }}
                                className="shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-white/80"
                                title="Ocultar panel de fidelización"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Encabezados de columna (también arrastrables) */}
                    <div
                        className={`flex items-stretch border-b border-gray-200 select-none touch-none overflow-hidden ${dragSurfaceClass}`}
                        style={{ height: columnHeaderHeight, minHeight: columnHeaderHeight }}
                        onMouseDown={handleDragMouseDown}
                        onTouchStart={e => {
                            if (isInteractiveDragTarget(e.target)) return;
                            beginDrag(e.touches[0].clientX);
                        }}
                        title="Arrastrar columnas de fidelización"
                    >
                        {columnIds.map(colId => (
                            <div
                                key={colId}
                                className={`${COMPACT_TH_CLASS} bg-gray-50 border-r border-gray-200 last:border-r-0 flex items-center gap-0.5 group/col`}
                                style={{
                                    width: getColumnWidth(colId, columnWidths),
                                    minWidth: getColumnWidth(colId, columnWidths),
                                }}
                            >
                                <span className="truncate flex-1 min-w-0">
                                    {renderHeader ? renderHeader(colId) : getColumnLabel(colId, customColumns)}
                                </span>
                                {onRemoveColumn && columnIds.length > 1 && (
                                    <button
                                        type="button"
                                        data-no-drag
                                        onClick={e => {
                                            e.stopPropagation();
                                            onRemoveColumn(colId);
                                        }}
                                        className="shrink-0 p-0.5 rounded opacity-0 group-hover/col:opacity-100 text-gray-400 hover:text-red-600 hover:bg-white/80"
                                        title="Quitar columna del panel"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {rowKeys.map((rowKey, rowIndex) => {
                const metric = rowMetrics.get(rowKey);
                if (!metric) return null;
                const isSelected = selectedRowIds?.has(rowKey);

                return (
                    <div
                        key={rowKey}
                        className={`absolute top-0 left-0 flex items-stretch border-b border-gray-100 pointer-events-none ${
                            isSelected ? 'bg-primary-50' : 'bg-white'
                        }`}
                        style={{
                            top: metric.top,
                            height: metric.height,
                            minHeight: metric.height,
                            boxShadow: '2px 0 6px -2px rgba(0,0,0,0.08)',
                            ...railTransform,
                        }}
                    >
                        {columnIds.map(colId => (
                            <div
                                key={`${rowKey}-${colId}`}
                                className={`${COMPACT_TD_CLASS} shrink-0 overflow-visible border-r border-gray-100 last:border-r-0 bg-inherit pointer-events-auto`}
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
