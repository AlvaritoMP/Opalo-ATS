import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    LineChart,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    ArrowRightLeft,
    Brain,
    Briefcase,
    Phone,
    RefreshCw,
    TrendingDown,
    TrendingUp,
    UserCheck,
    Users,
} from 'lucide-react';
import { useAppState } from '../App';
import type { ContactConsultantPeriod } from '../lib/contactDashboardStats';
import {
    buildUserLookupForStats,
    enrichContactAttemptsForStats,
} from '../lib/dashboardActorNames';
import { bulkProcessActivityApi, type BulkProcessActivityEntry } from '../lib/api/bulkProcessActivity';
import {
    buildMultiProcessDailyInflow,
    buildTeamDailyEvolution,
    computePortfolioStatusCounts,
    computeProcessIntelligenceRows,
    computeUserPerformanceRows,
    type ProcessIntelligenceRow,
} from '../lib/intelligenceAnalytics';
import { PROCESS_STATUS_COLORS } from '../lib/processStatus';
import type { ProcessStatus } from '../types';

const MeasuredChartArea: React.FC<{
    height: number;
    children: (size: { width: number; height: number }) => React.ReactNode;
}> = ({ height, children }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<{ width: number; height: number } | null>(null);

    const updateSize = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const width = el.getBoundingClientRect().width || el.clientWidth || 320;
        if (width > 0) {
            setSize(prev => (prev?.width === width && prev?.height === height ? prev : { width, height }));
        }
    }, [height]);

    useEffect(() => {
        updateSize();
        const raf = requestAnimationFrame(updateSize);
        const timer = window.setTimeout(updateSize, 150);
        const el = containerRef.current;
        if (!el || typeof ResizeObserver === 'undefined') {
            return () => {
                cancelAnimationFrame(raf);
                window.clearTimeout(timer);
            };
        }
        const observer = new ResizeObserver(updateSize);
        observer.observe(el);
        return () => {
            cancelAnimationFrame(raf);
            window.clearTimeout(timer);
            observer.disconnect();
        };
    }, [updateSize]);

    return (
        <div ref={containerRef} className="min-w-0 w-full" style={{ height }}>
            {size ? children(size) : null}
        </div>
    );
};

const KpiCard: React.FC<{
    icon: React.ElementType;
    label: string;
    value: string | number;
    hint: string;
    tone: string;
}> = ({ icon: Icon, label, value, hint, tone }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex gap-3">
        <div className={`p-2.5 rounded-lg flex-shrink-0 ${tone}`}>
            <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{hint}</p>
        </div>
    </div>
);

type SortKey = keyof Pick<
    ProcessIntelligenceRow,
    | 'newPerHour'
    | 'newInPeriod'
    | 'newLast24h'
    | 'desistedRatio'
    | 'transfersOut'
    | 'transfersIn'
    | 'hired'
    | 'conversionPct'
    | 'contactRate'
    | 'totalCandidates'
    | 'title'
>;

