import React, { useMemo, useState } from 'react';
import { useAppState } from '../App';
import { Candidate, Process } from '../types';
import { Users, BarChart2, FileText, Download, Plus, Trash2 } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, BarChart, XAxis, YAxis, CartesianGrid, Bar, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type BuiltInMetric = 'age' | 'salaryExpectation' | 'stageProgress' | 'attachments';
interface CustomMetric {
    id: string;
    name: string;
    scaleMax: number;
}

export const CandidateComparator: React.FC = () => {
    const { state, getLabel, actions } = useAppState();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [builtInMetrics, setBuiltInMetrics] = useState<Record<BuiltInMetric, boolean>>({
        age: true,
        salaryExpectation: true,
        stageProgress: true,
        attachments: false,
    });
    const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([]);
    const [customValues, setCustomValues] = useState<Record<string, Record<string, number>>>({}); // metricId -> candidateId -> value
    const [comments, setComments] = useState<string>('');
    const [candidateQuery, setCandidateQuery] = useState<string>('');
    const [barMetric, setBarMetric] = useState<BuiltInMetric>('stageProgress');
    const [selectedCustomMetricIds, setSelectedCustomMetricIds] = useState<string[]>([]);
    const [savePdfToCandidates, setSavePdfToCandidates] = useState<boolean>(false);

    const chartsRef = React.useRef<HTMLDivElement>(null);
    // Resúmenes solo para PDF (sin controles)
    const summaryHeaderRef = React.useRef<HTMLDivElement>(null);
    const summaryCustomRef = React.useRef<HTMLDivElement>(null);
    const commentsRef = React.useRef<HTMLDivElement>(null);

    const candidates = state.candidates;
    const processes = state.processes;
    const selectedCandidates = useMemo(() => candidates.filter(c => selectedIds.includes(c.id)), [candidates, selectedIds]);
    const filteredCandidates = useMemo(() => {
        const q = candidateQuery.trim().toLowerCase();
        return state.candidates.filter(c =>
            !q ||
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            (c.phone || '').toLowerCase().includes(q) ||
            (state.processes.find(p => p.id === c.processId)?.title || '').toLowerCase().includes(q)
        );
    }, [state.candidates, state.processes, candidateQuery]);

    const parseSalary = (s?: string) => {
        if (!s) return 0;
        const num = s.replace(/[^0-9.,]/g, '').replace('.', '').replace(',', '.');
        const v = parseFloat(num);
        return isNaN(v) ? 0 : v;
    };

    const stageProgress = (c: Candidate) => {
        const p = processes.find(pr => pr.id === c.processId);
        if (!p || p.stages.length === 0) return 0;
        const idx = p.stages.findIndex(s => s.id === c.stageId);
        return idx >= 0 ? Math.round(((idx + 1) / p.stages.length) * 100) : 0;
    };
    const attachmentsCount = (c: Candidate) => c.attachments?.length || 0;

    const radarData = useMemo(() => {
        const dataKeys: { key: string; label: string; getter: (c: Candidate) => number }[] = [];
        if (builtInMetrics.age) dataKeys.push({ key: 'Edad', label: 'Edad', getter: c => c.age || 0 });
        if (builtInMetrics.salaryExpectation) dataKeys.push({ key: 'Salario', label: 'Salario', getter: c => parseSalary(c.salaryExpectation) });
        if (builtInMetrics.stageProgress) dataKeys.push({ key: 'Avance', label: 'Avance', getter: c => stageProgress(c) });
        if (builtInMetrics.attachments) dataKeys.push({ key: 'Adjuntos', label: 'Adjuntos', getter: c => attachmentsCount(c) });
        // For radar, we will build one entry per metric label with candidate values as fields
        return dataKeys.map(m => {
            const entry: any = { metric: m.label };
            selectedCandidates.forEach(c => {
                entry[c.name] = m.getter(c);
            });
            return entry;
        });
    }, [selectedCandidates, builtInMetrics]);

    const barData = useMemo(() => {
        const metricGetter = (c: Candidate) => {
            switch (barMetric) {
                case 'stageProgress': return stageProgress(c);
                case 'age': return c.age || 0;
                case 'salaryExpectation': return parseSalary(c.salaryExpectation);
                case 'attachments': return attachmentsCount(c);
            }
        };
        return selectedCandidates.map(c => ({ name: c.name, value: metricGetter(c) }));
    }, [selectedCandidates, barMetric]);

    const customChartsData = useMemo(() => {
        const map: Record<string, { name: string; value: number }[]> = {};
        selectedCustomMetricIds.forEach(id => {
            const metric = customMetrics.find(m => m.id === id);
            if (!metric) return;
            map[id] = selectedCandidates.map(c => ({
                name: c.name,
                value: customValues[metric.id]?.[c.id] ?? 0,
            }));
        });
        return map;
    }, [selectedCustomMetricIds, customMetrics, customValues, selectedCandidates]);

    const locationDist = useMemo(() => {
        const counts = new Map<string, number>();
        selectedCandidates.forEach(c => {
            const key = c.address || 'Sin ubicación';
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
    }, [selectedCandidates]);

    const sourceDist = useMemo(() => {
        const counts = new Map<string, number>();
        selectedCandidates.forEach(c => {
            const key = (c.source as string) || 'Sin fuente';
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
    }, [selectedCandidates]);

    const addCustomMetric = () => {
        setCustomMetrics(prev => [...prev, { id: `m-${Date.now()}`, name: `Criterio ${prev.length + 1}`, scaleMax: 10 }]);
    };
    const removeCustomMetric = (id: string) => {
        setCustomMetrics(prev => prev.filter(m => m.id !== id));
        setCustomValues(prev => {
            const cp = { ...prev };
            delete cp[id];
            return cp;
        });
    };

    const exportReport = () => {
        const report = {
            generatedAt: new Date().toISOString(),
            candidates: selectedCandidates.map(c => ({
                id: c.id,
                name: c.name,
                email: c.email,
                process: processes.find(p => p.id === c.processId)?.title || '',
                stageProgress: stageProgress(c),
                age: c.age || null,
                salaryExpectation: c.salaryExpectation || null,
                attachments: attachmentsCount(c),
                custom: Object.fromEntries(customMetrics.map(m => [m.name, customValues[m.id]?.[c.id] ?? null])),
            })),
            comments,
        };
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `comparador_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const fetchImageAsDataUrl = async (url?: string): Promise<string | null> => {
        if (!url) return null;
        try {
            const res = await fetch(url, { mode: 'cors' });
            const blob = await res.blob();
            return await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch {
            return null;
        }
    };

    const exportPDF = async () => {
        try {
            const doc = new jsPDF('p', 'pt', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            let y = 40;

            // Branding
            if (state.settings?.logoUrl) {
                try {
                    const res = await fetch(state.settings.logoUrl, { mode: 'cors' });
                    const blob = await res.blob();
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                        const r = new FileReader();
                        r.onload = () => resolve(r.result as string);
                        r.onerror = reject;
                        r.readAsDataURL(blob);
                    });
                    doc.addImage(dataUrl, 'PNG', 40, y - 20, 80, 24, undefined, 'FAST');
                } catch {
                    // Ignorar errores de logo
                }
            }
            const titleText = state.settings?.reportTheme?.coverTitle || 'Informe comparativo de candidatos';
            const primary = state.settings?.reportTheme?.primaryColor || '#2563eb';
            const accent = state.settings?.reportTheme?.accentColor || '#16a34a';

            // Title
            doc.setTextColor(primary);
            doc.setFontSize(18);
            doc.text(titleText, pageWidth / 2, y, { align: 'center' });
            y += 16;
            doc.setFontSize(10);
            doc.setTextColor('#000000');
            doc.text(new Date().toLocaleString(), pageWidth / 2, y, { align: 'center' });
            y += 24;
            // Accent line
            doc.setDrawColor(accent);
            doc.setLineWidth(1);
            doc.line(40, y, pageWidth - 40, y);
            y += 16;

            // Photos grid (up to 3 per row)
            const cellW = (pageWidth - 80) / 3;
            const cellH = 80;
            let col = 0;
            for (const c of selectedCandidates) {
                const dataUrl = c.avatarUrl?.startsWith('data:') ? c.avatarUrl : await fetchImageAsDataUrl(c.avatarUrl);
                if (dataUrl) {
                    try {
                        doc.addImage(dataUrl, 'JPEG', 40 + col * cellW, y, 60, 60, undefined, 'FAST');
                    } catch {
                        // Ignorar error en imagen individual
                    }
                }
                doc.setFontSize(11);
                doc.text(c.name, 40 + col * cellW + 70, y + 14);
                const proc = processes.find(p => p.id === c.processId)?.title || '';
                doc.setFontSize(9);
                doc.text(`Proceso: ${proc}`, 40 + col * cellW + 70, y + 32);
                doc.text(`Avance: ${stageProgress(c)}%`, 40 + col * cellW + 70, y + 46);
                doc.text(`Edad: ${c.age ?? '-'}`, 40 + col * cellW + 70, y + 60);
                col += 1;
                if (col === 3) {
                    col = 0;
                    y += cellH + 10;
                    if (y > pageHeight - 80) { doc.addPage(); y = 40; }
                }
            }
            if (col !== 0) { y += cellH + 10; }

            const addSectionFromRef = async (ref: React.RefObject<HTMLDivElement>, title: string) => {
                if (!ref.current) return;
                let canvas: HTMLCanvasElement;
                try {
                    canvas = await html2canvas(ref.current, { useCORS: true, backgroundColor: '#ffffff', scale: 2 });
                } catch (e) {
                    console.error('Error capturando sección para PDF:', title, e);
                    return;
                }
                const imgData = canvas.toDataURL('image/png');
                let imgW = pageWidth - 80;
                let ratio = canvas.height / canvas.width;
                let imgH = imgW * ratio;
                if (y + 24 + imgH > pageHeight - 40) {
                    const colW = (pageWidth - 100) / 2;
                    const colH = colW * ratio;
                    if (colH > (pageHeight - 160) / 2) {
                        const maxH = (pageHeight - 160) / 2;
                        const scaleW = maxH / ratio;
                        imgW = scaleW;
                        imgH = maxH;
                    } else {
                        imgW = colW;
                        imgH = colH;
                    }
                    if (y + 24 + imgH > pageHeight - 40) { doc.addPage(); y = 40; }
                    doc.setFontSize(12);
                    doc.text(title, 40, y);
                    y += 10;
                    try {
                        doc.addImage(imgData, 'PNG', 40, y, imgW, imgH, undefined, 'FAST');
                    } catch (e) {
                        console.error('Error añadiendo imagen de sección al PDF (modo columna):', title, e);
                        return;
                    }
                    y += imgH + 20;
                    return;
                }
                doc.setFontSize(12);
                doc.text(title, 40, y);
                y += 10;
                try {
                    doc.addImage(imgData, 'PNG', 40, y, imgW, imgH, undefined, 'FAST');
                } catch (e) {
                    console.error('Error añadiendo imagen de sección al PDF:', title, e);
                    return;
                }
                y += imgH + 20;
            };

            // Datos finales (tablas resumen)
            await addSectionFromRef(summaryHeaderRef, 'Resumen de candidatos');
            if (customMetrics.length > 0 && selectedCandidates.length > 0) {
                await addSectionFromRef(summaryCustomRef, 'Puntuaciones personalizadas');
            }
            // Todos los gráficos (radar, barras, personalizados, distribuciones)
            await addSectionFromRef(chartsRef, 'Gráficos comparativos');

            // Comentarios
            if (comments.trim()) {
                if (y + 120 > pageHeight - 40) { doc.addPage(); y = 40; }
                doc.setFontSize(12);
                doc.text('Comentarios', 40, y);
                y += 14;
                doc.setFontSize(10);
                const lines = doc.splitTextToSize(comments, pageWidth - 80);
                doc.text(lines, 40, y);
            }

            const footerText = state.settings?.reportTheme?.footerText;
            if (footerText) {
                const pageCount = (doc as any).internal.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.setTextColor('#666666');
                    doc.text(footerText, pageWidth / 2, pageHeight - 20, { align: 'center' });
                }
            }

            const fileName = `informe_comparador_${Date.now()}.pdf`;
            doc.save(fileName);

            if (savePdfToCandidates && selectedCandidates.length > 0) {
                const pdfBlob = doc.output('blob');
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(pdfBlob);
                });
                for (const c of selectedCandidates) {
                    const updated = {
                        ...c,
                        attachments: [
                            ...c.attachments,
                            { id: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: fileName, url: dataUrl, type: 'application/pdf', size: pdfBlob.size },
                        ],
                    };
                    await actions.updateCandidate(updated, state.currentUser?.name);
                }
            }
        } catch (err) {
            console.error('Error al exportar PDF:', err);
            alert('No se pudo generar el PDF. Revisa la consola para más detalles.');
        }
    };

    return (
        <div className="p-8 flex-1 min-h-0 flex flex-col">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center"><BarChart2 className="w-7 h-7 mr-3" /> {getLabel('compare_title', 'Comparador de candidatos')}</h1>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Buscar y seleccionar candidatos</label>
                        <input
                            value={candidateQuery}
                            onChange={e => setCandidateQuery(e.target.value)}
                            placeholder="Buscar por nombre, email, proceso..."
                            className="w-full border border-gray-300 rounded-md shadow-sm mb-2 px-3 py-2"
                        />
                        <div className="border rounded-md max-h-48 overflow-y-auto">
                            {filteredCandidates.map(c => {
                                const checked = selectedIds.includes(c.id);
                                return (
                                    <label key={c.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={e => {
                                                setSelectedIds(prev => checked ? prev.filter(id => id !== c.id) : [...prev, c.id]);
                                            }}
                                        />
                                        <span className="text-sm text-gray-700">{c.name}</span>
                                    </label>
                                );
                            })}
                            {filteredCandidates.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{selectedIds.length} seleccionado(s)</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Métricas base</label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={builtInMetrics.age}
                                    onChange={e => setBuiltInMetrics(s => ({ ...s, age: e.target.checked }))}
                                />
                                Edad
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={builtInMetrics.salaryExpectation}
                                    onChange={e => setBuiltInMetrics(s => ({ ...s, salaryExpectation: e.target.checked }))}
                                />
                                Expectativa salarial
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={builtInMetrics.stageProgress}
                                    onChange={e => setBuiltInMetrics(s => ({ ...s, stageProgress: e.target.checked }))}
                                />
                                Avance en proceso
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={builtInMetrics.attachments}
                                    onChange={e => setBuiltInMetrics(s => ({ ...s, attachments: e.target.checked }))}
                                />
                                Adjuntos
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Criterios personalizados</label>
                        <div className="space-y-2">
                            {customMetrics.map(m => {
                                const checked = selectedCustomMetricIds.includes(m.id);
                                return (
                                    <div key={m.id} className="flex items-center gap-2">
                                        <input
                                            value={m.name}
                                            onChange={e => setCustomMetrics(prev => prev.map(x => x.id === m.id ? { ...x, name: e.target.value } : x))}
                                            className="flex-1 border-gray-300 rounded-md shadow-sm px-2 py-1"
                                        />
                                        <input
                                            type="number"
                                            min={1}
                                            value={m.scaleMax}
                                            onChange={e => setCustomMetrics(prev => prev.map(x => x.id === m.id ? { ...x, scaleMax: parseInt(e.target.value || '10', 10) } : x))}
                                            className="w-20 border-gray-300 rounded-md shadow-sm px-2 py-1"
                                        />
                                        <label className="flex items-center gap-1 text-xs text-gray-600">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() =>
                                                    setSelectedCustomMetricIds(prev =>
                                                        checked ? prev.filter(id => id !== m.id) : [...prev, m.id]
                                                    )
                                                }
                                            />
                                            Gráfico
                                        </label>
                                        <button onClick={() => removeCustomMetric(m.id)} className="p-2 rounded-md hover:bg-gray-100">
                                            <Trash2 className="w-4 h-4 text-gray-600" />
                                        </button>
                                    </div>
                                );
                            })}
                            <button
                                onClick={addCustomMetric}
                                className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 flex items-center text-sm"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Añadir criterio
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {customMetrics.length > 0 && selectedCandidates.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3">Puntuaciones personalizadas</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Criterio</th>
                                    {selectedCandidates.map(c => <th key={c.id} className="px-6 py-3">{c.name}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {customMetrics.map(m => (
                                    <tr key={m.id}>
                                        <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">{m.name} (max {m.scaleMax})</td>
                                        {selectedCandidates.map(c => (
                                            <td key={c.id} className="px-6 py-3">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={m.scaleMax}
                                                    value={customValues[m.id]?.[c.id] ?? ''}
                                                    onChange={e => {
                                                        const v = e.target.value === '' ? '' : Math.max(0, Math.min(m.scaleMax, parseInt(e.target.value, 10) || 0));
                                                        setCustomValues(prev => ({
                                                            ...prev,
                                                            [m.id]: { ...(prev[m.id] || {}), [c.id]: v as number }
                                                        }));
                                                    }}
                                                    className="w-24 border-gray-300 rounded-md shadow-sm px-2 py-1"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedCandidates.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" ref={chartsRef}>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">Radar de métricas</h2>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart data={radarData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="metric" />
                                    <PolarRadiusAxis />
                                    {selectedCandidates.map((c, idx) => (
                                        <Radar key={c.id} name={c.name} dataKey={c.name} stroke={['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#f59e0b'][idx % 5]} fill={['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#f59e0b'][idx % 5]} fillOpacity={0.4} />
                                    ))}
                                    <Legend />
                                    <Tooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold text-gray-800">Comparativa rápida</h2>
                            <select value={barMetric} onChange={e => setBarMetric(e.target.value as BuiltInMetric)} className="border border-gray-300 rounded-md shadow-sm px-2 py-1 text-sm">
                                <option value="stageProgress">Avance en proceso</option>
                                <option value="age">Edad</option>
                                <option value="salaryExpectation">Expectativa salarial</option>
                                <option value="attachments">Adjuntos</option>
                            </select>
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#2563eb" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {selectedCustomMetricIds.length > 0 && Object.keys(customChartsData).length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3">Gráficos de criterios personalizados</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedCustomMetricIds.map(id => {
                            const metric = customMetrics.find(m => m.id === id);
                            if (!metric) return null;
                            const data = customChartsData[id] || [];
                            return (
                                <div key={id} className="h-64">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-2">{metric.name}</h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="#16a34a" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {selectedCandidates.length > 0 && (locationDist.length > 0 || sourceDist.length > 0) && (
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3">Distribuciones adicionales</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {locationDist.length > 0 && (
                            <div className="h-64">
                                <h3 className="text-sm font-semibold text-gray-800 mb-2">Ubicaciones</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={locationDist}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#0ea5e9" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                        {sourceDist.length > 0 && (
                            <div className="h-64">
                                <h3 className="text-sm font-semibold text-gray-800 mb-2">Fuentes</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sourceDist}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#f97316" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm" ref={commentsRef}>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Comentarios para informe</h2>
                <textarea value={comments} onChange={e => setComments(e.target.value)} rows={5} className="w-full border border-gray-300 rounded-md shadow-sm p-3" placeholder="Anota aquí observaciones, riesgos, fortalezas, recomendación final..." />
                <div className="mt-3 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={savePdfToCandidates} onChange={e => setSavePdfToCandidates(e.target.checked)} />
                        Guardar PDF en Adjuntos de candidatos seleccionados
                    </label>
                    <div className="flex gap-2">
                        <button onClick={exportReport} disabled={selectedCandidates.length === 0} className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm disabled:opacity-50">
                            Exportar JSON
                        </button>
                        <button onClick={exportPDF} disabled={selectedCandidates.length === 0} className="px-4 py-2 bg-primary-600 text-white rounded-md shadow-sm disabled:bg-primary-300 flex items-center">
                            <Download className="w-4 h-4 mr-2" /> Exportar PDF
                        </button>
                    </div>
                </div>
            </div>
            </div>

            {/* Contenido resumen SOLO para PDF (no visible en UI) */}
            <div className="hidden">
                <div ref={summaryHeaderRef}>
                    <h2>Resumen de candidatos</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Proceso</th>
                                <th>Avance</th>
                                <th>Edad</th>
                                <th>Salario</th>
                                <th>Adjuntos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedCandidates.map(c => {
                                const proc = processes.find(p => p.id === c.processId)?.title || '';
                                return (
                                    <tr key={c.id}>
                                        <td>{c.name}</td>
                                        <td>{c.email}</td>
                                        <td>{proc}</td>
                                        <td>{stageProgress(c)}%</td>
                                        <td>{c.age ?? '-'}</td>
                                        <td>{c.salaryExpectation || '-'}</td>
                                        <td>{attachmentsCount(c)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {customMetrics.length > 0 && selectedCandidates.length > 0 && (
                    <div ref={summaryCustomRef}>
                        <h2>Puntuaciones personalizadas</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Criterio</th>
                                    {selectedCandidates.map(c => <th key={c.id}>{c.name}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {customMetrics.map(m => (
                                    <tr key={m.id}>
                                        <td>{m.name}</td>
                                        {selectedCandidates.map(c => (
                                            <td key={c.id}>{customValues[m.id]?.[c.id] ?? ''}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};


