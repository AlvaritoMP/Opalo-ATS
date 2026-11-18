import React, { useEffect, useState } from 'react';
import { useAppState } from '../App';
import { shortlistsApi, ShortlistSchemaError } from '../lib/api/shortlists';
import { shortlistColumnLabel } from '../lib/shortlists';
import { toUuidOrNull } from '../lib/uuid';
import type { Shortlist, ShortlistMember } from '../types';

interface PresentToShortlistModalProps {
    candidateId: string;
    candidateName: string;
    processId: string;
    stageId?: string;
    processTitle?: string;
    processClientId?: string;
    processClientLabel?: string;
    onClose: () => void;
}

export const PresentToShortlistModal: React.FC<PresentToShortlistModalProps> = ({
    candidateId,
    candidateName,
    processId,
    stageId,
    processTitle,
    processClientId,
    processClientLabel,
    onClose,
}) => {
    const { state, actions } = useAppState();
    const [rooms, setRooms] = useState<Shortlist[]>([]);
    const [memberships, setMemberships] = useState<Pick<ShortlistMember, 'shortlistId' | 'column' | 'status'>[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const process = state.processes.find(item => item.id === processId);
    const stageName = process?.stages.find(stage => stage.id === stageId)?.name;
    const resolvedTitle = processTitle || process?.title || 'Proceso';
    const resolvedClientId = processClientId || process?.clientId;
    const resolvedClientLabel = processClientLabel || process?.client?.razonSocial;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [list, current] = await Promise.all([
                    shortlistsApi.list(),
                    shortlistsApi.membershipsForCandidate(candidateId),
                ]);
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
    }, [candidateId]);

    const selected = rooms.find(room => room.id === selectedId);
    const current = memberships.find(item => item.shortlistId === selectedId);
    const mismatch = Boolean(
        selected?.clientId && resolvedClientId && selected.clientId !== resolvedClientId
    );

    const present = async () => {
        if (!selected) return;
        setSaving(true);
        setError('');
        try {
            await shortlistsApi.addMember({
                shortlistId: selected.id,
                candidateId,
                candidateName,
                sourceProcessId: processId,
                sourceProcessTitle: resolvedTitle,
                sourceStageId: stageId,
                sourceStageName: stageName,
                sourceClientId: resolvedClientId,
                sourceClientLabel: resolvedClientLabel,
                actor: {
                    actorType: 'staff',
                    actorName: state.currentUser?.name || 'Equipo ATS',
                    actorUserId: toUuidOrNull(state.currentUser?.id) || undefined,
                },
            });
            actions.showToast(`${candidateName} quedó en Presentación de «${selected.title}». Su etapa en el proceso no cambió.`, 'success', 4500);
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
                        {candidateName} entra a la sala en Presentación. Su registro en {resolvedTitle} queda igual.
                    </p>
                </header>
                <div className="px-5 py-4 space-y-3">
                    {loading && <p className="text-sm text-gray-500">Cargando salas abiertas…</p>}
                    {!loading && rooms.length === 0 && (
                        <p className="text-sm text-gray-600">No hay salas abiertas. Créelas en la sección Shortlists.</p>
                    )}
                    {rooms.map(room => {
                        const place = memberships.find(item => item.shortlistId === room.id);
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
                                        <span className="block text-xs text-gray-500">{room.clientLabel || 'Sin cliente'} · DNI {room.accessDni}</span>
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
                        disabled={!selected || saving || current?.status === 'active'}
                        className="px-3 py-2 text-sm rounded-lg bg-primary-600 text-white disabled:opacity-40"
                    >
                        {saving ? 'Presentando…' : 'Presentar'}
                    </button>
                </footer>
            </div>
        </div>
    );
};
