import React, { useEffect, useMemo, useState } from 'react';
import { X, Save, Loader2, Trash2, ClipboardCopy } from 'lucide-react';
import type {
    BulkClipboardFieldPreset,
    BulkClipboardFieldSeparator,
    BulkInfoPinColor,
    CustomColumn,
} from '../types';
import {
    BULK_INFO_PIN_COLOR_OPTIONS,
    BULK_INFO_PIN_STYLES,
} from '../lib/bulkInfoPins';
import { getColumnLabel } from '../lib/bulkTableColumns';

interface BulkClipboardPresetModalProps {
    isOpen: boolean;
    preset: BulkClipboardFieldPreset | null;
    isNew?: boolean;
    isSaving?: boolean;
    columnOrder: string[];
    customColumns: CustomColumn[];
    onClose: () => void;
    onSave: (preset: BulkClipboardFieldPreset) => void;
    onDelete?: (presetId: string) => void;
}

const SEPARATOR_OPTIONS: { value: BulkClipboardFieldSeparator; label: string; hint: string }[] = [
    { value: 'tab', label: 'Tabulador', hint: 'Una línea por candidato (Excel / Sheets)' },
    { value: 'comma', label: 'Coma', hint: 'Nombre, teléfono, …' },
    { value: 'pipe', label: 'Barra |', hint: 'Nombre | teléfono | …' },
    { value: 'newline', label: 'Un campo por línea', hint: 'Bloques separados; útil en WhatsApp' },
];

