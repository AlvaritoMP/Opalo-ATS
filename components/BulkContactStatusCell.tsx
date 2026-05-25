import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Phone, MessageCircle, Loader2, Clock, ChevronDown, X, Undo2 } from 'lucide-react';
import { contactTrackingApi, parseUndoFromAttemptNotes } from '../lib/api/contactTracking';
import type { ContactAttempt, ContactOutcome, ContactStatus } from '../lib/contactTracking';
import {
    CONTACT_STATUS_META,
    QUICK_STATUS_OPTIONS,
    getContactBadgeLabel,
    isContactCooldownActive,
    formatContactCooldownWarning,
    formatAttemptHistoryLine,
    CONTACT_OUTCOME_LABELS,
} from '../lib/contactTracking';

export interface BulkContactStatusCellProps {
    candidateId: string;
    candidateName?: string;
    processId: string;
    phone?: string;
    status: ContactStatus;
    attemptCount: number;
    lastAttemptAt?: string;
    lastUserName?: string;
    userId?: string;
    userName?: string;
    onSummaryChange: (
        summary: {
            status: ContactStatus;
            attemptCount: number;
            lastAttemptAt?: string;
            lastUserName?: string;
        },
        actionType: 'contact_attempt' | 'contact_status'
    ) => void;
    onWhatsApp?: () => void;
    disabled?: boolean;
}

type PopoverMode = 'status' | 'history' | null;

const POPOVER_WIDTH = 288;
const POPOVER_MAX_HEIGHT = 420;

const CALL_OUTCOMES: { outcome: ContactOutcome; label: string }[] = [
    { outcome: 'no_answer', label: 'No contestó' },
    { outcome: 'busy', label: 'Ocupado' },
    { outcome: 'answered', label: 'Contestó' },
];

function computePopoverPosition(anchorRect: DOMRect, preferHeight: number) {
    const margin = 8;
    const maxH = Math.min(POPOVER_MAX_HEIGHT, window.innerHeight - margin * 2);
    const height = Math.min(preferHeight, maxH);

    let left = anchorRect.left;
    if (left + POPOVER_WIDTH > window.innerWidth - margin) {
        left = window.innerWidth - POPOVER_WIDTH - margin;
    }
    left = Math.max(margin, left);

    const spaceBelow = window.innerHeight - anchorRect.bottom - margin;
    const spaceAbove = anchorRect.top - margin;
    const openUp = spaceBelow < height && spaceAbove > spaceBelow;

    let top = openUp ? anchorRect.top - height - 4 : anchorRect.bottom + 4;
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));

    return { left, top, maxHeight: maxH };
}

