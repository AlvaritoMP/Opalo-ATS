import React, { useEffect, useMemo, useState } from 'react';
import { X, Send, Loader2, AlertTriangle } from 'lucide-react';
import { useAppState } from '../App';
import { candidatesApi } from '../lib/api/candidates';
import { workerHandoffApi } from '../lib/api/workerHandoff';
import { countSendableFieldsForCandidate } from '../lib/workerHandoffFields';
import type { Candidate } from '../types';

interface SendToOpsFlowModalProps {
    isOpen: boolean;
    onClose: () => void;
    candidates: Candidate[];
    onSent?: () => void;
}

function mergeCandidateData(fromApi: Candidate, fromUi: Candidate): Candidate {
    return {
        ...fromApi,
        bulkColumnValues: {
            ...(fromApi.bulkColumnValues || {}),
            ...(fromUi.bulkColumnValues || {}),
        },
        scoreIa: fromApi.scoreIa ?? fromUi.scoreIa,
        metadataIa: fromApi.metadataIa ?? fromUi.metadataIa,
        psycholaboralEvaluation: fromApi.psycholaboralEvaluation ?? fromUi.psycholaboralEvaluation,
        attachments:
            fromApi.attachments?.length ? fromApi.attachments : fromUi.attachments || fromApi.attachments,
    };
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
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [checkingDuplicates, setCheckingDuplicates] = useState(false);
    const [activeDuplicateIds, setActiveDuplicateIds] = useState<Set<string>>(new Set());
    const [ignoreDuplicates, setIgnoreDuplicates] = useState(false);
    const [resolvedCandidates, setResolvedCandidates] = useState<Candidate[]>([]);

    const inputCandidates = useMemo(() => {
        const byId = new Map<string, Candidate>();
        for (const candidate of candidates) {
            if (!byId.has(candidate.id)) byId.set(candidate.id, candidate);
        }
        return [...byId.values()];
    }, [candidates]);

    const uniqueCandidates = resolvedCandidates.length > 0 ? resolvedCandidates : inputCandidates;

    const processById = useMemo(
        () => new Map(state.processes.map(process => [process.id, process])),
        [state.processes]
    );

    const duplicateCandidates = useMemo(
        () => uniqueCandidates.filter(candidate => activeDuplicateIds.has(candidate.id)),
        [uniqueCandidates, activeDuplicateIds]
    );

    const fieldsPreview = useMemo(() => {
        if (uniqueCandidates.length === 0) {
            return { min: 0, max: 0, avg: 0 };
        }
        const counts = uniqueCandidates.map(candidate =>
            countSendableFieldsForCandidate(candidate, processById.get(candidate.processId))
        );
        const min = Math.min(...counts);
        const max = Math.max(...counts);
        const avg = Math.round(counts.reduce((sum, n) => sum + n, 0) / counts.length);
        return { min, max, avg };
    }, [uniqueCandidates, processById]);

    useEffect(() => {
        if (!isOpen) return;
        setSenderNote('');
        setIgnoreDuplicates(false);
        setActiveDuplicateIds(new Set());
        setResolvedCandidates([]);

        if (inputCandidates.length === 0) return;

        let cancelled = false;
        setLoadingCandidates(true);
        setCheckingDuplicates(true);

        (async () => {
            try {
                const loaded = await Promise.all(
                    inputCandidates.map(async fromUi => {
                        try {
                            const fromApi = await candidatesApi.getById(fromUi.id);
                            return fromApi ? mergeCandidateData(fromApi, fromUi) : fromUi;
                        } catch {
                            return fromUi;
                        }
                    })
                );
                if (!cancelled) setResolvedCandidates(loaded);

                const ids = await workerHandoffApi.getActiveCandidateIds(
                    inputCandidates.map(candidate => candidate.id)
                );
                if (!cancelled) setActiveDuplicateIds(new Set(ids));
            } catch (error) {
                console.error('Error preparando envío a OpsFlow:', error);
                if (!cancelled) setResolvedCandidates(inputCandidates);
            } finally {
                if (!cancelled) {
                    setLoadingCandidates(false);
                    setCheckingDuplicates(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isOpen, inputCandidates]);

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
                `Paquete enviado a OpsFlow (${uniqueCandidates.length} trabajador${uniqueCandidates.length === 1 ? '' : 'es'}, todos los campos disponibles)`,
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

    const preparing = loadingCandidates || checkingDuplicates;

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
                        Se enviarán{' '}
                        <span className="font-medium text-gray-900">{uniqueCandidates.length}</span>{' '}
                        trabajador{uniqueCandidates.length === 1 ? '' : 'es'} con{' '}
                        <span className="font-medium text-gray-900">todos los campos disponibles</span>{' '}
                        (identidad, datos del candidato, proceso, evaluación y columnas del proceso
                        masivo). OpsFlow decidirá cómo usarlos.
                    </p>

                    {preparing ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Cargando datos completos de los candidatos…
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500">
                            Campos con valor por trabajador:{' '}
                            {fieldsPreview.min === fieldsPreview.max
                                ? fieldsPreview.min
                                : `${fieldsPreview.min}–${fieldsPreview.max}`}
                            {uniqueCandidates.length > 1 ? ` (promedio ${fieldsPreview.avg})` : ''}.
                        </p>
                    )}

                    <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                        <ul className="divide-y divide-gray-100">
                            {uniqueCandidates.map(candidate => {
                                const fieldCount = preparing
                                    ? null
                                    : countSendableFieldsForCandidate(
                                          candidate,
                                          processById.get(candidate.processId)
                                      );
                                return (
                                    <li
                                        key={candidate.id}
                                        className="px-3 py-2 text-sm text-gray-800 flex items-center justify-between gap-2"
                                    >
                                        <span className="truncate">
                                            {candidate.name || candidate.dni || 'Sin nombre'}
                                        </span>
                                        {fieldCount != null && (
                                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                                {fieldCount} campos
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {!preparing && duplicateCandidates.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                            <div className="flex items-start gap-2 text-sm text-amber-900">
                                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium">
                                        {duplicateCandidates.length} candidato
                                        {duplicateCandidates.length === 1 ? '' : 's'} ya tiene envío
                                        activo en OpsFlow
                                    </p>
                                    <p className="text-amber-800 mt-1">
                                        {duplicateCandidates
                                            .slice(0, 5)
                                            .map(c => c.name || c.dni || c.id)
                                            .join(', ')}
                                        {duplicateCandidates.length > 5
                                            ? ` y ${duplicateCandidates.length - 5} más`
                                            : ''}
                                    </p>
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-amber-900 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={ignoreDuplicates}
                                    onChange={e => setIgnoreDuplicates(e.target.checked)}
                                    className="rounded border-amber-300 text-primary-600 focus:ring-primary-500"
                                />
                                Enviar de todos modos
                            </label>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nota para operaciones (opcional)
                        </label>
                        <textarea
                            value={senderNote}
                            onChange={e => setSenderNote(e.target.value)}
                            rows={3}
                            placeholder="Ej. Priorizar ingreso esta semana…"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            disabled={busy}
                        />
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSend()}
                        disabled={
                            busy ||
                            preparing ||
                            uniqueCandidates.length === 0 ||
                            (duplicateCandidates.length > 0 && !ignoreDuplicates)
                        }
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
                    >
                        {busy ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        Enviar a OpsFlow
                    </button>
                </div>
            </div>
        </div>
    );
};
