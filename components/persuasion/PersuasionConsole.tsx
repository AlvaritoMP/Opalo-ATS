import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ClipboardCopy, Eraser, Mic, Save, Trash2, X } from 'lucide-react';
import type { BulkCandidate } from '../../lib/api/bulkCandidates';
import {
    AXES,
    AXIS_HEAT_COLOR,
    AXIS_HEAT_LABEL,
    AXIS_HEAT_LEVELS,
    AXIS_OBJECTIVE,
    COMMITMENTS,
    LEVERS,
    NEXT_ACTION_PRESETS,
    PREDICTION_DELTA_LIMIT,
    answerNode,
    clampPredictionDelta,
    emptyBoard,
    interpolateSay,
    newPersuasionId,
    objectionLabel,
    predictDay1,
    projectCall,
    undoLastAnswer,
    type AxisHeat,
    type AxisId,
    type BoardCheckpoint,
    type BoardEvidence,
    type CandidateBoard,
    type CommitmentId,
    type EvidenceKind,
    type LeverId,
    type NextAction,
    type ObjectionCode,
    type PersuasionScript,
    type ScriptNode,
    type WhatsappArgument,
} from '../../lib/persuasion/model';
import { fileToEvidenceUrl, loadBoard, loadScript, loadWhatsappArguments, saveBoard, saveScript, saveWhatsappArguments } from '../../lib/persuasion/storage';
import { queuePersuasionBoardPush, queuePersuasionProcessPush, syncPersuasionBoard, syncPersuasionProcess } from '../../lib/api/persuasion';
import { ScriptNetwork } from './ScriptNetwork';

const EVIDENCE_KINDS: { id: EvidenceKind; label: string }[] = [
    { id: 'chat', label: 'Chat' },
    { id: 'dni', label: 'DNI' },
    { id: 'ruta', label: 'Ruta' },
    { id: 'otro', label: 'Otro' },
];

interface PersuasionConsoleProps {
    candidate: BulkCandidate;
    processId: string;
    processTitle: string;
    candidates: BulkCandidate[];
    scriptTick: number;
    onClose: () => void;
    onCandidateChange: (candidate: BulkCandidate) => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function answerLabel(node: ScriptNode, alternativeId: string | undefined): string {
    if (!alternativeId) return '';
    if (alternativeId === '__typed__') return 'Respuesta anotada';
    return node.alternatives.find(item => item.id === alternativeId)?.label || 'Respondida';
}

function gapAfter(previous: string, next: string): string {
    const diff = new Date(next).getTime() - new Date(previous).getTime();
    if (!Number.isFinite(diff) || diff < 0) return '';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0 && hours > 0) return `${days} d ${hours} h después`;
    if (days > 0) return `${days} d después`;
    if (hours > 0) return `${hours} h después`;
    return `${Math.max(1, Math.round(diff / 60000))} min después`;
}

function checkpointWhen(at: string): string {
    const date = new Date(at);
    const day = date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    const time = date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    return `${day} · ${time}`;
}

