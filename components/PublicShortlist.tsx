import React, { useEffect, useState } from 'react';
import { ShortlistBoard } from './ShortlistBoard';
import { shortlistsApi } from '../lib/api/shortlists';
import { normalizeAccessDni, readPublicShortlistToken } from '../lib/shortlists';
import type { Shortlist, ShortlistColumnKey, ShortlistEvent, ShortlistMember } from '../types';

interface RoomState {
    shortlist: Shortlist;
    members: ShortlistMember[];
    events: ShortlistEvent[];
}

function sessionKey(token: string): string {
    return `shortlist-dni:${token}`;
}

export const PublicShortlist: React.FC = () => {
    const token = readPublicShortlistToken() || '';
    const [dni, setDni] = useState('');
    const [room, setRoom] = useState<RoomState | null>(null);
    const [gate, setGate] = useState<'form' | 'closed' | 'missing'>('form');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const enter = async (value: string) => {
        const digits = normalizeAccessDni(value);
        if (digits.length < 8) {
            setError('Ingrese el DNI completo.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const result = await shortlistsApi.openByToken(token, digits);
            if (result.ok === false) {
                if (result.reason === 'closed') setGate('closed');
                else if (result.reason === 'not_found') setGate('missing');
                else setError('El DNI no corresponde a esta sala.');
                return;
            }
            sessionStorage.setItem(sessionKey(token), digits);
            setRoom({ shortlist: result.shortlist, members: result.members, events: result.events });
            const seenKey = `shortlist-access:${token}`;
            if (!sessionStorage.getItem(seenKey)) {
                sessionStorage.setItem(seenKey, '1');
                void shortlistsApi.logAccess(result.shortlist.id).catch(() => undefined);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo abrir la sala.');
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        const stored = sessionStorage.getItem(sessionKey(token));
        if (stored) void enter(stored);
        // Solo al abrir el enlace.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const reload = async () => {
        const stored = sessionStorage.getItem(sessionKey(token));
        if (!stored) return;
        const result = await shortlistsApi.openByToken(token, stored);
        if (result.ok === false) {
            setRoom(null);
            setGate(result.reason === 'closed' ? 'closed' : 'missing');
            return;
        }
        setRoom({ shortlist: result.shortlist, members: result.members, events: result.events });
    };

    const run = async (action: () => Promise<void>) => {
        setBusy(true);
        setError('');
        try {
            await action();
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo guardar.');
        } finally {
            setBusy(false);
        }
    };

    if (gate === 'closed') {
        return (
            <Screen>
                <h1 className="text-xl font-semibold text-gray-900">Esta sala ya no está disponible</h1>
                <p className="text-sm text-gray-600 mt-2">El enlace se cerró. El equipo conserva el historial de lo que se decidió.</p>
            </Screen>
        );
    }

    if (gate === 'missing') {
        return (
            <Screen>
                <h1 className="text-xl font-semibold text-gray-900">Enlace no válido</h1>
                <p className="text-sm text-gray-600 mt-2">Pida al equipo el enlace actualizado de la presentación.</p>
            </Screen>
        );
    }

    if (!room) {
        return (
            <Screen>
                <h1 className="text-xl font-semibold text-gray-900">Presentación de candidatos</h1>
                <p className="text-sm text-gray-600 mt-2">Ingrese el DNI con el que se habilitó esta sala.</p>
                <form
                    className="mt-4 space-y-3"
                    onSubmit={event => {
                        event.preventDefault();
                        void enter(dni);
                    }}
                >
                    <input
                        value={dni}
                        onChange={event => setDni(event.target.value)}
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="DNI"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    {error && <p className="text-sm text-red-700">{error}</p>}
                    <button type="submit" disabled={busy} className="w-full px-3 py-2 rounded-lg bg-primary-600 text-white text-sm disabled:opacity-40">
                        {busy ? 'Entrando…' : 'Entrar'}
                    </button>
                </form>
            </Screen>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b px-4 py-4 md:px-8">
                <p className="text-xs uppercase tracking-wide text-gray-400">Shortlist</p>
                <h1 className="text-xl font-semibold text-gray-900">{room.shortlist.title}</h1>
                <p className="text-sm text-gray-500">{room.shortlist.clientLabel}</p>
            </header>
            <main className="px-4 py-4 md:px-8 md:py-6">
                {error && <p className="mb-3 text-sm text-red-700">{error}</p>}
                <ShortlistBoard
                    shortlist={room.shortlist}
                    members={room.members}
                    events={room.events}
                    mode="client"
                    busy={busy}
                    onMove={(memberId, column: ShortlistColumnKey) => {
                        void run(() => shortlistsApi.moveMember(memberId, column, { actorType: 'client', actorName: 'Cliente' }, 'client'));
                    }}
                    onReject={(memberId, reason) => {
                        void run(() => shortlistsApi.rejectMember(memberId, reason, { actorType: 'client', actorName: 'Cliente' }));
                    }}
                    onComment={(memberId, body) => {
                        void run(() => shortlistsApi.commentMember(memberId, body, { actorType: 'client', actorName: 'Cliente' }));
                    }}
                />
            </main>
        </div>
    );
};

const Screen: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm w-full max-w-md p-6">
            {children}
        </div>
    </div>
);
