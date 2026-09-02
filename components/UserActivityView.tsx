import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Activity,
    Clock,
    Filter,
    LogIn,
    RefreshCw,
    Search,
    Users,
} from 'lucide-react';
import { useAppState } from '../App';
import { userActivityApi, type UserActivityEvent } from '../lib/api/userActivity';
import {
    eventBelongsToUser,
    formatActivityDateTime,
    formatActivityRelative,
    formatActivityTime,
    RECENTLY_ACTIVE_MS,
    USER_ACTIVITY_CATEGORIES,
    USER_ACTIVITY_CATEGORY_LABELS,
    USER_ACTIVITY_CATEGORY_STYLES,
    type UserActivityCategory,
} from '../lib/userActivity';
import type { User } from '../types';

type PeriodKey = 'today' | '7d' | '30d';

interface UserActivitySummary {
    user: User;
    loginCount: number;
    lastLoginAt?: string;
    lastInteractionAt?: string;
    lastInteraction?: UserActivityEvent;
    lastCategory?: UserActivityCategory;
    eventCount: number;
    isActive: boolean;
}

function limaDateKey(iso: string): string {
    return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

function startOfTodayLimaIso(): string {
    const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    return `${todayKey}T00:00:00-05:00`;
}

function periodStartIso(period: PeriodKey): string {
    if (period === 'today') return startOfTodayLimaIso();
    const days = period === '7d' ? 7 : 30;
    const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
    const key = start.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    return `${key}T00:00:00-05:00`;
}

const PERIOD_LABELS: Record<PeriodKey, string> = {
    today: 'hoy',
    '7d': 'los últimos 7 días',
    '30d': 'los últimos 30 días',
};

function mergeEvents(primary: UserActivityEvent[], extra: UserActivityEvent[]): UserActivityEvent[] {
    const byId = new Map<string, UserActivityEvent>();
    for (const event of [...primary, ...extra]) byId.set(event.id, event);
    return [...byId.values()].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

function initials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p.charAt(0))
        .join('')
        .toUpperCase();
}