export const BulkClipboardPresetModal: React.FC<BulkClipboardPresetModalProps> = ({
    isOpen,
    preset,
    isNew = false,
    isSaving = false,
    columnOrder,
    customColumns,
    onClose,
    onSave,
    onDelete,
}) => {
    const [draft, setDraft] = useState<BulkClipboardFieldPreset | null>(preset);

    useEffect(() => {
        if (isOpen && preset) {
            setDraft({
                ...preset,
                columnIds: [...(preset.columnIds ?? [])],
            });
        }
    }, [isOpen, preset]);

    const orderedAvailableColumns = useMemo(() => {
        const ids = columnOrder.length > 0 ? columnOrder : [];
        return ids.filter(id => id !== 'schedule' && id !== 'documents');
    }, [columnOrder]);

    if (!isOpen || !draft) return null;

    const selectedSet = new Set(draft.columnIds);
    const separator = draft.fieldSeparator ?? 'tab';

    const toggleColumn = (colId: string) => {
        setDraft(prev => {
            if (!prev) return prev;
            const has = prev.columnIds.includes(colId);
            const columnIds = has
                ? prev.columnIds.filter(id => id !== colId)
                : [...prev.columnIds, colId];
            return { ...prev, columnIds };
        });
    };

    const moveColumn = (colId: string, dir: -1 | 1) => {
        setDraft(prev => {
            if (!prev) return prev;
            const idx = prev.columnIds.indexOf(colId);
            if (idx < 0) return prev;
            const next = [...prev.columnIds];
            const target = idx + dir;
            if (target < 0 || target >= next.length) return prev;
            [next[idx], next[target]] = [next[target], next[idx]];
            return { ...prev, columnIds: next };
        });
    };

    const handleSave = () => {
        const title = draft.title.trim() || 'Copiar datos';
        if (draft.columnIds.length === 0) return;
        onSave({
            ...draft,
            title,
            columnIds: draft.columnIds,
            fieldSeparator: draft.fieldSeparator ?? 'tab',
            includeHeader: separator === 'newline' ? false : Boolean(draft.includeHeader),
        });
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col border border-gray-200">
                <div className="flex items-start justify-between gap-2 px-4 py-3 border-b">
                        <div className="flex items-center gap-2 min-w-0">
                        <ClipboardCopy className="w-5 h-5 shrink-0 text-emerald-600" />
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-gray-900 truncate">
                                {isNew ? 'Nuevo botón de copia' : 'Editar botón de copia'}
                            </h2>
                            <p className="text-xs text-gray-600 mt-0.5">
                                Al hacer clic se copian los campos elegidos de los candidatos marcados con checkbox.
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Título del botón</label>
                        <input
                            type="text"
                            value={draft.title}
                            onChange={e => setDraft(prev => (prev ? { ...prev, title: e.target.value } : prev))}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Ej. Nombre + teléfono"
                            maxLength={80}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Color</label>
                        <div className="flex flex-wrap gap-1.5">
                            {BULK_INFO_PIN_COLOR_OPTIONS.map(color => {
                                const opt = BULK_INFO_PIN_STYLES[color as BulkInfoPinColor];
                                const active = (draft.color ?? 'green') === color;
                                return (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setDraft(prev => (prev ? { ...prev, color } : prev))}
                                        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium border rounded-md ${opt.button} ${
                                            active ? 'ring-2 ring-offset-1 ring-emerald-500' : ''
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                            <label className="text-xs font-semibold text-gray-600">
                                Campos a copiar ({draft.columnIds.length})
                            </label>
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    className="text-[10px] text-emerald-700 hover:underline"
                                    onClick={() =>
                                        setDraft(prev =>
                                            prev
                                                ? {
                                                      ...prev,
                                                      columnIds: orderedAvailableColumns.filter(id =>
                                                          ['name', 'phone', 'email', 'dni'].includes(id)
                                                      ),
                                                  }
                                                : prev
                                        )
                                    }
                                >
                                    Contacto
                                </button>
                                <span className="text-gray-300">·</span>
                                <button
                                    type="button"
                                    className="text-[10px] text-emerald-700 hover:underline"
                                    onClick={() =>
                                        setDraft(prev =>
                                            prev ? { ...prev, columnIds: [...orderedAvailableColumns] } : prev
                                        )
                                    }
                                >
                                    Todas
                                </button>
                                <span className="text-gray-300">·</span>
                                <button
                                    type="button"
                                    className="text-[10px] text-gray-500 hover:underline"
                                    onClick={() =>
                                        setDraft(prev => (prev ? { ...prev, columnIds: [] } : prev))
                                    }
                                >
                                    Ninguna
                                </button>
                            </div>
                        </div>
                        <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                            {orderedAvailableColumns.map(colId => {
                                const checked = selectedSet.has(colId);
                                return (
                                    <label
                                        key={colId}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleColumn(colId)}
                                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span className="flex-1 truncate text-gray-800">
                                            {getColumnLabel(colId, customColumns)}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        {draft.columnIds.length > 0 && (
                            <div className="mt-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                                    Orden al copiar
                                </p>
                                <ul className="space-y-1">
                                    {draft.columnIds.map((colId, idx) => (
                                        <li
                                            key={colId}
                                            className="flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1"
                                        >
                                            <span className="flex-1 truncate text-gray-800">
                                                {getColumnLabel(colId, customColumns)}
                                            </span>
                                            <button
                                                type="button"
                                                disabled={idx === 0}
                                                onClick={() => moveColumn(colId, -1)}
                                                className="px-1.5 py-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                                                title="Subir"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                type="button"
                                                disabled={idx === draft.columnIds.length - 1}
                                                onClick={() => moveColumn(colId, 1)}
                                                className="px-1.5 py-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                                                title="Bajar"
                                            >
                                                ↓
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Formato</label>
                        <div className="space-y-1.5">
                            {SEPARATOR_OPTIONS.map(opt => (
                                <label
                                    key={opt.value}
                                    className={`flex items-start gap-2 px-3 py-2 border rounded-lg cursor-pointer ${
                                        separator === opt.value
                                            ? 'border-emerald-400 bg-emerald-50'
                                            : 'border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="clipboard-separator"
                                        checked={separator === opt.value}
                                        onChange={() =>
                                            setDraft(prev =>
                                                prev ? { ...prev, fieldSeparator: opt.value } : prev
                                            )
                                        }
                                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span>
                                        <span className="block text-sm font-medium text-gray-900">{opt.label}</span>
                                        <span className="block text-[11px] text-gray-500">{opt.hint}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                        {separator !== 'newline' && (
                            <label className="mt-2 flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={Boolean(draft.includeHeader)}
                                    onChange={e =>
                                        setDraft(prev =>
                                            prev ? { ...prev, includeHeader: e.target.checked } : prev
                                        )
                                    }
                                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                Incluir fila de encabezados
                            </label>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2 px-4 py-3 border-t bg-gray-50 rounded-b-xl">
                    {!isNew && onDelete ? (
                        <button
                            type="button"
                            onClick={() => onDelete(draft.id)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4" />
                            Eliminar
                        </button>
                    ) : (
                        <span />
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || draft.columnIds.length === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