export const PersuasionConsole: React.FC<PersuasionConsoleProps> = ({
    candidate,
    processId,
    processTitle,
    candidates,
    scriptTick,
    onClose,
    onCandidateChange,
}) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const [script, setScript] = useState<PersuasionScript>(() => loadScript(processId));
    const [board, setBoard] = useState<CandidateBoard>(() => loadBoard(candidate.id));
    const [whatsappArguments, setWhatsappArguments] = useState<WhatsappArgument[]>(() => loadWhatsappArguments(processId));
    const [storageNote, setStorageNote] = useState('');
    const [hiddenObjection, setHiddenObjection] = useState<ObjectionCode | null>(null);
    const [focusId, setFocusId] = useState<string | null>(null);
    const [axisPick, setAxisPick] = useState<AxisId | null>(null);
    const [confirmClear, setConfirmClear] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const [viewingEvidenceId, setViewingEvidenceId] = useState<string | null>(null);
    const candidateIdRef = useRef(candidate.id);
    const skipProcessSave = useRef(true);
    const skipBoardSave = useRef(true);
    const scriptRef = useRef(script);
    const argumentsRef = useRef(whatsappArguments);
    scriptRef.current = script;
    argumentsRef.current = whatsappArguments;

    useEffect(() => {
        let cancel = false;
        const startedScript = JSON.stringify(loadScript(processId).nodes);
        const startedArguments = JSON.stringify(loadWhatsappArguments(processId));
        void syncPersuasionProcess(processId).then(snapshot => {
            if (cancel) return;
            const scriptSame = JSON.stringify(scriptRef.current.nodes) === startedScript;
            const argumentsSame = JSON.stringify(argumentsRef.current) === startedArguments;
            skipProcessSave.current = scriptSame && argumentsSame;
            if (scriptSame) setScript(snapshot.script);
            if (argumentsSame) setWhatsappArguments(snapshot.arguments);
        });
        return () => {
            cancel = true;
        };
    }, [processId, scriptTick]);

    useEffect(() => {
        if (skipProcessSave.current) {
            skipProcessSave.current = false;
            return;
        }
        saveScript(processId, script);
        saveWhatsappArguments(processId, whatsappArguments);
        queuePersuasionProcessPush(processId, script, whatsappArguments);
    }, [processId, script, whatsappArguments]);

    useEffect(() => {
        const id = candidate.id;
        const switching = candidateIdRef.current !== id;
        candidateIdRef.current = id;
        if (switching) skipBoardSave.current = true;
        let cancel = false;
        const startedBoard = JSON.stringify(loadBoard(id));
        void syncPersuasionBoard(processId, id).then(next => {
            if (cancel) return;
            setBoard(current => {
                const unchanged = JSON.stringify(current) === startedBoard;
                skipBoardSave.current = unchanged;
                return unchanged ? next : current;
            });
            if (!switching) return;
            setHiddenObjection(null);
            setFocusId(null);
            setAxisPick(null);
            setConfirmClear(false);
            setSavedFlash(false);
            setViewingEvidenceId(null);
        });
        return () => {
            cancel = true;
        };
    }, [candidate.id, processId]);

    useEffect(() => {
        if (candidateIdRef.current !== candidate.id) return;
        if (skipBoardSave.current) {
            skipBoardSave.current = false;
            return;
        }
        if (!saveBoard(candidate.id, board) && board.evidence.some(item => item.dataUrl)) {
            setStorageNote('La captura se ve ahora. Este navegador no alcanzó a guardarla para después.');
        }
        queuePersuasionBoardPush(processId, candidate.id, board, status => {
            if (status === 'error') setStorageNote('No se pudo guardar el avance en el servidor. Quedó en este navegador.');
            if (status === 'light') setStorageNote('La captura se ve ahora. El servidor no alcanzó a guardar la imagen.');
        });
    }, [board, candidate.id, processId]);

    useEffect(() => {
        panelRef.current?.focus();
    }, [candidate.id]);

    const snapshot = useMemo(() => projectCall(script, board), [script, board]);
    const prediction = useMemo(() => predictDay1(script, board, snapshot), [script, board, snapshot]);
    const focusNode = (id: string) => {
        setFocusId(id);
        const node = script.nodes.find(item => item.id === id);
        setAxisPick(node?.axis ?? null);
    };
    const focused = useMemo(() => {
        if (axisPick) {
            const nodes = script.nodes.filter(node => node.axis === axisPick);
            const current = focusId ? nodes.find(node => node.id === focusId) : undefined;
            return current ?? nodes.find(node => !board.answers[node.id]) ?? nodes[0];
        }
        const picked = focusId ? script.nodes.find(node => node.id === focusId) : undefined;
        return picked ?? snapshot.active;
    }, [axisPick, board.answers, focusId, script.nodes, snapshot.active]);
    const activeSay = focused ? interpolateSay(focused.say, candidate.name, processTitle) : '';
    const focusedAxis = axisPick ?? focused?.axis;
    const focusedHeat = focusedAxis ? board.axisHeat?.[focusedAxis] : undefined;

    const axisNodes = useMemo(() => {
        const groups = AXES.map(axis => ({
            ...axis,
            objective: AXIS_OBJECTIVE[axis.id],
            nodes: script.nodes.filter(node => node.axis === axis.id),
        }));
        const loose = script.nodes.filter(node => !node.axis);
        return { groups, loose };
    }, [script.nodes]);

    const totals = useMemo(() => {
        const total = script.nodes.length;
        const done = script.nodes.filter(node => board.answers[node.id]).length;
        return { total, done };
    }, [script.nodes, board.answers]);

    const patch = (recipe: (current: CandidateBoard) => CandidateBoard) => {
        setBoard(recipe);
    };

    const focusAxis = (axis: AxisId) => {
        setAxisPick(axis);
        const nodes = script.nodes.filter(node => node.axis === axis);
        const pending = nodes.find(node => !board.answers[node.id]);
        const target = pending ?? nodes[0];
        if (target) setFocusId(target.id);
    };

    const choose = (nodeId: string, alternativeId: string) => {
        setHiddenObjection(null);
        const node = script.nodes.find(item => item.id === nodeId);
        const alternative = node?.alternatives.find(item => item.id === alternativeId);
        patch(current => answerNode(current, nodeId, alternativeId));
        const next = alternative?.opens.find(id => script.nodes.some(item => item.id === id));
        if (next) {
            setFocusId(next);
            const nextNode = script.nodes.find(item => item.id === next);
            setAxisPick(nextNode?.axis ?? null);
        }
    };

    const moveCandidate = (delta: number) => {
        const index = candidates.findIndex(item => item.id === candidate.id);
        if (index < 0) return;
        const next = candidates[index + delta];
        if (next) onCandidateChange(next);
    };

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (isTypingTarget(event.target)) {
                    (event.target as HTMLElement).blur();
                    return;
                }
                event.preventDefault();
                onClose();
                return;
            }
            if (isTypingTarget(event.target)) return;
            if (event.key === 'Backspace') {
                event.preventDefault();
                const last = board.answerOrder[board.answerOrder.length - 1];
                patch(undoLastAnswer);
                if (last) {
                    setFocusId(last);
                    const node = script.nodes.find(item => item.id === last);
                    setAxisPick(node?.axis ?? null);
                }
                return;
            }
            if (event.key === 'j' || event.key === 'J') {
                event.preventDefault();
                moveCandidate(1);
                return;
            }
            if (event.key === 'k' || event.key === 'K') {
                event.preventDefault();
                moveCandidate(-1);
                return;
            }
            if (!focused) return;
            const digit = Number(event.key);
            if (digit >= 1 && digit <= 9) {
                const alternative = focused.alternatives[digit - 1];
                if (!alternative) return;
                event.preventDefault();
                choose(focused.id, alternative.id);
            }
        };
        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    });

    useEffect(() => {
        const onPaste = (event: ClipboardEvent) => {
            const items = event.clipboardData?.items;
            if (!items) return;
            let image: File | null = null;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    image = item.getAsFile();
                    break;
                }
            }
            if (image) {
                event.preventDefault();
                event.stopPropagation();
                const file = image;
                void fileToEvidenceUrl(file)
                    .then(dataUrl => {
                        patch(current => ({
                            ...current,
                            evidence: [
                                {
                                    id: newPersuasionId('ev'),
                                    kind: 'chat',
                                    name: file.name || 'captura',
                                    dataUrl,
                                },
                                ...current.evidence,
                            ],
                        }));
                    })
                    .catch(() => {
                        setStorageNote('No se pudo leer esa imagen.');
                    });
                return;
            }
            if (isTypingTarget(event.target)) return;
            const text = event.clipboardData?.getData('text/plain')?.trim();
            if (!text) return;
            event.preventDefault();
            event.stopPropagation();
            patch(current => ({
                ...current,
                dirtyNote: current.dirtyNote ? `${current.dirtyNote}\n${text}` : text,
            }));
        };
        document.addEventListener('paste', onPaste, true);
        return () => document.removeEventListener('paste', onPaste, true);
    });

    const changeWhatsappArguments = (next: WhatsappArgument[]) => {
        setWhatsappArguments(next);
    };

    const copyWhatsappArgument = async (item: WhatsappArgument) => {
        const text = interpolateSay(item.text, candidate.name, processTitle);
        try {
            await navigator.clipboard.writeText(text);
            patch(current => ({
                ...current,
                usedWhatsappArgumentIds: (current.usedWhatsappArgumentIds ?? []).includes(item.id)
                    ? current.usedWhatsappArgumentIds
                    : [...(current.usedWhatsappArgumentIds ?? []), item.id],
            }));
        } catch {
            setStorageNote('No se pudo copiar. Selecciona el texto del argumento y cópialo a mano.');
        }
    };

    const setLever = (lever: LeverId) => {
        patch(current => ({
            ...current,
            overrides: {
                ...current.overrides,
                lever: snapshot.lever === lever ? null : lever,
            },
        }));
    };

    const setCommitment = (commitment: CommitmentId) => {
        patch(current => ({
            ...current,
            overrides: {
                ...current.overrides,
                commitment: snapshot.commitment === commitment ? null : commitment,
            },
        }));
    };

    const setObjection = (code: ObjectionCode, state: 'abierta' | 'desmontada') => {
        patch(current => ({
            ...current,
            overrides: {
                ...current.overrides,
                objections: { ...current.overrides.objections, [code]: state },
            },
        }));
    };

    const setEvidenceKind = (id: string, kind: EvidenceKind) => {
        patch(current => ({
            ...current,
            evidence: current.evidence.map(item => (item.id === id ? { ...item, kind } : item)),
        }));
    };

    const removeEvidence = (id: string) => {
        setViewingEvidenceId(current => (current === id ? null : current));
        patch(current => ({
            ...current,
            evidence: current.evidence.filter(item => item.id !== id),
        }));
    };

    const setHeat = (axis: AxisId, level: AxisHeat) => {
        patch(current => {
            const axisHeat = { ...(current.axisHeat ?? {}) };
            if (axisHeat[axis] === level) delete axisHeat[axis];
            else axisHeat[axis] = level;
            return { ...current, axisHeat };
        });
    };

    const keepNote = () => {
        const text = board.dirtyNote.trim();
        if (!text) return;
        patch(current => ({
            ...current,
            dirtyNote: '',
            notes: [{ id: newPersuasionId('note'), text, at: new Date().toISOString() }, ...current.notes],
        }));
    };

    const setDelta = (delta: number) => {
        patch(current => ({ ...current, predictionDelta: clampPredictionDelta(delta) }));
    };

    const saveProgress = () => {
        patch(current => {
            const shot = projectCall(script, current);
            return {
                ...current,
                checkpoints: [
                    ...(current.checkpoints ?? []),
                    {
                        id: newPersuasionId('chk'),
                        at: new Date().toISOString(),
                        kind: 'save' as const,
                        answered: script.nodes.filter(node => current.answers[node.id]).length,
                        total: script.nodes.length,
                        temperature: predictDay1(script, current, shot).value,
                    },
                ],
            };
        });
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 1600);
    };

    const clearCanvas = () => {
        patch(current => {
            const fresh = emptyBoard();
            fresh.checkpoints = [
                ...(current.checkpoints ?? []),
                {
                    id: newPersuasionId('chk'),
                    at: new Date().toISOString(),
                    kind: 'reset',
                    answered: 0,
                    total: script.nodes.length,
                    temperature: 0,
                },
            ];
            return fresh;
        });
        setFocusId(null);
        setAxisPick(null);
        setConfirmClear(false);
    };

    const openObjection = snapshot.objections.find(
        item => item.state === 'abierta' && item.code !== hiddenObjection
    );

    const axisSteps = focusedAxis ? axisNodes.groups.find(group => group.id === focusedAxis) : undefined;

    return (
        <div className="fixed inset-0 z-[60] flex h-screen w-screen flex-col bg-white text-gray-900">
            <header className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2">
                <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold leading-tight">{candidate.name}</h2>
                    <p className="truncate text-[11px] text-gray-500">
                        {[candidate.phone, candidate.district, candidate.email, candidate.source].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                    </p>
                </div>
                <p className="ml-auto hidden text-right text-[11px] leading-tight text-gray-400 xl:block">
                    1–9 responde · Retroceso deshace · J/K otro candidato · Esc cierra
                </p>
                <p className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                    {totals.done}/{totals.total}
                </p>
                <p className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
                    {prediction.value}°
                </p>
                <button
                    type="button"
                    onClick={saveProgress}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                >
                    <Save className="h-3.5 w-3.5" />
                    {savedFlash ? 'Guardado' : 'Guardar avance'}
                </button>
                {confirmClear ? (
                    <span className="inline-flex items-center gap-1">
                        <button
                            type="button"
                            onClick={clearCanvas}
                            className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                        >
                            Sí, reiniciar
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmClear(false)}
                            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                    </span>
                ) : (
                    <button
                        type="button"
                        onClick={() => setConfirmClear(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        <Eraser className="h-3.5 w-3.5" />
                        Limpiar lienzo
                    </button>
                )}
                <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100" title="Cerrar">
                    <X className="h-5 w-5 text-gray-500" />
                </button>
            </header>
            {storageNote && <p className="shrink-0 bg-amber-50 px-3 py-1 text-xs text-amber-900">{storageNote}</p>}
            <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-2">
                    <aside className="relative z-10 col-start-1 row-start-1 flex min-h-0 min-w-0 flex-col overflow-hidden border-r bg-slate-50">
                        <div className="shrink-0 px-2 pt-2">
                            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Red</h3>
                        </div>
                        {focusedAxis && (
                            <div className="flex shrink-0 flex-wrap items-center gap-1.5 px-2 pb-1">
                                {AXIS_HEAT_LEVELS.map(level => {
                                    const active = focusedHeat === level;
                                    return (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setHeat(focusedAxis, level)}
                                            title={AXIS_HEAT_LABEL[level]}
                                            className={`h-5 w-5 rounded-full ${active ? 'ring-2 ring-gray-900 ring-offset-1' : ''}`}
                                            style={{ background: AXIS_HEAT_COLOR[level] }}
                                        />
                                    );
                                })}
                                <span className="text-[10px] text-gray-500">
                                    {focusedHeat !== undefined ? AXIS_HEAT_LABEL[focusedHeat] : 'Sin destacar'}
                                </span>
                            </div>
                        )}
                        <div className="min-h-0 flex-1 overflow-hidden">
                            <ScriptNetwork
                                groups={axisNodes.groups}
                                loose={axisNodes.loose}
                                answers={board.answers}
                                focusedId={focused?.id}
                                focusedAxis={focusedAxis}
                                heat={board.axisHeat}
                                nombre={candidate.name}
                                puesto={processTitle}
                                onFocusNode={focusNode}
                                onFocusAxis={focusAxis}
                            />
                        </div>
                    </aside>
                    <section className="col-start-2 row-start-1 row-span-2 min-h-0 min-w-0 overflow-y-auto px-4 py-3">
                        {openObjection && (
                            <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                                    Leer ahora · {objectionLabel(openObjection.code)}
                                </p>
                                <p className="mt-1 text-sm leading-snug text-amber-950">{openObjection.script}</p>
                                <div className="mt-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setObjection(openObjection.code, 'desmontada')}
                                        className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800"
                                    >
                                        Ya la desmonté
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setHiddenObjection(openObjection.code)}
                                        className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100"
                                    >
                                        Seguir con la pregunta
                                    </button>
                                </div>
                            </div>
                        )}
                        {axisSteps && (
                            <div className="mb-3">
                                <div className="flex items-baseline justify-between gap-3">
                                    <h3 className="text-sm font-semibold text-primary-800">{axisSteps.label}</h3>
                                    <span className="text-[11px] font-semibold text-gray-500">
                                        {axisSteps.nodes.filter(node => board.answers[node.id]).length}/{axisSteps.nodes.length}
                                    </span>
                                </div>
                                <p className="mt-0.5 text-sm leading-snug text-gray-600">{axisSteps.objective}</p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {axisSteps.nodes.map((node, index) => {
                                        const answered = board.answers[node.id];
                                        const current = node.id === focused?.id;
                                        return (
                                            <button
                                                key={node.id}
                                                type="button"
                                                onClick={() => focusNode(node.id)}
                                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                                    current
                                                        ? 'bg-primary-600 text-white'
                                                        : answered
                                                          ? 'bg-emerald-100 text-emerald-800'
                                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                {index + 1}. {answered ? answerLabel(node, answered) : 'Pendiente'}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {focused && !focused.axis && axisNodes.loose.length > 0 && (
                            <div className="mb-3">
                                <div className="flex items-baseline justify-between gap-3">
                                    <h3 className="text-sm font-semibold text-primary-800">Sin eje</h3>
                                    <span className="text-[11px] font-semibold text-gray-500">
                                        {axisNodes.loose.filter(node => board.answers[node.id]).length}/{axisNodes.loose.length}
                                    </span>
                                </div>
                                <p className="mt-0.5 text-sm leading-snug text-gray-600">Preguntas del guion que todavía no tienen eje temático.</p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {axisNodes.loose.map((node, index) => {
                                        const answered = board.answers[node.id];
                                        const current = node.id === focused.id;
                                        const title = node.say.trim() || 'Pregunta sin texto';
                                        return (
                                            <button
                                                key={node.id}
                                                type="button"
                                                onClick={() => focusNode(node.id)}
                                                className={`max-w-full truncate rounded-full px-2.5 py-1 text-left text-[11px] font-semibold ${
                                                    current
                                                        ? 'bg-primary-600 text-white'
                                                        : answered
                                                          ? 'bg-emerald-100 text-emerald-800'
                                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                {index + 1}. {title.length > 42 ? `${title.slice(0, 42)}…` : title}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {focused ? (
                            <>
                                {!focused.axis && (
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-700">Pregunta abierta</p>
                                )}
                                <h3 className="text-xl font-semibold leading-snug text-gray-900">{activeSay}</h3>
                                {board.answers[focused.id] && (
                                    <p className="mt-2 text-sm font-medium text-emerald-700">
                                        Respondió: {answerLabel(focused, board.answers[focused.id])}
                                    </p>
                                )}
                                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                                    {focused.alternatives.map((alternative, index) => {
                                        const selected = board.answers[focused.id] === alternative.id;
                                        return (
                                            <button
                                                key={alternative.id}
                                                type="button"
                                                onClick={() => choose(focused.id, alternative.id)}
                                                className={`flex min-h-11 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm font-medium ${
                                                    selected
                                                        ? 'border-primary-500 bg-primary-50 text-primary-950'
                                                        : 'border-gray-200 bg-white text-gray-900 hover:border-primary-400 hover:bg-primary-50'
                                                }`}
                                            >
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-600">
                                                    {index + 1}
                                                </span>
                                                {alternative.label || 'Sin texto'}
                                            </button>
                                        );
                                    })}
                                </div>
                                <TypedScriptAnswer
                                    nodeId={focused.id}
                                    onSave={text => {
                                        const nodeId = focused.id;
                                        const question = activeSay;
                                        patch(current =>
                                            answerNode(
                                                {
                                                    ...current,
                                                    customAnswers: [
                                                        ...(current.customAnswers ?? []),
                                                        {
                                                            id: newPersuasionId('free'),
                                                            nodeId,
                                                            question,
                                                            answer: text,
                                                            at: new Date().toISOString(),
                                                        },
                                                    ],
                                                },
                                                nodeId,
                                                '__typed__'
                                            )
                                        );
                                    }}
                                />
                            </>
                        ) : axisSteps && axisSteps.nodes.length === 0 ? (
                            <div className="rounded-lg bg-gray-50 px-4 py-6 text-center">
                                <p className="text-base font-medium text-gray-800">{axisSteps.label} todavía no tiene preguntas.</p>
                            </div>
                        ) : (
                            <div className="rounded-lg bg-gray-50 px-4 py-6 text-center">
                                <p className="text-base font-medium text-gray-800">
                                    {script.nodes.some(node => node.entry)
                                        ? 'Recorriste las ramas abiertas. Elige un eje del árbol para seguir.'
                                        : 'El guion no tiene una pregunta de inicio.'}
                                </p>
                            </div>
                        )}
                        <FreeQuestionBox
                            onSave={(question, answer) =>
                                patch(current => ({
                                    ...current,
                                    customAnswers: [
                                        ...(current.customAnswers ?? []),
                                        {
                                            id: newPersuasionId('free'),
                                            question,
                                            answer,
                                            at: new Date().toISOString(),
                                        },
                                    ],
                                }))
                            }
                        />
                    </section>
                    <aside className="col-start-1 row-start-2 min-h-0 min-w-0 overflow-y-auto border-r border-t bg-white p-3">
                        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Seguimiento</h3>
                        <CriticalPointsEditor
                            points={board.criticalPoints ?? []}
                            onChange={criticalPoints => patch(current => ({ ...current, criticalPoints }))}
                        />
                        <NextActionsEditor
                            actions={board.nextActions ?? []}
                            onChange={nextActions => patch(current => ({ ...current, nextActions }))}
                        />
                        <h3 className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Palanca</h3>
                        <div className="mt-1 flex flex-wrap gap-1">
                            {LEVERS.map(lever => (
                                <button
                                    key={lever.id}
                                    type="button"
                                    onClick={() => setLever(lever.id)}
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                        snapshot.lever === lever.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {lever.label}
                                </button>
                            ))}
                        </div>
                        <h3 className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Compromiso</h3>
                        <div className="mt-1 flex flex-wrap gap-1">
                            {COMMITMENTS.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setCommitment(item.id)}
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                        snapshot.commitment === item.id ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <h3 className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Protocolo</h3>
                        <ul className="mt-1 space-y-0.5">
                            {snapshot.milestones.map(item => (
                                <li key={item.id} className="flex items-center gap-1.5 text-[11px]">
                                    <span className={`h-2 w-2 rounded-full ${item.done ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                    <span className={item.done ? 'text-gray-800' : 'text-gray-500'}>{item.label}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-2 flex flex-wrap gap-1">
                            <button
                                type="button"
                                onClick={() => patch(current => ({ ...current, noObjection: !current.noObjection }))}
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${board.noObjection ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}
                            >
                                Sin objeción
                            </button>
                            <button
                                type="button"
                                onClick={() => patch(current => ({ ...current, routeAgreed: !current.routeAgreed }))}
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${board.routeAgreed ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}
                            >
                                Ruta acordada
                            </button>
                            <button
                                type="button"
                                onClick={() => patch(current => ({ ...current, day1Repeated: !current.day1Repeated }))}
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${board.day1Repeated ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}
                            >
                                Repitió día y hora
                            </button>
                        </div>
                    </aside>
                    <aside className="col-start-3 row-start-1 row-span-2 min-h-0 min-w-0 overflow-y-auto border-l p-3">
                        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Registro</h3>
                        <TemperaturePanel
                            prediction={prediction}
                            checkpoints={board.checkpoints ?? []}
                            onDelta={setDelta}
                        />
                        <EvidenceGallery
                            evidence={board.evidence ?? []}
                            onKind={setEvidenceKind}
                            onRemove={removeEvidence}
                            onOpen={setViewingEvidenceId}
                        />
                        <div className="mt-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Notas</h3>
                                <button
                                    type="button"
                                    disabled
                                    title="El dictado entra en una siguiente versión"
                                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-400"
                                >
                                    <Mic className="h-3 w-3" />
                                    Voz luego
                                </button>
                            </div>
                            <textarea
                                value={board.dirtyNote}
                                onChange={e => patch(current => ({ ...current, dirtyNote: e.target.value }))}
                                rows={3}
                                placeholder="Pega el chat o una nota suelta."
                                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                            />
                            <button type="button" onClick={keepNote} className="mt-1 text-[11px] font-medium text-primary-700 hover:underline">
                                Dejar en el recorrido
                            </button>
                        </div>
                        <WhatsappArguments
                            items={whatsappArguments}
                            usedIds={board.usedWhatsappArgumentIds ?? []}
                            nombre={candidate.name}
                            puesto={processTitle}
                            onCopy={item => void copyWhatsappArgument(item)}
                            onChange={changeWhatsappArguments}
                        />
                        <h3 className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Anotado en la llamada</h3>
                        <ul className="mt-1 space-y-1">
                            {(board.customAnswers ?? []).map(item => (
                                <li key={item.id} className="rounded-md bg-gray-50 px-2 py-1 text-[11px] text-gray-700">
                                    <span className="font-medium">{item.question}</span>
                                    <span className="block text-gray-500">{item.answer}</span>
                                </li>
                            ))}
                            {board.notes.map(note => (
                                <li key={note.id} className="rounded-md bg-gray-50 px-2 py-1 text-[11px] whitespace-pre-wrap text-gray-700">
                                    {note.text}
                                </li>
                            ))}
                            {(board.customAnswers ?? []).length === 0 && board.notes.length === 0 && (
                                <li className="text-[11px] text-gray-400">Aún no hay notas sueltas.</li>
                            )}
                        </ul>
                    </aside>
            </div>
            {viewingEvidenceId && (
                <EvidenceLightbox
                    item={(board.evidence ?? []).find(entry => entry.id === viewingEvidenceId) || null}
                    onClose={() => setViewingEvidenceId(null)}
                    onRemove={() => removeEvidence(viewingEvidenceId)}
                />
            )}
        </div>
    );
};

const TemperaturePanel: React.FC<{
    prediction: { base: number; delta: number; value: number };
    checkpoints: BoardCheckpoint[];
    onDelta: (delta: number) => void;
}> = ({ prediction, checkpoints, onDelta }) => {
    const tone = prediction.value >= 70 ? '#059669' : prediction.value >= 40 ? '#d97706' : '#0284c7';
    const saves = checkpoints.filter(item => item.kind === 'save');
    const times = saves.map(item => new Date(item.at).getTime());
    const min = times.length ? Math.min(...times) : 0;
    const max = times.length ? Math.max(...times, min + 1) : 1;
    const coords = saves.map(item => {
        const x = 10 + ((new Date(item.at).getTime() - min) / (max - min)) * 260;
        const y = 64 - (item.temperature / 100) * 52;
        return { x, y, item };
    });
    const line = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const deltaLabel = prediction.delta > 0 ? `+${prediction.delta}` : String(prediction.delta);

    return (
        <section className="rounded-lg border border-sky-100 bg-sky-50/70 px-2.5 py-2">
            <div className="flex items-center gap-2">
                <p className="w-10 shrink-0 text-lg font-semibold leading-none" style={{ color: tone }}>{prediction.value}°</p>
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full" style={{ width: `${prediction.value}%`, background: tone }} />
                </div>
                <p className="shrink-0 text-[10px] text-gray-500">ajuste {deltaLabel}</p>
            </div>
            <input
                type="range"
                min={-PREDICTION_DELTA_LIMIT}
                max={PREDICTION_DELTA_LIMIT}
                value={prediction.delta}
                onChange={event => onDelta(Number(event.target.value))}
                className="mt-1 h-4 w-full accent-sky-700"
                aria-label="Ajustar la predicción de llegada"
            />
            <div className="flex items-center justify-between text-[10px] text-gray-500">
                <span>Castigar</span>
                <button type="button" onClick={() => onDelta(0)} className="font-medium text-primary-700 hover:underline">
                    Quitar ajuste
                </button>
                <span>Mejorar</span>
            </div>
            <h4 className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Llegada al primer día</h4>
            {saves.length === 0 ? (
                <p className="mt-1 text-[11px] leading-snug text-gray-500">Guarda un avance para ver cómo cambia la temperatura con las horas y los días.</p>
            ) : (
                <svg viewBox="0 0 280 72" className="mt-1 h-12 w-full">
                    <path d={line} fill="none" stroke={tone} strokeWidth="2.5" />
                    {coords.map(point => (
                        <circle key={point.item.id} cx={point.x} cy={point.y} r="4" fill={tone} />
                    ))}
                </svg>
            )}
            <ul className="mt-1 space-y-1">
                {checkpoints.length === 0 && <li className="text-[11px] text-gray-400">Todavía no hay avances guardados.</li>}
                {[...checkpoints].reverse().map(item => {
                    const index = checkpoints.findIndex(entry => entry.id === item.id);
                    const previous = index > 0 ? checkpoints[index - 1] : undefined;
                    const gap = previous ? gapAfter(previous.at, item.at) : '';
                    return (
                        <li key={item.id} className="text-[11px] leading-snug text-gray-700">
                            <span className="font-medium">{checkpointWhen(item.at)}</span>
                            {gap && <span className="text-gray-500"> · {gap}</span>}
                            <span className="block text-gray-500">
                                {item.kind === 'reset' ? 'Lienzo reiniciado' : `${item.temperature}° · ${item.answered}/${item.total} preguntas`}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};

const EvidenceGallery: React.FC<{
    evidence: BoardEvidence[];
    onKind: (id: string, kind: EvidenceKind) => void;
    onRemove: (id: string) => void;
    onOpen: (id: string) => void;
}> = ({ evidence, onKind, onRemove, onOpen }) => (
    <section className="mt-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Capturas · Ctrl+V</h3>
        {evidence.length === 0 && (
            <p className="mt-1 text-[11px] text-gray-400">Pega una captura del chat, DNI o ruta para revisarla aquí.</p>
        )}
        <div className="mt-1 space-y-2">
            {evidence.map(item => (
                <figure key={item.id} className="overflow-hidden rounded-lg border bg-white">
                    {item.dataUrl ? (
                        <button type="button" onClick={() => onOpen(item.id)} className="block w-full bg-slate-100" title="Ver captura">
                            <img src={item.dataUrl} alt={item.name || 'Captura'} className="max-h-40 w-full object-contain" />
                        </button>
                    ) : (
                        <p className="px-2 py-3 text-[11px] text-gray-400">Esta captura no quedó guardada en el navegador.</p>
                    )}
                    <figcaption className="flex items-center gap-1 p-1">
                        {EVIDENCE_KINDS.map(kind => (
                            <button
                                key={kind.id}
                                type="button"
                                onClick={() => onKind(item.id, kind.id)}
                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                    item.kind === kind.id ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                                }`}
                            >
                                {kind.label}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            className="ml-auto rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            title="Quitar captura"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </figcaption>
                </figure>
            ))}
        </div>
    </section>
);

const EvidenceLightbox: React.FC<{
    item: BoardEvidence | null;
    onClose: () => void;
    onRemove: () => void;
}> = ({ item, onClose, onRemove }) => {
    if (!item) return null;
    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-6" onClick={onClose}>
            <div className="flex max-h-full max-w-full flex-col gap-2" onClick={event => event.stopPropagation()}>
                {item.dataUrl ? (
                    <img src={item.dataUrl} alt={item.name || 'Captura'} className="max-h-[80vh] max-w-full object-contain" />
                ) : (
                    <p className="text-sm text-white">No hay imagen para mostrar.</p>
                )}
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onRemove} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
                        Quitar
                    </button>
                    <button type="button" onClick={onClose} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-800">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

const NextActionsEditor: React.FC<{
    actions: NextAction[];
    onChange: (actions: NextAction[]) => void;
}> = ({ actions, onChange }) => {
    const [custom, setCustom] = useState('');
    const togglePreset = (id: string, label: string) => {
        const exists = actions.some(item => item.id === id);
        onChange(exists ? actions.filter(item => item.id !== id) : [...actions, { id, label, done: false }]);
    };
    const addCustom = () => {
        const label = custom.trim();
        if (!label) return;
        onChange([...actions, { id: newPersuasionId('act'), label, done: false, custom: true }]);
        setCustom('');
    };
    return (
        <section className="mt-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Acciones siguientes</h3>
            <div className="mt-1 flex flex-wrap gap-1">
                {NEXT_ACTION_PRESETS.map(preset => {
                    const selected = actions.some(item => item.id === preset.id);
                    return (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => togglePreset(preset.id, preset.label)}
                            className={`rounded-full px-2 py-0.5 text-left text-[11px] font-medium ${
                                selected ? 'bg-violet-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-violet-50'
                            }`}
                        >
                            {preset.label}
                        </button>
                    );
                })}
            </div>
            <div className="mt-2 flex gap-1">
                <input
                    value={custom}
                    onChange={event => setCustom(event.target.value)}
                    onKeyDown={event => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            addCustom();
                        }
                    }}
                    placeholder="Otra acción de este postulante"
                    className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs"
                />
                <button type="button" onClick={addCustom} className="rounded-md bg-gray-900 px-2 py-1 text-[11px] font-semibold text-white">
                    Añadir
                </button>
            </div>
            <ul className="mt-2 space-y-1">
                {actions.length === 0 && <li className="text-[11px] text-gray-400">Todavía no hay un siguiente paso.</li>}
                {actions.map(action => (
                    <li key={action.id} className="flex items-start gap-1.5 text-[11px] text-gray-800">
                        <input
                            type="checkbox"
                            checked={action.done}
                            onChange={() => onChange(actions.map(item => (item.id === action.id ? { ...item, done: !item.done } : item)))}
                            className="mt-0.5"
                        />
                        <span className={`min-w-0 flex-1 ${action.done ? 'text-gray-400 line-through' : ''}`}>{action.label}</span>
                        <button
                            type="button"
                            onClick={() => onChange(actions.filter(item => item.id !== action.id))}
                            className="text-gray-400 hover:text-red-600"
                            title="Quitar acción"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
};

const CriticalPointsEditor: React.FC<{
    points: CandidateBoard['criticalPoints'];
    onChange: (points: CandidateBoard['criticalPoints']) => void;
}> = ({ points, onChange }) => (
    <section className="mt-3">
        <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Puntos críticos</h3>
            <button
                type="button"
                onClick={() => onChange([...(points ?? []), { id: newPersuasionId('punto'), point: '', theory: '' }])}
                className="text-[11px] font-medium text-primary-700 hover:underline"
            >
                Añadir
            </button>
        </div>
        <p className="mt-0.5 text-[10px] leading-snug text-gray-400">Lo que detectas y hacia dónde seguir el convencimiento.</p>
        <div className="mt-1 space-y-2">
            {(points ?? []).length === 0 && <p className="text-[11px] text-gray-400">Sin puntos todavía.</p>}
            {(points ?? []).map(item => (
                <div key={item.id} className="rounded-lg border border-gray-200 p-2">
                    <div className="flex gap-1">
                        <input
                            value={item.point}
                            onChange={event =>
                                onChange((points ?? []).map(entry => (entry.id === item.id ? { ...entry, point: event.target.value } : entry)))
                            }
                            placeholder="Qué viste en la conversación"
                            className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium"
                        />
                        <button
                            type="button"
                            onClick={() => onChange((points ?? []).filter(entry => entry.id !== item.id))}
                            className="text-gray-400 hover:text-red-600"
                            title="Quitar punto"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <textarea
                        value={item.theory}
                        onChange={event =>
                            onChange((points ?? []).map(entry => (entry.id === item.id ? { ...entry, theory: event.target.value } : entry)))
                        }
                        rows={2}
                        placeholder="Teoría: por dónde seguir convenciéndolo"
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                    />
                </div>
            ))}
        </div>
    </section>
);

const TypedScriptAnswer: React.FC<{ nodeId: string; onSave: (text: string) => void }> = ({ nodeId, onSave }) => {
    const [text, setText] = useState('');

    useEffect(() => {
        setText('');
    }, [nodeId]);

    const save = () => {
        const value = text.trim();
        if (!value) return;
        onSave(value);
        setText('');
    };

    return (
        <div className="mt-2 flex items-center gap-2">
            <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        save();
                    }
                }}
                placeholder="Otra respuesta, si no está en los botones"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <button
                type="button"
                onClick={save}
                className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
                Anotar
            </button>
        </div>
    );
};

const FreeQuestionBox: React.FC<{ onSave: (question: string, answer: string) => void }> = ({ onSave }) => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');

    const save = () => {
        const q = question.trim();
        const a = answer.trim();
        if (!q || !a) return;
        onSave(q, a);
        setQuestion('');
        setAnswer('');
    };

    return (
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-dashed border-gray-300 p-2">
            <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Pregunta que no estaba en el guion"
                className="rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <input
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        save();
                    }
                }}
                placeholder="Qué respondió"
                className="rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <button
                type="button"
                onClick={save}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
            >
                Anotar
            </button>
        </div>
    );
};

const WhatsappArguments: React.FC<{
    items: WhatsappArgument[];
    usedIds: string[];
    nombre: string;
    puesto: string;
    onCopy: (item: WhatsappArgument) => void;
    onChange: (items: WhatsappArgument[]) => void;
}> = ({ items, usedIds, nombre, puesto, onCopy, onChange }) => {
    const [label, setLabel] = useState('');
    const [text, setText] = useState('');

    const add = () => {
        const nextLabel = label.trim();
        const nextText = text.trim();
        if (!nextLabel || !nextText) return;
        onChange([...items, { id: newPersuasionId('wa'), label: nextLabel, text: nextText }]);
        setLabel('');
        setText('');
    };

    return (
        <section className="mt-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Argumentos de WhatsApp</h3>
            <p className="mt-0.5 text-[10px] leading-snug text-gray-400">
                Clic copia el texto para pegarlo. El botón queda verde si ya lo usaste con esta persona.
            </p>
            <div className="mt-1 space-y-1">
                {items.length === 0 && <p className="text-[11px] text-gray-400">Todavía no hay argumentos.</p>}
                {items.map(item => {
                    const used = usedIds.includes(item.id);
                    const preview = interpolateSay(item.text, nombre, puesto);
                    return (
                        <div key={item.id} className="flex items-stretch gap-1">
                            <button
                                type="button"
                                onClick={() => onCopy(item)}
                                className={`min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-left ${
                                    used
                                        ? 'border-emerald-700 bg-emerald-600 text-white'
                                        : 'border-gray-200 bg-white text-gray-800 hover:border-emerald-400'
                                }`}
                            >
                                <span className="flex items-center gap-1 text-xs font-semibold">
                                    {used ? <Check className="h-3.5 w-3.5 shrink-0" /> : <ClipboardCopy className="h-3.5 w-3.5 shrink-0" />}
                                    {item.label}
                                </span>
                                <span className={`mt-0.5 line-clamp-2 block text-[10px] leading-snug ${used ? 'text-emerald-50' : 'text-gray-500'}`}>
                                    {preview}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onChange(items.filter(entry => entry.id !== item.id))}
                                className="rounded-lg px-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                title="Quitar argumento"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    );
                })}
            </div>
            <input
                value={label}
                onChange={event => setLabel(event.target.value)}
                placeholder="Nombre del botón"
                className="mt-2 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
            />
            <textarea
                value={text}
                onChange={event => setText(event.target.value)}
                rows={3}
                placeholder="Texto para pegar. Puedes usar {nombre} y {puesto}."
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
            />
            <button
                type="button"
                onClick={add}
                className="mt-1 rounded-md bg-gray-900 px-2 py-1 text-[11px] font-semibold text-white"
            >
                Añadir argumento
            </button>
        </section>
    );
};
