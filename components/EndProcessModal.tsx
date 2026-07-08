import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Ban, Scissors, ArrowLeft, AlertCircle } from 'lucide-react';
import { Candidate, Process } from '../types';
import { CloseProcessModal } from './CloseProcessModal';

type EndOutcome = 'terminado' | 'cancelado' | 'trunco';

interface EndProcessModalProps {
    isOpen: boolean;
    onClose: () => void;
    process: Process | null;
    candidates: Candidate[];
    onCloseWithHires: (hiredCandidateIds: string[]) => Promise<void>;
    onCancelProcess: () => Promise<void>;
    onTruncateProcess: () => Promise<void>;
}

const OUTCOME_OPTIONS: {
    id: EndOutcome;
    title: string;
    description: string;
    icon: React.ElementType;
    colorClass: string;
}[] = [
    {
        id: 'terminado',
        title: 'Terminado',
        description: 'El proceso concluyó con candidatos contratados. Selecciona los finalistas.',
        icon: CheckCircle,
        colorClass: 'border-green-200 hover:border-green-400 hover:bg-green-50',
    },
    {
        id: 'cancelado',
        title: 'Cancelado',
        description: 'El proceso no continúa y no se facturará. No requiere candidatos contratados.',
        icon: Ban,
        colorClass: 'border-red-200 hover:border-red-400 hover:bg-red-50',
    },
    {
        id: 'trunco',
        title: 'Trunco',
        description: 'El proceso no continúa pero se facturará parcialmente. No requiere candidatos contratados.',
        icon: Scissors,
        colorClass: 'border-orange-200 hover:border-orange-400 hover:bg-orange-50',
    },
];

export const EndProcessModal: React.FC<EndProcessModalProps> = ({
    isOpen,
    onClose,
    process,
    candidates,
    onCloseWithHires,
    onCancelProcess,
    onTruncateProcess,
}) => {
    const [selectedOutcome, setSelectedOutcome] = useState<EndOutcome | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setSelectedOutcome(null);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    if (!isOpen || !process) return null;

    if (selectedOutcome === 'terminado') {
        return (
            <CloseProcessModal
                isOpen
                onClose={() => {
                    setSelectedOutcome(null);
                    onClose();
                }}
                onBack={() => setSelectedOutcome(null)}
                process={process}
                candidates={candidates}
                onCloseProcess={onCloseWithHires}
            />
        );
    }

    const handleConfirmOutcome = async () => {
        if (!selectedOutcome) return;
        setIsSubmitting(true);
        try {
            if (selectedOutcome === 'cancelado') {
                await onCancelProcess();
            } else if (selectedOutcome === 'trunco') {
                await onTruncateProcess();
            }
            setSelectedOutcome(null);
            onClose();
        } catch (error) {
            console.error('Error finalizando proceso:', error);
            const message = error instanceof Error
                ? error.message
                : (error as { message?: string })?.message || 'Error desconocido';
            alert(`Error al finalizar el proceso: ${message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Finalizar proceso</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Elige cómo concluir este proceso de selección
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        disabled={isSubmitting}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-3">
                    {OUTCOME_OPTIONS.map(option => {
                        const Icon = option.icon;
                        const isSelected = selectedOutcome === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setSelectedOutcome(option.id)}
                                className={`w-full text-left p-4 border-2 rounded-lg transition-all ${
                                    isSelected ? 'border-primary-500 bg-primary-50' : option.colorClass
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <Icon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                                        option.id === 'terminado' ? 'text-green-600' :
                                        option.id === 'cancelado' ? 'text-red-600' : 'text-orange-600'
                                    }`} />
                                    <div>
                                        <div className="font-semibold text-gray-900">{option.title}</div>
                                        <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}

                    {(selectedOutcome === 'cancelado' || selectedOutcome === 'trunco') && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-900">
                                    El proceso quedará sin acciones pendientes ni alertas hasta que vuelva a estado <strong>En Proceso</strong>.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cerrar
                    </button>
                    {(selectedOutcome === 'cancelado' || selectedOutcome === 'trunco') && (
                        <button
                            onClick={handleConfirmOutcome}
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting ? 'Guardando...' : `Confirmar ${selectedOutcome === 'cancelado' ? 'cancelación' : 'cierre trunco'}`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
