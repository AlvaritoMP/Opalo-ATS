import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Archive,
    ArrowRight,
    CheckCircle,
    Filter,
    Loader2,
    Mail,
    MessageCircle,
    Phone,
    RefreshCw,
    XCircle,
} from 'lucide-react';
import {
    candidateContactologyHistoryApi,
    ContactologyChannelSummary,
    ContactologyEvent,
    ContactologyEventKind,
} from '../lib/api/candidateContactologyHistory';
import { CONTACT_STATUS_META } from '../lib/contactTracking';
import type { ContactAttemptChannel } from '../lib/contactChannelConfig';
import type { Process } from '../types';

const CHANNEL_ICONS: Record<ContactAttemptChannel, React.ElementType> = {
    call: Phone,
    whatsapp: MessageCircle,
    email: Mail,
};

const KIND_META: Record<
    ContactologyEventKind,
    { label: string; dotClass: string; bgClass: string }
> = {
    contact_attempt: { label: 'Contacto', dotClass: 'bg-cyan-500', bgClass: 'bg-cyan-50 text-cyan-800' },
    contact_status: { label: 'Estado contacto', dotClass: 'bg-sky-500', bgClass: 'bg-sky-50 text-sky-800' },
    contact_reset: { label: 'Reinicio', dotClass: 'bg-gray-500', bgClass: 'bg-gray-100 text-gray-800' },
    stage_change: { label: 'Etapa', dotClass: 'bg-indigo-500', bgClass: 'bg-indigo-50 text-indigo-800' },
    discard: { label: 'Descarte', dotClass: 'bg-red-500', bgClass: 'bg-red-50 text-red-800' },
    archive: { label: 'Archivo', dotClass: 'bg-gray-500', bgClass: 'bg-gray-100 text-gray-800' },
    approval: { label: 'Aprobación', dotClass: 'bg-green-500', bgClass: 'bg-green-50 text-green-800' },
    other: { label: 'Otro', dotClass: 'bg-slate-400', bgClass: 'bg-slate-50 text-slate-700' },
};

interface BulkContactologyHistoryProps {
    candidateId: string;
    process?: Process;
    refreshToken?: number;
}

function formatDateTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

