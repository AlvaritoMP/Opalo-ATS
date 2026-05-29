import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    X,
    Plus,
    Trash2,
    BarChart3,
    Loader2,
    Save,
    PieChart as PieChartIcon,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import { BulkCandidate } from '../lib/api/bulkCandidates';
import { Process, CustomColumn, BulkProcessStatChart, BulkStatChartType } from '../types';
import {
    aggregateBulkStatData,
    createDefaultStatChart,
    getBulkStatChartableColumns,
    getStatChartTitle,
    type BulkStatColumnOption,
    type BulkStatContext,
} from '../lib/bulkProcessStats';
import { HiredStageActor } from '../lib/hiringStageTracking';

const CHART_COLORS = ['#6366f1', '#14b8a6', '#f97316', '#ec4899', '#8b5cf6', '#06b6d4', '#eab308', '#ef4444'];

const CHART_TYPE_OPTIONS: { id: BulkStatChartType; label: string }[] = [
    { id: 'bar', label: 'Barras verticales' },
    { id: 'horizontalBar', label: 'Barras horizontales' },
    { id: 'pie', label: 'Circular' },
];

type DataScope = 'all' | 'stage';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    process: Process;
    customColumns: CustomColumn[];
    columnOrder: string[];
    columnValues: Record<string, Record<string, unknown>>;
    legacyColumnIdToName: Record<string, string>;
    hiringStageActors: Record<string, HiredStageActor>;
    candidates: BulkCandidate[];
    allCandidates: BulkCandidate[];
    loadingAllCandidates: boolean;
    selectedStageId: string;
    onSave: (charts: BulkProcessStatChart[]) => Promise<void>;
}