export const BulkContactStatusCell: React.FC<BulkContactStatusCellProps> = ({
    candidateId,
    processId,
    phone,
    status,
    attemptCount,
    lastAttemptAt,
    lastUserName,
    userId,
    userName,
    onSummaryChange,
    onWhatsApp,
    disabled = false,
}) => {
    const [popover, setPopover] = useState<PopoverMode>(null);
    const [popoverPos, setPopoverPos] = useState({ left: 0, top: 0, maxHeight: POPOVER_MAX_HEIGHT });
    const [history, setHistory] = useState<ContactAttempt[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [canUndo, setCanUndo] = useState(false);
    const [undoPreview, setUndoPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const badgeRef = useRef<HTMLButtonElement>(null);

    const closePopover = useCallback(() => setPopover(null), []);

    const cooldown = isContactCooldownActive(lastAttemptAt);
    const meta = CONTACT_STATUS_META[status];
    const badgeLabel = getContactBadgeLabel(status, attemptCount);

    const openPopover = useCallback((mode: PopoverMode, el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        setPopoverPos(computePopoverPosition(rect, mode === 'status' ? 380 : 320));
        setPopover(mode);
    }, []);

    const toggleStatusPopover = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            if (popover === 'status') {
                closePopover();
                return;
            }
            openPopover('status', e.currentTarget);
        },
        [popover, closePopover, openPopover]
    );

    useEffect(() => {
        if (!popover) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closePopover();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [popover, closePopover]);

    useEffect(() => {
        if (!popover) return;

        const closeOnOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (rootRef.current?.contains(target)) return;
            const pop = document.getElementById(`contact-popover-${candidateId}`);
            if (pop?.contains(target)) return;
            closePopover();
        };

        document.addEventListener('mousedown', closeOnOutside);
        return () => document.removeEventListener('mousedown', closeOnOutside);
    }, [popover, candidateId, closePopover]);

    useLayoutEffect(() => {
        if (!popover || !badgeRef.current) return;
        const rect = badgeRef.current.getBoundingClientRect();
        setPopoverPos(computePopoverPosition(rect, popover === 'status' ? 380 : 320));
    }, [popover]);

    useEffect(() => {
        if (!popover) return;
        let cancelled = false;
        setLoadingHistory(true);
        contactTrackingApi
            .getHistory(candidateId, popover === 'history' ? 25 : 1)
            .then((rows) => {
                if (cancelled) return;
                setHistory(rows);
                const latest = rows[0];
                if (!latest) {
                    setCanUndo(false);
                    setUndoPreview(null);
                    return;
                }
                const snap = parseUndoFromAttemptNotes(latest.notes, latest.attemptNumber);
                if (snap) {
                    setCanUndo(true);
                    setUndoPreview(
                        `${CONTACT_STATUS_META[snap.statusBefore].label} · ${snap.attemptCountBefore} intento(s)`
                    );
                } else {
                    setCanUndo(true);
                    setUndoPreview('Estado anterior (según historial)');
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setHistory([]);
                    setCanUndo(false);
                }
            })
            .finally(() => {
                if (!cancelled) setLoadingHistory(false);
            });
        return () => {
            cancelled = true;
        };
    }, [popover, candidateId]);

    const applySummary = useCallback(
        (
            summary: Awaited<ReturnType<typeof contactTrackingApi.recordAttempt>>,
            actionType: 'contact_attempt' | 'contact_status'
        ) => {
            if (!summary) return;
            onSummaryChange(
                {
                    status: summary.status,
                    attemptCount: summary.attemptCount,
                    lastAttemptAt: summary.lastAttemptAt,
                    lastUserName: summary.lastUserName,
                },
                actionType
            );
        },
        [onSummaryChange]
    );

    const handleMarkCall = async (outcome: ContactOutcome) => {
        if (disabled || saving) return;
        setSaving(true);
        try {
            const summary = await contactTrackingApi.recordAttempt({
                candidateId,
                processId,
                channel: 'call',
                outcome,
                userId,
                userName,
            });
            applySummary(summary, 'contact_attempt');
            closePopover();
        } finally {
            setSaving(false);
        }
    };

    const handleSetStatus = async (newStatus: ContactStatus) => {
        if (disabled || saving || newStatus === status) return;
        setSaving(true);
        try {
            const summary = await contactTrackingApi.setStatus({
                candidateId,
                processId,
                status: newStatus,
                userId,
                userName,
            });
            applySummary(summary, 'contact_status');
            closePopover();
        } finally {
            setSaving(false);
        }
    };

    const handleUndo = async () => {
        if (disabled || saving || !canUndo) return;
        setSaving(true);
        try {
            const summary = await contactTrackingApi.revertLastAction({
                candidateId,
                processId,
                userId,
                userName,
            });
            applySummary(summary, 'contact_status');
            closePopover();
        } finally {
            setSaving(false);
        }
    };

    const popoverContent =
        popover &&
        createPortal(
            <>
                <button
                    type="button"
                    className="fixed inset-0 z-[100] cursor-default bg-black/10"
                    aria-label="Cerrar menú de contacto"
                    onClick={closePopover}
                />
                <div
                    id={`contact-popover-${candidateId}`}
                    role="dialog"
                    aria-modal="true"
                    aria-label={popover === 'status' ? 'Estado de contacto' : 'Historial de contacto'}
                    className="fixed z-[110] flex flex-col bg-white border border-gray-200 rounded-lg shadow-2xl"
                    style={{
                        left: popoverPos.left,
                        top: popoverPos.top,
                        width: POPOVER_WIDTH,
                        maxHeight: popoverPos.maxHeight,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between shrink-0 px-2 py-1.5 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                        <span className="text-[10px] uppercase tracking-wide text-gray-600 font-semibold">
                            {popover === 'status' ? 'Estado de contacto' : 'Historial'}
                        </span>
                        <button
                            type="button"
                            onClick={closePopover}
                            className="p-1 rounded hover:bg-gray-200 text-gray-600"
                            title="Cerrar (Esc)"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div
                        className="overflow-y-auto overflow-x-hidden overscroll-contain flex-1 min-h-0 p-2"
                        style={{ WebkitOverflowScrolling: 'touch' }}
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {popover === 'status' && (
                            <>
                                {cooldown && lastAttemptAt && (
                                    <p className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 mb-2">
                                        {formatContactCooldownWarning(lastAttemptAt, lastUserName)}
                                    </p>
                                )}

                                {canUndo && (
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() => void handleUndo()}
                                        className="w-full flex items-center gap-2 px-3 py-2 mb-2 rounded-lg text-sm font-medium border border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100"
                                    >
                                        <Undo2 className="w-4 h-4 shrink-0" />
                                        <span className="text-left">
                                            Deshacer última acción
                                            {undoPreview && (
                                                <span className="block text-[10px] font-normal text-violet-700">
                                                    Volver a: {undoPreview}
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                )}

                                <div className="flex flex-col gap-1">
                                    {QUICK_STATUS_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.status}
                                            type="button"
                                            disabled={saving}
                                            onClick={() => void handleSetStatus(opt.status)}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                                                status === opt.status
                                                    ? 'bg-primary-50 border-primary-300 text-primary-900'
                                                    : 'border-gray-200 hover:bg-gray-50 text-gray-800'
                                            }`}
                                        >
                                            <span className="mr-1.5">{CONTACT_STATUS_META[opt.status].dot}</span>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>

                                <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-3 mb-1.5 px-1">
                                    Resultado de llamada
                                </p>
                                <div className="flex flex-col gap-1 pb-1">
                                    {CALL_OUTCOMES.map((o) => (
                                        <button
                                            key={o.outcome}
                                            type="button"
                                            disabled={saving}
                                            onClick={() => void handleMarkCall(o.outcome)}
                                            className="w-full text-left px-3 py-2 rounded-lg text-sm border border-gray-200 hover:bg-amber-50 text-gray-800"
                                        >
                                            📞 {o.label}
                                            {o.outcome === 'no_answer' && (
                                                <span className="text-[10px] text-gray-500 block">
                                                    +1 intento automático
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={closePopover}
                                    className="w-full mt-2 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                                >
                                    Cerrar sin cambios
                                </button>
                            </>
                        )}

                        {popover === 'history' && (
                            <>
                                {loadingHistory ? (
                                    <div className="flex justify-center py-6">
                                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                    </div>
                                ) : history.length === 0 ? (
                                    <p className="text-xs text-gray-500 px-2 py-4">Sin intentos registrados.</p>
                                ) : (
                                    <ul className="space-y-2 pr-1">
                                        {history.map((a) => (
                                            <li
                                                key={a.id}
                                                className="text-[11px] text-gray-700 leading-snug border-l-2 border-gray-200 pl-2"
                                            >
                                                {formatAttemptHistoryLine(a)}
                                                {a.outcome === 'status_change' && a.notes && (
                                                    <span className="block text-gray-500">
                                                        {a.notes.includes('{')
                                                            ? 'Cambio de estado'
                                                            : a.notes}
                                                    </span>
                                                )}
                                                {!['status_change'].includes(a.outcome) && (
                                                    <span className="block text-gray-400">
                                                        {CONTACT_OUTCOME_LABELS[a.outcome]}
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <button
                                    type="button"
                                    onClick={closePopover}
                                    className="w-full mt-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                                >
                                    Cerrar
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </>,
            document.body
        );

    return (
        <div
            ref={rootRef}
            className={`flex items-center gap-0.5 min-w-0 ${cooldown ? 'ring-1 ring-red-300 rounded-md px-0.5' : ''}`}
            onClick={(e) => e.stopPropagation()}
            title={
                cooldown && lastAttemptAt
                    ? formatContactCooldownWarning(lastAttemptAt, lastUserName)
                    : undefined
            }
        >
            <button
                ref={badgeRef}
                type="button"
                disabled={disabled || saving}
                onClick={toggleStatusPopover}
                className={`inline-flex items-center gap-0.5 max-w-full px-1 py-0.5 rounded border text-[10px] font-semibold leading-tight truncate ${meta.badgeClass} hover:opacity-90 transition-opacity`}
                aria-expanded={popover === 'status'}
            >
                <span className="shrink-0">{meta.dot}</span>
                <span className="truncate">{badgeLabel}</span>
                <ChevronDown className={`w-2.5 h-2.5 shrink-0 opacity-60 transition-transform ${popover === 'status' ? 'rotate-180' : ''}`} />
            </button>

            {attemptCount > 0 && (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (popover === 'history') {
                            closePopover();
                        } else {
                            openPopover('history', e.currentTarget);
                        }
                    }}
                    className="inline-flex items-center gap-0.5 px-0.5 text-[10px] text-gray-600 hover:text-primary-700 hover:bg-gray-50 rounded"
                    title={
                        lastUserName
                            ? `Intento ${attemptCount} (por ${lastUserName}) — ver historial`
                            : `Intento ${attemptCount} — ver historial`
                    }
                >
                    <Phone className="w-3 h-3" />
                    <span className="font-bold tabular-nums">{attemptCount}</span>
                </button>
            )}

            {phone && (
                <button
                    type="button"
                    disabled={disabled || saving}
                    onClick={(e) => {
                        e.stopPropagation();
                        void handleMarkCall('no_answer');
                    }}
                    className="p-0.5 text-blue-600 hover:bg-blue-50 rounded"
                    title="Registrar llamada (no contestó)"
                >
                    {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Phone className="w-3.5 h-3.5" />
                    )}
                </button>
            )}

            {phone && onWhatsApp && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onWhatsApp();
                    }}
                    className="p-0.5 text-green-600 hover:bg-green-50 rounded"
                    title="WhatsApp"
                >
                    <MessageCircle className="w-3.5 h-3.5" />
                </button>
            )}

            {cooldown && <Clock className="w-3 h-3 text-red-500 shrink-0" aria-hidden />}

            {popoverContent}
        </div>
    );
};