export const IntelligenceView: React.FC = () => {
    const { state, actions } = useAppState();
    const {
        processes,
        candidates: allCandidates,
        users,
        currentUser,
        dashboardCache,
        dashboardCacheLoading,
    } = state;

    const [period, setPeriod] = useState<ContactConsultantPeriod>('month');
    const [transferActivity, setTransferActivity] = useState<BulkProcessActivityEntry[]>([]);
    const [transfersLoading, setTransfersLoading] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey>('newPerHour');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [statusFilter, setStatusFilter] = useState<'all' | ProcessStatus>('all');

    const statsUsers = useMemo(
        () => buildUserLookupForStats(users, currentUser),
        [users, currentUser]
    );

    const visibleProcesses = useMemo(() => {
        if (!currentUser?.allowedClientIds?.length) return processes;
        const allowed = new Set(currentUser.allowedClientIds);
        return processes.filter(p => p.clientId && allowed.has(p.clientId));
    }, [processes, currentUser]);

    const processIds = useMemo(() => visibleProcesses.map(p => p.id), [visibleProcesses]);

    useEffect(() => {
        if (!dashboardCache && !dashboardCacheLoading) {
            const timer = window.setTimeout(() => {
                void actions.loadDashboardCache();
            }, 400);
            return () => window.clearTimeout(timer);
        }
    }, [dashboardCache, dashboardCacheLoading, actions]);

    const loadTransfers = useCallback(async () => {
        if (processIds.length === 0) {
            setTransferActivity([]);
            return;
        }
        setTransfersLoading(true);
        try {
            const rows = await bulkProcessActivityApi.getTransfersForProcesses(processIds);
            setTransferActivity(rows);
        } catch {
            setTransferActivity([]);
        } finally {
            setTransfersLoading(false);
        }
    }, [processIds]);

    useEffect(() => {
        void loadTransfers();
    }, [loadTransfers]);

    const bulkPoolCandidates = useMemo(() => {
        if (!dashboardCache) return [];
        const ids = new Set(processIds);
        return dashboardCache.bulkPoolCandidates.filter(c => ids.has(c.processId));
    }, [dashboardCache, processIds]);

    const analyticsCandidates = useMemo(() => {
        const standardIds = new Set(
            visibleProcesses.filter(p => !p.isBulkProcess).map(p => p.id)
        );
        const standard = allCandidates.filter(c => standardIds.has(c.processId));
        return [...standard, ...bulkPoolCandidates];
    }, [allCandidates, bulkPoolCandidates, visibleProcesses]);

    const contactAttempts = useMemo(() => {
        if (!dashboardCache) return [];
        const ids = new Set(processIds);
        const raw = dashboardCache.contactAttempts.filter(a => ids.has(a.processId));
        return enrichContactAttemptsForStats(raw, statsUsers);
    }, [dashboardCache, processIds, statsUsers]);

    const contactSummaries = useMemo(() => {
        if (!dashboardCache) return {};
        const ids = new Set(processIds);
        const out: typeof dashboardCache.bulkContactSummaries = {};
        for (const [id, summary] of Object.entries(dashboardCache.bulkContactSummaries)) {
            if (ids.has(summary.processId)) out[id] = summary;
        }
        return out;
    }, [dashboardCache, processIds]);

    const bulkHiringActorsByProcess = useMemo(() => {
        if (!dashboardCache) return {};
        const ids = new Set(processIds);
        const out: typeof dashboardCache.bulkHiringActorsByProcess = {};
        for (const [processId, actors] of Object.entries(dashboardCache.bulkHiringActorsByProcess)) {
            if (ids.has(processId)) out[processId] = actors;
        }
        return out;
    }, [dashboardCache, processIds]);

    const inflow = useMemo(
        () => buildMultiProcessDailyInflow(analyticsCandidates, visibleProcesses, period),
        [analyticsCandidates, visibleProcesses, period]
    );

    const userRows = useMemo(
        () =>
            computeUserPerformanceRows(
                contactAttempts,
                analyticsCandidates,
                visibleProcesses,
                statsUsers,
                bulkHiringActorsByProcess,
                period
            ),
        [
            contactAttempts,
            analyticsCandidates,
            visibleProcesses,
            statsUsers,
            bulkHiringActorsByProcess,
            period,
        ]
    );

    const teamDaily = useMemo(
        () =>
            buildTeamDailyEvolution(
                contactAttempts,
                analyticsCandidates,
                visibleProcesses,
                statsUsers,
                bulkHiringActorsByProcess,
                period
            ),
        [
            contactAttempts,
            analyticsCandidates,
            visibleProcesses,
            statsUsers,
            bulkHiringActorsByProcess,
            period,
        ]
    );

    const processRows = useMemo(
        () =>
            computeProcessIntelligenceRows(
                analyticsCandidates,
                visibleProcesses,
                contactAttempts,
                transferActivity,
                contactSummaries,
                bulkHiringActorsByProcess,
                period
            ),
        [
            analyticsCandidates,
            visibleProcesses,
            contactAttempts,
            transferActivity,
            contactSummaries,
            bulkHiringActorsByProcess,
            period,
        ]
    );

    const portfolio = useMemo(
        () => computePortfolioStatusCounts(visibleProcesses),
        [visibleProcesses]
    );

    const filteredProcessRows = useMemo(() => {
        const base =
            statusFilter === 'all'
                ? processRows
                : processRows.filter(r => r.status === statusFilter);
        const dir = sortDir === 'asc' ? 1 : -1;
        return [...base].sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            if (typeof av === 'string' && typeof bv === 'string') {
                return av.localeCompare(bv, 'es') * dir;
            }
            return ((av as number) - (bv as number)) * dir;
        });
    }, [processRows, statusFilter, sortKey, sortDir]);

    const bestEffectiveness = useMemo(() => {
        const eligible = userRows.filter(u => u.calls >= 5);
        if (eligible.length === 0) return userRows.find(u => u.effectivenessPct > 0) || null;
        return [...eligible].sort((a, b) => b.effectivenessPct - a.effectivenessPct)[0] || null;
    }, [userRows]);

    const topHirer = useMemo(
        () => [...userRows].sort((a, b) => b.hires - a.hires)[0] || null,
        [userRows]
    );

    const totalHires = userRows.reduce((s, u) => s + u.hires, 0);
    const totalCalls = userRows.reduce((s, u) => s + u.calls, 0);
    const loading = (dashboardCacheLoading && !dashboardCache) || transfersLoading;

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir(key === 'title' ? 'asc' : 'desc');
        }
    };

    const sortMark = (key: SortKey) =>
        sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

    const handleRefresh = async () => {
        await actions.loadDashboardCache(true);
        await loadTransfers();
    };

    return (
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-primary-700 mb-1">
                        <Brain className="w-6 h-6" />
                        <h1 className="text-2xl font-bold text-gray-900">Inteligencia</h1>
                    </div>
                    <p className="text-sm text-gray-500 max-w-2xl">
                        Vista ejecutiva del flujo de postulantes, desempeño del equipo y salud de la
                        cartera de procesos. Acceso restringido a administración / supervisión.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={period}
                        onChange={e => setPeriod(e.target.value as ContactConsultantPeriod)}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    >
                        <option value="week">Última semana</option>
                        <option value="month">Último mes</option>
                        <option value="year">Último año</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => void handleRefresh()}
                        disabled={loading}
                        className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                    icon={Users}
                    label="Nuevos postulantes"
                    value={inflow.totalInflow}
                    hint={`${inflow.periodLabel} · prom. ${inflow.dailyAverage}/día`}
                    tone="bg-blue-600"
                />
                <KpiCard
                    icon={Phone}
                    label="Llamadas del equipo"
                    value={totalCalls}
                    hint={
                        bestEffectiveness
                            ? `Mayor efectividad: ${bestEffectiveness.name} (${bestEffectiveness.effectivenessPct}%)`
                            : 'Sin datos de llamadas'
                    }
                    tone="bg-emerald-600"
                />
                <KpiCard
                    icon={UserCheck}
                    label="Contrataciones"
                    value={totalHires}
                    hint={
                        topHirer?.hires
                            ? `Lidera ${topHirer.name} (${topHirer.hires})`
                            : 'Sin contrataciones en el periodo'
                    }
                    tone="bg-violet-600"
                />
                <KpiCard
                    icon={Briefcase}
                    label="Cartera de procesos"
                    value={portfolio.total}
                    hint={`En proceso ${portfolio.en_proceso} · Stand by ${portfolio.standby} · Terminados ${portfolio.terminado}`}
                    tone="bg-slate-700"
                />
            </div>

            {/* Flujo comparativo */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-6 space-y-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        Flujo diario de nuevos postulantes
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Comparación entre procesos (hasta 8 con más ingreso) y totalización del
                        flujo. Pico:{' '}
                        {inflow.peakDay
                            ? `${inflow.peakDay.label} (${inflow.peakDay.total})`
                            : 'sin pico destacado'}
                        .
                    </p>
                </div>

                {inflow.rows.some(r => Number(r.total) > 0) ? (
                    <div className="grid lg:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                                Comparativo por proceso
                            </p>
                            <MeasuredChartArea height={280}>
                                {({ width, height }) => (
                                    <LineChart width={width} height={height} data={inflow.rows}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        {inflow.processSeries.map(series => (
                                            <Line
                                                key={series.processId}
                                                type="monotone"
                                                dataKey={series.dataKey}
                                                name={series.shortTitle}
                                                stroke={series.color}
                                                strokeWidth={2}
                                                dot={false}
                                                isAnimationActive={false}
                                            />
                                        ))}
                                    </LineChart>
                                )}
                            </MeasuredChartArea>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                                Total del flujo (todos los procesos)
                            </p>
                            <MeasuredChartArea height={280}>
                                {({ width, height }) => (
                                    <ComposedChart width={width} height={height} data={inflow.rows}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Bar dataKey="total" name="Total día" fill="#2563eb" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                        <Line
                                            type="monotone"
                                            dataKey="total"
                                            name="Tendencia"
                                            stroke="#0f172a"
                                            strokeWidth={2}
                                            dot={false}
                                            isAnimationActive={false}
                                        />
                                    </ComposedChart>
                                )}
                            </MeasuredChartArea>
                            <p className="text-center text-sm text-gray-600 mt-2">
                                Total periodo: <strong>{inflow.totalInflow}</strong> · Promedio diario:{' '}
                                <strong>{inflow.dailyAverage}</strong>
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                        {loading ? 'Cargando datos…' : 'Sin ingresos de postulantes en el periodo.'}
                    </div>
                )}
            </section>

            {/* Desempeño usuarios */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-6 space-y-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Phone className="w-5 h-5 text-emerald-600" />
                        Desempeño por usuario
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Llamadas, efectividad, respuestas de interés/desistimiento y contrataciones
                        generadas en el periodo.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                    <div className="overflow-x-auto border border-gray-100 rounded-lg">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-3 py-2">Usuario</th>
                                    <th className="px-3 py-2 text-right">Llamadas</th>
                                    <th className="px-3 py-2 text-right">Efectivas</th>
                                    <th className="px-3 py-2 text-right">% Efec.</th>
                                    <th className="px-3 py-2 text-right">Interés</th>
                                    <th className="px-3 py-2 text-right">Desistió</th>
                                    <th className="px-3 py-2 text-right">Contrat.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {userRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                                            Sin actividad de contactología en el periodo.
                                        </td>
                                    </tr>
                                ) : (
                                    userRows.slice(0, 15).map(row => (
                                        <tr key={row.name} className="border-t border-gray-100">
                                            <td className="px-3 py-2 font-medium text-gray-800">{row.name}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{row.calls}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{row.effectiveCalls}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{row.effectivenessPct}%</td>
                                            <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{row.interested}</td>
                                            <td className="px-3 py-2 text-right tabular-nums text-amber-700">{row.notInterested}</td>
                                            <td className="px-3 py-2 text-right tabular-nums font-semibold">{row.hires}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                            Evolución diaria del equipo
                        </p>
                        {teamDaily.some(d => d.calls > 0 || d.hires > 0) ? (
                            <MeasuredChartArea height={300}>
                                {({ width, height }) => (
                                    <ComposedChart width={width} height={height} data={teamDaily}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                        <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
                                        <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <Bar yAxisId="left" dataKey="calls" name="Llamadas" fill="#94a3b8" isAnimationActive={false} />
                                        <Bar yAxisId="left" dataKey="effective" name="Efectivas" fill="#059669" isAnimationActive={false} />
                                        <Line
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="hires"
                                            name="Contrataciones"
                                            stroke="#7c3aed"
                                            strokeWidth={2}
                                            isAnimationActive={false}
                                        />
                                    </ComposedChart>
                                )}
                            </MeasuredChartArea>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm border border-dashed border-gray-200 rounded-lg">
                                Sin evolución diaria para graficar.
                            </div>
                        )}
                    </div>
                </div>

                {userRows.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                            Volumen de llamadas vs contrataciones
                        </p>
                        <MeasuredChartArea height={240}>
                            {({ width, height }) => (
                                <BarChart
                                    width={width}
                                    height={height}
                                    data={userRows.slice(0, 8)}
                                    layout="vertical"
                                    margin={{ left: 8, right: 16 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar dataKey="calls" name="Llamadas" fill="#64748b" isAnimationActive={false} />
                                    <Bar dataKey="hires" name="Contrataciones" fill="#7c3aed" isAnimationActive={false} />
                                </BarChart>
                            )}
                        </MeasuredChartArea>
                    </div>
                )}
            </section>

            {/* Resumen procesos */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <ArrowRightLeft className="w-5 h-5 text-slate-700" />
                            Resumen de procesos
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Ingresos/hora, desistimiento, traspasos, estado y ratios clave. Ordena
                            columnas para priorizar atención.
                        </p>
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as 'all' | ProcessStatus)}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="en_proceso">En Proceso</option>
                        <option value="standby">Stand By</option>
                        <option value="terminado">Terminado</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="trunco">Trunco</option>
                    </select>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                    {(
                        [
                            ['en_proceso', portfolio.en_proceso],
                            ['standby', portfolio.standby],
                            ['terminado', portfolio.terminado],
                            ['cancelado', portfolio.cancelado],
                            ['trunco', portfolio.trunco],
                        ] as const
                    ).map(([status, count]) => (
                        <span
                            key={status}
                            className={`px-2.5 py-1 rounded-full font-medium ${PROCESS_STATUS_COLORS[status]}`}
                        >
                            {status === 'en_proceso'
                                ? 'En Proceso'
                                : status === 'standby'
                                  ? 'Stand By'
                                  : status === 'terminado'
                                    ? 'Terminado'
                                    : status === 'cancelado'
                                      ? 'Cancelado'
                                      : 'Trunco'}
                            : {count}
                        </span>
                    ))}
                </div>

                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-3 py-2 cursor-pointer whitespace-nowrap" onClick={() => toggleSort('title')}>
                                    Proceso{sortMark('title')}
                                </th>
                                <th className="px-3 py-2 whitespace-nowrap">Estado</th>
                                <th className="px-3 py-2 text-right cursor-pointer whitespace-nowrap" onClick={() => toggleSort('newPerHour')}>
                                    Ing./h{sortMark('newPerHour')}
                                </th>
                                <th className="px-3 py-2 text-right cursor-pointer whitespace-nowrap" onClick={() => toggleSort('newLast24h')}>
                                    24h{sortMark('newLast24h')}
                                </th>
                                <th className="px-3 py-2 text-right cursor-pointer whitespace-nowrap" onClick={() => toggleSort('newInPeriod')}>
                                    Periodo{sortMark('newInPeriod')}
                                </th>
                                <th className="px-3 py-2 text-right cursor-pointer whitespace-nowrap" onClick={() => toggleSort('desistedRatio')}>
                                    <span className="inline-flex items-center gap-1">
                                        <TrendingDown className="w-3 h-3" /> Desist.%{sortMark('desistedRatio')}
                                    </span>
                                </th>
                                <th className="px-3 py-2 text-right cursor-pointer whitespace-nowrap" onClick={() => toggleSort('transfersOut')}>
                                    Traspasos ↑{sortMark('transfersOut')}
                                </th>
                                <th className="px-3 py-2 text-right cursor-pointer whitespace-nowrap" onClick={() => toggleSort('transfersIn')}>
                                    Traspasos ↓{sortMark('transfersIn')}
                                </th>
                                <th className="px-3 py-2 text-right cursor-pointer whitespace-nowrap" onClick={() => toggleSort('contactRate')}>
                                    Contacto%{sortMark('contactRate')}
                                </th>
                                <th className="px-3 py-2 text-right cursor-pointer whitespace-nowrap" onClick={() => toggleSort('conversionPct')}>
                                    Conv.%{sortMark('conversionPct')}
                                </th>
                                <th className="px-3 py-2 text-right cursor-pointer whitespace-nowrap" onClick={() => toggleSort('hired')}>
                                    Contrat.{sortMark('hired')}
                                </th>
                                <th className="px-3 py-2 text-right cursor-pointer whitespace-nowrap" onClick={() => toggleSort('totalCandidates')}>
                                    Total{sortMark('totalCandidates')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProcessRows.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="px-3 py-8 text-center text-gray-500">
                                        No hay procesos para el filtro seleccionado.
                                    </td>
                                </tr>
                            ) : (
                                filteredProcessRows.map(row => (
                                    <tr key={row.processId} className="border-t border-gray-100 hover:bg-gray-50/80">
                                        <td className="px-3 py-2">
                                            <div className="font-medium text-gray-800 max-w-[220px] truncate" title={row.title}>
                                                {row.title}
                                            </div>
                                            {row.isBulk && (
                                                <span className="text-[10px] text-primary-600 font-medium">Masivo</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${PROCESS_STATUS_COLORS[row.status]}`}>
                                                {row.statusLabel}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-blue-700">
                                            {row.newPerHour}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums">{row.newLast24h}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{row.newInPeriod}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">
                                            <span className={row.desistedRatio >= 20 ? 'text-amber-700 font-medium' : ''}>
                                                {row.desistedRatio}%
                                            </span>
                                            <span className="text-gray-400 text-xs ml-1">({row.desisted})</span>
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums">{row.transfersOut}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{row.transfersIn}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{row.contactRate}%</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{row.conversionPct}%</td>
                                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{row.hired}</td>
                                        <td className="px-3 py-2 text-right tabular-nums text-gray-600">{row.totalCandidates}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};
