import React from 'react';
import { Plus, StickyNote, ImageIcon } from 'lucide-react';
import type { BulkInfoPin } from '../types';
import { bulkInfoPinHasImage, getBulkInfoPinStyle } from '../lib/bulkInfoPins';

interface BulkInfoPinsBarProps {
    pins: BulkInfoPin[];
    canEdit: boolean;
    activePinId?: string | null;
    onSelectPin: (pin: BulkInfoPin) => void;
    onAddPin: () => void;
}

export const BulkInfoPinsBar: React.FC<BulkInfoPinsBarProps> = ({
    pins,
    canEdit,
    activePinId,
    onSelectPin,
    onAddPin,
}) => {
    if (pins.length === 0 && !canEdit) return null;

    return (
        <div className="flex items-center gap-1 min-w-0 shrink-0">
            <div className="flex items-center gap-1 px-0.5 shrink-0">
                <StickyNote className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 select-none whitespace-nowrap">
                    Referencias
                </span>
            </div>
            <div className="flex flex-nowrap items-center gap-1 min-w-0">
                {pins.map(pin => {
                    const style = getBulkInfoPinStyle(pin.color);
                    const isActive = activePinId === pin.id;
                    const hasImage = bulkInfoPinHasImage(pin);
                    return (
                        <button
                            key={pin.id}
                            type="button"
                            onClick={() => onSelectPin(pin)}
                            className={`inline-flex items-center max-w-[150px] shrink-0 h-7 px-2 text-[11px] font-semibold border rounded-md transition-colors truncate ${style.button} ${
                                isActive ? 'ring-2 ring-primary-500 ring-offset-1' : ''
                            }`}
                            title={pin.title}
                            aria-pressed={isActive}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 mr-1.5 ${style.dot}`} />
                            {hasImage && (
                                <ImageIcon className="w-3 h-3 shrink-0 mr-1 opacity-70" aria-hidden />
                            )}
                            <span className="truncate">{pin.title}</span>
                        </button>
                    );
                })}
                {canEdit && (
                    <button
                        type="button"
                        onClick={onAddPin}
                        className="inline-flex items-center gap-1 h-7 px-2 text-[11px] font-medium text-gray-600 bg-white border border-dashed border-gray-300 rounded-md hover:border-primary-400 hover:text-primary-700 hover:bg-primary-50 transition-colors shrink-0"
                        title="Agregar referencia"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar
                    </button>
                )}
            </div>
        </div>
    );
};
