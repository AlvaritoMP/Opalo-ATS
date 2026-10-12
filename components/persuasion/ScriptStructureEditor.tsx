import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, RotateCcw, Trash2, X } from 'lucide-react';
import {
    AXIS_OBJECTIVE,
    EFFECT_OPTIONS,
    OBJECTION_SCRIPT,
    PERSUASION_PHASES,
    PHASE_LABEL,
    AXES,
    createSeedScript,
    effectFromValue,
    effectValue,
    newPersuasionId,
    type AxisId,
    type PersuasionPhase,
    type PersuasionScript,
    type ScriptAlternative,
    type ScriptNode,
} from '../../lib/persuasion/model';
import { loadScript, saveScript } from '../../lib/persuasion/storage';
import { queuePersuasionProcessPush, syncPersuasionProcess } from '../../lib/api/persuasion';

interface ScriptStructureEditorProps {
    processId: string;
    processTitle: string;
    onClose: () => void;
}

export const ScriptStructureEditor: React.FC<ScriptStructureEditorProps> = ({
    processId,
    processTitle,
    onClose,
}) => {
    const [script, setScript] = useState<PersuasionScript>(() => loadScript(processId));
    const [selectedId, setSelectedId] = useState<string>(() => loadScript(processId).nodes.find(n => n.entry)?.id || loadScript(processId).nodes[0]?.id || '');
    const skipScriptSave = useRef(true);
    const scriptRef = useRef(script);
    scriptRef.current = script;

    useEffect(() => {
        let cancel = false;
        const startedNodes = JSON.stringify(loadScript(processId).nodes);
        void syncPersuasionProcess(processId).then(snapshot => {
            if (cancel) return;
            const unchanged = JSON.stringify(scriptRef.current.nodes) === startedNodes;
            skipScriptSave.current = unchanged;
            if (unchanged) {
                setScript(snapshot.script);
                setSelectedId(current =>
                    snapshot.script.nodes.some(node => node.id === current)
                        ? current
                        : snapshot.script.nodes.find(node => node.entry)?.id || snapshot.script.nodes[0]?.id || ''
                );
            }
        });
        return () => {
            cancel = true;
        };
    }, [processId]);

    useEffect(() => {
        if (skipScriptSave.current) {
            skipScriptSave.current = false;
            return;
        }
        saveScript(processId, script);
        queuePersuasionProcessPush(processId, script);
    }, [processId, script]);

    const selected = script.nodes.find(n => n.id === selectedId) || null;

    const updateNode = (nodeId: string, patch: Partial<ScriptNode>) => {
        setScript(prev => ({
            nodes: prev.nodes.map(node => (node.id === nodeId ? { ...node, ...patch } : node)),
        }));
    };

    const updateAlternative = (nodeId: string, altId: string, patch: Partial<ScriptAlternative>) => {
        setScript(prev => ({
            nodes: prev.nodes.map(node => {
                if (node.id !== nodeId) return node;
                return {
                    ...node,
                    alternatives: node.alternatives.map(alt => (alt.id === altId ? { ...alt, ...patch } : alt)),
                };
            }),
        }));
    };

    const addAlternative = (nodeId: string, focus = true) => {
        const id = newPersuasionId('alt');
        setScript(prev => ({
            nodes: prev.nodes.map(node =>
                node.id === nodeId
                    ? { ...node, alternatives: [...node.alternatives, { id, label: '', opens: [] }] }
                    : node
            ),
        }));
        if (focus) {
            requestAnimationFrame(() => {
                document.querySelector<HTMLInputElement>(`[data-alt="${id}"]`)?.focus();
            });
        }
    };

    const removeAlternative = (nodeId: string, altId: string) => {
        setScript(prev => ({
            nodes: prev.nodes.map(node =>
                node.id === nodeId
                    ? { ...node, alternatives: node.alternatives.filter(alt => alt.id !== altId) }
                    : node
            ),
        }));
    };

    const removeNode = (nodeId: string) => {
        setScript(prev => ({
            nodes: prev.nodes
                .filter(node => node.id !== nodeId)
                .map(node => ({
                    ...node,
                    alternatives: node.alternatives.map(alt => ({
                        ...alt,
                        opens: alt.opens.filter(id => id !== nodeId),
                    })),
                })),
        }));
        setSelectedId(current => (current === nodeId ? '' : current));
    };

    const addFollowUp = (nodeId: string, altId: string) => {
        const parent = script.nodes.find(node => node.id === nodeId);
        const id = newPersuasionId('pregunta');
        const node: ScriptNode = {
            id,
            phase: parent?.phase || 'sondeo',
            axis: parent?.axis,
            say: '',
            alternatives: [{ id: newPersuasionId('alt'), label: '', opens: [] }],
        };
        setScript(prev => ({
            nodes: [
                ...prev.nodes.map(item =>
                    item.id === nodeId
                        ? {
                              ...item,
                              alternatives: item.alternatives.map(alt =>
                                  alt.id === altId ? { ...alt, opens: [...alt.opens, id] } : alt
                              ),
                          }
                        : item
                ),
                node,
            ],
        }));
        setSelectedId(id);
        requestAnimationFrame(() => {
            document.querySelector<HTMLTextAreaElement>('[data-say="true"]')?.focus();
        });
    };

    const markEntry = (nodeId: string) => {
        setScript(prev => ({
            nodes: prev.nodes.map(node => ({ ...node, entry: node.id === nodeId })),
        }));
    };

    const addNodeToAxis = (axis: AxisId) => {
        const id = newPersuasionId('pregunta');
        const node: ScriptNode = {
            id,
            phase: 'sondeo',
            axis,
            say: '',
            entry: script.nodes.length === 0,
            alternatives: [{ id: newPersuasionId('alt'), label: '', opens: [] }],
        };
        setScript(prev => ({ nodes: [...prev.nodes, node] }));
        setSelectedId(id);
    };

    const groupedAxes = useMemo(
        () =>
            AXES.map(axis => ({
                ...axis,
                objective: AXIS_OBJECTIVE[axis.id],
                nodes: script.nodes.filter(node => node.axis === axis.id),
            })),
        [script.nodes]
    );
    const looseNodes = script.nodes.filter(node => !node.axis);

    return (
        <div className="fixed inset-0 z-[70] flex h-screen w-screen flex-col bg-white">
            <div className="flex h-full min-h-0 flex-col">
                <header className="flex items-center gap-3 border-b px-4 py-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Estructura del guion</p>
                        <h2 className="truncate text-lg font-semibold text-gray-900">{processTitle}</h2>
                        <p className="text-xs text-gray-500">
                            Este árbol es del proceso y lo comparten los consultores. La consola de la llamada solo lo recorre.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const seed = createSeedScript();
                            setScript(seed);
                            setSelectedId(seed.nodes[0]?.id || '');
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Restaurar ejemplo
                    </button>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100" title="Cerrar">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </header>
                <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)]">
                    <aside className="min-h-0 overflow-y-auto border-r bg-gray-50 p-3">
                        {groupedAxes.map(group => (
                            <section key={group.id} className="mb-4">
                                <div className="mb-1 flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3 className="text-xs font-semibold text-gray-800">{group.label}</h3>
                                        <p className="text-[11px] leading-snug text-gray-500">{group.objective}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => addNodeToAxis(group.id)}
                                        className="rounded p-1 text-violet-700 hover:bg-violet-100"
                                        title="Agregar pregunta en este eje"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {group.nodes.map((node, index) => (
                                        <button
                                            key={node.id}
                                            type="button"
                                            onClick={() => setSelectedId(node.id)}
                                            className={`w-full rounded-lg px-2 py-2 text-left text-sm ${
                                                node.id === selectedId
                                                    ? 'bg-violet-600 text-white'
                                                    : 'bg-white text-gray-800 hover:bg-violet-50'
                                            }`}
                                            data-node-jump={node.id}
                                        >
                                            <span className="line-clamp-2">{index + 1}. {node.say || 'Pregunta sin texto'}</span>
                                            {node.entry && (
                                                <span className={`mt-1 block text-[10px] font-semibold uppercase ${node.id === selectedId ? 'text-violet-100' : 'text-violet-700'}`}>
                                                    Inicio de la llamada
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                    {group.nodes.length === 0 && (
                                        <p className="px-1 text-xs text-gray-400">Sin preguntas</p>
                                    )}
                                </div>
                            </section>
                        ))}
                        {looseNodes.length > 0 && (
                            <section>
                                <h3 className="mb-1 text-xs font-semibold text-gray-500">Sin eje</h3>
                                {looseNodes.map(node => (
                                    <button
                                        key={node.id}
                                        type="button"
                                        onClick={() => setSelectedId(node.id)}
                                        data-node-jump={node.id}
                                        className={`mb-1 w-full rounded-lg px-2 py-2 text-left text-sm ${
                                            node.id === selectedId ? 'bg-violet-600 text-white' : 'bg-white text-gray-800'
                                        }`}
                                    >
                                        <span className="line-clamp-2">{node.say || 'Pregunta sin texto'}</span>
                                    </button>
                                ))}
                            </section>
                        )}
                    </aside>
                    <div className="min-h-0 overflow-y-auto p-4">
                        {!selected && (
                            <p className="text-sm text-gray-500">Elige una pregunta o agrégala en una fase.</p>
                        )}
                        {selected && (
                            <NodeEditor
                                node={selected}
                                script={script}
                                onChange={patch => updateNode(selected.id, patch)}
                                onAlternative={(altId, patch) => updateAlternative(selected.id, altId, patch)}
                                onAddAlternative={() => addAlternative(selected.id)}
                                onAddFollowUp={altId => addFollowUp(selected.id, altId)}
                                onRemoveAlternative={altId => removeAlternative(selected.id, altId)}
                                onRemove={() => removeNode(selected.id)}
                                onMakeEntry={() => markEntry(selected.id)}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const NodeEditor: React.FC<{
    node: ScriptNode;
    script: PersuasionScript;
    onChange: (patch: Partial<ScriptNode>) => void;
    onAlternative: (altId: string, patch: Partial<ScriptAlternative>) => void;
    onAddAlternative: () => void;
    onAddFollowUp: (altId: string) => void;
    onRemoveAlternative: (altId: string) => void;
    onRemove: () => void;
    onMakeEntry: () => void;
}> = ({ node, script, onChange, onAlternative, onAddAlternative, onAddFollowUp, onRemoveAlternative, onRemove, onMakeEntry }) => {
    const destinations = script.nodes.filter(item => item.id !== node.id);
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-medium text-gray-500">
                    Fase
                    <select
                        value={node.phase}
                        onChange={e => onChange({ phase: e.target.value as PersuasionPhase })}
                        className="ml-2 rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-900"
                    >
                        {PERSUASION_PHASES.map(phase => (
                            <option key={phase} value={phase}>
                                {PHASE_LABEL[phase]}
                            </option>
                        ))}
                    </select>
                </label>
                <div className="flex flex-wrap items-center gap-1">
                    {AXES.map(axis => (
                        <button
                            key={axis.id}
                            type="button"
                            onClick={() => {
                                onChange({ axis: axis.id });
                                window.setTimeout(() => {
                                    document.querySelector(`[data-node-jump="${node.id}"]`)?.scrollIntoView({ block: 'nearest' });
                                }, 0);
                            }}
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                node.axis === axis.id ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-violet-50'
                            }`}
                        >
                            {axis.label}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={onMakeEntry}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        node.entry ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-violet-50'
                    }`}
                >
                    {node.entry ? 'Inicio de la llamada' : 'Marcar como inicio'}
                </button>
                <button
                    type="button"
                    onClick={onRemove}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-red-700 hover:bg-red-50"
                >
                    <Trash2 className="h-4 w-4" />
                    Quitar pregunta
                </button>
            </div>
            {node.axis && (
                <p className="rounded-lg bg-violet-50 px-3 py-2 text-sm leading-snug text-violet-950">
                    Objetivo: {AXIS_OBJECTIVE[node.axis]}
                </p>
            )}
            <label className="block text-sm font-medium text-gray-700">
                Lo que se lee en la llamada
                <textarea
                    value={node.say}
                    onChange={e => onChange({ say: e.target.value })}
                    rows={3}
                    data-say="true"
                    placeholder="Usa {nombre} y {puesto} si quieres."
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
            </label>
            <div>
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">Alternativas</h3>
                    <button
                        type="button"
                        onClick={onAddAlternative}
                        className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
                    >
                        <Plus className="h-4 w-4" />
                        Alternativa
                    </button>
                </div>
                <div className="space-y-3">
                    {node.alternatives.map((alternative, index) => {
                        const effect = effectValue(alternative.effect);
                        const isObjection = alternative.effect?.type === 'objection';
                        return (
                            <div key={alternative.id} className="rounded-xl border border-gray-200 p-3">
                                <div className="flex items-start gap-2">
                                    <span className="mt-2 w-5 text-sm font-semibold text-gray-400">{index + 1}</span>
                                    <input
                                        data-alt={alternative.id}
                                        value={alternative.label}
                                        onChange={e => onAlternative(alternative.id, { label: e.target.value })}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                onAddAlternative();
                                            }
                                        }}
                                        placeholder="Texto del botón. Enter agrega otra."
                                        className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => onRemoveAlternative(alternative.id)}
                                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                        title="Quitar alternativa"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="mt-2 space-y-2">
                                    <div>
                                        <p className="text-xs text-gray-500">Siguientes preguntas de este eje</p>
                                        <p className="text-[11px] text-gray-400">
                                            Se preguntan una por una, en este orden, después de elegir esta respuesta.
                                        </p>
                                        <ol className="mt-1 space-y-1">
                                            {alternative.opens.map((targetId, level) => {
                                                const target = script.nodes.find(item => item.id === targetId);
                                                return (
                                                    <li key={`${alternative.id}-${targetId}`} className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const select = document.querySelector<HTMLButtonElement>(
                                                                    `[data-node-jump="${targetId}"]`
                                                                );
                                                                select?.click();
                                                            }}
                                                            className="min-w-0 flex-1 truncate rounded-lg bg-violet-50 px-2 py-1 text-left text-xs text-violet-900 hover:bg-violet-100"
                                                        >
                                                            Nivel {level + 2} · {target?.say || 'Pregunta sin texto'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                onAlternative(alternative.id, {
                                                                    opens: alternative.opens.filter(id => id !== targetId),
                                                                })
                                                            }
                                                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                                            title="Quitar este nivel"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => onAddFollowUp(alternative.id)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-violet-300 bg-white px-2 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-50"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Siguiente pregunta de este eje
                                            </button>
                                            <select
                                                value=""
                                                onChange={e => {
                                                    const id = e.target.value;
                                                    if (!id || alternative.opens.includes(id)) return;
                                                    onAlternative(alternative.id, { opens: [...alternative.opens, id] });
                                                }}
                                                className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-700"
                                            >
                                                <option value="">Vincular una pregunta ya hecha</option>
                                                {destinations
                                                    .filter(dest => !alternative.opens.includes(dest.id))
                                                    .map(dest => (
                                                        <option key={dest.id} value={dest.id}>
                                                            {PHASE_LABEL[dest.phase]} · {dest.say.slice(0, 50) || 'Sin texto'}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>
                                    <label className="block text-xs text-gray-500">
                                        Al elegir marca
                                        <select
                                            value={effect}
                                            onChange={e => {
                                                const next = effectFromValue(e.target.value);
                                                const patch: Partial<ScriptAlternative> = { effect: next };
                                                if (next?.type === 'objection' && !alternative.battlecard) {
                                                    patch.battlecard = OBJECTION_SCRIPT[next.code];
                                                }
                                                onAlternative(alternative.id, patch);
                                            }}
                                            className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-900"
                                        >
                                            {EFFECT_OPTIONS.map(option => (
                                                <option key={option.value || 'none'} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                                {isObjection && (
                                    <label className="mt-2 block text-xs text-gray-500">
                                        Guion para leer
                                        <textarea
                                            value={alternative.battlecard || ''}
                                            onChange={e => onAlternative(alternative.id, { battlecard: e.target.value })}
                                            rows={2}
                                            className="mt-1 w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-gray-900"
                                        />
                                    </label>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
