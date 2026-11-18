import React, { useEffect, useState } from 'react';
import { useAppState } from '../App';
import { ShortlistBoard } from './ShortlistBoard';
import { clientsApi } from '../lib/api/clients';
import { shortlistsApi, ShortlistSchemaError } from '../lib/api/shortlists';
import { buildPublicShortlistUrl, isValidAccessDni, normalizeAccessDni } from '../lib/shortlists';
import { setBulkSelectedProcessId } from '../lib/bulkTableColumns';
import { toUuidOrNull } from '../lib/uuid';
import type { Client, Shortlist, ShortlistActor, ShortlistColumnKey, ShortlistEvent, ShortlistMember } from '../types';

interface RoomState {
    shortlist: Shortlist;
    members: ShortlistMember[];
    events: ShortlistEvent[];
}

export const ShortlistsView: React.FC = () => {
    const { state, actions } = useAppState();
    const [rooms, setRooms] = useState<Shortlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(false);
    const [openId, setOpenId] = useState<string | null>(null);
    const [room, setRoom] = useState<RoomState | null>(null);
    const [busy, setBusy] = useState(false);

    const actor = (): ShortlistActor => ({
        actorType: 'staff',
        actorName: state.currentUser?.name || 'Equipo ATS',
        actorUserId: toUuidOrNull(state.currentUser?.id) || undefined,
    });

    const loadList = async () => {
        setLoading(true);
        setError('');
        try {
            setRooms(await shortlistsApi.list());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudieron cargar las salas.');
        } finally {
            setLoading(false);
        }
    };

    const loadRoom = async (id: string) => {
        const next = await shortlistsApi.getRoom(id);
        setRoom(next);
        setOpenId(id);
    };

    useEffect(() => {
        void loadList();
    }, []);

    const requestedId = typeof state.view.payload === 'string' ? state.view.payload : '';
    useEffect(() => {
        if (!requestedId) return;
        void loadRoom(requestedId).catch(err => setError(err instanceof Error ? err.message : 'No se pudo abrir la sala.'));
    }, [requestedId]);

    useEffect(() => {
        if (!openId) return;
        const timer = window.setInterval(() => {
            void shortlistsApi.getRoom(openId).then(setRoom).catch(() => undefined);
        }, 30000);
        return () => window.clearInterval(timer);
    }, [openId]);

    const run = async (action: () => Promise<void>) => {
        if (!openId) return;
        setBusy(true);
        setError('');
        try {
            await action();
            await loadRoom(openId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo guardar.');
        } finally {
            setBusy(false);
        }
    };

    const copyLink = async (token: string) => {
        const url = buildPublicShortlistUrl(token);
        try {
            await navigator.clipboard.writeText(url);
            actions.showToast('Enlace de la sala copiado', 'success', 2500);
        } catch {
            actions.showToast(url, 'info', 8000);
        }
    };

    const openProcess = (processId: string) => {
        const process = state.processes.find(item => item.id === processId);
        if (process?.isBulkProcess) {
            setBulkSelectedProcessId(processId);
            actions.setView('bulk-processes');
            return;
        }
        actions.setView('process-view', processId);
    };

    if (room && openId) {
        return (
            <div className="p-4 md:p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <button type="button" onClick={() => { setRoom(null); setOpenId(null); actions.setView('shortlists'); void loadList(); }} className="text-sm text-primary-700 hover:underline">
                            Volver a shortlists
                        </button>
                        <h1 className="text-2xl font-semibold text-gray-900 mt-1">{room.shortlist.title}</h1>
                        <p className="text-sm text-gray-500">
                            {room.shortlist.clientLabel || 'Sin cliente'} · acceso con DNI {room.shortlist.accessDni}
                            {room.shortlist.status === 'closed' ? ' · cerrada' : ' · abierta'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => { void copyLink(room.shortlist.token); }} className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white">
                            Copiar enlace
                        </button>
                        {room.shortlist.status === 'open' ? (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                    if (confirm('Al cerrar la sala el cliente ya no podrá entrar. El historial se conserva.')) {
                                        void run(() => shortlistsApi.close(room.shortlist.id, actor()));
                                    }
                                }}
                                className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white disabled:opacity-40"
                            >
                                Cerrar sala
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => { void run(() => shortlistsApi.reopen(room.shortlist.id, actor())); }}
                                className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white disabled:opacity-40"
                            >
                                Reabrir sala
                            </button>
                        )}
                    </div>
                </div>
                {room.shortlist.status === 'closed' && (
                    <p className="text-sm bg-gray-100 text-gray-700 rounded-lg px-3 py-2">Sala cerrada. El enlace ya no muestra candidatos. Este historial queda para el equipo.</p>
                )}
                {error && <p className="text-sm text-red-700">{error}</p>}
                <ShortlistBoard
                    shortlist={room.shortlist}
                    members={room.members}
                    events={room.events}
                    mode="staff"
                    busy={busy}
                    onMove={(memberId, column: ShortlistColumnKey) => { void run(() => shortlistsApi.moveMember(memberId, column, actor(), 'staff')); }}
                    onReject={(memberId, reason) => { void run(() => shortlistsApi.rejectMember(memberId, reason, actor())); }}
                    onComment={(memberId, body) => { void run(() => shortlistsApi.commentMember(memberId, body, actor())); }}
                    onCommentRoom={body => { void run(() => shortlistsApi.commentOnRoom(room.shortlist.id, body, actor())); }}
                    onProposeInterview={(memberId, proposal) => { void run(() => shortlistsApi.proposeInterview(memberId, proposal, actor())); }}
                    onConfirmAppointment={(memberId, appointment) => { void run(() => shortlistsApi.confirmAppointment(memberId, appointment, actor())); }}
                    onRemove={memberId => {
                        if (confirm('¿Quitar a esta persona de la sala? Su proceso de origen no cambia.')) {
                            void run(() => shortlistsApi.removeMember(memberId, actor()));
                        }
                    }}
                    onOpenProcess={openProcess}
                />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Shortlists</h1>
                    <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                        Arme una sala con tres pasos — Presentación, Entrevista y Finalista — y comparta el enlace. El cliente entra con su DNI. Presentar a alguien no cambia su etapa en el proceso.
                    </p>
                </div>
                <button type="button" onClick={() => setCreating(true)} className="px-3 py-2 text-sm rounded-lg bg-primary-600 text-white">
                    Nueva sala
                </button>
            </div>
            {error && <p className="text-sm text-red-700">{error}</p>}
            {loading && <p className="text-sm text-gray-500">Cargando salas…</p>}
            {!loading && rooms.length === 0 && !error && (
                <p className="text-sm text-gray-500">Todavía no hay salas. Cree una y luego, desde la ficha de un candidato, elija Presentar en shortlist.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {rooms.map(item => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => { void loadRoom(item.id).catch(err => setError(err instanceof Error ? err.message : 'No se pudo abrir la sala.')); }}
                        className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-300"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="font-medium text-gray-900">{item.title}</h2>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full ${item.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                {item.status === 'open' ? 'Abierta' : 'Cerrada'}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{item.clientLabel || 'Sin cliente'}</p>
                        <p className="text-xs text-gray-500 mt-2">
                            Presentación {item.counts.presentacion} · Entrevista {item.counts.entrevista} · Finalistas {item.counts.finalista} · Rechazados {item.counts.rejected}
                        </p>
                    </button>
                ))}
            </div>
            {creating && (
                <CreateShortlistModal
                    onClose={() => setCreating(false)}
                    onCreated={async roomCreated => {
                        setCreating(false);
                        await loadList();
                        await copyLink(roomCreated.token);
                        await loadRoom(roomCreated.id);
                    }}
                />
            )}
        </div>
    );
};