const ChannelSummaryCard: React.FC<{ summary: ContactologyChannelSummary }> = ({ summary }) => {
    const Icon = CHANNEL_ICONS[summary.channel];
    const meta = CONTACT_STATUS_META[summary.status];

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-xs font-semibold text-gray-800">{summary.shortLabel}</span>
            </div>
            <div className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${meta.badgeClass}`}>
                <span>{meta.dot}</span>
                <span>{meta.label}</span>
            </div>
            <div className="mt-2 space-y-0.5 text-[11px] text-gray-600">
                <p>
                    <span className="text-gray-400">Contabilizaciones:</span>{' '}
                    <span className="font-semibold text-gray-800 tabular-nums">{summary.attemptCount}</span>
                </p>
                {summary.lastAttemptAt && (
                    <p>
                        <span className="text-gray-400">Última:</span>{' '}
                        {formatDateTime(summary.lastAttemptAt)}
                        {summary.lastUserName ? ` · ${summary.lastUserName}` : ''}
                    </p>
                )}
                {!summary.lastAttemptAt && summary.attemptCount === 0 && (
                    <p className="text-gray-400">Sin registros</p>
                )}
            </div>
        </div>
    );
};

export const BulkContactologyHistory: React.FC<BulkContactologyHistoryProps> = ({
    candidateId,
    process,
    refreshToken = 0,
}) => {
    const [channelSummaries, setChannelSummaries] = useState<ContactologyChannelSummary[]>([]);
    const [events, setEvents] = useState<ContactologyEvent[]>([]);
    const [recordStatusLabel, setRecordStatusLabel] = useState<string | undefined>();
    const [currentStageName, setCurrentStageName] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [channelFilter, setChannelFilter] = useState<ContactAttemptChannel | ''>('');
    const [kindFilter, setKindFilter] = useState<ContactologyEventKind | ''>('');

    const loadHistory = useCallback(async () => {
        if (!candidateId) return;
        setIsLoading(true);
        setLoadError(null);
        try {
            const result = await candidateContactologyHistoryApi.getHistory(candidateId, process);
            setChannelSummaries(result.channelSummaries);
            setEvents(result.events);
            setRecordStatusLabel(result.recordStatusLabel);
            setCurrentStageName(result.currentStageName);
        } catch {
            setLoadError('No se pudo cargar el historial de contactología.');
            setEvents([]);
            setChannelSummaries([]);
        } finally {
            setIsLoading(false);
        }
    }, [candidateId, process]);

    useEffect(() => {
        void loadHistory();
    }, [loadHistory, refreshToken]);

    const filteredEvents = useMemo(() => {
        return events.filter(e => {
            if (channelFilter && e.channel !== channelFilter) return false;
            if (kindFilter && e.kind !== kindFilter) return false;
            return true;
        });
    }, [events, channelFilter, kindFilter]);

    const kindCounts = useMemo(() => {
        const counts = new Map<ContactologyEventKind, number>();
        for (const e of events) {
            counts.set(e.kind, (counts.get(e.kind) || 0) + 1);
        }
        return counts;
    }, [events]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Cargando historial de contactología…
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {loadError}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-100 rounded-lg">
                <span className="text-xs font-medium text-primary-800">Estado del registro</span>
                <span className="text-sm font-semibold text-primary-900">{recordStatusLabel || '—'}</span>
                {currentStageName && recordStatusLabel !== currentStageName && (
                    <span className="text-xs text-primary-600">· Etapa: {currentStageName}</span>
                )}
            </div>

            <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Resumen por canal
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {channelSummaries.map(summary => (
                        <ChannelSummaryCard key={summary.channel} summary={summary} />
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <select
                    value={channelFilter}
                    onChange={e => setChannelFilter(e.target.value as ContactAttemptChannel | '')}
                    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                >
                    <option value="">Todos los canales</option>
                    <option value="call">Llamadas</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Correo</option>
                </select>
                <select
                    value={kindFilter}
                    onChange={e => setKindFilter(e.target.value as ContactologyEventKind | '')}
                    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white flex-1 min-w-[140px]"
                >
                    <option value="">Todos los eventos ({events.length})</option>
                    {Array.from(kindCounts.entries())
                        .sort((a, b) => b[1] - a[1])
                        .map(([kind, count]) => (
                            <option key={kind} value={kind}>
                                {KIND_META[kind].label} ({count})
                            </option>
                        ))}
                </select>
                <button
                    type="button"
                    onClick={() => void loadHistory()}
                    className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50"
                >
                    <RefreshCw className="w-3 h-3" />
                    Actualizar
                </button>
            </div>

            {filteredEvents.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                    No hay registros de contactología para este candidato.
                </p>
            ) : (
                <ol className="relative border-l-2 border-gray-200 ml-3 space-y-0">
                    {filteredEvents.map((event, idx) => {
                        const meta = KIND_META[event.kind];
                        const ChannelIcon = event.channel ? CHANNEL_ICONS[event.channel] : null;
                        const isLast = idx === filteredEvents.length - 1;

                        return (
                            <li key={event.id} className={`relative pl-6 ${isLast ? 'pb-0' : 'pb-4'}`}>
                                <span
                                    className={`absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white ${meta.dotClass}`}
                                />
                                <div
                                    className={`rounded-lg border p-3 shadow-sm transition-colors ${
                                        event.isSynced
                                            ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300'
                                            : 'border-gray-100 bg-white hover:border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span
                                                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.bgClass}`}
                                                >
                                                    {event.kind === 'stage_change' && <ArrowRight className="w-3 h-3" />}
                                                    {event.kind === 'discard' && <XCircle className="w-3 h-3" />}
                                                    {event.kind === 'archive' && <Archive className="w-3 h-3" />}
                                                    {event.kind === 'approval' && <CheckCircle className="w-3 h-3" />}
                                                    {ChannelIcon && <ChannelIcon className="w-3 h-3" />}
                                                    {meta.label}
                                                </span>
                                                <span className="text-sm font-medium text-gray-900">{event.title}</span>
                                            </div>
                                            {event.description && (
                                                <p className="text-xs text-gray-600 mt-0.5 break-words">{event.description}</p>
                                            )}
                                            {event.userName && (
                                                <p className="text-[11px] text-gray-400 mt-1">Por {event.userName}</p>
                                            )}
                                        </div>
                                        <time className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">
                                            {formatDateTime(event.timestamp)}
                                        </time>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
        </div>
    );
};
