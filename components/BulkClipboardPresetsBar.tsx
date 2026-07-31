import React from 'react';
import { Plus, ClipboardCopy, Pencil } from 'lucide-react';
import type { BulkClipboardFieldPreset } from '../types';
import { getBulkInfoPinStyle } from '../lib/bulkInfoPins';

interface BulkClipboardPresetsBarProps {
    presets: BulkClipboardFieldPreset[];
    canEdit: boolean;
    selectedCount: number;
    isCopyingId?: string | null;
    onCopyPreset: (preset: BulkClipboardFieldPreset) => void;
    onEditPreset: (preset: BulkClipboardFieldPreset) => void;
    onAddPreset: () => void;
}

export const BulkClipboardPresetsBar: React.FC<BulkClipboardPresetsBarProps> = ({
    presets,
    canEdit,
    selectedCount,
    isCopyingId,
    onCopyPreset,
    onEditPreset,
    onAddPreset,
}) => {
    if (presets.length === 0 && !canEdit) return null;

    return (
        <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5 px-0.5">
                <ClipboardCopy className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 select-none">
                    Copiar datos
                </span>
                {selectedCount > 0 && (
                    <span className="text-[10px] text-emerald-700 font-medium tabular-nums">
                        ({selectedCount} sel.)
                    </span>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                {presets.map(preset => {
                    const style = getBulkInfoPinStyle(preset.color);
                    const isCopying = isCopyingId === preset.id;
                    const disabled = isCopying || selectedCount === 0;
                    return (
                        <div key={preset.id} className="inline-flex items-center max-w-[220px]">
                            <button
                                type="button"
                                onClick={() => onCopyPreset(preset)}
                                disabled={disabled}
                                className={`inline-flex items-center flex-1 min-w-0 px-2.5 py-1 text-xs font-semibold border rounded-l-md shadow-sm transition-colors truncate ${style.button} ${
                                    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-95'
                                }`}
                                title={
                                    selectedCount === 0
                                        ? 'Selecciona uno o más candidatos con el checkbox'
                                        : `Copiar ${preset.columnIds.length} campo(s) de ${selectedCount} candidato(s)`
                                }
                            >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mr-1.5 ${style.dot}`} />
                                <span className="truncate">{preset.title}</span>
                            </button>
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={() => onEditPreset(preset)}
                                    className={`inline-flex items-center px-1.5 py-1 text-xs border border-l-0 rounded-r-md shadow-sm transition-colors ${style.button} hover:brightness-95`}
                                    title="Editar botón de copia"
                                >
                                    <Pencil className="w-3 h-3 opacity-70" />
                                </button>
                            )}
                        </div>
                    );
                })}
                {canEdit && (
                    <button
                        type="button"
                        onClick={onAddPreset}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-dashed border-gray-300 rounded-md hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors shrink-0"
                        title="Agregar botón de copia de datos"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar
                    </button>
                )}
            </div>
        </div>
    );
};