const CategoryBadge: React.FC<{ category: UserActivityCategory }> = ({ category }) => (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${USER_ACTIVITY_CATEGORY_STYLES[category]}`}>
        {USER_ACTIVITY_CATEGORY_LABELS[category]}
    </span>
);

export const UserActivityView: React.FC = () => {
    const { state } = useAppState();
    const isAdmin = state.currentUser?.role === 'admin';

    const [period, setPeriod] = useState<PeriodKey>('7d');
    const [events, setEvents] = useState<UserActivityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [available, setAvailable] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [userFilter, setUserFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<UserActivityCategory | ''>('');
    const [search, setSearch] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedHistory, setSelectedHistory] = useState<UserActivityEvent[] | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    const usersRef = useRef(state.users);
    usersRef.current = state.users;

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const ok = await userActivityApi.isAvailable();
            setAvailable(ok);
            if (!ok) {
                setEvents([]);
                return;
            }
            const sinceIso = periodStartIso(period);
            const data = await userActivityApi.getSince(sinceIso);
            const missing = usersRef.current.filter(user => !data.some(event => eventBelongsToUser(event, user)));
            if (missing.length === 0) {
                setEvents(data);
            } else {
                const extras = await userActivityApi.getLatestForUsers(
                    missing.map(user => ({ id: user.id, name: user.name })),
                    sinceIso,
                    80,
                );
                setEvents(mergeEvents(data, extras));
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            setLoadError(msg.includes('schema cache') || msg.includes('Could not find')
                ? 'Ejecute MIGRATION_ADD_USER_ACTIVITY_LOG.sql en Supabase para habilitar esta sección.'
                : 'No se pudo cargar la actividad de usuarios.');
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (!selectedUserId || !available) {
            setSelectedHistory(null);
            setHistoryLoading(false);
            return;
        }
        const user = usersRef.current.find(u => u.id === selectedUserId);
        if (!user) {
            setSelectedHistory(null);
            return;
        }
        let cancelled = false;
        setSelectedHistory(null);
        setHistoryLoading(true);
        void userActivityApi.getForUser({
            userId: user.id,
            userName: user.name,
            sinceIso: periodStartIso(period),
        }).then(rows => {
            if (cancelled) return;
            setSelectedHistory(rows);
            if (rows.length > 0) {
                setEvents(prev => mergeEvents(prev, rows));
            }
        }).catch(() => {
            if (!cancelled) setSelectedHistory([]);
        }).finally(() => {
            if (!cancelled) setHistoryLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [selectedUserId, period, available]);

    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            if (userFilter) {
                const filterUser = state.users.find(u => u.id === userFilter);
                if (filterUser ? !eventBelongsToUser(event, filterUser) : event.userId !== userFilter) return false;
            }
            if (categoryFilter && event.category !== categoryFilter) return false;
            return true;
        });
    }, [events, userFilter, categoryFilter, state.users]);

    const summaries = useMemo<UserActivitySummary[]>(() => {
        const now = Date.now();
        return state.users
            .map(user => {
                const userEvents = events.filter(e => eventBelongsToUser(e, user));
                const logins = userEvents.filter(e => e.category === 'session' && e.action === 'login');
                const lastLogin = logins[0];
                const lastInteraction = userEvents.find(e => !(e.category === 'session' && e.action === 'login')) || userEvents[0];
                const lastAt = lastInteraction?.createdAt;
                return {
                    user,
                    loginCount: logins.length,
                    lastLoginAt: lastLogin?.createdAt,
                    lastInteractionAt: lastAt,
                    lastInteraction,
                    lastCategory: lastInteraction?.category,
                    eventCount: userEvents.length,
                    isActive: !!lastAt && now - new Date(lastAt).getTime() < RECENTLY_ACTIVE_MS,
                };
            })
            .filter(row => {
                if (search.trim()) {
                    const q = search.trim().toLowerCase();
                    if (!row.user.name.toLowerCase().includes(q) && !row.user.email.toLowerCase().includes(q)) {
                        return false;
                    }
                }
                if (userFilter && row.user.id !== userFilter) return false;
                return true;
            })
            .sort((a, b) => {
                const aTime = a.lastInteractionAt ? new Date(a.lastInteractionAt).getTime() : 0;
                const bTime = b.lastInteractionAt ? new Date(b.lastInteractionAt).getTime() : 0;
                return bTime - aTime;
            });
    }, [state.users, events, search, userFilter]);

    const selectedUser = state.users.find(u => u.id === selectedUserId);

    const selectedEvents = useMemo(() => {
        const applyCategory = (rows: UserActivityEvent[]) => (
            categoryFilter ? rows.filter(e => e.category === categoryFilter) : rows
        );
        if (!selectedUserId) return filteredEvents;
        if (selectedHistory) return applyCategory(selectedHistory);
        if (!selectedUser) return [];
        return applyCategory(events.filter(e => eventBelongsToUser(e, selectedUser)));
    }, [filteredEvents, selectedUserId, selectedUser, selectedHistory, categoryFilter, events]);

    const groupedTimeline = useMemo(() => {
        const groups: { key: string; label: string; items: UserActivityEvent[] }[] = [];
        const byDay = new Map<string, UserActivityEvent[]>();
        for (const event of selectedEvents) {
            const key = limaDateKey(event.createdAt);
            if (!byDay.has(key)) byDay.set(key, []);
            byDay.get(key)!.push(event);
        }
        const todayKey = limaDateKey(new Date().toISOString());
        for (const [key, items] of byDay) {
            const label = key === todayKey
                ? 'Hoy'
                : new Date(`${key}T12:00:00-05:00`).toLocaleDateString('es-PE', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                });
            groups.push({ key, label, items });
        }
        return groups;
    }, [selectedEvents]);

    const stats = useMemo(() => {
        const logins = filteredEvents.filter(e => e.category === 'session' && e.action === 'login');
        const uniqueLogins = new Set(logins.map(e => e.userId || e.userName)).size;
        const activeNow = summaries.filter(s => s.isActive).length;
        const categoryCounts = USER_ACTIVITY_CATEGORIES.map(category => ({
            category,
            count: filteredEvents.filter(e => e.category === category).length,
        })).filter(row => row.count > 0);
        return { loginCount: logins.length, uniqueLogins, activeNow, categoryCounts };
    }, [filteredEvents, summaries]);

    if (!isAdmin) {
        return (
            <div className="p-8 text-center text-gray-500">
                Esta sección solo está disponible para administradores.
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 h-full flex flex-col overflow-hidden gap-4">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Actividad de usuarios</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Ingresos al sistema y últimas interacciones, agrupadas por categoría.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {([
                        ['today', 'Hoy'],
                        ['7d', '7 días'],
                        ['30d', '30 días'],
                    ] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setPeriod(key)}
                            className={`px-3 py-1.5 text-sm rounded-lg border ${
                                period === key
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                    <button
                        onClick={() => void load()}
                        className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                        title="Actualizar"
                    >
                        <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {!available && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-4 py-3 text-sm">
                    Ejecute <code className="font-mono text-xs">MIGRATION_ADD_USER_ACTIVITY_LOG.sql</code> en el SQL Editor de Supabase para empezar a registrar ingresos e interacciones.
                </div>
            )}
            {loadError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">{loadError}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center text-sm text-gray-500 mb-1"><LogIn className="w-4 h-4 mr-2" /> Ingresos</div>
                    <p className="text-2xl font-bold text-gray-800">{stats.loginCount}</p>
                    <p className="text-xs text-gray-500">{stats.uniqueLogins} usuario{stats.uniqueLogins === 1 ? '' : 's'} distintos</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center text-sm text-gray-500 mb-1"><Activity className="w-4 h-4 mr-2" /> Activos ahora</div>
                    <p className="text-2xl font-bold text-gray-800">{stats.activeNow}</p>
                    <p className="text-xs text-gray-500">Actividad en los últimos 15 min</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center text-sm text-gray-500 mb-1"><Clock className="w-4 h-4 mr-2" /> Eventos</div>
                    <p className="text-2xl font-bold text-gray-800">{filteredEvents.length}</p>
                    <p className="text-xs text-gray-500">En el periodo seleccionado</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar usuario…"
                        className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white w-52"
                    />
                </div>
                <select
                    value={userFilter}
                    onChange={e => {
                        setUserFilter(e.target.value);
                        setSelectedUserId(e.target.value || null);
                    }}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                >
                    <option value="">Todos los usuarios</option>
                    {state.users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                </select>
                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => setCategoryFilter('')}
                        className={`px-2.5 py-1 text-xs rounded-full border ${
                            !categoryFilter ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'
                        }`}
                    >
                        Todas
                    </button>
                    {USER_ACTIVITY_CATEGORIES.map(category => (
                        <button
                            key={category}
                            onClick={() => setCategoryFilter(categoryFilter === category ? '' : category)}
                            className={`px-2.5 py-1 text-xs rounded-full border ${
                                categoryFilter === category
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {USER_ACTIVITY_CATEGORY_LABELS[category]}
                            {stats.categoryCounts.find(c => c.category === category)
                                ? ` (${stats.categoryCounts.find(c => c.category === category)?.count})`
                                : ''}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-5 gap-4">
                <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                    <div className="px-4 py-3 border-b bg-gray-50 flex items-center text-sm font-medium text-gray-700">
                        <Users className="w-4 h-4 mr-2" /> Usuarios
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {loading && summaries.length === 0 ? (
                            <p className="p-4 text-sm text-gray-500">Cargando…</p>
                        ) : summaries.length === 0 ? (
                            <p className="p-4 text-sm text-gray-500">No hay usuarios para mostrar.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="text-xs text-gray-500 uppercase bg-white sticky top-0">
                                    <tr>
                                        <th className="text-left px-4 py-2 font-medium">Usuario</th>
                                        <th className="text-left px-3 py-2 font-medium">Último login</th>
                                        <th className="text-left px-3 py-2 font-medium">Última interacción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaries.map(row => (
                                        <tr
                                            key={row.user.id}
                                            onClick={() => setSelectedUserId(row.user.id === selectedUserId ? null : row.user.id)}
                                            className={`border-t cursor-pointer ${
                                                selectedUserId === row.user.id ? 'bg-primary-50' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${row.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                                                        {row.user.avatarUrl ? (
                                                            <img src={row.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-xs font-semibold text-gray-600">{initials(row.user.name)}</span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-900 truncate">{row.user.name}</p>
                                                        <p className="text-xs text-gray-500 capitalize">{row.user.role} · {row.loginCount} ingreso{row.loginCount === 1 ? '' : 's'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                                                {row.lastLoginAt ? (
                                                    <span title={formatActivityDateTime(row.lastLoginAt)}>{formatActivityRelative(row.lastLoginAt)}</span>
                                                ) : (
                                                    <span className="text-gray-400">Sin login</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                {row.lastInteraction ? (
                                                    <div className="flex flex-col gap-1">
                                                        <CategoryBadge category={row.lastInteraction.category} />
                                                        <span className="text-xs text-gray-500 truncate max-w-[180px]" title={row.lastInteraction.summary}>
                                                            {formatActivityRelative(row.lastInteraction.createdAt)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">Sin actividad</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div className="xl:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                    <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center text-sm font-medium text-gray-700">
                            <Filter className="w-4 h-4 mr-2" />
                            {selectedUser ? `Historial de ${selectedUser.name}` : 'Historial del periodo'}
                            {selectedEvents.length > 0 && (
                                <span className="ml-2 text-xs font-normal text-gray-500">
                                    ({selectedEvents.length} evento{selectedEvents.length === 1 ? '' : 's'} · {PERIOD_LABELS[period]})
                                </span>
                            )}
                        </div>
                        {selectedUser && (
                            <button onClick={() => setSelectedUserId(null)} className="text-xs text-primary-600 hover:underline">
                                Ver todos
                            </button>
                        )}
                    </div>
                    <div className="overflow-y-auto flex-1 p-4 space-y-6">
                        {(loading && selectedEvents.length === 0) || (selectedUser && historyLoading && selectedHistory === null) ? (
                            <p className="text-sm text-gray-500">Cargando historial…</p>
                        ) : selectedEvents.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                {!available
                                    ? 'No hay datos hasta ejecutar la migración.'
                                    : selectedUser
                                        ? `No hay actividad de ${selectedUser.name} en ${PERIOD_LABELS[period]}.${period === 'today' ? ' Si busca lo de ayer, cambie el periodo a 7 días.' : ''}`
                                        : 'Aún no hay actividad registrada en este filtro.'}
                            </p>
                        ) : (
                            groupedTimeline.map(group => (
                                <div key={group.key}>
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 capitalize">{group.label}</h3>
                                    <ol className="relative border-l border-gray-200 ml-3 space-y-3">
                                        {group.items.map(event => (
                                            <li key={event.id} className="ml-4">
                                                <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-white border-2 border-primary-400" />
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs font-mono text-gray-500">{formatActivityTime(event.createdAt)}</span>
                                                    <CategoryBadge category={event.category} />
                                                    {!selectedUser && (
                                                        <span className="text-xs font-medium text-gray-700">{event.userName || 'Usuario'}</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-800 mt-0.5">{event.summary}</p>
                                                {event.details && Object.keys(event.details).length > 0 && event.details.candidateName ? (
                                                    <p className="text-xs text-gray-500">{String(event.details.candidateName)}</p>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
