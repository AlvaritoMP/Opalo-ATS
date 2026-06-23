import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GripVertical, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { COMPACT_TD_CLASS, COMPACT_TH_CLASS, getColumnLabel, getColumnWidth } from '../lib/bulkTableColumns';

export interface BulkFloatingColumnRailProps {
    columnIds: string[];
    customColumns: import('../types').CustomColumn[];
    columnWidths?: Record<string, number>;
    /** Filas visibles (mismo orden que la tabla principal) */
    rowKeys: string[];
    rowHeight?: number;
    headerHeight?: number;
    offsetX: number;
    onOffsetXChange: (offsetX: number) => void;
    /** Persistir posición al soltar el arrastre (evita saturar la API) */
    onOffsetXCommit?: (offsetX: number) => void;
    onClose?: () => void;
    renderCell: (colId: string, rowKey: string, rowIndex: number) => React.ReactNode;
    renderHeader?: (colId: string) => React.ReactNode;
    scrollContainerRef: React.RefObject<HTMLElement | null>;
    title?: string;
}

const RAIL_MIN_LEFT = 40;
const DRAG_HANDLE_WIDTH = 28;

export const BulkFloatingColumnRail: React.FC<BulkFloatingColumnRailProps> = ({
    columnIds,
    customColumns,
    columnWidths,
    rowKeys,
    rowHeight = 28,
    headerHeight = 52,
    offsetX,
    onOffsetXChange,
    onOffsetXCommit,
    onClose,
    renderCell,
    renderHeader,
    scrollContainerRef,
    title = 'Columnas flotantes',
}) => {
    const railRef = useRef<HTMLDivElement>(null);
    const liveOffsetRef = useRef(offsetX);
    const [scrollTop, setScrollTop] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, offset: 0 });

    useEffect(() => {
        liveOffsetRef.current = offsetX;
    }, [offsetX]);

    const totalWidth = useMemo(() => {
        return columnIds.reduce((sum, id) => sum + getColumnWidth(id, columnWidths), 0) + DRAG_HANDLE_WIDTH;
    }, [columnIds, columnWidths]);

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;

        const onScroll = () => setScrollTop(el.scrollTop);
        onScroll();
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [scrollContainerRef]);

    const clampOffset = useCallback(
        (next: number) => {
            const container = scrollContainerRef.current;
            if (!container) return Math.max(RAIL_MIN_LEFT, next);
            const maxLeft = Math.max(RAIL_MIN_LEFT, container.clientWidth - totalWidth - 8);
            return Math.min(maxLeft, Math.max(RAIL_MIN_LEFT, next));
        },
        [scrollContainerRef, totalWidth]
    );

    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault();
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
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
    }, [isDragging, onOffsetXChange, onOffsetXCommit, clampOffset]);

    const nudge = (delta: number) => {
        const next = clampOffset(offsetX + delta);
        onOffsetXChange(next);
        onOffsetXCommit?.(next);
    };

    if (columnIds.length === 0) return null;

    return (
        <div
            ref={railRef}
            className={`absolute z-40 flex shadow-xl border border-violet-200 rounded-lg overflow-hidden bg-white/98 backdrop-blur-sm ${
                isDragging ? 'ring-2 ring-violet-400 cursor-grabbing' : ''
            }`}
            style={{
                left: offsetX,
                top: 0,
                width: totalWidth,
                maxHeight: '100%',
                pointerEvents: 'auto',
            }}
            onClick={e => e.stopPropagation()}
        >
            <div
                className="flex flex-col items-center justify-start bg-violet-50 border-r border-violet-200 shrink-0 select-none"
                style={{ width: DRAG_HANDLE_WIDTH }}
            >
                <button
                    type="button"
                    onMouseDown={handleDragStart}
                    className="p-1 text-violet-600 hover:bg-violet-100 cursor-grab active:cursor-grabbing"
                    title="Arrastrar panel sobre la tabla"
                >
                    <GripVertical className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={() => nudge(-48)}
                    className="p-0.5 text-violet-500 hover:bg-violet-100"
                    title="Mover a la izquierda"
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => nudge(48)}
                    className="p-0.5 text-violet-500 hover:bg-violet-100"
                    title="Mover a la derecha"
                >
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-0.5 mt-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        title="Ocultar panel"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            <div className="flex flex-col min-w-0 overflow-hidden">
                <div
                    className="bg-violet-50 border-b border-violet-200 px-2 py-1 flex items-end gap-0 shrink-0"
                    style={{ minHeight: headerHeight }}
                >
                    <span className="text-[10px] font-semibold text-violet-800 uppercase tracking-wide mr-1 self-center">
                        {title}
                    </span>
                    {columnIds.map(colId => (
                        <div
                            key={colId}
                            className={`${COMPACT_TH_CLASS} text-violet-700 font-semibold`}
                            style={{
                                width: getColumnWidth(colId, columnWidths),
                                minWidth: getColumnWidth(colId, columnWidths),
                            }}
                        >
                            {renderHeader ? renderHeader(colId) : getColumnLabel(colId, customColumns)}
                        </div>
                    ))}
                </div>

                <div className="overflow-hidden flex-1">
                    <div style={{ transform: `translateY(-${scrollTop}px)` }}>
                        {rowKeys.map((rowKey, rowIndex) => (
                            <div
                                key={rowKey}
                                className="flex border-b border-gray-100 bg-white/95 even:bg-violet-50/20"
                                style={{ height: rowHeight, minHeight: rowHeight }}
                            >
                                {columnIds.map(colId => (
                                    <div
                                        key={`${rowKey}-${colId}`}
                                        className={`${COMPACT_TD_CLASS} shrink-0 overflow-hidden`}
                                        style={{
                                            width: getColumnWidth(colId, columnWidths),
                                            minWidth: getColumnWidth(colId, columnWidths),
                                        }}
                                    >
                                        {renderCell(colId, rowKey, rowIndex)}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
