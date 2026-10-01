import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useAppState } from '../App';
import type { Process, WorkPlanAssignment } from '../types';
import { workPlanningApi, type WorkPlanSource } from '../lib/api/workPlanning';
import { getErrorMessage } from '../lib/supabase';
import { isProcessOperational } from '../lib/processStatus';
import {
    PROCESS_COLOR_OPTIONS,
    WEEKDAY_LABELS,
    addDays,
    assignmentsOverlap,
    combineDateAndTime,
    dotFromKey,
    endOfDay,
    endOfMonth,
    formatWhen,
    layoutWeek,
    monthWeeks,
    parseDateInput,
    rangesOverlap,
    resolveProcessColor,
    startOfDay,
    startOfMonth,
    startOfWeekMonday,
    toDateInput,
    toTimeInput,
    upcomingFriday,
} from '../lib/workPlanDates';

type Draft = {
    id?: string;
    processIds: string[];
    userIds: string[];
    startDate: string;
    endDate: string;
    allDay: boolean;
    startTime: string;
    endTime: string;
    note: string;
};

const LANE_HEIGHT = 62;
const BAR_HEIGHT = 56;

function sortByTitle(processes: Process[]): Process[] {
    return [...processes].sort((a, b) => a.title.localeCompare(b.title, 'es'));
}

