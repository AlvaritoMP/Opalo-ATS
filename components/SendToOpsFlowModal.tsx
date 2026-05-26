import React, { useEffect, useMemo, useState } from 'react';
import { X, Send, Loader2, AlertTriangle } from 'lucide-react';
import { useAppState } from '../App';
import { workerHandoffApi } from '../lib/api/workerHandoff';
import type { Candidate } from '../types';

interface SendToOpsFlowModalProps {
    isOpen: boolean;
    onClose: () => void;
    candidates: Candidate[];
    onSent?: () => void;
}

export const SendToOpsFlowModal: React.FC<SendToOpsFlowModalProps> = ({
    isOpen,
    onClose,
    candidates,
    onSent,
}) => {
    const { state, actions } = useAppState();
    const [senderNote, setSenderNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [checkingDuplicates, setCheckingDuplicates] = useState(false);
    const [activeDuplicateIds, setActiveDuplicateIds] = useState<Set<string>>(new Set());
    const [ignoreDuplicates, setIgnoreDuplicates] = useState(false);

    const uniqueCandidates = useMemo(() => {
        const byId = new Map<string, Candidate>();
        for (const candidate of candidates) {
            if (!byId.has(candidate.id)) byId.set(candidate.id, candidate);
        }
        return [...byId.values()];
    }, [candidates]);

    const duplicateCandidates = useMemo(
        () => uniqueCandidates.filter(candidate => activeDuplicateIds.has(candidate.id)),
        [uniqueCandidates, activeDuplicateIds]
    );

    useEffect(() => {
        if (!isOpen) return;
        setSenderNote('');
        setIgnoreDuplicates(false);
        setActiveDuplicateIds(new Set());

        if (uniqueCandidates.length === 0) return;

        let cancelled = false;
        setCheckingDuplicates(true);
        workerHandoffApi
            .getActiveCandidateIds(uniqueCandidates.map(candidate => candidate.id))
            .then(ids => {
                if (!cancelled) setActiveDuplicateIds(new Set(ids));
            })
            .catch(error => {
                console.error('Error verificando envíos activos:', error);
            })
            .finally(() => {
                if (!cancelled) setCheckingDuplicates(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, uniqueCandidates]);

    if (!isOpen) return null;

    const handleSend = async () => {
        if (uniqueCandidates.length === 0) {
            actions.showToast('No hay candidatos seleccionados', 'error', 3000);
            return;
        }

        if (duplicateCandidates.length > 0 && !ignoreDuplicates) {
            actions.showToast('Confirma el envío a pesar de los envíos activos', 'error', 3500);
            return;
        }

        setBusy(true);
        try {
            await workerHandoffApi.sendPackage({
                candidates: uniqueCandidates,
                processes: state.processes,
                senderNote: senderNote.trim() || undefined,
                createdBy: state.currentUser?.id,
                createdByName: state.currentUser?.name,
            });

            actions.showToast(
                `Paquete enviado a OpsFlow (${uniqueCandidates.length} trabajador${uniqueCandidates.length === 1 ? '' : 'es'})`,
                'success',
                4000
            );
            onSent?.();
            onClose();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'No se pudo enviar el paquete';
            actions.showToast(message, 'error', 5000);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-primary-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Enviar a OpsFlow</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="p-2 rounded-full hover:bg-gray-100"
                        aria-label="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto flex-1">
                    <p className="text-sm text-gray-600">
                        Se enviará un paquete con los datos disponibles en el ATS para{' '}
                        <span className="font-medium text-gray-900">{uniqueCandidates.length}</span>{' '}
                        trabajador{uniqueCandidates.length === 1 ? '' : 'es'}.
                    </p>

                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                        <ul className="divide-y divide-gray-100">
                            {uniqueCandidates.map(candidate => (
                                <li key={candidate.id} className="px-3 py-2 text-sm text-gray-800">
                                    {candidate.name || candidate.dni || 'Sin nombre'}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {checkingDuplicates && (
                        <p className="text-xs text-gray-500 flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Verificando envíos activos…
                        </p>
                    )}

                    {!checkingDuplicates && duplicateCandidates.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium">Envíos activos detectados</p>
                                    <ul className="mt-1 list-disc list-inside text-amber-800">
                                        {duplicateCandidates.map(candidate => (
                                            <li key={candidate.id}>{candidate.name}</li>
                                        ))}
                                    </ul>
                                    <label className="mt-2 flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={ignoreDuplicates}
                                            onChange={event => setIgnoreDuplicates(event.target.checked)}
                                            className="rounded border-amber-400"
                                        />
                                        <span>Enviar de todos modos</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="opsflow-sender-note" className="block text-sm font-medium text-gray-700 mb-1">
                            Nota para OpsFlow (opcional)
                        </label>
                        <textarea
                            id="opsflow-sender-note"
                            value={senderNote}
                            onChange={event => setSenderNote(event.target.value)}
                            rows={3}
                            placeholder="Ej: Ingresan el lunes, prioridad alta…"
                            className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm"
                        />
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={busy || uniqueCandidates.length === 0 || checkingDuplicates}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                    >
                        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
};
