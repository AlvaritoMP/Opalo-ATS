import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Bell,
    AlertTriangle,
    Info,
    Clock,
    Users,
    Megaphone,
    Unlock,
    ChevronRight,
} from 'lucide-react';
import type { Process, User, UserAlert } from '../types';
import { userAlertsApi } from '../lib/api/userAlerts';
import { computeUserAlerts, getSporadicAlerts } from '../lib/userAlerts';
import { getProcessesVisibleToUser } from '../lib/userAlertAccess';
import {
    filterPendingAlerts,
    isAlertPending,
    loadAlertAcknowledgements,
    saveAlertAcknowledgement,
} from '../lib/userAlertAck';

const SEVERITY_STYLES = {
    urgent: {
        border: 'border-red-200',
        bg: 'bg-red-50',
        icon: AlertTriangle,
        iconClass: 'text-red-600',
        badge: 'bg-red-100 text-red-800',
    },
    warning: {
        border: 'border-amber-200',
        bg: 'bg-amber-50',
        icon: Clock,
        iconClass: 'text-amber-600',
        badge: 'bg-amber-100 text-amber-800',
    },
    info: {
        border: 'border-blue-200',
        bg: 'bg-blue-50',
        icon: Info,
        iconClass: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-800',
    },
};

const TYPE_ICONS: Record<UserAlert['type'], React.ElementType> = {
    new_candidates: Users,
    stale_without_contact: Clock,
    lock_expired: Unlock,
    no_new_in_process: Megaphone,
};

interface UserAlertsPanelProps {
    currentUser: User;
    processes: Process[];
    onNavigateToProcess?: (processId: string) => void;
}

export const UserAlertsPanel: React.FC<UserAlertsPanelProps> = ({
    currentUser,
    processes,
    onNavigateToProcess,
}) => {
    const [alerts, setAlerts] = useState<UserAlert[]>([]);
    const [acks, setAcks] = useState<Record<string, string>>(() =>
        loadAlertAcknowledgements(currentUser.id)
    );
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const pendingAlerts = useMemo(
        () => filterPendingAlerts(alerts, acks),
        [alerts, acks]
    );

    const loadAlerts = useCallback(async () => {
        try {
            const visible = getProcessesVisibleToUser(currentUser, processes);
            const bulkProcessIds = visible.filter(p => p.isBulkProcess).map(p => p.id);
            const standardProcessIds = visible.filter(p => !p.isBulkProcess).map(p => p.id);

            const [bulkRows, standardRows, latestBulkCreatedAt] = await Promise.all([
                userAlertsApi.fetchBulkCandidates(bulkProcessIds, currentUser.id, currentUser.name),
                userAlertsApi.fetchStandardCandidates(standardProcessIds, currentUser.id),
                userAlertsApi.fetchLatestCandidateCreatedAt(bulkProcessIds),
            ]);

            const computed = computeUserAlerts(
                processes,
                bulkRows,
                standardRows,
                currentUser,
                latestBulkCreatedAt
            );
            setAlerts(computed);
            return computed;
        } catch (err) {
            console.warn('No se pudieron calcular avisos:', err);
            setAlerts([]);
            return [];
        } finally {
            setLoading(false);
        }
    }, [processes, currentUser]);

    useEffect(() => {
        void loadAlerts().then(computed => {
            const currentAcks = loadAlertAcknowledgements(currentUser.id);
            const pending = filterPendingAlerts(computed, currentAcks);
            if (pending.length > 0) setShowModal(true);
        });
    }, [loadAlerts, currentUser.id]);

    useEffect(() => {
        const interval = setInterval(() => {
            void loadAlerts().then(computed => {
                const sporadic = getSporadicAlerts(computed);
                const hasNewPending = sporadic.some(a => isAlertPending(a, acks));
                if (hasNewPending) setShowModal(true);
            });
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [loadAlerts, acks]);

    const acknowledgeAlert = (alert: UserAlert) => {
        setAcks(prev => saveAlertAcknowledgement(currentUser.id, alert, prev));
    };

    const allPendingRead = pendingAlerts.length === 0;

    const urgentCount = pendingAlerts.filter(
        a => a.severity === 'urgent' || a.severity === 'warning'
    ).length;

    const AlertCard: React.FC<{ alert: UserAlert }> = ({ alert }) => {
        const style = SEVERITY_STYLES[alert.severity];
        const TypeIcon = TYPE_ICONS[alert.type];
        const Icon = style.icon;

        return (
            <div className={`rounded-lg border p-3 mb-3 ${style.border} ${style.bg}`}>
                <div className="flex items-start gap-2.5">
                    <div className={`mt-0.5 ${style.iconClass}`}>
                        <TypeIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">
                                {alert.title}
                            </span>
                            {alert.count != null && alert.count > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${style.badge}`}>
                                    {alert.count}
                                </span>
                            )}
                        </div>
                        {alert.processTitle && (
                            <p className="text-xs text-gray-500 mt-0.5">{alert.processTitle}</p>
                        )}
                        <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                        {alert.candidateNames && alert.candidateNames.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                                {alert.candidateNames.join(', ')}
                                {(alert.count || 0) > 5 ? '…' : ''}
                            </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {alert.processId && onNavigateToProcess && (
                                <button
                                    onClick={() => onNavigateToProcess(alert.processId!)}
                                    className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-0.5"
                                >
                                    Ir al proceso <ChevronRight className="w-3 h-3" />
                                </button>
                            )}
                            <button
                                onClick={() => acknowledgeAlert(alert)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 font-medium"
                            >
                                Confirmar lectura
                            </button>
                        </div>
                    </div>
                    <Icon className={`w-4 h-4 shrink-0 ${style.iconClass}`} />
                </div>
            </div>
        );
    };

    if (loading && alerts.length === 0) return null;

    return (
        <>
            <button
                onClick={() => {
                    void loadAlerts().then(() => setShowModal(true));
                }}
                className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                title="Avisos"
            >
                <Bell className="w-5 h-5" />
                {urgentCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                        {urgentCount > 9 ? '9+' : urgentCount}
                    </span>
                )}
            </button>

            {showModal &&
                createPortal(
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <h2 className="text-lg font-semibold text-gray-900">Avisos</h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Hola {currentUser.name.split(' ')[0]}, confirma la lectura de
                                    cada aviso para continuar.
                                </p>
                                {pendingAlerts.length > 0 && (
                                    <p className="text-xs text-amber-700 mt-2">
                                        {pendingAlerts.length} aviso(s) pendiente(s) de confirmar
                                    </p>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto px-5 py-4">
                                {pendingAlerts.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-8">
                                        Sin avisos pendientes
                                    </p>
                                ) : (
                                    pendingAlerts.map(alert => (
                                        <AlertCard key={alert.id} alert={alert} />
                                    ))
                                )}
                            </div>
                            <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
                                <button
                                    onClick={() => setShowModal(false)}
                                    disabled={!allPendingRead}
                                    className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {allPendingRead ? 'Cerrar' : 'Confirma todos los avisos'}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
};
