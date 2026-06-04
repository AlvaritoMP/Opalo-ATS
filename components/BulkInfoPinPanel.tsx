import React from 'react';
import { X, Pencil, ImageIcon } from 'lucide-react';
import type { BulkInfoPin } from '../types';
import { bulkInfoPinHasImage, getBulkInfoPinStyle } from '../lib/bulkInfoPins';

interface BulkInfoPinPanelProps {
    pin: BulkInfoPin;
    canEdit: boolean;
    onClose: () => void;
    onEdit: () => void;
}

export const BulkInfoPinPanel: React.FC<BulkInfoPinPanelProps> = ({
    pin,
    canEdit,
    onClose,
    onEdit,
}) => {
    const style = getBulkInfoPinStyle(pin.color);
    const hasImage = bulkInfoPinHasImage(pin);
    const hasText = Boolean(pin.content?.trim());

    return (
        <div
            className="fixed bottom-4 right-4 z-40 flex flex-col w-[min(420px,calc(100vw-2rem))] max-h-[min(78vh,calc(100vh-6rem))] rounded-xl shadow-2xl border-2 pointer-events-auto"
            style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}
            role="dialog"
            aria-label={`Referencia: ${pin.title}`}
        >
            <div
                className={`flex items-center justify-between gap-2 px-3 py-2 border-b border-black/10 shrink-0 rounded-t-[10px] ${style.button}`}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                    <h3 className="text-sm font-bold truncate">{pin.title}</h3>
                    {hasImage && (
                        <ImageIcon className="w-3.5 h-3.5 shrink-0 opacity-60" aria-hidden />
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {canEdit && (
                        <button
                            type="button"
                            onClick={onEdit}
                            className="p-1.5 rounded-md hover:bg-black/10 transition-colors"
                            title="Editar referencia"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-md hover:bg-black/10 transition-colors"
                        title="Cerrar"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col bg-white/95 rounded-b-[10px] overflow-hidden">
                {hasImage && (
                    <div
                        className="shrink-0 border-b border-gray-200 bg-gray-50"
                        title="Desplázate horizontal y verticalmente para ver toda la imagen"
                    >
                        <p className="px-3 py-1 text-[10px] text-gray-500 select-none">
                            Desplaza ↓ y → para recorrer la imagen
                        </p>
                        <div className="overflow-auto max-h-[min(52vh,420px)] w-full touch-pan-x touch-pan-y">
                            <img
                                src={pin.imageDataUrl}
                                alt={pin.imageFileName || pin.title}
                                className="block max-w-none h-auto w-max min-w-full"
                                draggable={false}
                            />
                        </div>
                    </div>
                )}

                {hasText && (
                    <div
                        className={`overflow-y-auto px-3 py-3 text-sm whitespace-pre-wrap leading-relaxed text-gray-800 ${
                            hasImage ? 'max-h-[28vh]' : 'max-h-[min(70vh,560px)] flex-1'
                        }`}
                    >
                        {pin.content}
                    </div>
                )}

                {!hasImage && !hasText && (
                    <p className="px-3 py-4 text-sm italic text-gray-500">Sin contenido</p>
                )}
            </div>
        </div>
    );
};
