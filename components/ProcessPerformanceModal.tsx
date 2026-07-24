import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    CalendarRange,
    Download,
    Loader2,
    Target,
    TrendingUp,
    UserMinus,
    UserPlus,
    Users,
    X,
    CheckSquare,
    Square,
    FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppState } from '../App';
import type { Process } from '../types';
import {
    fetchFinalStageArrivals,
    fetchProcessCoverageSnapshot,
    fetchProcessDiscards,
} from '../lib/api/processCoverage';
import { fetchCandidateInflowRows } from '../lib/api/candidateInflow';
import { resolveHiringStageId } from '../lib/hiringStageTracking';
import { buildUserLookupForStats } from '../lib/dashboardActorNames';
import {
    buildProcessCoverageReport,
    COVERAGE_PERIOD_OPTIONS,
    consolidateArrivalsForDays,
    coverageGranularityLabel,
    coverageStartKeyToIso,
    aggregateConsultantDailyForChart,
    aggregateDailyCountsForChart,
    formatDateTimeLima,
    getCoverageChartAxisConfig,
    getCoveragePeriodRange,
    resolveCoverageChartGranularity,
    type CoverageChartBucket,
    type CoveragePeriod,
    type FinalStageArrivalDetail,
    type ProcessCoverageReport,
} from '../lib/processCoverageAnalytics';

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

const Kpi: React.FC<{
    icon: React.ElementType;
    label: string;
    value: string | number;
    hint: string;
    tone: string;
}> = ({ icon: Icon, label, value, hint, tone }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3.5 flex gap-3">
        <div className={`p-2 rounded-lg flex-shrink-0 ${tone}`}>
            <Icon className="w-4.5 h-4.5 text-white w-4 h-4" />
        </div>
        <div className="min-w-0">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight">{value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{hint}</p>
        </div>
    </div>
);

const REASON_COLORS = ['#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d', '#0891b2', '#7c3aed', '#64748b'];

function safeSheetName(name: string): string {
    return name.replace(/[\\/?*[\]]/g, '').slice(0, 31) || 'Hoja';
}

function exportArrivalsSheet(
    arrivals: FinalStageArrivalDetail[],
    fileName: string,
    sheetName = 'Llegadas etapa final'
) {
    const rows = arrivals.map(a => ({
        Candidato: a.name,
        Email: a.email,
        Teléfono: a.phone || '',
        Consultor: a.consultant,
        'Fecha y hora': formatDateTimeLima(a.movedAt),
        Día: a.dateKey,
        Descartado: a.discarded ? 'Sí' : 'No',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheetName));
    XLSX.writeFile(wb, fileName);
}

interface ProcessPerformanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    process: Process;
}

