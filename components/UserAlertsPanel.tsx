import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Bell,
    X,
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

const SESSION_SHOWN_KEY = 'ats_alerts_shown_session_';
const SPORADIC_SEEN_KEY = 'ats_alerts_sporadic_seen_';

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
    onSporadicAlert?: (alert: UserAlert) => void;
}

export const UserAlertsPanel: React.FC<UserAlertsPanelProps> = ({
    currentUser,
    processes,
    onNavigateToProcess,
    onSporadicAlert,
}) => {
    const [alerts, setAlerts] = useState<UserAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showBellList, setShowBellList] = useState(false);
    const sporadicSeenRef = useRef<Set<string>>(new Set());

    const loadAlerts = useCallback(async () => {
        try {
            const bulkProcessIds = processes
                .filter(p => p.isBulkProcess && p.status === 'en_proceso')
                .map(p => p.id);

            const [bulkRows, standardRows] = await Promise.all([
                userAlertsApi.fetchBulkCandidates(bulkProcessIds),
                userAlertsApi.fetchStandardCandidates(processes),
            ]);

            const computed = computeUserAlerts(
                processes,
                bulkRows,
                standardRows,
                currentUser.id
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
    }, [processes, currentUser.id]);

    useEffect(() => {
        void loadAlerts().then(computed => {
            if (computed.length === 0) return;
            try {
                const sessionKey = `${SESSION_SHOWN_KEY}${currentUser.id}`;
                if (!sessionStorage.getItem(sessionKey)) {
                    setShowModal(true);
                    sessionStorage.setItem(sessionKey, '1');
                }
            } catch { /* ignore */ }
        });
    }, [loadAlerts, currentUser.id]);

    useEffect(() => {
        const interval = setInterval(() => {
            void loadAlerts().then(computed => {
                const sporadic = getSporadicAlerts(computed);
                for (const alert of sporadic) {
                    if (sporadicSeenRef.current.has(alert.id)) continue;
                    sporadicSeenRef.current.add(alert.id);
                    onSporadicAlert?.(alert);
                }
            });
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [loadAlerts, onSporadicAlert]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(`${SPORADIC_SEEN_KEY}${currentUser.id}`);
            if (stored) {
                sporadicSeenRef.current = new Set(JSON.parse(stored) as string[]);
            }
        } catch { /* ignore */ }
    }, [currentUser.id]);

    useEffect(() => {
        if (sporadicSeenRef.current.size > 0) {
            try {
                localStorage.setItem(
                    `${SPORADIC_SEEN_KEY}${currentUser.id}`,
                    JSON.stringify([...sporadicSeenRef.current])
                );
            } catch { /* ignore */ }
        }
    });

    const urgentCount = alerts.filter(a => a.severity === 'urgent' || a.severity === 'warning').length;

    const AlertCard: React.FC<{ alert: UserAlert; compact?: boolean }> = ({
        alert,
        compact,
    }) => {
        const style = SEVERITY_STYLES[alert.severity];
        const TypeIcon = TYPE_ICONS[alert.type];
        const Icon = style.icon;

        return (
            <div
                className={`rounded-lg border p-3 ${style.border} ${style.bg} ${
                    compact ? '' : 'mb-2'
                }`}
            >
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
                        {alert.processId && onNavigateToProcess && (
                            <button
                                onClick={() => {
                                    onNavigateToProcess(alert.processId!);
                                    setShowModal(false);
                                    setShowBellList(false);
                                }}
                                className="mt-2 text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-0.5"
                            >
                                Ir al proceso <ChevronRight className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    {!compact && <Icon className={`w-4 h-4 shrink-0 ${style.iconClass}`} />}
                </div>
            </div>
        );
    };

    if (loading && alerts.length === 0) return null;

    return (
        <>
            <button
                onClick={() => {
                    setShowBellList(v => !v);
                    void loadAlerts();
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

            {showBellList && (
                <>
                    <div
                        className="fixed inset-0 z-[48]"
                        onClick={() => setShowBellList(false)}
                    />
                    <div className="absolute bottom-full right-0 mb-2 w-80 sm:w-96 max-h-[min(400px,60vh)] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-[49] p-3">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-gray-900">Avisos</h3>
                            <button
                                onClick={() => setShowBellList(false)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        {alerts.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">
                                Sin avisos pendientes
                            </p>
                        ) : (
                            alerts.map(alert => (
                                <AlertCard key={alert.id} alert={alert} compact />
                            ))
                        )}
                    </div>
                </>
            )}

            {showModal && alerts.length > 0 && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Resumen de avisos
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Hola {currentUser.name.split(' ')[0]}, esto requiere tu atención
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            {alerts.map(alert => (
                                <AlertCard key={alert.id} alert={alert} />
                            ))}
                        </div>
                        <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
