import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock, ClipboardList, Loader2 } from 'lucide-react';
import {
    AssessmentLookupMatch,
    AssessmentLookupPayload,
    AssessmentTestCard,
    PublicQuestion,
    lookupAssessments,
    startAssessment,
    submitAssessment,
} from '../lib/api/assessments';
import { getAssessmentDniFromUrl } from '../lib/assessments/publicRoute';
import { normalizeDniDigits } from '../lib/complementaryFicha';
import type { AssessmentTestId } from '../lib/assessments/types';
import { ASSESSMENT_PROFILE_LABELS } from '../lib/assessments/types';

type Phase = 'dni' | 'pick' | 'list' | 'brief' | 'run' | 'done';

function formatRemaining(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function draftKey(candidateId: string, testId: string) {
    return `opalo-prueba:${candidateId}:${testId}`;
}

export const PublicAssessments: React.FC = () => {
    const [phase, setPhase] = useState<Phase>('dni');
    const [dni, setDni] = useState(getAssessmentDniFromUrl());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [matches, setMatches] = useState<AssessmentLookupMatch[]>([]);
    const [session, setSession] = useState<AssessmentLookupPayload | null>(null);
    const [active, setActive] = useState<AssessmentTestCard | null>(null);
    const [briefing, setBriefing] = useState<AssessmentTestCard | null>(null);
    const [questions, setQuestions] = useState<PublicQuestion[]>([]);
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, unknown>>({});
    const [deadlineAt, setDeadlineAt] = useState<string | null>(null);
    const [now, setNow] = useState(Date.now());
    const submitting = useRef(false);
    const autoSent = useRef(false);

    useEffect(() => {
        if (phase !== 'run' || !deadlineAt) return;
        const timer = window.setInterval(() => setNow(Date.now()), 250);
        return () => window.clearInterval(timer);
    }, [phase, deadlineAt]);

    const remainingMs = deadlineAt ? new Date(deadlineAt).getTime() - now : null;

    const persistDraft = (next: Record<string, unknown>) => {
        if (!session || !active) return;
        sessionStorage.setItem(draftKey(session.candidateId, active.id), JSON.stringify(next));
    };

    const refreshList = async (candidateId: string, document = dni) => {
        const result = await lookupAssessments(document, candidateId);
        if (result.multiple) {
            setMatches(result.matches);
            setPhase('pick');
            return;
        }
        setSession(result);
        setPhase('list');
    };

    const handleLookup = async (event?: React.FormEvent, candidateId?: string) => {
        event?.preventDefault();
        const digits = normalizeDniDigits(dni);
        if (digits.length < 8) {
            setError('Ingresa un documento de al menos 8 dígitos.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const result = await lookupAssessments(digits, candidateId);
            if (result.multiple) {
                setMatches(result.matches);
                setPhase('pick');
            } else {
                setSession(result);
                setPhase('list');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo buscar el documento.');
        } finally {
            setLoading(false);
        }
    };

    const beginTest = async (card: AssessmentTestCard) => {
        if (!session || card.status === 'completed') return;
        if (card.status === 'retake') {
            sessionStorage.removeItem(draftKey(session.candidateId, card.id));
        }
        setLoading(true);
        setError('');
        try {
            const started = await startAssessment(dni, session.candidateId, card.id);
            let draft: Record<string, unknown> = {};
            if (card.status !== 'retake') {
                try {
                    const raw = sessionStorage.getItem(draftKey(session.candidateId, card.id));
                    if (raw) draft = JSON.parse(raw);
                } catch {
                    draft = {};
                }
            }
            setActive(card);
            setQuestions(started.questions);
            setAnswers(draft);
            setDeadlineAt(started.deadlineAt);
            setIndex(0);
            setNow(Date.now());
            autoSent.current = false;
            setPhase('run');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo abrir la prueba.');
        } finally {
            setLoading(false);
        }
    };

    const sendAnswers = async (timedOut: boolean) => {
        if (!session || !active || submitting.current) return;
        if (!timedOut) {
            const pending = questions.some((q) => !isAnswered(q, answers[q.id]));
            if (pending && !window.confirm('Hay preguntas sin responder. ¿Enviar de todos modos?')) return;
        }
        submitting.current = true;
        setLoading(true);
        setError('');
        try {
            await submitAssessment(dni, session.candidateId, active.id, answers);
            sessionStorage.removeItem(draftKey(session.candidateId, active.id));
            setPhase('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo enviar la prueba.');
        } finally {
            submitting.current = false;
            setLoading(false);
        }
    };

    useEffect(() => {
        if (phase !== 'run' || remainingMs == null || remainingMs > 0 || autoSent.current) return;
        autoSent.current = true;
        void sendAnswers(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [remainingMs, phase]);

    const question = questions[index];
    const progress = questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0;

    const setAnswer = (id: string, value: unknown) => {
        setAnswers((prev) => {
            const next = { ...prev, [id]: value };
            persistDraft(next);
            return next;
        });
    };

    const profileLabel = session ? ASSESSMENT_PROFILE_LABELS[session.profile] : '';

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <header className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Evaluación</p>
                    <h1 className="text-2xl font-bold">Pruebas del proceso</h1>
                    {session && phase !== 'dni' && phase !== 'pick' && (
                        <p className="text-sm text-slate-600 mt-1">
                            {session.name} · {session.processTitle}
                            <span className="block text-xs text-slate-500">{profileLabel}</span>
                        </p>
                    )}
                </header>

                {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                        {error}
                    </div>
                )}

                {phase === 'dni' && (
                    <form onSubmit={(e) => void handleLookup(e)} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                        <p className="text-sm text-slate-600">
                            Ingresa tu DNI para ver las pruebas que debes resolver. Cada prueba se puede enviar una sola vez. Si necesitas repetirla, selección debe habilitar la reevaluación.
                        </p>
                        <label className="block text-sm font-medium">Número de documento</label>
                        <input
                            inputMode="numeric"
                            autoFocus
                            value={dni}
                            onChange={(e) => setDni(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                            placeholder="DNI"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-teal-700 text-white py-2.5 font-medium hover:bg-teal-800 disabled:opacity-60"
                        >
                            {loading ? 'Buscando…' : 'Continuar'}
                        </button>
                    </form>
                )}

                {phase === 'pick' && (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-600">Encontramos más de un proceso con tu documento. Elige en cuál vas a rendir las pruebas.</p>
                        {matches.map((match) => (
                            <button
                                key={match.candidateId}
                                type="button"
                                onClick={() => void handleLookup(undefined, match.candidateId)}
                                className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-400"
                            >
                                <span className="font-medium">{match.processTitle}</span>
                                <span className="block text-xs text-slate-500 mt-1">{match.name} · {ASSESSMENT_PROFILE_LABELS[match.profile]}</span>
                            </button>
                        ))}
                    </div>
                )}

                {phase === 'list' && session && (
                    <div className="space-y-3">
                        {session.tests.map((card) => (
                            <article key={card.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="font-semibold">{card.title}</h2>
                                        <p className="text-xs text-slate-500 mt-1 whitespace-pre-line line-clamp-4">{card.instructions}</p>
                                    </div>
                                    {card.timeLimitSec ? (
                                        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {Math.round(card.timeLimitSec / 60)} min
                                        </span>
                                    ) : null}
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-xs text-slate-500">
                                        {card.status === 'completed'
                                            ? 'Enviada. Solo se resuelve una vez.'
                                            : card.status === 'retake'
                                                ? 'Reevaluación habilitada'
                                                : card.status === 'in_progress'
                                                    ? 'En curso'
                                                    : 'Pendiente'}
                                    </span>
                                    {card.status === 'completed' ? (
                                        <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
                                            <CheckCircle2 className="w-4 h-4" /> Lista
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={loading}
                                            onClick={() => {
                                                if (card.status === 'in_progress') {
                                                    void beginTest(card);
                                                    return;
                                                }
                                                setBriefing(card);
                                                setPhase('brief');
                                                setError('');
                                            }}
                                            className="rounded-lg bg-teal-700 text-white px-3 py-1.5 text-sm font-medium hover:bg-teal-800 disabled:opacity-60"
                                        >
                                            {card.status === 'in_progress' ? 'Continuar' : 'Ver instrucciones'}
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                {phase === 'brief' && briefing && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                        <h2 className="text-lg font-semibold">{briefing.title}</h2>
                        <p className="inline-flex items-center gap-1 text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-1">
                            <Clock className="w-4 h-4" />
                            {briefing.timeLimitSec ? `${Math.round(briefing.timeLimitSec / 60)} minutos` : 'Sin límite'}
                            . El tiempo empieza al confirmar.
                        </p>
                        <p className="text-sm text-slate-700 whitespace-pre-line">{briefing.instructions}</p>
                        <ExampleBlock testId={briefing.id} />
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                type="button"
                                onClick={() => { setPhase('list'); setBriefing(null); }}
                                className="px-3 py-2 text-sm rounded-lg border border-slate-300"
                            >
                                Volver
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => void beginTest(briefing)}
                                className="px-3 py-2 text-sm rounded-lg bg-teal-700 text-white font-medium disabled:opacity-60"
                            >
                                {loading ? 'Abriendo…' : 'Estoy de acuerdo, empezar'}
                            </button>
                        </div>
                    </div>
                )}

                {phase === 'run' && question && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <p className="text-sm font-medium">{active?.title}</p>
                            {remainingMs != null && (
                                <span className={`font-mono text-sm font-semibold ${remainingMs < 60_000 ? 'text-red-600' : 'text-slate-700'}`}>
                                    {formatRemaining(remainingMs)}
                                </span>
                            )}
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full mb-4">
                            <div className="h-1.5 bg-teal-600 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-xs text-slate-500 mb-2">Pregunta {index + 1} de {questions.length}</p>
                        <QuestionView question={question} value={answers[question.id]} onChange={(value) => setAnswer(question.id, value)} />
                        <div className="mt-5 flex items-center justify-between gap-2">
                            <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => setIndex((n) => Math.max(0, n - 1))}
                                className="px-3 py-2 text-sm rounded-lg border border-slate-300 disabled:opacity-40"
                            >
                                Anterior
                            </button>
                            {index < questions.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setIndex((n) => n + 1)}
                                    className="px-3 py-2 text-sm rounded-lg bg-teal-700 text-white"
                                >
                                    Siguiente
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => void sendAnswers(false)}
                                    className="px-3 py-2 text-sm rounded-lg bg-teal-700 text-white disabled:opacity-60"
                                >
                                    {loading ? 'Enviando…' : 'Enviar prueba'}
                                </button>
                            )}
                        </div>
                        <QuestionDots
                            questions={questions}
                            answers={answers}
                            index={index}
                            onPick={setIndex}
                        />
                    </div>
                )}

                {phase === 'done' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-3">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                        <h2 className="text-lg font-semibold">Prueba enviada</h2>
                        <p className="text-sm text-slate-600">Selección ya puede revisar tus respuestas. El puntaje no se muestra aquí.</p>
                        <button
                            type="button"
                            onClick={() => session && void refreshList(session.candidateId)}
                            className="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium"
                        >
                            Volver a mis pruebas
                        </button>
                    </div>
                )}

                {loading && phase !== 'run' && (
                    <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" /> Cargando
                    </p>
                )}
                <p className="mt-8 flex items-center gap-2 text-xs text-slate-400">
                    <ClipboardList className="w-3.5 h-3.5" /> Opalo · pruebas de selección
                </p>
            </div>
        </div>
    );
};

function ExampleBlock({ testId }: { testId: AssessmentTestCard['id'] }) {
    if (testId === 'barsit') {
        return (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm space-y-2">
                <p className="font-medium">Ejemplo, no se califica</p>
                <p>El pan se elabora con:</p>
                <p className="text-slate-600">Harina · Leche · Agua · Sal · Azúcar</p>
                <p>La opción correcta sería <strong>Harina</strong>.</p>
                <p>En una serie como 2 4 6 10 12 16, escribirías los dos números que faltan. En este ejemplo: <strong>8 y 14</strong>.</p>
            </div>
        );
    }
    if (testId === 'inteligencia') {
        return (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm space-y-2">
                <p className="font-medium">Ejemplo, no se califica</p>
                <p>Verás una figura grande con un espacio vacío y varias piezas numeradas. Eliges el número de la pieza que encaja.</p>
                <div className="flex items-center gap-3">
                    <div className="w-16 h-16 border-2 border-slate-800 grid grid-cols-2">
                        <div className="bg-slate-800" />
                        <div className="bg-white" />
                        <div className="bg-white" />
                        <div className="border border-dashed border-slate-400" />
                    </div>
                    <p>Si la pieza que completa el cuadro es la número 2, marcas <strong>2</strong>.</p>
                </div>
            </div>
        );
    }
    return (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm space-y-2">
            <p className="font-medium">Ejemplo, no se califica</p>
            <p>En cada grupo marcas una palabra en MÁS y otra distinta en MENOS.</p>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 items-center">
                <span />
                <span className="text-xs font-semibold">MÁS</span>
                <span className="text-xs font-semibold">MENOS</span>
                <span>Entusiasta</span>
                <input type="radio" checked readOnly onChange={() => undefined} />
                <input type="radio" readOnly onChange={() => undefined} />
                <span>Serio</span>
                <input type="radio" readOnly onChange={() => undefined} />
                <input type="radio" checked readOnly onChange={() => undefined} />
            </div>
            <p>Aquí, Entusiasta es lo que más representa y Serio lo que menos.</p>
        </div>
    );
}

function isAnswered(question: PublicQuestion, value: unknown): boolean {
    if (question.kind === 'choice' || question.kind === 'series') return String(value ?? '').trim() !== '';
    if (question.kind === 'figure') return Number.isInteger(Number(value)) && Number(value) >= 1;
    if (question.kind === 'disc' && value && typeof value === 'object') {
        const row = value as { most?: number; least?: number };
        return Number.isInteger(row.most) && Number.isInteger(row.least) && row.most !== row.least;
    }
    return false;
}

function QuestionDots({
    questions,
    answers,
    index,
    onPick,
}: {
    questions: PublicQuestion[];
    answers: Record<string, unknown>;
    index: number;
    onPick: (n: number) => void;
}) {
    const answered = useMemo(
        () => questions.filter((q) => isAnswered(q, answers[q.id])).length,
        [questions, answers]
    );
    return (
        <div className="mt-4">
            <p className="text-xs text-slate-500 mb-2">{answered} de {questions.length} respondidas</p>
            <div className="flex flex-wrap gap-1">
                {questions.map((q, i) => {
                    const done = isAnswered(q, answers[q.id]);
                    const current = i === index;
                    return (
                        <button
                            key={q.id}
                            type="button"
                            onClick={() => onPick(i)}
                            className={`w-7 h-7 rounded text-[11px] ${
                                current ? 'bg-teal-700 text-white' : done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                            {i + 1}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function QuestionView({
    question,
    value,
    onChange,
}: {
    question: PublicQuestion;
    value: unknown;
    onChange: (value: unknown) => void;
}) {
    if (question.kind === 'choice') {
        return (
            <fieldset className="space-y-2">
                <legend className="text-base font-medium mb-2">{question.prompt}</legend>
                {(question.options || []).map((option) => (
                    <label key={option} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <input
                            type="radio"
                            name={question.id}
                            checked={value === option}
                            onChange={() => onChange(option)}
                        />
                        {option}
                    </label>
                ))}
            </fieldset>
        );
    }
    if (question.kind === 'series') {
        return (
            <div>
                <p className="text-base font-medium mb-2">{question.prompt}</p>
                <input
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Ejemplo: 30 y 50"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
            </div>
        );
    }
    if (question.kind === 'figure') {
        const selected = Number(value);
        const count = question.optionCount || 6;
        return (
            <div>
                <p className="text-base font-medium mb-2">{question.prompt}</p>
                {question.image && (
                    <img src={question.image} alt={question.prompt || 'Figura'} className="w-full rounded-lg border border-slate-200 bg-white" />
                )}
                <p className="text-sm text-slate-600 mt-3 mb-2">Número de la figura que completa el dibujo</p>
                <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => onChange(n)}
                            className={`rounded-lg border py-2 text-sm font-medium ${
                                selected === n ? 'bg-teal-700 text-white border-teal-700' : 'border-slate-300'
                            }`}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </div>
        );
    }
    const row = (value && typeof value === 'object' ? value : {}) as { most?: number; least?: number };
    const words = question.words || [];
    const setSide = (side: 'most' | 'least', idx: number) => {
        const next = { ...row, [side]: idx };
        if (next.most === next.least) {
            if (side === 'most') delete next.least;
            else delete next.most;
        }
        onChange(next);
    };
    return (
        <div>
            <p className="text-sm text-slate-600 mb-3">Marca una palabra en MÁS y otra distinta en MENOS.</p>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-2 items-center text-sm">
                <span />
                <span className="text-xs font-semibold text-slate-500">MÁS</span>
                <span className="text-xs font-semibold text-slate-500">MENOS</span>
                {words.map((word, idx) => (
                    <React.Fragment key={word}>
                        <span>{word}</span>
                        <input type="radio" name={`${question.id}-mas`} checked={row.most === idx} onChange={() => setSide('most', idx)} />
                        <input type="radio" name={`${question.id}-menos`} checked={row.least === idx} onChange={() => setSide('least', idx)} />
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}
