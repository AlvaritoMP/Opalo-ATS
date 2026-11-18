import React, { useEffect, useState } from 'react';
import { useAppState } from '../App';
import { shortlistsApi, ShortlistSchemaError } from '../lib/api/shortlists';
import { shortlistColumnLabel } from '../lib/shortlists';
import { toUuidOrNull } from '../lib/uuid';
import type { Shortlist, ShortlistMember } from '../types';

export interface PresentableCandidate {
    id: string;
    name: string;
    processId: string;
    stageId?: string;
    processTitle?: string;
    processClientId?: string;
    processClientLabel?: string;
}

interface PresentToShortlistModalProps {
    candidates: PresentableCandidate[];
    onClose: () => void;
}

export const PresentToShortlistModal: React.FC<PresentToShortlistModalProps> = ({ candidates, onClose }) => {
    const { state, actions } = useAppState();
    const [rooms, setRooms] = useState<Shortlist[]>([]);
    const [memberships, setMemberships] = useState<Pick<ShortlistMember, 'shortlistId' | 'column' | 'status'>[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const single = candidates.length === 1 ? candidates[0] : null;
    const process = single ? state.processes.find(item => item.id === single.processId) : undefined;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await shortlistsApi.list();
                const current = single ? await shortlistsApi.membershipsForCandidate(single.id) : [];
                if (cancelled) return;
                const open = list.filter(room => room.status === 'open');
                setRooms(open);
                setMemberships(current);
                setSelectedId(open[0]?.id || '');
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar las salas.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [single?.id]);

    const selected = rooms.find(room => room.id === selectedId);
    const current = single ? memberships.find(item => item.shortlistId === selectedId) : undefined;
    const resolvedClientId = single?.processClientId || process?.clientId;
    const resolvedClientLabel = single?.processClientLabel || process?.client?.razonSocial;
    const mismatch = Boolean(selected?.clientId && resolvedClientId && selected.clientId !== resolvedClientId);

    const present = async () => {
        if (!selected || candidates.length === 0) return;
        setSaving(true);
        setError('');
        const actor = {
            actorType: 'staff' as const,
            actorName: state.currentUser?.name || 'Equipo ATS',
            actorUserId: toUuidOrNull(state.currentUser?.id) || undefined,
        };
        let added = 0;
        let skipped = 0;
        try {
            for (const candidate of candidates) {
                const source = state.processes.find(item => item.id === candidate.processId);
                try {
                    await shortlistsApi.addMember({
                        shortlistId: selected.id,
                        candidateId: candidate.id,
                        candidateName: candidate.name,
                        sourceProcessId: candidate.processId,
                        sourceProcessTitle: candidate.processTitle || source?.title || 'Proceso',
                        sourceStageId: candidate.stageId,
                        sourceStageName: source?.stages.find(stage => stage.id === candidate.stageId)?.name,
                        sourceClientId: candidate.processClientId || source?.clientId,
                        sourceClientLabel: candidate.processClientLabel || source?.client?.razonSocial,
                        actor,
                    });
                    added += 1;
                } catch (err) {
                    const message = err instanceof Error ? err.message : '';
                    if (message.includes('ya está en la sala')) {
                        skipped += 1;
                        continue;
                    }
                    throw err;
                }
            }
            const who = added === 1 && candidates.length === 1 ? candidates[0].name : `${added} candidato${added === 1 ? '' : 's'}`;
            const extra = skipped > 0 ? ` ${skipped} ya estaba${skipped === 1 ? '' : 'n'} en la sala.` : '';
            actions.showToast(`${who} quedó en Presentación de «${selected.title}».${extra} La etapa en el proceso no cambió.`, 'success', 5000);
            onClose();
        } catch (err) {
            setError(err instanceof ShortlistSchemaError || err instanceof Error ? err.message : 'No se pudo presentar.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={event => event.stopPropagation()}>
                <header className="px-5 py-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">Presentar en shortlist</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {single
                            ? `${single.name} entra a la sala en Presentación. Su registro en el proceso queda igual.`
                            : `${candidates.length} candidatos entran a la sala en Presentación. Su registro en el proceso queda igual.`}
                    </p>
                </header>
                <div className="px-5 py-4 space-y-3">
                    {loading && <p className="text-sm text-gray-500">Cargando salas abiertas…</p>}
                    {!loading && rooms.length === 0 && (
                        <p className="text-sm text-gray-600">No hay salas abiertas. Créelas en la sección Shortlists.</p>
                    )}
                    {rooms.map(room => {
                        const place = single ? memberships.find(item => item.shortlistId === room.id) : undefined;
                        return (
                            <label key={room.id} className={`block border rounded-xl px-3 py-3 cursor-pointer ${selectedId === room.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                                <span className="flex items-start gap-3">
                                    <input
                                        type="radio"
                                        name="shortlist"
                                        checked={selectedId === room.id}
                                        onChange={() => setSelectedId(room.id)}
                                        className="mt-1"
                                    />
                                    <span>
                                        <span className="block text-sm font-medium text-gray-900">{room.title}</span>
                                        <span className="block text-xs text-gray-500">{room.clientLabel || 'Sin cliente del catálogo'} · DNI {room.accessDni}</span>
                                        {place?.status === 'active' && (
                                            <span className="block text-xs text-primary-700 mt-1">Ya está en {shortlistColumnLabel(place.column)}</span>
                                        )}
                                        {place?.status === 'rejected' && (
                                            <span className="block text-xs text-amber-700 mt-1">Fue rechazado en esta sala. Presentarlo de nuevo lo devuelve a Presentación.</span>
                                        )}
                                    </span>
                                </span>
                            </label>
                        );
                    })}
                    {mismatch && selected && (
                        <p className="text-sm bg-amber-50 text-amber-900 rounded-lg px-3 py-2">
                            Este proceso pertenece a {resolvedClientLabel || 'otro cliente'} y la sala es de {selected.clientLabel || 'otro cliente'}.
                        </p>
                    )}
                    {error && <p className="text-sm text-red-700">{error}</p>}
                </div>
                <footer className="px-5 py-4 border-t flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-3 py-2 text-sm rounded-lg border border-gray-300">Cancelar</button>
                    <button
                        type="button"
                        onClick={() => { void present(); }}
                        disabled={!selected || saving || candidates.length === 0 || current?.status === 'active'}
                        className="px-3 py-2 text-sm rounded-lg bg-primary-600 text-white disabled:opacity-40"
                    >
                        {saving ? 'Presentando…' : 'Presentar'}
                    </button>
                </footer>
            </div>
        </div>
    );
};
