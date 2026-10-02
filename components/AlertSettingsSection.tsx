import React, { useMemo, useState } from 'react';
import { Bell, Search } from 'lucide-react';
import type { Client, Process, UserAlertSettings } from '../types';
import { isProcessActive } from '../lib/processStatus';
import { EMPTY_USER_ALERT_SETTINGS } from '../lib/userAlertSettings';

interface AlertSettingsSectionProps {
    clients: Client[];
    processes: Process[];
    value?: UserAlertSettings;
    onChange: (next: UserAlertSettings) => void;
}

function toggleId(ids: string[], id: string, enabled: boolean): string[] {
    if (enabled) return ids.filter(current => current !== id);
    return ids.includes(id) ? ids : [...ids, id];
}

function Switch({
    enabled,
    disabled,
    label,
    onToggle,
}: {
    enabled: boolean;
    disabled?: boolean;
    label: string;
    onToggle: (enabled: boolean) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={label}
            disabled={disabled}
            onClick={() => onToggle(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                enabled ? 'bg-primary-600' : 'bg-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    );
}

export const AlertSettingsSection: React.FC<AlertSettingsSectionProps> = ({
    clients,
    processes,
    value,
    onChange,
}) => {
    const settings = value ?? EMPTY_USER_ALERT_SETTINGS;
    const [query, setQuery] = useState('');
    const normalizedQuery = query.trim().toLowerCase();

    const activeProcesses = useMemo(
        () => processes.filter(process => isProcessActive(process.status)),
        [processes]
    );

    const groups = useMemo(() => {
        const byClient = new Map<string, Process[]>();
        const unassigned: Process[] = [];

        for (const process of activeProcesses) {
            if (!process.clientId) {
                unassigned.push(process);
                continue;
            }
            const list = byClient.get(process.clientId) || [];
            list.push(process);
            byClient.set(process.clientId, list);
        }

        const named = clients
            .map(client => ({
                key: client.id,
                clientId: client.id as string | null,
                label: client.razonSocial,
                detail: client.ruc,
                processes: (byClient.get(client.id) || []).slice().sort((a, b) => a.title.localeCompare(b.title, 'es')),
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'es'));

        const knownIds = new Set(clients.map(client => client.id));
        for (const [clientId, clientProcesses] of byClient) {
            if (knownIds.has(clientId)) continue;
            named.push({
                key: clientId,
                clientId,
                label: 'Cliente sin ficha',
                detail: clientId,
                processes: clientProcesses.slice().sort((a, b) => a.title.localeCompare(b.title, 'es')),
            });
        }

        if (unassigned.length > 0) {
            named.push({
                key: '__unassigned__',
                clientId: null,
                label: 'Sin cliente asignado',
                detail: '',
                processes: unassigned.slice().sort((a, b) => a.title.localeCompare(b.title, 'es')),
            });
        }

        return named;
    }, [activeProcesses, clients]);

    const visibleGroups = useMemo(() => {
        if (!normalizedQuery) return groups;
        return groups
            .map(group => {
                const clientMatches = group.label.toLowerCase().includes(normalizedQuery)
                    || group.detail.toLowerCase().includes(normalizedQuery);
                if (clientMatches) return group;
                return {
                    ...group,
                    processes: group.processes.filter(process =>
                        process.title.toLowerCase().includes(normalizedQuery)
                    ),
                };
            })
            .filter(group => group.processes.length > 0 || group.label.toLowerCase().includes(normalizedQuery) || group.detail.toLowerCase().includes(normalizedQuery));
    }, [groups, normalizedQuery]);

    const mutedProcessCount = activeProcesses.filter(process => {
        if (process.clientId && settings.disabledClientIds.includes(process.clientId)) return true;
        return settings.disabledProcessIds.includes(process.id);
    }).length;

    const hasMutes = settings.disabledClientIds.length > 0 || settings.disabledProcessIds.length > 0;

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                    <h2 className="text-xl font-semibold mb-1 flex items-center">
                        <Bell className="mr-2" /> Alertas
                    </h2>
                    <p className="text-sm text-gray-500 max-w-2xl">
                        Enciende o apaga los avisos de seguimiento para un cliente o un proceso.
                        Si apagas un cliente, ninguno de sus procesos genera alertas.
                        Solo aparecen procesos en curso: stand by, terminados y cancelados no avisan.
                        Guarda los cambios para que apliquen en los avisos.
                    </p>
                </div>
                {hasMutes && (
                    <button
                        type="button"
                        onClick={() => onChange({ disabledClientIds: [], disabledProcessIds: [] })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Activar todas
                    </button>
                )}
            </div>

            <p className="text-sm text-gray-600 mb-4">
                {mutedProcessCount === 0
                    ? 'Todas las alertas de procesos en curso están encendidas.'
                    : `${mutedProcessCount} proceso(s) en curso con alertas apagadas.`}
            </p>

            <div className="relative mb-4">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                    type="search"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Buscar cliente o proceso"
                    className="w-full input pl-9"
                />
            </div>

            {visibleGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    {groups.length === 0
                        ? 'No hay clientes ni procesos en curso para configurar.'
                        : 'Ningún cliente o proceso coincide con la búsqueda.'}
                </div>
            ) : (
                <div className="space-y-4">
                    {visibleGroups.map(group => {
                        const clientDisabled = group.clientId
                            ? settings.disabledClientIds.includes(group.clientId)
                            : false;
                        const clientEnabled = !clientDisabled;

                        return (
                            <div key={group.key} className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50">
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-800 truncate">{group.label}</p>
                                        <p className="text-xs text-gray-500">
                                            {group.detail ? `${group.detail} · ` : ''}
                                            {group.processes.length} proceso(s) en curso
                                        </p>
                                    </div>
                                    {group.clientId && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-xs text-gray-500">
                                                {clientEnabled ? 'Encendidas' : 'Apagadas'}
                                            </span>
                                            <Switch
                                                enabled={clientEnabled}
                                                label={`Alertas de ${group.label}`}
                                                onToggle={enabled =>
                                                    onChange({
                                                        ...settings,
                                                        disabledClientIds: toggleId(settings.disabledClientIds, group.clientId as string, enabled),
                                                    })
                                                }
                                            />
                                        </div>
                                    )}
                                </div>

                                {group.processes.length === 0 ? (
                                    <p className="px-4 py-3 text-sm text-gray-500">
                                        Este cliente no tiene procesos en curso. El interruptor aplica a los que se abran después.
                                    </p>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {group.processes.map(process => {
                                            const processDisabled = settings.disabledProcessIds.includes(process.id);
                                            const enabled = clientEnabled && !processDisabled;
                                            return (
                                                <li key={process.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                                    <div className="min-w-0">
                                                        <p className="text-sm text-gray-800 truncate">{process.title}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {process.isBulkProcess ? 'Proceso masivo' : 'Proceso normal'}
                                                            {clientDisabled ? ' · apagado por el cliente' : ''}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-xs text-gray-500">
                                                            {enabled ? 'Encendida' : 'Apagada'}
                                                        </span>
                                                        <Switch
                                                            enabled={enabled}
                                                            disabled={clientDisabled}
                                                            label={`Alertas de ${process.title}`}
                                                            onToggle={nextEnabled =>
                                                                onChange({
                                                                    ...settings,
                                                                    disabledProcessIds: toggleId(settings.disabledProcessIds, process.id, nextEnabled),
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