const CreateShortlistModal: React.FC<{
    onClose: () => void;
    onCreated: (room: Shortlist) => Promise<void>;
}> = ({ onClose, onCreated }) => {
    const { state } = useAppState();
    const [clients, setClients] = useState<Client[]>([]);
    const [title, setTitle] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientName, setClientName] = useState('');
    const [dni, setDni] = useState('');
    const [showDocuments, setShowDocuments] = useState(true);
    const [showAssessments, setShowAssessments] = useState(true);
    const [showProfile, setShowProfile] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        clientsApi.getAll().then(setClients).catch(err => {
            setError(err instanceof Error ? err.message : 'No se pudieron cargar los clientes.');
        });
    }, []);

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            if (!isValidAccessDni(dni)) throw new Error('El DNI de acceso debe tener al menos 8 dígitos.');
            const client = clients.find(item => item.id === clientId);
            const created = await shortlistsApi.create({
                title,
                clientId: clientId || undefined,
                clientLabel: clientName.trim() || client?.razonSocial,
                accessDni: normalizeAccessDni(dni),
                showDocuments,
                showAssessments,
                showProfile,
                actor: {
                    actorType: 'staff',
                    actorName: state.currentUser?.name || 'Equipo ATS',
                    actorUserId: toUuidOrNull(state.currentUser?.id) || undefined,
                },
            });
            await onCreated(created);
        } catch (err) {
            setError(err instanceof ShortlistSchemaError || err instanceof Error ? err.message : 'No se pudo crear la sala.');
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={event => event.stopPropagation()}>
                <header className="px-5 py-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">Nueva sala</h2>
                    <p className="text-sm text-gray-500 mt-1">El cliente entra con el enlace y este DNI. No necesita usuario del ATS.</p>
                </header>
                <div className="px-5 py-4 space-y-3">
                    <label className="block text-sm">
                        <span className="text-gray-700">Nombre</span>
                        <input value={title} onChange={event => setTitle(event.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Finalistas analista de crédito" />
                    </label>
                    <label className="block text-sm">
                        <span className="text-gray-700">Cliente del ATS, si ya existe</span>
                        <select
                            value={clientId}
                            onChange={event => {
                                const nextId = event.target.value;
                                setClientId(nextId);
                                const match = clients.find(item => item.id === nextId);
                                if (match && !clientName.trim()) setClientName(match.razonSocial);
                            }}
                            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                        >
                            <option value="">Sin cliente del catálogo</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.razonSocial}</option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-sm">
                        <span className="text-gray-700">Nombre del cliente o de la terna</span>
                        <input value={clientName} onChange={event => setClientName(event.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Opcional si el cliente no tiene proceso abierto" />
                    </label>
                    <label className="block text-sm">
                        <span className="text-gray-700">DNI de acceso</span>
                        <input value={dni} onChange={event => setDni(event.target.value)} inputMode="numeric" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Documento de quien revisa" />
                    </label>
                    <div className="text-sm text-gray-700 space-y-1">
                        <p className="font-medium">Qué puede ver</p>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={showProfile} onChange={event => setShowProfile(event.target.checked)} /> Ficha, contacto y expectativa</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={showDocuments} onChange={event => setShowDocuments(event.target.checked)} /> Documentos</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={showAssessments} onChange={event => setShowAssessments(event.target.checked)} /> Pruebas e informe</label>
                    </div>
                    {error && <p className="text-sm text-red-700">{error}</p>}
                </div>
                <footer className="px-5 py-4 border-t flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-3 py-2 text-sm rounded-lg border border-gray-300">Cancelar</button>
                    <button type="button" disabled={saving} onClick={() => { void save(); }} className="px-3 py-2 text-sm rounded-lg bg-primary-600 text-white disabled:opacity-40">
                        {saving ? 'Creando…' : 'Crear sala'}
                    </button>
                </footer>
            </div>
        </div>
    );
};