const StatChartPreview: React.FC<{
    chart: BulkProcessStatChart;
    title: string;
    data: { name: string; value: number }[];
}> = ({ chart, title, data }) => {
    const hasData = data.some(d => d.value > 0);

    if (!hasData) {
        return (
            <div className="flex items-center justify-center h-56 text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg">
                Sin datos para esta columna.
            </div>
        );
    }

    if (chart.chartType === 'pie') {
        return (
            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ name, percent }) =>
                            `${name.length > 14 ? `${name.slice(0, 12)}…` : name} (${(percent * 100).toFixed(0)}%)`
                        }
                    >
                        {data.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'Candidatos']} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        );
    }

    const layout = chart.chartType === 'horizontalBar' ? 'vertical' : 'horizontal';

    return (
        <ResponsiveContainer width="100%" height={Math.max(260, data.length * 28)}>
            <BarChart
                data={data}
                layout={layout}
                margin={{ top: 8, right: 16, left: layout === 'vertical' ? 8 : 80, bottom: 8 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                {layout === 'vertical' ? (
                    <>
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={76} tick={{ fontSize: 11 }} />
                    </>
                ) : (
                    <>
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11 }}
                            interval={0}
                            angle={data.length > 6 ? -25 : 0}
                            textAnchor={data.length > 6 ? 'end' : 'middle'}
                            height={data.length > 6 ? 70 : 30}
                        />
                        <YAxis allowDecimals={false} />
                    </>
                )}
                <Tooltip
                    formatter={(v: number) => [v, 'Candidatos']}
                    labelFormatter={label => String(label)}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

export const BulkProcessStatsModal: React.FC<Props> = ({
    isOpen,
    onClose,
    process,
    customColumns,
    columnOrder,
    columnValues,
    legacyColumnIdToName,
    hiringStageActors,
    candidates,
    allCandidates,
    loadingAllCandidates,
    selectedStageId,
    onSave,
}) => {
    const columnOptions = useMemo(
        () => getBulkStatChartableColumns(customColumns, columnOrder),
        [customColumns, columnOrder]
    );

    const [charts, setCharts] = useState<BulkProcessStatChart[]>([]);
    const [dataScope, setDataScope] = useState<DataScope>('all');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const saved = process.bulkConfig?.customStats ?? [];
        if (saved.length > 0) {
            setCharts(saved);
        } else if (columnOptions.length > 0) {
            setCharts([createDefaultStatChart(columnOptions[0].id)]);
        } else {
            setCharts([]);
        }
        setDataScope('all');
    }, [isOpen, process.id, process.bulkConfig?.customStats, columnOptions]);

    const statContext = useMemo<BulkStatContext>(
        () => ({
            process,
            bulkConfig: process.bulkConfig,
            customColumns,
            columnValues,
            legacyColumnIdToName,
            hiringStageActors,
            idealProfileConfig: process.bulkConfig?.idealProfile ?? null,
        }),
        [process, customColumns, columnValues, legacyColumnIdToName, hiringStageActors]
    );

    const candidatePool = useMemo(() => {
        const base = allCandidates.length > 0 ? allCandidates : candidates;
        if (dataScope === 'stage' && selectedStageId) {
            return base.filter(c => c.stageId === selectedStageId);
        }
        return base;
    }, [allCandidates, candidates, dataScope, selectedStageId]);

    const chartDataById = useMemo(() => {
        const map = new Map<string, { name: string; value: number }[]>();
        for (const chart of charts) {
            map.set(chart.id, aggregateBulkStatData(candidatePool, chart.columnId, statContext));
        }
        return map;
    }, [charts, candidatePool, statContext]);

    const addChart = useCallback(() => {
        const used = new Set(charts.map(c => c.columnId));
        const nextCol = columnOptions.find(c => !used.has(c.id)) ?? columnOptions[0];
        if (!nextCol) return;
        setCharts(prev => [...prev, createDefaultStatChart(nextCol.id, nextCol.suggestedChart)]);
    }, [charts, columnOptions]);

    const updateChart = useCallback((id: string, patch: Partial<BulkProcessStatChart>) => {
        setCharts(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
    }, []);

    const removeChart = useCallback((id: string) => {
        setCharts(prev => prev.filter(c => c.id !== id));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(charts);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const stageName = selectedStageId
        ? process.stages.find(s => s.id === selectedStageId)?.name
        : undefined;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 md:p-6 bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
                <div className="flex items-start justify-between gap-3 px-4 md:px-6 py-4 border-b border-gray-200">
                    <div>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Estadísticas del proceso</h2>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            Gráficos personalizados por columna · {process.title}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 px-4 md:px-6 py-3 bg-gray-50 border-b border-gray-200">
                    <label className="text-xs font-medium text-gray-600">Datos</label>
                    <select
                        value={dataScope}
                        onChange={e => setDataScope(e.target.value as DataScope)}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="all">Todo el proceso</option>
                        {selectedStageId && stageName && (
                            <option value="stage">Etapa actual: {stageName}</option>
                        )}
                    </select>
                    <span className="text-xs text-gray-500">
                        {loadingAllCandidates ? (
                            <span className="inline-flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Cargando candidatos…
                            </span>
                        ) : (
                            `${candidatePool.length} candidato${candidatePool.length === 1 ? '' : 's'}`
                        )}
                    </span>
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={addChart}
                        disabled={columnOptions.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4" />
                        Agregar gráfico
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                    {columnOptions.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-12">
                            No hay columnas disponibles para graficar en este proceso.
                        </p>
                    ) : charts.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-12">
                            Agregue un gráfico para empezar.
                        </p>
                    ) : (
                        charts.map(chart => {
                            const data = chartDataById.get(chart.id) ?? [];
                            const title = getStatChartTitle(chart, columnOptions);
                            return (
                                <div
                                    key={chart.id}
                                    className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm"
                                >
                                    <div className="flex flex-wrap items-end gap-3 mb-4">
                                        <div className="flex-1 min-w-[160px]">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Columna
                                            </label>
                                            <select
                                                value={chart.columnId}
                                                onChange={e =>
                                                    updateChart(chart.id, { columnId: e.target.value })
                                                }
                                                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
                                            >
                                                {columnOptions.map(col => (
                                                    <option key={col.id} value={col.id}>
                                                        {col.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="min-w-[160px]">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Tipo de gráfico
                                            </label>
                                            <select
                                                value={chart.chartType}
                                                onChange={e =>
                                                    updateChart(chart.id, {
                                                        chartType: e.target.value as BulkStatChartType,
                                                    })
                                                }
                                                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
                                            >
                                                {CHART_TYPE_OPTIONS.map(opt => (
                                                    <option key={opt.id} value={opt.id}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex-1 min-w-[180px]">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Título (opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={chart.title ?? ''}
                                                onChange={e =>
                                                    updateChart(chart.id, { title: e.target.value })
                                                }
                                                placeholder={title}
                                                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeChart(chart.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                                            title="Eliminar gráfico"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                                        {chart.chartType === 'pie' ? (
                                            <PieChartIcon className="w-4 h-4 text-indigo-500" />
                                        ) : (
                                            <BarChart3 className="w-4 h-4 text-indigo-500" />
                                        )}
                                        {title}
                                    </h3>
                                    <StatChartPreview chart={chart} title={title} data={data} />
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 px-4 md:px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-md"
                    >
                        Cerrar
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar configuración
                    </button>
                </div>
            </div>
        </div>
    );
};
