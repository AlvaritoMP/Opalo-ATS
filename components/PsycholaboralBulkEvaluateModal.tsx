import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Loader2, Save, RefreshCw } from 'lucide-react';
import { useAppState } from '../App';
import { BulkCandidate } from '../lib/api/bulkCandidates';
import {
    Process,
    PsycholaboralEvaluation,
    PsycholaboralInventory,
    IntellectualLevelId,
    PersonalityLevel,
    PsycholaboralSuitability,
    CustomColumn,
} from '../types';
import { psycholaboralApi } from '../lib/api/psycholaboral';
import {
    resolveProcessCompetencies,
    createEmptyEvaluation,
    mergePsycholaboralInventory,
    generateConclusionFromTemplate,
    buildPsycholaboralDisplayName,
} from '../lib/psycholaboralUtils';

const LEVEL_OPTIONS: PersonalityLevel[] = ['bajo', 'promedio', 'alto'];

interface Props {
    isOpen: boolean;
    onClose: () => void;
    candidates: BulkCandidate[];
    process: Process;
    inventory: PsycholaboralInventory;
    customColumns?: CustomColumn[];
    columnValues?: Record<string, Record<string, unknown>>;
}

export const PsycholaboralBulkEvaluateModal: React.FC<Props> = ({
    isOpen,
    onClose,
    candidates,
    process,
    inventory: inventoryProp,
    customColumns = [],
    columnValues = {},
}) => {
    const { actions } = useAppState();
    const inventory = useMemo(() => mergePsycholaboralInventory(inventoryProp), [inventoryProp]);
    const competencies = useMemo(() => resolveProcessCompetencies(process, inventory), [process, inventory]);

    const defaultPosition =
        process.bulkConfig?.psycholaboral?.defaultPositionTitle || process.title || '';
    const defaultTemplateId =
        process.bulkConfig?.psycholaboral?.defaultConclusionTemplateId || '';

    const [rows, setRows] = useState<Record<string, PsycholaboralEvaluation>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [batchTemplateId, setBatchTemplateId] = useState(defaultTemplateId);
    const [globalReportDate, setGlobalReportDate] = useState(
        () => new Date().toISOString().split('T')[0]
    );

    const loadEvaluations = useCallback(async () => {
        const next: Record<string, PsycholaboralEvaluation> = {};
        await Promise.all(
            candidates.map(async c => {
                const saved = await psycholaboralApi.getEvaluation(c.id);
                next[c.id] = createEmptyEvaluation(inventory, competencies, saved, defaultPosition);
            })
        );
        setRows(next);
    }, [candidates, inventory, competencies, defaultPosition]);

    useEffect(() => {
        if (!isOpen || candidates.length === 0) return;
        setLoading(true);
        loadEvaluations().finally(() => setLoading(false));
    }, [isOpen, candidates, loadEvaluations]);

    useEffect(() => {
        setBatchTemplateId(defaultTemplateId);
    }, [defaultTemplateId, isOpen]);

    const updateRow = useCallback((candidateId: string, updater: (e: PsycholaboralEvaluation) => PsycholaboralEvaluation) => {
        setRows(prev => ({
            ...prev,
            [candidateId]: updater(prev[candidateId] || createEmptyEvaluation(inventory, competencies, null, defaultPosition)),
        }));
    }, [inventory, competencies, defaultPosition]);

    const setIntellectualLevel = (candidateId: string, intellectualLevelId: IntellectualLevelId) => {
        updateRow(candidateId, ev => ({ ...ev, intellectualLevelId }));
    };

    const setPersonalityLevel = (candidateId: string, traitId: string, level: PersonalityLevel) => {
        updateRow(candidateId, ev => ({
            ...ev,
            personality: ev.personality.map(p => (p.traitId === traitId ? { ...p, level } : p)),
        }));
    };

    const setCompScore = (candidateId: string, competencyId: string, score: number) => {
        const v = Math.min(9, Math.max(1, score || 0));
        updateRow(candidateId, ev => ({
            ...ev,
            competencies: ev.competencies.map(r =>
                r.competencyId === competencyId ? { ...r, obtainedScore: v } : r
            ),
        }));
    };

    const setSuitability = (candidateId: string, suitabilityStatus: PsycholaboralSuitability) => {
        updateRow(candidateId, ev => ({ ...ev, suitabilityStatus }));
    };

    const setReportDateRow = (candidateId: string, reportDate: string) => {
        updateRow(candidateId, ev => ({ ...ev, reportDate }));
    };

    const setPositionRow = (candidateId: string, positionApplied: string) => {
        updateRow(candidateId, ev => ({ ...ev, positionApplied }));
    };

    const setConclusionsRow = (candidateId: string, conclusions: string) => {
        updateRow(candidateId, ev => ({ ...ev, conclusions }));
    };

    const applyGlobalReportDate = () => {
        setRows(prev =>
            Object.fromEntries(
                Object.entries(prev).map(([id, ev]) => [id, { ...ev, reportDate: globalReportDate }])
            )
        );
        actions.showToast('Fecha actualizada en todos los candidatos', 'success', 2000);
    };

    const getDisplayName = useCallback(
        (c: BulkCandidate) => {
            const getCell = (columnId: string) => columnValues[c.id]?.[columnId];
            return buildPsycholaboralDisplayName(c.name, customColumns, getCell);
        },
        [columnValues, customColumns]
    );

    const applyTemplateToRow = (candidateId: string) => {
        const tplId = batchTemplateId;
        if (!tplId) {
            actions.showToast('Seleccione una plantilla de conclusión', 'info', 2500);
            return;
        }
        const tpl = inventory.conclusionTemplates.find(t => t.id === tplId);
        const cand = candidates.find(c => c.id === candidateId);
        if (!tpl || !cand) return;
        setRows(prev => {
            const ev = prev[candidateId];
            if (!ev) return prev;
            const conclusions = generateConclusionFromTemplate(
                tpl,
                cand,
                process,
                ev,
                inventory,
                competencies,
                { displayName: getDisplayName(cand) }
            );
            return { ...prev, [candidateId]: { ...ev, conclusions } };
        });
    };

    const applyTemplateToAll = () => {
        if (!batchTemplateId) {
            actions.showToast('Seleccione una plantilla', 'info', 2500);
            return;
        }
        const tpl = inventory.conclusionTemplates.find(t => t.id === batchTemplateId);
        if (!tpl) return;
        setRows(prev => {
            const next = { ...prev };
            candidates.forEach(c => {
                const ev = next[c.id];
                if (!ev) return;
                next[c.id] = {
                    ...ev,
                    conclusions: generateConclusionFromTemplate(tpl, c, process, ev, inventory, competencies, {
                        displayName: getDisplayName(c),
                    }),
                };
            });
            return next;
        });
        actions.showToast(`Conclusiones regeneradas (${candidates.length})`, 'success', 2500);
    };

    const handleSaveAll = async () => {
        setSaving(true);
        let ok = 0;
        try {
            for (const c of candidates) {
                const ev = rows[c.id];
                if (!ev) continue;
                await psycholaboralApi.saveEvaluation(c.id, ev);
                ok++;
            }
            actions.showToast(`${ok} evaluación(es) guardada(s)`, 'success', 3000);
            onClose();
        } catch (e: any) {
            actions.showToast(e.message || 'Error al guardar', 'error', 5000);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || candidates.length === 0) return null;

    const intLevels = inventory.intellectualLevels;

    return (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-2 md:p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-[min(1400px,100vw)] max-h-[95vh] flex flex-col overflow-hidden border border-gray-200">
                <div className="flex items-start justify-between gap-3 px-4 py-3 border-b bg-slate-50 shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Evaluación psicolaboral masiva</h2>
                        <p className="text-xs text-gray-600 mt-0.5">
                            {process.title} · {candidates.length} candidato(s). Edite y guarde; luego puede abrir cada uno para revisar texto largo y PDF.
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-4 py-2 border-b bg-white flex flex-wrap items-end gap-2 shrink-0 text-xs">
                    <label className="flex flex-col gap-0.5">
                        <span className="text-gray-600 font-medium">Plantilla conclusions</span>
                        <select
                            value={batchTemplateId}
                            onChange={e => setBatchTemplateId(e.target.value)}
                            className="border rounded px-2 py-1.5 text-xs min-w-[180px]"
                        >
                            <option value="">— Elegir —</option>
                            {inventory.conclusionTemplates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        onClick={applyTemplateToAll}
                        disabled={!batchTemplateId}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-800 rounded-lg border border-indigo-200 hover:bg-indigo-100 disabled:opacity-40"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Generar conclusions en todas las filas
                    </button>
                    <label className="flex flex-col gap-0.5">
                        <span className="text-gray-600 font-medium">Fecha informe (todas las filas)</span>
                        <div className="flex gap-1">
                            <input
                                type="date"
                                value={globalReportDate}
                                onChange={e => setGlobalReportDate(e.target.value)}
                                className="border rounded px-2 py-1.5 text-xs"
                            />
                            <button
                                type="button"
                                onClick={applyGlobalReportDate}
                                className="px-2 py-1.5 border rounded hover:bg-gray-50"
                            >
                                Aplicar fecha
                            </button>
                        </div>
                    </label>
                </div>

                {loading ? (
                    <div className="flex justify-center py-24">
                        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto min-h-0 p-3">
                        <table className="border-collapse text-xs w-max min-w-full">
                            <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                                <tr className="border-b border-slate-200">
                                    <th className="text-left px-2 py-2 font-semibold whitespace-nowrap sticky left-0 bg-slate-100 z-20 border-r border-slate-200">
                                        Candidato
                                    </th>
                                    <th className="px-1 py-2 font-semibold whitespace-nowrap" title="Puesto aplicado">
                                        Puesto
                                    </th>
                                    <th className="px-1 py-2 font-semibold whitespace-nowrap">Fecha</th>
                                    <th className="px-1 py-2 font-semibold whitespace-nowrap min-w-[120px]">Nivel intel.</th>
                                    {inventory.personalityTraits.map(t => (
                                        <th
                                            key={t.id}
                                            className="px-1 py-2 font-semibold whitespace-nowrap max-w-[72px] truncate"
                                            title={t.name}
                                        >
                                            {t.name.length > 10 ? `${t.name.slice(0, 10)}.` : t.name}
                                        </th>
                                    ))}
                                    {competencies.map(c => (
                                        <th
                                            key={c.id}
                                            className="px-0.5 py-2 font-semibold whitespace-nowrap text-center max-w-[48px]"
                                            title={`${c.name} (esp. ${c.expectedScore})`}
                                        >
                                            Pt
                                            <br />
                                            <span className="font-normal text-[10px] text-gray-500">{c.expectedScore}</span>
                                        </th>
                                    ))}
                                    <th className="px-1 py-2 font-semibold whitespace-nowrap min-w-[100px]">
                                        Resultado
                                    </th>
                                    <th className="px-1 py-2 font-semibold min-w-[200px]">
                                        Conclusiones / acciones
                                    </th>
                                    <th className="px-1 py-2 w-24" aria-hidden />
                                </tr>
                            </thead>
                            <tbody>
                                {candidates.map(c => {
                                    const ev = rows[c.id];
                                    if (!ev) return null;
                                    return (
                                        <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                                            <td className="px-2 py-1 sticky left-0 bg-white hover:bg-inherit border-r border-slate-100 font-medium max-w-[160px]">
                                                <span className="truncate block" title={c.name}>{c.name}</span>
                                                {c.dni && (
                                                    <span className="text-[10px] text-gray-500 block">DNI {c.dni}</span>
                                                )}
                                            </td>
                                            <td className="px-1 py-1">
                                                <input
                                                    type="text"
                                                    value={ev.positionApplied || ''}
                                                    onChange={e => setPositionRow(c.id, e.target.value)}
                                                    className="w-28 px-1 py-0.5 border rounded text-[11px]"
                                                    placeholder={defaultPosition.slice(0, 20)}
                                                />
                                            </td>
                                            <td className="px-1 py-1">
                                                <input
                                                    type="date"
                                                    value={ev.reportDate?.split('T')[0] || ''}
                                                    onChange={e => setReportDateRow(c.id, e.target.value)}
                                                    className="w-[124px] px-1 py-0.5 border rounded text-[11px]"
                                                />
                                            </td>
                                            <td className="px-1 py-1">
                                                <select
                                                    value={ev.intellectualLevelId}
                                                    onChange={e =>
                                                        setIntellectualLevel(c.id, e.target.value as IntellectualLevelId)
                                                    }
                                                    className="max-w-[130px] text-[11px] px-1 py-0.5 border rounded"
                                                >
                                                    {intLevels.map(l => (
                                                        <option key={l.id} value={l.id}>
                                                            {l.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            {inventory.personalityTraits.map(t => {
                                                const rating = ev.personality.find(p => p.traitId === t.id);
                                                return (
                                                    <td key={t.id} className="px-0.5 py-1">
                                                        <select
                                                            value={rating?.level ?? 'promedio'}
                                                            onChange={e =>
                                                                setPersonalityLevel(
                                                                    c.id,
                                                                    t.id,
                                                                    e.target.value as PersonalityLevel
                                                                )
                                                            }
                                                            className="w-full max-w-[78px] text-[10px] px-0.5 py-0.5 border rounded capitalize"
                                                        >
                                                            {LEVEL_OPTIONS.map(o => (
                                                                <option key={o} value={o}>{o}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                );
                                            })}
                                            {competencies.map(comp => {
                                                const rating = ev.competencies.find(r => r.competencyId === comp.id);
                                                return (
                                                    <td key={comp.id} className="px-0.5 py-1 text-center">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={9}
                                                            value={rating?.obtainedScore ?? ''}
                                                            onChange={e =>
                                                                setCompScore(
                                                                    c.id,
                                                                    comp.id,
                                                                    parseInt(e.target.value, 10) || 1
                                                                )
                                                            }
                                                            className="w-9 text-center px-0 py-0.5 border rounded text-[11px]"
                                                        />
                                                    </td>
                                                );
                                            })}
                                            <td className="px-1 py-1">
                                                <select
                                                    value={ev.suitabilityStatus || 'apto'}
                                                    onChange={e =>
                                                        setSuitability(c.id, e.target.value as PsycholaboralSuitability)
                                                    }
                                                    className="text-[10px] px-1 py-0.5 border rounded max-w-[110px]"
                                                >
                                                    <option value="apto">Apto</option>
                                                    <option value="apto_reservas">Reservas</option>
                                                    <option value="no_apto">No apto</option>
                                                </select>
                                            </td>
                                            <td className="px-1 py-1 align-top">
                                                <textarea
                                                    value={ev.conclusions || ''}
                                                    onChange={e => setConclusionsRow(c.id, e.target.value)}
                                                    rows={2}
                                                    className="w-[min(240px,25vw)] text-[11px] px-1 py-0.5 border rounded resize-y min-h-[40px]"
                                                    placeholder="Observaciones o conclusiones..."
                                                />
                                            </td>
                                            <td className="px-1 py-1 align-top whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    disabled={!batchTemplateId}
                                                    onClick={() => applyTemplateToRow(c.id)}
                                                    className="text-[10px] text-indigo-600 hover:underline disabled:text-gray-400"
                                                >
                                                    Plantilla esta fila
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex justify-end gap-2 px-4 py-3 border-t bg-slate-50 shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-white">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={loading || saving}
                        onClick={handleSaveAll}
                        className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar evaluaciones
                    </button>
                </div>
            </div>
        </div>
    );
};
