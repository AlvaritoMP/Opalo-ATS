import React, { useEffect, useState } from 'react';
import { X, Save, Loader2, Trash2, StickyNote } from 'lucide-react';
import type { BulkInfoPin } from '../types';
import {
    BULK_INFO_PIN_COLOR_OPTIONS,
    BULK_INFO_PIN_STYLES,
    getBulkInfoPinStyle,
} from '../lib/bulkInfoPins';

interface BulkInfoPinModalProps {
    isOpen: boolean;
    pin: BulkInfoPin | null;
    canEdit: boolean;
    isNew?: boolean;
    isSaving?: boolean;
    onClose: () => void;
    onSave: (pin: BulkInfoPin) => void;
    onDelete?: (pinId: string) => void;
}

export const BulkInfoPinModal: React.FC<BulkInfoPinModalProps> = ({
    isOpen,
    pin,
    canEdit,
    isNew = false,
    isSaving = false,
    onClose,
    onSave,
    onDelete,
}) => {
    const [draft, setDraft] = useState<BulkInfoPin | null>(pin);

    useEffect(() => {
        if (isOpen && pin) setDraft({ ...pin });
    }, [isOpen, pin]);

    if (!isOpen || !draft) return null;

    const style = getBulkInfoPinStyle(draft.color);

    const handleSave = () => {
        const title = draft.title.trim() || 'Sin título';
        onSave({ ...draft, title, content: draft.content });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div
                className={`rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col border-2 ${style.button}`}
            >
                <div className="flex items-start justify-between gap-3 p-4 border-b border-black/10 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <StickyNote className="w-5 h-5 shrink-0 opacity-70" />
                        <div className="min-w-0">
                            <h2 className="text-sm font-semibold opacity-80">
                                {isNew ? 'Nueva referencia' : canEdit ? 'Editar referencia' : 'Referencia'}
                            </h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-current/50 hover:text-current/80 transition-colors shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {canEdit ? (
                        <>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">
                                    Título del botón
                                </label>
                                <input
                                    type="text"
                                    value={draft.title}
                                    onChange={e => setDraft({ ...draft, title: e.target.value })}
                                    placeholder="Ej. Horarios, Contacto cliente, Tarifas..."
                                    className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-white/80 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                                    autoFocus
                                />
                            </div>

                            {canEdit && (
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">
                                        Color
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {BULK_INFO_PIN_COLOR_OPTIONS.map(color => {
                                            const colorStyle = BULK_INFO_PIN_STYLES[color];
                                            const selected = draft.color === color;
                                            return (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => setDraft({ ...draft, color })}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                                                        selected
                                                            ? `${colorStyle.button} ring-2 ring-offset-1 ring-primary-500`
                                                            : 'bg-white/70 border-black/10 text-gray-700 hover:bg-white'
                                                    }`}
                                                >
                                                    <span className={`w-2.5 h-2.5 rounded-full ${colorStyle.dot}`} />
                                                    {colorStyle.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">
                                    Contenido
                                </label>
                                <textarea
                                    value={draft.content}
                                    onChange={e => setDraft({ ...draft, content: e.target.value })}
                                    placeholder="Información que el equipo necesita tener a la mano..."
                                    rows={10}
                                    className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-white/80 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-y min-h-[160px] font-mono leading-relaxed"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 className="text-lg font-bold">{draft.title}</h3>
                            <div className="text-sm whitespace-pre-wrap leading-relaxed opacity-90">
                                {draft.content || (
                                    <span className="italic opacity-60">Sin contenido</span>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center justify-between gap-2 p-4 border-t border-black/10 shrink-0">
                    <div>
                        {canEdit && !isNew && onDelete && (
                            <button
                                type="button"
                                onClick={() => onDelete(draft.id)}
                                disabled={isSaving}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Eliminar
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white/80 border border-black/10 rounded-lg hover:bg-white transition-colors"
                        >
                            {canEdit ? 'Cancelar' : 'Cerrar'}
                        </button>
                        {canEdit && (
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Save className="w-3.5 h-3.5" />
                                )}
                                Guardar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