export const TeamPlanningView: React.FC = () => {
    const { state, actions, getLabel } = useAppState();
    const [cursor, setCursor] = useState(() => new Date());
    const [mode, setMode] = useState<'month' | 'week'>('month');
    const [items, setItems] = useState<WorkPlanAssignment[]>([]);
    const [source, setSource] = useState<WorkPlanSource | null>(null);
    const [remoteReady, setRemoteReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [hiddenUserIds, setHiddenUserIds] = useState<Set<string>>(new Set());
    const [processColors, setProcessColors] = useState<Record<string, string>>({});
    const [draft, setDraft] = useState<Draft | null>(null);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [formError, setFormError] = useState('');
    const [processQuery, setProcessQuery] = useState('');
    const [userQuery, setUserQuery] = useState('');
    const [showClosed, setShowClosed] = useState(false);

    const canEdit = state.currentUser?.role === 'admin' || state.currentUser?.role === 'recruiter';

    const load = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const result = await workPlanningApi.list();
            setItems(result.items);
            setProcessColors(result.colors);
            setSource(result.source);
            setRemoteReady(result.remoteReady);
        } catch (error) {
            setLoadError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const teamUsers = useMemo(() => {
        const assigned = new Set(items.flatMap(item => item.userIds));
        return state.users
            .filter(user => user.role !== 'client' || assigned.has(user.id))
            .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }, [state.users, items]);

    const weeks = useMemo(() => {
        if (mode === 'week') {
            const start = startOfWeekMonday(cursor);
            return [Array.from({ length: 7 }, (_, index) => addDays(start, index))];
        }
        return monthWeeks(cursor);
    }, [mode, cursor]);

    const range = useMemo(() => {
        const start = startOfDay(weeks[0][0]);
        const end = endOfDay(weeks[weeks.length - 1][6]);
        return { start, end };
    }, [weeks]);

    const visibleItems = useMemo(() => {
        return items.filter(item => item.userIds.length === 0 || item.userIds.some(id => !hiddenUserIds.has(id)));
    }, [items, hiddenUserIds]);

    const itemsInRange = useMemo(() => {
        return items.filter(item => rangesOverlap(new Date(item.startsAt), new Date(item.endsAt), range.start, range.end));
    }, [items, range]);

    const processTitleOf = (item: WorkPlanAssignment) =>
        state.processes.find(process => process.id === item.processId)?.title || item.processTitle;

    const namesOf = (item: WorkPlanAssignment) =>
        item.userIds.map((id, index) => state.users.find(user => user.id === id)?.name || item.userNames[index] || 'Consultor');

    const parallelTitles = (item: WorkPlanAssignment) => {
        const titles = items
            .filter(other => other.id !== item.id
                && item.userIds.some(id => other.userIds.includes(id))
                && assignmentsOverlap(item, other))
            .map(processTitleOf);
        return [...new Set(titles)];
    };

    const userIsParallel = (userId: string) => {
        const mine = itemsInRange.filter(item => item.userIds.includes(userId));
        for (let i = 0; i < mine.length; i++) {
            for (let j = i + 1; j < mine.length; j++) {
                if (assignmentsOverlap(mine[i], mine[j])) return true;
            }
        }
        return false;
    };

    const chooseProcessColor = async (processId: string, colorId: string) => {
        setProcessColors(current => ({ ...current, [processId]: colorId }));
        try {
            const saved = await workPlanningApi.saveProcessColor(processId, colorId);
            setProcessColors(saved);
        } catch (error) {
            actions.showToast(getErrorMessage(error), 'error', 4000);
        }
    };

    const openDraft = (next: Draft) => {
        setFormError('');
        setProcessQuery('');
        setUserQuery('');
        setShowClosed(false);
        setDraft(next);
    };

    const openCreate = (day: Date, processId?: string, throughFriday = false) => {
        if (!canEdit) return;
        const start = startOfDay(day);
        const end = throughFriday || processId ? upcomingFriday(start) : start;
        openDraft({
            processIds: processId ? [processId] : [],
            userIds: [],
            startDate: toDateInput(start),
            endDate: toDateInput(end.getTime() < start.getTime() ? start : end),
            allDay: true,
            startTime: '08:00',
            endTime: '18:00',
            note: '',
        });
    };

    const openEdit = (item: WorkPlanAssignment) => {
        const start = new Date(item.startsAt);
        const end = new Date(item.endsAt);
        openDraft({
            id: item.id,
            processIds: item.processId ? [item.processId] : [],
            userIds: [...item.userIds],
            startDate: toDateInput(start),
            endDate: toDateInput(end),
            allDay: item.allDay,
            startTime: toTimeInput(start),
            endTime: toTimeInput(end),
            note: item.note || '',
        });
    };

    const applyPreset = (preset: 'day' | 'friday' | 'workweek' | 'month') => {
        setDraft(current => {
            if (!current) return current;
            const anchor = parseDateInput(current.startDate) || new Date();
            if (preset === 'day') return { ...current, endDate: current.startDate };
            if (preset === 'friday') return { ...current, endDate: toDateInput(upcomingFriday(anchor)) };
            if (preset === 'workweek') {
                const monday = startOfWeekMonday(anchor);
                return { ...current, startDate: toDateInput(monday), endDate: toDateInput(addDays(monday, 4)) };
            }
            return {
                ...current,
                startDate: toDateInput(startOfMonth(anchor)),
                endDate: toDateInput(startOfDay(endOfMonth(anchor))),
            };
        });
    };

    const saveDraft = async () => {
        if (!draft || !canEdit || !state.currentUser) return;
        if (draft.processIds.length === 0) {
            setFormError('Elige al menos un proceso.');
            return;
        }
        if (draft.userIds.length === 0) {
            setFormError('Elige al menos un consultor.');
            return;
        }
        const start = combineDateAndTime(draft.startDate, draft.allDay ? null : draft.startTime, false);
        const end = combineDateAndTime(draft.endDate, draft.allDay ? null : draft.endTime, true);
        if (!start || !end) {
            setFormError('Revisa las fechas y las horas.');
            return;
        }
        if (end.getTime() < start.getTime()) {
            setFormError('El fin no puede ser anterior al inicio.');
            return;
        }

        const userNames = draft.userIds.map(id => state.users.find(user => user.id === id)?.name || 'Consultor');
        const base = {
            userIds: draft.userIds,
            userNames,
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
            allDay: draft.allDay,
            note: draft.note,
            createdBy: state.currentUser.id,
            createdByName: state.currentUser.name,
        };

        setSaving(true);
        setFormError('');
        try {
            if (draft.id) {
                const process = state.processes.find(item => item.id === draft.processIds[0]);
                const existing = items.find(item => item.id === draft.id);
                const updated = await workPlanningApi.update(draft.id, {
                    ...base,
                    processId: draft.processIds[0],
                    processTitle: process?.title || existing?.processTitle || 'Proceso',
                });
                setItems(current => current.map(item => item.id === updated.id ? updated : item));
                actions.showToast('Asignación actualizada', 'success', 2200);
            } else {
                const created = await workPlanningApi.createMany(draft.processIds.map(processId => {
                    const process = state.processes.find(item => item.id === processId);
                    return {
                        ...base,
                        processId,
                        processTitle: process?.title || 'Proceso',
                    };
                }));
                setItems(current => [...current, ...created]);
                actions.showToast(
                    created.length === 1 ? 'Asignación creada' : `${created.length} asignaciones creadas`,
                    'success',
                    2200,
                );
            }
            setDraft(null);
        } catch (error) {
            setFormError(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const removeDraft = async () => {
        if (!draft?.id || !canEdit) return;
        if (!window.confirm('¿Quitar esta asignación del planeamiento? El proceso no se modifica.')) return;
        setSaving(true);
        try {
            await workPlanningApi.remove(draft.id);
            setItems(current => current.filter(item => item.id !== draft.id));
            setDraft(null);
            actions.showToast('Asignación quitada', 'success', 2200);
        } catch (error) {
            setFormError(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const publish = async () => {
        setPublishing(true);
        try {
            const created = await workPlanningApi.publishLocal();
            setItems(created);
            setSource('remote');
            setRemoteReady(false);
            actions.showToast('Planeamiento compartido con el equipo', 'success', 2500);
        } catch (error) {
            actions.showToast(getErrorMessage(error), 'error', 5000);
        } finally {
            setPublishing(false);
        }
    };

    const shift = (direction: -1 | 1) => {
        setCursor(current => {
            if (mode === 'week') return addDays(current, direction * 7);
            return new Date(current.getFullYear(), current.getMonth() + direction, 1);
        });
    };

    const periodLabel = mode === 'month'
        ? cursor.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
        : `${weeks[0][0].toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} – ${weeks[0][6].toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    const assignableProcesses = useMemo(() => {
        const query = processQuery.trim().toLowerCase();
        return sortByTitle(state.processes.filter(process => {
            if (!showClosed && !isProcessOperational(process.status)) return false;
            if (!query) return true;
            return process.title.toLowerCase().includes(query);
        }));
    }, [state.processes, processQuery, showClosed]);

    const filteredUsers = teamUsers.filter(user => {
        const query = userQuery.trim().toLowerCase();
        return !query || user.name.toLowerCase().includes(query);
    });

    const toggleProcess = (processId: string) => {
        setDraft(current => {
            if (!current) return current;
            if (current.id) return { ...current, processIds: [processId] };
            const exists = current.processIds.includes(processId);
            return {
                ...current,
                processIds: exists
                    ? current.processIds.filter(id => id !== processId)
                    : [...current.processIds, processId],
            };
        });
    };

    const toggleUser = (userId: string) => {
        setDraft(current => {
            if (!current) return current;
            const exists = current.userIds.includes(userId);
            return {
                ...current,
                userIds: exists ? current.userIds.filter(id => id !== userId) : [...current.userIds, userId],
            };
        });
    };

    return (
        <div className="p-4 md:p-6 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <CalendarDays className="w-7 h-7 text-primary-600" />
                        {getLabel('sidebar_planning', 'Planeamiento')}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 max-w-3xl">
                        Acuerdo de la reunión. El color lo eliges por proceso. Los consultores van en etiquetas propias, debajo del nombre del proceso.
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        onClick={() => openCreate(new Date(), undefined, true)}
                        disabled={loading || !!loadError}
                        className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 disabled:opacity-50"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Nueva asignación
                    </button>
                )}
            </div>

            {source === 'local' && !remoteReady && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Estas asignaciones viven solo en este navegador. Para que el equipo las vea, ejecuta <span className="font-medium">MIGRATION_ADD_WORK_PLAN.sql</span> en Supabase y luego actualiza.
                </div>
            )}
            {source === 'local' && remoteReady && canEdit && (
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p>Hay un borrador local. La base ya está lista para compartirlo con el equipo.</p>
                    <button
                        type="button"
                        onClick={() => void publish()}
                        disabled={publishing}
                        className="px-3 py-1.5 rounded-lg bg-sky-700 text-white hover:bg-sky-800 disabled:opacity-50"
                    >
                        {publishing ? 'Publicando…' : 'Compartir con el equipo'}
                    </button>
                </div>
            )}
            {loadError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    No se pudo cargar el planeamiento. {loadError}
                </div>
            )}

            <div className="flex flex-col xl:flex-row gap-4 items-start">
                <aside className="w-full xl:w-56 bg-white border border-gray-200 rounded-xl p-3 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-semibold text-gray-800">Equipo</h2>
                        <button
                            type="button"
                            className="text-xs text-primary-700 hover:underline"
                            onClick={() => setHiddenUserIds(new Set())}
                        >
                            Todos
                        </button>
                    </div>
                    {state.currentUser && (
                        <button
                            type="button"
                            className="text-xs text-gray-500 hover:text-gray-800 mb-2"
                            onClick={() => {
                                const me = state.currentUser;
                                if (!me) return;
                                const hidden = new Set(teamUsers.map(user => user.id));
                                hidden.delete(me.id);
                                setHiddenUserIds(hidden);
                            }}
                        >
                            Solo yo
                        </button>
                    )}
                    <ul className="space-y-1">
                        {teamUsers.map(user => {
                            const checked = !hiddenUserIds.has(user.id);
                            const count = itemsInRange.filter(item => item.userIds.includes(user.id)).length;
                            return (
                                <li key={user.id}>
                                    <label className="flex items-start gap-2 px-1 py-1 rounded hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="mt-1 rounded"
                                            checked={checked}
                                            onChange={() => {
                                                setHiddenUserIds(current => {
                                                    const next = new Set(current);
                                                    if (next.has(user.id)) next.delete(user.id);
                                                    else next.add(user.id);
                                                    return next;
                                                });
                                            }}
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-1.5 text-sm text-gray-800">
                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotFromKey(user.id) }} />
                                                <span className="truncate">{user.name}</span>
                                            </span>
                                            <span className="block text-[11px] text-gray-500">
                                                {count === 0 ? 'Sin asignación en este periodo' : `${count} en este periodo`}
                                                {userIsParallel(user.id) ? ' · en paralelo' : ''}
                                            </span>
                                        </span>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                </aside>

                <section className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => shift(-1)} className="p-1.5 rounded-md hover:bg-gray-100" aria-label="Periodo anterior">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button type="button" onClick={() => shift(1)} className="p-1.5 rounded-md hover:bg-gray-100" aria-label="Periodo siguiente">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            <h2 className="text-lg font-semibold capitalize text-gray-900">{periodLabel}</h2>
                            <button
                                type="button"
                                onClick={() => setCursor(new Date())}
                                className="ml-1 text-sm px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                            >
                                Hoy
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    workPlanningApi.resetSource();
                                    void load();
                                }}
                                className="text-sm px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                            >
                                Actualizar
                            </button>
                        </div>
                        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                                <button
                                    type="button"
                                    onClick={() => setMode('month')}
                                    className={`px-3 py-1.5 ${mode === 'month' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`}
                                >
                                    Mes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('week')}
                                    className={`px-3 py-1.5 ${mode === 'week' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`}
                                >
                                    Semana
                                </button>
                            </div>
                    </div>

                    <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                        {WEEKDAY_LABELS.map(label => (
                            <div key={label} className="px-2 py-3 text-sm font-semibold text-gray-600">{label}</div>
                        ))}
                    </div>

                    {loading ? (
                        <div className="p-10 text-center text-sm text-gray-500">Cargando planeamiento…</div>
                    ) : (
                        weeks.map(week => {
                            const weekKey = toDateInput(week[0]);
                            const segments = layoutWeek(week[0], visibleItems);
                            const laneCount = segments.reduce((max, segment) => Math.max(max, segment.lane), -1) + 1;
                            const eventsHeight = Math.max(laneCount * LANE_HEIGHT, 72);
                            const today = new Date();
                            return (
                                <div key={weekKey} className="border-b border-gray-200 last:border-b-0">
                                    <div className="grid grid-cols-7 bg-white">
                                        {week.map(day => {
                                            const inMonth = day.getMonth() === cursor.getMonth();
                                            const isToday = day.getFullYear() === today.getFullYear()
                                                && day.getMonth() === today.getMonth()
                                                && day.getDate() === today.getDate();
                                            return (
                                                <button
                                                    key={toDateInput(day)}
                                                    type="button"
                                                    onClick={() => {
                                                        if (canEdit) openCreate(day);
                                                    }}
                                                    className={`h-12 border-l border-gray-100 first:border-l-0 text-left px-2 ${
                                                        mode === 'month' && !inMonth ? 'bg-gray-50' : 'bg-white'
                                                    } ${canEdit ? 'hover:bg-primary-50' : 'cursor-default'}`}
                                                    title={canEdit ? `Asignar el ${day.toLocaleDateString('es-PE')}` : undefined}
                                                >
                                                    <span className={`inline-flex items-center justify-center w-8 h-8 text-sm font-semibold rounded-full ${
                                                        isToday ? 'bg-primary-600 text-white' : inMonth || mode === 'week' ? 'text-gray-900' : 'text-gray-400'
                                                    }`}>
                                                        {day.getDate()}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="relative border-t border-gray-100" style={{ height: eventsHeight }}>
                                        <div className="absolute inset-0 grid grid-cols-7">
                                            {week.map(day => (
                                                <button
                                                    key={`${weekKey}-slot-${toDateInput(day)}`}
                                                    type="button"
                                                    onClick={() => {
                                                        if (canEdit) openCreate(day);
                                                    }}
                                                    className={`border-l border-gray-100 first:border-l-0 ${
                                                        mode === 'month' && day.getMonth() !== cursor.getMonth() ? 'bg-gray-50/80' : ''
                                                    } ${canEdit ? 'hover:bg-primary-50/40' : 'cursor-default'}`}
                                                    aria-label={canEdit ? `Asignar el ${day.toLocaleDateString('es-PE')}` : undefined}
                                                />
                                            ))}
                                        </div>
                                        {segments.map(segment => {
                                            const item = segment.item;
                                            const color = resolveProcessColor(item.processId || item.id, processColors[item.processId]);
                                            const names = namesOf(item);
                                            const startClock = new Date(item.startsAt).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
                                            const endClock = new Date(item.endsAt).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
                                            const singleDay = segment.startCol === segment.endCol && !segment.continuesBefore && !segment.continuesAfter;
                                            const timePrefix = item.allDay
                                                ? ''
                                                : singleDay
                                                    ? `${startClock}–${endClock} `
                                                    : !segment.continuesBefore
                                                        ? `${startClock} `
                                                        : '';
                                            const parallel = parallelTitles(item);
                                            const tip = [
                                                processTitleOf(item),
                                                names.join(', '),
                                                formatWhen(item),
                                                item.note || '',
                                                parallel.length ? `En paralelo: ${parallel.join(' · ')}` : '',
                                            ].filter(Boolean).join('\n');
                                            const shownPeople = item.userIds.slice(0, 4);
                                            const extraPeople = item.userIds.length - shownPeople.length;
                                            return (
                                                <button
                                                    key={`${item.id}-${weekKey}-${segment.startCol}`}
                                                    type="button"
                                                    title={tip}
                                                    onClick={event => {
                                                        event.stopPropagation();
                                                        openEdit(item);
                                                    }}
                                                    className="absolute z-10 overflow-hidden border-2 text-left px-2 py-1 flex flex-col justify-center gap-1"
                                                    style={{
                                                        top: segment.lane * LANE_HEIGHT + 4,
                                                        height: BAR_HEIGHT,
                                                        left: `calc(${(segment.startCol / 7) * 100}% + 4px)`,
                                                        width: `calc(${((segment.endCol - segment.startCol + 1) / 7) * 100}% - 8px)`,
                                                        background: color.bg,
                                                        color: color.text,
                                                        borderColor: color.border,
                                                        borderRadius: segment.continuesBefore && segment.continuesAfter
                                                            ? 0
                                                            : segment.continuesBefore
                                                                ? '0 8px 8px 0'
                                                                : segment.continuesAfter
                                                                    ? '8px 0 0 8px'
                                                                    : 8,
                                                    }}
                                                >
                                                    <span className="block truncate text-[13px] font-semibold leading-none">
                                                        {timePrefix}{processTitleOf(item)}
                                                    </span>
                                                    {shownPeople.length > 0 && (
                                                        <span className="flex items-center gap-1 min-w-0 overflow-hidden">
                                                            {shownPeople.map((userId, index) => (
                                                                <span
                                                                    key={`${userId}-${index}`}
                                                                    className="inline-flex items-center max-w-[8rem] truncate rounded px-1.5 py-1 text-[11px] font-semibold leading-none text-white"
                                                                    style={{ background: dotFromKey(userId) }}
                                                                >
                                                                    {(names[index] || 'Consultor').trim().split(/\s+/)[0]}
                                                                </span>
                                                            ))}
                                                            {extraPeople > 0 && (
                                                                <span className="shrink-0 rounded bg-gray-900 px-1.5 py-1 text-[11px] font-semibold leading-none text-white">
                                                                    +{extraPeople}
                                                                </span>
                                                            )}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    {!loading && visibleItems.length === 0 && (
                        <p className="px-4 py-3 text-sm text-gray-500">
                            {canEdit
                                ? 'Todavía no hay asignaciones visibles. Usa Nueva asignación o haz clic en un día.'
                                : 'Todavía no hay asignaciones en el planeamiento.'}
                        </p>
                    )}
                </section>
            </div>

            {draft && (
                <AssignmentDialog
                    draft={draft}
                    readOnly={!canEdit}
                    saving={saving}
                    formError={formError}
                    processes={state.processes}
                    assignableProcesses={assignableProcesses}
                    filteredUsers={filteredUsers}
                    teamUsers={teamUsers}
                    processQuery={processQuery}
                    userQuery={userQuery}
                    showClosed={showClosed}
                    onProcessQuery={setProcessQuery}
                    onUserQuery={setUserQuery}
                    onShowClosed={setShowClosed}
                    onChange={setDraft}
                    onToggleProcess={toggleProcess}
                    onToggleUser={toggleUser}
                    onPreset={applyPreset}
                    processColors={processColors}
                    onProcessColor={chooseProcessColor}
                    onClose={() => { if (!saving) setDraft(null); }}
                    onSave={() => void saveDraft()}
                    onDelete={() => void removeDraft()}
                />
            )}
        </div>
    );
};

function AssignmentDialog({
    draft,
    readOnly,
    saving,
    formError,
    processes,
    assignableProcesses,
    filteredUsers,
    teamUsers,
    processQuery,
    userQuery,
    showClosed,
    onProcessQuery,
    onUserQuery,
    onShowClosed,
    onChange,
    onToggleProcess,
    onToggleUser,
    onPreset,
    processColors,
    onProcessColor,
    onClose,
    onSave,
    onDelete,
}: {
    draft: Draft;
    readOnly: boolean;
    saving: boolean;
    formError: string;
    processes: Process[];
    assignableProcesses: Process[];
    filteredUsers: { id: string; name: string }[];
    teamUsers: { id: string; name: string }[];
    processQuery: string;
    userQuery: string;
    showClosed: boolean;
    onProcessQuery: (value: string) => void;
    onUserQuery: (value: string) => void;
    onShowClosed: (value: boolean) => void;
    onChange: (draft: Draft) => void;
    onToggleProcess: (processId: string) => void;
    onToggleUser: (userId: string) => void;
    onPreset: (preset: 'day' | 'friday' | 'workweek' | 'month') => void;
    processColors: Record<string, string>;
    onProcessColor: (processId: string, colorId: string) => void;
    onClose: () => void;
    onSave: () => void;
    onDelete: () => void;
}) {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const selectedProcesses = draft.processIds
        .map(id => processes.find(process => process.id === id))
        .filter((process): process is Process => !!process);

    const addFiltered = () => {
        const ids = new Set(draft.processIds);
        assignableProcesses.forEach(process => ids.add(process.id));
        onChange({ ...draft, processIds: [...ids] });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onMouseDown={onClose}>
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                onMouseDown={event => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {readOnly ? 'Asignación' : draft.id ? 'Editar asignación' : 'Nueva asignación'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            {draft.id
                                ? 'Cambia personas, proceso o el periodo de este acuerdo.'
                                : 'Puedes marcar varios procesos: se crea una barra por proceso, con las mismas personas y fechas, para verlos en paralelo.'}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100" aria-label="Cerrar">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {(['day', 'friday', 'workweek', 'month'] as const).map(preset => (
                            <button
                                key={preset}
                                type="button"
                                disabled={readOnly}
                                onClick={() => onPreset(preset)}
                                className="text-xs px-2 py-1 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                            >
                                {preset === 'day' && 'Solo este día'}
                                {preset === 'friday' && 'Hasta el viernes'}
                                {preset === 'workweek' && 'Semana laboral'}
                                {preset === 'month' && 'Hasta fin de mes'}
                            </button>
                        ))}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                        <label className="block text-sm">
                            <span className="text-gray-700">Desde</span>
                            <input
                                type="date"
                                value={draft.startDate}
                                disabled={readOnly}
                                onChange={event => onChange({ ...draft, startDate: event.target.value })}
                                className="mt-1 w-full border border-gray-200 rounded-md px-2 py-1.5"
                            />
                        </label>
                        <label className="block text-sm">
                            <span className="text-gray-700">Hasta</span>
                            <input
                                type="date"
                                value={draft.endDate}
                                disabled={readOnly}
                                onChange={event => onChange({ ...draft, endDate: event.target.value })}
                                className="mt-1 w-full border border-gray-200 rounded-md px-2 py-1.5"
                            />
                        </label>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={!draft.allDay}
                            disabled={readOnly}
                            onChange={event => onChange({ ...draft, allDay: !event.target.checked })}
                        />
                        Indicar hora de inicio y de fin
                    </label>
                    {!draft.allDay && (
                        <div className="grid sm:grid-cols-2 gap-3">
                            <label className="block text-sm">
                                <span className="text-gray-700">Hora de inicio</span>
                                <input
                                    type="time"
                                    value={draft.startTime}
                                    disabled={readOnly}
                                    onChange={event => onChange({ ...draft, startTime: event.target.value })}
                                    className="mt-1 w-full border border-gray-200 rounded-md px-2 py-1.5"
                                />
                            </label>
                            <label className="block text-sm">
                                <span className="text-gray-700">Hora de fin, el último día</span>
                                <input
                                    type="time"
                                    value={draft.endTime}
                                    disabled={readOnly}
                                    onChange={event => onChange({ ...draft, endTime: event.target.value })}
                                    className="mt-1 w-full border border-gray-200 rounded-md px-2 py-1.5"
                                />
                            </label>
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-800">Procesos</span>
                                {!draft.id && !readOnly && processQuery.trim().length >= 2 && assignableProcesses.length > 0 && assignableProcesses.length <= 12 && (
                                    <button type="button" className="text-xs text-primary-700 hover:underline" onClick={addFiltered}>
                                        Agregar estos {assignableProcesses.length}
                                    </button>
                                )}
                            </div>
                            {selectedProcesses.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                            {selectedProcesses.map(process => {
                                const color = resolveProcessColor(process.id, processColors[process.id]);
                                const chipStyle = { background: color.bg, color: color.text, borderColor: color.border };
                                return draft.id ? (
                                    <span
                                        key={process.id}
                                        className="inline-flex items-center max-w-full text-xs px-2 py-1 rounded-full border"
                                        style={chipStyle}
                                    >
                                        <span className="truncate">{process.title}</span>
                                    </span>
                                ) : (
                                    <button
                                        key={process.id}
                                        type="button"
                                        disabled={readOnly}
                                        onClick={() => onToggleProcess(process.id)}
                                        className="inline-flex items-center gap-1 max-w-full text-xs px-2 py-1 rounded-full border"
                                        style={chipStyle}
                                    >
                                        <span className="truncate">{process.title}</span>
                                        {!readOnly && <X className="w-3 h-3" />}
                                    </button>
                                );
                            })}
                                </div>
                            )}
                            {selectedProcesses.length > 0 && (
                                <div className="space-y-2 mb-3">
                                    <p className="text-xs font-medium text-gray-700">Color de cada proceso</p>
                                    {selectedProcesses.map(process => (
                                        <div key={process.id}>
                                            <p className="text-xs text-gray-600 truncate mb-1">{process.title}</p>
                                            <div className="flex flex-wrap gap-1">
                                                {PROCESS_COLOR_OPTIONS.map(option => {
                                                    const selected = processColors[process.id] === option.id;
                                                    return (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            disabled={readOnly}
                                                            title={option.label}
                                                            aria-label={`${option.label} para ${process.title}`}
                                                            onClick={() => onProcessColor(process.id, option.id)}
                                                            className={`w-6 h-6 rounded-full border-2 shadow-sm disabled:opacity-60 ${selected ? 'border-gray-900' : 'border-white'}`}
                                                            style={{ background: option.border }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <input
                                type="search"
                                value={processQuery}
                                onChange={event => onProcessQuery(event.target.value)}
                                placeholder="Buscar proceso"
                                className="w-full mb-2 px-2 py-1.5 text-sm border border-gray-200 rounded-md"
                            />
                            <label className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                <input type="checkbox" checked={showClosed} onChange={event => onShowClosed(event.target.checked)} />
                                Incluir procesos cerrados
                            </label>
                            <ul className="max-h-48 overflow-y-auto border border-gray-100 rounded-md divide-y divide-gray-50">
                                {assignableProcesses.map(process => (
                                    <li key={process.id}>
                                        <label className="flex items-start gap-2 px-2 py-1.5 text-sm hover:bg-gray-50 cursor-pointer">
                                            <input
                                                type={draft.id ? 'radio' : 'checkbox'}
                                                name="planning-process"
                                                className="mt-1"
                                                checked={draft.processIds.includes(process.id)}
                                                disabled={readOnly}
                                                onChange={() => onToggleProcess(process.id)}
                                            />
                                            <span
                                                className="w-2.5 h-2.5 mt-1 rounded-full shrink-0"
                                                style={{ background: resolveProcessColor(process.id, processColors[process.id]).border }}
                                            />
                                            <span>
                                                <span className="block text-gray-800">{process.title}</span>
                                                <span className="text-[11px] text-gray-500">
                                                    {process.status === 'standby' ? 'Stand by' : process.status === 'en_proceso' ? 'En proceso' : process.status}
                                                    {process.isBulkProcess ? ' · Masivo' : ''}
                                                </span>
                                            </span>
                                        </label>
                                    </li>
                                ))}
                                {assignableProcesses.length === 0 && (
                                    <li className="px-2 py-3 text-sm text-gray-500">Ningún proceso coincide.</li>
                                )}
                            </ul>
                        </div>

                        <div>
                            <span className="block text-sm font-medium text-gray-800 mb-1">Consultores</span>
                            {draft.userIds.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {draft.userIds.map(id => {
                                        const user = teamUsers.find(item => item.id === id);
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                disabled={readOnly}
                                                onClick={() => onToggleUser(id)}
                                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800"
                                            >
                                                <span className="w-2 h-2 rounded-full" style={{ background: dotFromKey(id) }} />
                                                {user?.name || 'Consultor'}
                                                {!readOnly && <X className="w-3 h-3" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            <input
                                type="search"
                                value={userQuery}
                                onChange={event => onUserQuery(event.target.value)}
                                placeholder="Buscar consultor"
                                className="w-full mb-2 px-2 py-1.5 text-sm border border-gray-200 rounded-md"
                            />
                            <ul className="max-h-48 overflow-y-auto border border-gray-100 rounded-md divide-y divide-gray-50">
                                {filteredUsers.map(user => (
                                    <li key={user.id}>
                                        <label className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={draft.userIds.includes(user.id)}
                                                disabled={readOnly}
                                                onChange={() => onToggleUser(user.id)}
                                            />
                                            <span className="w-2 h-2 rounded-full" style={{ background: dotFromKey(user.id) }} />
                                            {user.name}
                                        </label>
                                    </li>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <li className="px-2 py-3 text-sm text-gray-500">Ningún consultor coincide.</li>
                                )}
                            </ul>
                        </div>
                    </div>

                    <label className="block text-sm">
                        <span className="text-gray-700">Nota del acuerdo</span>
                        <textarea
                            value={draft.note}
                            disabled={readOnly}
                            onChange={event => onChange({ ...draft, note: event.target.value })}
                            rows={2}
                            placeholder="Por ejemplo: solo operarios de limpieza hasta el viernes."
                            className="mt-1 w-full border border-gray-200 rounded-md px-2 py-1.5"
                        />
                    </label>

                    {formError && <p className="text-sm text-red-700">{formError}</p>}
                </div>

                <div className="px-5 py-4 border-t flex items-center justify-between gap-3">
                    {draft.id && !readOnly ? (
                        <button type="button" onClick={onDelete} disabled={saving} className="text-sm text-red-700 hover:underline disabled:opacity-50">
                            Quitar
                        </button>
                    ) : <span />}
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
                            {readOnly ? 'Cerrar' : 'Cancelar'}
                        </button>
                        {!readOnly && (
                            <button
                                type="button"
                                onClick={onSave}
                                disabled={saving}
                                className="px-3 py-1.5 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                            >
                                {saving ? 'Guardando…' : draft.id ? 'Guardar' : 'Asignar'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