export const ProcessPerformanceModal: React.FC<ProcessPerformanceModalProps> = ({
    isOpen,
    onClose,
    process,
}) => {
    const { state } = useAppState();
    const [period, setPeriod] = useState<CoveragePeriod>('30d');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [useCustomRange, setUseCustomRange] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<ProcessCoverageReport | null>(null);
    const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
    const [consolidatedDays, setConsolidatedDays] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'day' | 'consolidated' | 'discards'>('day');

    const hiringStageId = useMemo(() => resolveHiringStageId(process), [process]);
    const hiringStageName = useMemo(() => {
        if (!hiringStageId) return 'Etapa final';
        return process.stages.find(s => s.id === hiringStageId)?.name || 'Etapa final';
    }, [process.stages, hiringStageId]);

    const statsUsers = useMemo(
        () => buildUserLookupForStats(state.users, state.currentUser),
        [state.users, state.currentUser]
    );

    const effectiveRange = useMemo(() => {
        if (useCustomRange && customFrom && customTo && customFrom <= customTo) {
            const start = new Date(`${customFrom}T12:00:00-05:00`);
            const end = new Date(`${customTo}T12:00:00-05:00`);
            const days =
                Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
            return {
                startKey: customFrom,
                endKey: customTo,
                label: `${customFrom} → ${customTo}`,
                days,
            };
        }
        return getCoveragePeriodRange(period);
    }, [period, useCustomRange, customFrom, customTo]);

    const loadReport = useCallback(async () => {
        if (!hiringStageId) {
            setError('Este proceso no tiene etapas configuradas.');
            setReport(null);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const sinceIso = coverageStartKeyToIso(effectiveRange.startKey);
            const [arrivals, discards, inflow, snapshot] = await Promise.all([
                fetchFinalStageArrivals(process.id, hiringStageId, sinceIso),
                fetchProcessDiscards(process.id, sinceIso),
                fetchCandidateInflowRows([process.id], sinceIso),
                fetchProcessCoverageSnapshot(process.id, hiringStageId, process.vacancies || 0),
            ]);
            const built = buildProcessCoverageReport({
                range: effectiveRange,
                snapshot,
                arrivals,
                discards,
                inflow,
                users: statsUsers,
            });
            setReport(built);
            setSelectedDayKey(prev => {
                if (prev) {
                    const stillThere =
                        built.arrivalsByDay[prev] ||
                        Object.keys(built.arrivalsByDay).some(k => k.startsWith(prev.slice(0, 7)));
                    if (stillThere || prev.length >= 7) return prev;
                }
                const peak = [...built.finalStageDaily].reverse().find(d => d.count > 0);
                return peak?.dateKey ?? null;
            });
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'No se pudo cargar el informe';
            setError(message);
            setReport(null);
        } finally {
            setLoading(false);
        }
    }, [process.id, process.vacancies, hiringStageId, effectiveRange, statsUsers]);

    useEffect(() => {
        if (!isOpen) return;
        void loadReport();
    }, [isOpen, loadReport]);

    useEffect(() => {
        if (!isOpen) {
            setConsolidatedDays(new Set());
            setSelectedDayKey(null);
            setActiveTab('day');
        }
    }, [isOpen]);

    const consolidatedArrivals = useMemo(() => {
        if (!report) return [];
        return consolidateArrivalsForDays(report, [...consolidatedDays]);
    }, [report, consolidatedDays]);

    const chartGranularity = useMemo(
        () => resolveCoverageChartGranularity(effectiveRange.days),
        [effectiveRange.days]
    );

    const chartFinal = useMemo(
        () => (report ? aggregateDailyCountsForChart(report.finalStageDaily, chartGranularity) : []),
        [report, chartGranularity]
    );
    const chartNew = useMemo(
        () => (report ? aggregateDailyCountsForChart(report.newCandidatesDaily, chartGranularity) : []),
        [report, chartGranularity]
    );
    const chartDiscards = useMemo(
        () => (report ? aggregateDailyCountsForChart(report.discardsDaily, chartGranularity) : []),
        [report, chartGranularity]
    );
    const chartConsultants = useMemo(() => {
        if (!report) return [];
        return aggregateConsultantDailyForChart(
            report.consultantDaily,
            report.consultantSeries.map(s => s.key),
            chartGranularity
        );
    }, [report, chartGranularity]);

    const xAxis = useMemo(
        () => getCoverageChartAxisConfig(chartFinal.length || effectiveRange.days, chartGranularity),
        [chartFinal.length, effectiveRange.days, chartGranularity]
    );

    const selectedBucket = useMemo(() => {
        if (!selectedDayKey) return null;
        return (
            chartFinal.find(
                b => b.bucketKey === selectedDayKey || b.dateKeys.includes(selectedDayKey)
            ) ?? null
        );
    }, [chartFinal, selectedDayKey]);

    const bucketArrivals = useMemo(() => {
        if (!report || !selectedBucket) return [];
        return consolidateArrivalsForDays(report, selectedBucket.dateKeys);
    }, [report, selectedBucket]);

    const bucketHasConsolidated = useMemo(() => {
        if (!selectedBucket) return false;
        return selectedBucket.dateKeys.every(k => consolidatedDays.has(k));
    }, [selectedBucket, consolidatedDays]);

    const toggleConsolidateDay = (dateKey: string) => {
        setConsolidatedDays(prev => {
            const next = new Set(prev);
            if (next.has(dateKey)) next.delete(dateKey);
            else next.add(dateKey);
            return next;
        });
    };

    const toggleConsolidateBucket = (bucket: CoverageChartBucket) => {
        setConsolidatedDays(prev => {
            const next = new Set(prev);
            const allIn = bucket.dateKeys.every(k => next.has(k));
            if (allIn) {
                for (const k of bucket.dateKeys) next.delete(k);
            } else {
                for (const k of bucket.dateKeys) next.add(k);
            }
            return next;
        });
    };

    const bucketPartiallyConsolidated = (bucket: CoverageChartBucket) =>
        bucket.dateKeys.some(k => consolidatedDays.has(k));

    const selectChartBucket = (bucketKey?: string) => {
        if (!bucketKey) return;
        setSelectedDayKey(bucketKey);
        setActiveTab('day');
    };

    const exportFullReport = () => {
        if (!report) return;
        const wb = XLSX.utils.book_new();
        const kpiRows = [
            { Indicador: 'Vacantes', Valor: report.kpis.vacancies },
            { Indicador: 'En etapa final (actual)', Valor: report.kpis.hiredNow },
            { Indicador: 'Cobertura %', Valor: report.kpis.coveragePct },
            { Indicador: 'Vacantes restantes', Valor: report.kpis.remainingVacancies },
            { Indicador: 'Pipeline activo', Valor: report.kpis.activePipeline },
            { Indicador: 'Descartados totales', Valor: report.kpis.discardedTotal },
            { Indicador: `Llegadas a ${hiringStageName} (${report.range.label})`, Valor: report.kpis.finalArrivalsInPeriod },
            { Indicador: `Candidatos nuevos (${report.range.label})`, Valor: report.kpis.newInPeriod },
            { Indicador: `Descartados (${report.range.label})`, Valor: report.kpis.discardedInPeriod },
            { Indicador: 'Ritmo diario etapa final', Valor: report.kpis.dailyFinalPace },
            { Indicador: 'Ritmo diario nuevos', Valor: report.kpis.dailyNewPace },
            { Indicador: 'Flujo neto (nuevos − descartes)', Valor: report.kpis.netFlowInPeriod },
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiRows), 'Resumen');

        const dailyRows = report.finalStageDaily.map(d => ({
            Día: d.dateKey,
            Etiqueta: d.label,
            'Llegadas etapa final': d.count,
            Nuevos: report.newCandidatesDaily.find(n => n.dateKey === d.dateKey)?.count ?? 0,
            Descartados: report.discardsDaily.find(n => n.dateKey === d.dateKey)?.count ?? 0,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), 'Diario');

        const arrivalRows = report.allArrivals.map(a => ({
            Candidato: a.name,
            Email: a.email,
            Teléfono: a.phone || '',
            Consultor: a.consultant,
            'Fecha y hora': formatDateTimeLima(a.movedAt),
            Día: a.dateKey,
            Descartado: a.discarded ? 'Sí' : 'No',
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(arrivalRows), 'Llegadas');

        const consultantRows = report.consultantRanking.map(r => ({
            Consultor: r.name,
            Llegadas: r.arrivals,
            '%': r.sharePct,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(consultantRows), 'Consultores');

        const reasonRows = report.discardReasons.map(r => ({
            Motivo: r.reason,
            Cantidad: r.count,
            '%': r.sharePct,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reasonRows), 'Motivos descarte');

        const discardDetailRows = report.discardsInPeriod.map(d => ({
            Candidato: d.name,
            Email: d.email,
            Teléfono: d.phone || '',
            Motivo: d.discardReason || 'Sin motivo registrado',
            'Fecha y hora': d.discardedAt ? formatDateTimeLima(d.discardedAt) : '',
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(discardDetailRows), 'Descartes');

        const stamp = effectiveRange.endKey.replace(/-/g, '');
        XLSX.writeFile(wb, `performance_${process.title.slice(0, 40)}_${stamp}.xlsx`);
    };

    if (!isOpen) return null;

    const periodUnitHint = coverageGranularityLabel(chartGranularity);
    const flowTitle =
        chartGranularity === 'day'
            ? `Flujo diario a ${hiringStageName}`
            : chartGranularity === 'week'
              ? `Flujo semanal a ${hiringStageName}`
              : `Flujo mensual a ${hiringStageName}`;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-4">
            <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
                <div className="bg-white border-b px-4 md:px-6 py-3 flex flex-wrap items-start justify-between gap-3 flex-shrink-0">
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-teal-700 uppercase tracking-wide">Informe de cobertura</p>
                        <h2 className="text-lg md:text-xl font-bold text-gray-900 truncate">{process.title}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Desempeño del proceso · Etapa final: <span className="font-medium text-gray-700">{hiringStageName}</span>
                            {report ? ` · ${report.range.label}` : ''}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={exportFullReport}
                            disabled={!report || loading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            Exportar informe
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
                            aria-label="Cerrar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="bg-white border-b px-4 md:px-6 py-2.5 flex flex-wrap items-center gap-3 flex-shrink-0">
                    <CalendarRange className="w-4 h-4 text-gray-400" />
                    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                        {COVERAGE_PERIOD_OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                    setUseCustomRange(false);
                                    setPeriod(opt.id);
                                }}
                                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                                    !useCustomRange && period === opt.id
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <label className="inline-flex items-center gap-1.5 text-gray-600">
                            <input
                                type="checkbox"
                                checked={useCustomRange}
                                onChange={e => setUseCustomRange(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            Rango personalizado
                        </label>
                        {useCustomRange && (
                            <>
                                <input
                                    type="date"
                                    value={customFrom}
                                    onChange={e => setCustomFrom(e.target.value)}
                                    className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                                />
                                <span className="text-gray-400">→</span>
                                <input
                                    type="date"
                                    value={customTo}
                                    onChange={e => setCustomTo(e.target.value)}
                                    className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                                />
                            </>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => void loadReport()}
                        disabled={loading}
                        className="ml-auto text-xs font-medium text-teal-700 hover:text-teal-900 disabled:opacity-50"
                    >
                        Actualizar
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
                    {loading && (
                        <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generando informe de cobertura…
                        </div>
                    )}
                    {error && !loading && (
                        <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
                            {error}
                        </div>
                    )}
                    {report && !loading && (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                                <Kpi
                                    icon={Target}
                                    label="Cobertura"
                                    value={`${report.kpis.coveragePct}%`}
                                    hint={`${report.kpis.hiredNow} / ${report.kpis.vacancies || '—'} vacantes`}
                                    tone="bg-teal-600"
                                />
                                <Kpi
                                    icon={TrendingUp}
                                    label="A etapa final"
                                    value={report.kpis.finalArrivalsInPeriod}
                                    hint={`${report.kpis.dailyFinalPace}/día · ${report.range.label}`}
                                    tone="bg-blue-600"
                                />
                                <Kpi
                                    icon={UserPlus}
                                    label="Nuevos"
                                    value={report.kpis.newInPeriod}
                                    hint={`${report.kpis.dailyNewPace}/día en el período`}
                                    tone="bg-emerald-600"
                                />
                                <Kpi
                                    icon={UserMinus}
                                    label="Descartados"
                                    value={report.kpis.discardedInPeriod}
                                    hint={`${report.kpis.discardedTotal} acumulados en el proceso`}
                                    tone="bg-rose-600"
                                />
                                <Kpi
                                    icon={Users}
                                    label="Pipeline activo"
                                    value={report.kpis.activePipeline}
                                    hint={`${report.kpis.remainingVacancies} vacantes por cubrir`}
                                    tone="bg-indigo-600"
                                />
                                <Kpi
                                    icon={FileSpreadsheet}
                                    label="Flujo neto"
                                    value={report.kpis.netFlowInPeriod}
                                    hint="Nuevos − descartados del período"
                                    tone="bg-slate-700"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{flowTitle}</h3>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Datos {periodUnitHint}. Clic en una barra para ver el detalle
                                        {chartGranularity === 'day' ? ' del día' : chartGranularity === 'week' ? ' de la semana' : ' del mes'}.
                                    </p>
                                    <MeasuredChartArea height={220 + xAxis.chartHeightExtra}>
                                        {({ width, height }) => (
                                            <BarChart
                                                width={width}
                                                height={height}
                                                data={chartFinal}
                                                margin={{ bottom: 4, left: 0, right: 4, top: 8 }}
                                                onClick={(data) => {
                                                    const payload = data as {
                                                        activePayload?: Array<{ payload?: CoverageChartBucket }>;
                                                    };
                                                    selectChartBucket(payload.activePayload?.[0]?.payload?.bucketKey);
                                                }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis
                                                    dataKey="label"
                                                    tick={{ fontSize: xAxis.fontSize }}
                                                    interval={xAxis.interval}
                                                    angle={xAxis.angle}
                                                    textAnchor={xAxis.textAnchor}
                                                    height={xAxis.height}
                                                />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                                                <Tooltip
                                                    formatter={(value: number) => [value, 'Llegadas']}
                                                    labelFormatter={(_, payload) => {
                                                        const p = payload?.[0]?.payload as CoverageChartBucket | undefined;
                                                        if (!p) return '';
                                                        if (p.dateKeys.length <= 1) return `${p.label} (${p.bucketKey})`;
                                                        return `${p.label} (${p.dateKeys[0]} → ${p.dateKeys[p.dateKeys.length - 1]})`;
                                                    }}
                                                />
                                                <Bar dataKey="count" radius={[3, 3, 0, 0]} cursor="pointer">
                                                    {chartFinal.map(entry => (
                                                        <Cell
                                                            key={entry.bucketKey}
                                                            fill={
                                                                selectedBucket?.bucketKey === entry.bucketKey
                                                                    ? '#0f766e'
                                                                    : bucketPartiallyConsolidated(entry)
                                                                      ? '#14b8a6'
                                                                      : '#2dd4bf'
                                                            }
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        )}
                                    </MeasuredChartArea>
                                </section>

                                <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                                        Candidatos nuevos {periodUnitHint}
                                    </h3>
                                    <p className="text-xs text-gray-500 mb-3">Altas reales al proceso (sin contar traslados).</p>
                                    <MeasuredChartArea height={220 + xAxis.chartHeightExtra}>
                                        {({ width, height }) => (
                                            <LineChart
                                                width={width}
                                                height={height}
                                                data={chartNew}
                                                margin={{ bottom: 4, left: 0, right: 4, top: 8 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis
                                                    dataKey="label"
                                                    tick={{ fontSize: xAxis.fontSize }}
                                                    interval={xAxis.interval}
                                                    angle={xAxis.angle}
                                                    textAnchor={xAxis.textAnchor}
                                                    height={xAxis.height}
                                                />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                                                <Tooltip
                                                    formatter={(value: number) => [value, 'Nuevos']}
                                                    labelFormatter={(_, payload) => {
                                                        const p = payload?.[0]?.payload as CoverageChartBucket | undefined;
                                                        return p?.label || '';
                                                    }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="count"
                                                    stroke="#059669"
                                                    strokeWidth={2}
                                                    dot={chartGranularity !== 'day' || chartNew.length <= 45}
                                                />
                                            </LineChart>
                                        )}
                                    </MeasuredChartArea>
                                </section>

                                <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                                        Llegadas a etapa final por consultor ({periodUnitHint})
                                    </h3>
                                    <p className="text-xs text-gray-500 mb-3">Volumen atribuido al consultor que movió al candidato.</p>
                                    <MeasuredChartArea height={240 + xAxis.chartHeightExtra}>
                                        {({ width, height }) => (
                                            <BarChart
                                                width={width}
                                                height={height}
                                                data={chartConsultants}
                                                margin={{ bottom: 4, left: 0, right: 4, top: 8 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis
                                                    dataKey="label"
                                                    tick={{ fontSize: xAxis.fontSize }}
                                                    interval={xAxis.interval}
                                                    angle={xAxis.angle}
                                                    textAnchor={xAxis.textAnchor}
                                                    height={xAxis.height}
                                                />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                                                <Tooltip />
                                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                                {report.consultantSeries.map(series => (
                                                    <Bar
                                                        key={series.key}
                                                        dataKey={series.key}
                                                        name={series.name}
                                                        stackId="consultants"
                                                        fill={series.color}
                                                    />
                                                ))}
                                            </BarChart>
                                        )}
                                    </MeasuredChartArea>
                                    {report.consultantRanking.length > 0 && (
                                        <div className="mt-3 overflow-x-auto">
                                            <table className="min-w-full text-xs">
                                                <thead>
                                                    <tr className="text-left text-gray-500 border-b">
                                                        <th className="py-1.5 pr-3 font-medium">Consultor</th>
                                                        <th className="py-1.5 pr-3 font-medium text-right">Llegadas</th>
                                                        <th className="py-1.5 font-medium text-right">%</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {report.consultantRanking.slice(0, 8).map(row => (
                                                        <tr key={row.name} className="border-b border-gray-50">
                                                            <td className="py-1.5 pr-3 text-gray-800">{row.name}</td>
                                                            <td className="py-1.5 pr-3 text-right tabular-nums font-medium">
                                                                {row.arrivals}
                                                            </td>
                                                            <td className="py-1.5 text-right tabular-nums text-gray-500">
                                                                {row.sharePct}%
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>

                                <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                                        Descartes {periodUnitHint} y motivos
                                    </h3>
                                    <p className="text-xs text-gray-500 mb-3">
                                        {report.kpis.discardedInPeriod} descartes en el período · {report.kpis.discardedTotal} en el proceso
                                    </p>
                                    <MeasuredChartArea height={160 + xAxis.chartHeightExtra}>
                                        {({ width, height }) => (
                                            <BarChart
                                                width={width}
                                                height={height}
                                                data={chartDiscards}
                                                margin={{ bottom: 4, left: 0, right: 4, top: 8 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis
                                                    dataKey="label"
                                                    tick={{ fontSize: xAxis.fontSize }}
                                                    interval={xAxis.interval}
                                                    angle={xAxis.angle}
                                                    textAnchor={xAxis.textAnchor}
                                                    height={Math.max(28, xAxis.height - 8)}
                                                />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                                                <Tooltip formatter={(value: number) => [value, 'Descartes']} />
                                                <Bar dataKey="count" fill="#e11d48" radius={[3, 3, 0, 0]} />
                                            </BarChart>
                                        )}
                                    </MeasuredChartArea>
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                                        {report.discardReasons.length > 0 ? (
                                            <>
                                                <MeasuredChartArea height={150}>
                                                    {({ width, height }) => (
                                                        <PieChart width={width} height={height}>
                                                            <Pie
                                                                data={report.discardReasons.slice(0, 6) as Array<{ reason: string; count: number }>}
                                                                dataKey="count"
                                                                nameKey="reason"
                                                                cx="50%"
                                                                cy="50%"
                                                                outerRadius={55}
                                                                label={false}
                                                            >
                                                                {report.discardReasons.slice(0, 6).map((_, i) => (
                                                                    <Cell key={i} fill={REASON_COLORS[i % REASON_COLORS.length]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip />
                                                        </PieChart>
                                                    )}
                                                </MeasuredChartArea>
                                                <ul className="space-y-1 text-xs max-h-36 overflow-y-auto">
                                                    {report.discardReasons.slice(0, 8).map((r, i) => (
                                                        <li key={r.reason} className="flex items-start gap-2">
                                                            <span
                                                                className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                                                                style={{ background: REASON_COLORS[i % REASON_COLORS.length] }}
                                                            />
                                                            <span className="text-gray-700 flex-1 min-w-0 break-words">
                                                                {r.reason}
                                                            </span>
                                                            <span className="tabular-nums font-medium text-gray-900">
                                                                {r.count}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </>
                                        ) : (
                                            <p className="text-xs text-gray-400 col-span-2 py-4 text-center">
                                                Sin descartes en el período seleccionado.
                                            </p>
                                        )}
                                    </div>
                                </section>
                            </div>

                            <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b flex flex-wrap items-center gap-2 justify-between">
                                    <div className="flex items-center gap-1 rounded-lg border border-gray-200 overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('day')}
                                            className={`px-3 py-1.5 text-xs font-medium ${
                                                activeTab === 'day' ? 'bg-teal-600 text-white' : 'bg-white text-gray-700'
                                            }`}
                                        >
                                            {chartGranularity === 'day'
                                                ? 'Día seleccionado'
                                                : chartGranularity === 'week'
                                                  ? 'Semana seleccionada'
                                                  : 'Mes seleccionado'}
                                            {selectedBucket ? ` (${bucketArrivals.length})` : ''}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('consolidated')}
                                            className={`px-3 py-1.5 text-xs font-medium ${
                                                activeTab === 'consolidated' ? 'bg-teal-600 text-white' : 'bg-white text-gray-700'
                                            }`}
                                        >
                                            Consolidado ({consolidatedArrivals.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('discards')}
                                            className={`px-3 py-1.5 text-xs font-medium ${
                                                activeTab === 'discards' ? 'bg-teal-600 text-white' : 'bg-white text-gray-700'
                                            }`}
                                        >
                                            Descartes ({report.discardsInPeriod.length})
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {selectedBucket && (
                                            <button
                                                type="button"
                                                onClick={() => toggleConsolidateBucket(selectedBucket)}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                                            >
                                                {bucketHasConsolidated ? (
                                                    <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                                                ) : (
                                                    <Square className="w-3.5 h-3.5" />
                                                )}
                                                {bucketHasConsolidated
                                                    ? 'Quitar del consolidado'
                                                    : chartGranularity === 'day'
                                                      ? 'Añadir día al consolidado'
                                                      : 'Añadir período al consolidado'}
                                            </button>
                                        )}
                                        {activeTab === 'day' && (
                                            <button
                                                type="button"
                                                disabled={bucketArrivals.length === 0}
                                                onClick={() =>
                                                    exportArrivalsSheet(
                                                        bucketArrivals,
                                                        `llegadas_${hiringStageName}_${selectedBucket?.bucketKey || 'periodo'}.xlsx`,
                                                        chartGranularity === 'day' ? 'Día' : chartGranularity === 'week' ? 'Semana' : 'Mes'
                                                    )
                                                }
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-white border border-teal-300 text-teal-800 hover:bg-teal-50 disabled:opacity-50"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                Excel del período
                                            </button>
                                        )}
                                        {activeTab === 'consolidated' && (
                                            <button
                                                type="button"
                                                disabled={consolidatedArrivals.length === 0}
                                                onClick={() =>
                                                    exportArrivalsSheet(
                                                        consolidatedArrivals,
                                                        `llegadas_consolidado_${process.title.slice(0, 30)}.xlsx`,
                                                        'Consolidado'
                                                    )
                                                }
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                Excel consolidado
                                            </button>
                                        )}
                                        {activeTab === 'discards' && (
                                            <button
                                                type="button"
                                                disabled={report.discardsInPeriod.length === 0}
                                                onClick={() => {
                                                    const rows = report.discardsInPeriod.map(d => ({
                                                        Candidato: d.name,
                                                        Email: d.email,
                                                        Teléfono: d.phone || '',
                                                        Motivo: d.discardReason || 'Sin motivo registrado',
                                                        'Fecha y hora': d.discardedAt
                                                            ? formatDateTimeLima(d.discardedAt)
                                                            : '',
                                                    }));
                                                    const wb = XLSX.utils.book_new();
                                                    XLSX.utils.book_append_sheet(
                                                        wb,
                                                        XLSX.utils.json_to_sheet(rows),
                                                        'Descartes'
                                                    );
                                                    XLSX.writeFile(
                                                        wb,
                                                        `descartes_${process.title.slice(0, 30)}.xlsx`
                                                    );
                                                }}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-white border border-rose-300 text-rose-800 hover:bg-rose-50 disabled:opacity-50"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                Excel descartes
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {activeTab === 'day' && (
                                    <div className="overflow-x-auto max-h-72">
                                        {!selectedBucket ? (
                                            <p className="text-sm text-gray-400 p-6 text-center">
                                                Selecciona un período en el gráfico de flujo.
                                            </p>
                                        ) : bucketArrivals.length === 0 ? (
                                            <p className="text-sm text-gray-400 p-6 text-center">
                                                Sin llegadas a {hiringStageName} en {selectedBucket.label}.
                                            </p>
                                        ) : (
                                            <table className="min-w-full text-sm">
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr className="text-left text-xs text-gray-500">
                                                        <th className="px-4 py-2 font-medium">Candidato</th>
                                                        <th className="px-4 py-2 font-medium">Email</th>
                                                        <th className="px-4 py-2 font-medium">Consultor</th>
                                                        <th className="px-4 py-2 font-medium">Fecha y hora</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {bucketArrivals.map(a => (
                                                        <tr key={`${a.candidateId}-${a.movedAt}`} className="border-t border-gray-100">
                                                            <td className="px-4 py-2 font-medium text-gray-900">{a.name}</td>
                                                            <td className="px-4 py-2 text-gray-600">{a.email}</td>
                                                            <td className="px-4 py-2 text-gray-700">{a.consultant}</td>
                                                            <td className="px-4 py-2 tabular-nums text-gray-700">
                                                                {formatDateTimeLima(a.movedAt)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'consolidated' && (
                                    <div className="overflow-x-auto max-h-72">
                                        {consolidatedDays.size === 0 ? (
                                            <p className="text-sm text-gray-400 p-6 text-center">
                                                Añade días al consolidado desde el gráfico o el botón «Añadir día».
                                            </p>
                                        ) : (
                                            <>
                                                <div className="px-4 py-2 bg-teal-50 border-b border-teal-100 text-xs text-teal-900 flex flex-wrap gap-1.5">
                                                    {[...consolidatedDays].sort().map(key => (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            onClick={() => toggleConsolidateDay(key)}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-teal-200 hover:bg-teal-100"
                                                            title="Quitar día"
                                                        >
                                                            {key}
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    ))}
                                                </div>
                                                <table className="min-w-full text-sm">
                                                    <thead className="bg-gray-50 sticky top-0">
                                                        <tr className="text-left text-xs text-gray-500">
                                                            <th className="px-4 py-2 font-medium">Candidato</th>
                                                            <th className="px-4 py-2 font-medium">Día</th>
                                                            <th className="px-4 py-2 font-medium">Consultor</th>
                                                            <th className="px-4 py-2 font-medium">Fecha y hora</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {consolidatedArrivals.map(a => (
                                                            <tr
                                                                key={`${a.candidateId}-${a.movedAt}`}
                                                                className="border-t border-gray-100"
                                                            >
                                                                <td className="px-4 py-2 font-medium text-gray-900">
                                                                    {a.name}
                                                                </td>
                                                                <td className="px-4 py-2 tabular-nums text-gray-600">
                                                                    {a.dateKey}
                                                                </td>
                                                                <td className="px-4 py-2 text-gray-700">{a.consultant}</td>
                                                                <td className="px-4 py-2 tabular-nums text-gray-700">
                                                                    {formatDateTimeLima(a.movedAt)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'discards' && (
                                    <div className="overflow-x-auto max-h-72">
                                        {report.discardsInPeriod.length === 0 ? (
                                            <p className="text-sm text-gray-400 p-6 text-center">
                                                Sin descartes en el período.
                                            </p>
                                        ) : (
                                            <table className="min-w-full text-sm">
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr className="text-left text-xs text-gray-500">
                                                        <th className="px-4 py-2 font-medium">Candidato</th>
                                                        <th className="px-4 py-2 font-medium">Motivo</th>
                                                        <th className="px-4 py-2 font-medium">Fecha y hora</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {report.discardsInPeriod.map(d => (
                                                        <tr key={d.candidateId} className="border-t border-gray-100">
                                                            <td className="px-4 py-2 font-medium text-gray-900">{d.name}</td>
                                                            <td className="px-4 py-2 text-gray-700">
                                                                {d.discardReason || 'Sin motivo registrado'}
                                                            </td>
                                                            <td className="px-4 py-2 tabular-nums text-gray-700">
                                                                {d.discardedAt
                                                                    ? formatDateTimeLima(d.discardedAt)
                                                                    : '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}
                            </section>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
