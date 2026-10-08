import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { ensureAssessmentsMobileViewport } from '../lib/assessments/publicRoute';
import { normalizeDniDigits } from '../lib/complementaryFicha';
import type { AssessmentTestId } from '../lib/assessments/types';
import { ASSESSMENT_PUBLIC_LABELS } from '../lib/assessments/types';

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
    const [dni, setDni] = useState('');

    useLayoutEffect(() => {
        ensureAssessmentsMobileViewport();
    }, []);
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
            const firstDiscGap = questions.findIndex((q) => q.kind === 'disc' && !isAnswered(q, answers[q.id]));
            if (firstDiscGap >= 0) {
                setIndex(firstDiscGap);
                setError('Marca una palabra en MÁS y otra distinta en MENOS. No se puede avanzar ni enviar con una sola.');
                return;
            }
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
        setError('');
        setAnswers((prev) => {
            const next = { ...prev, [id]: value };
            persistDraft(next);
            return next;
        });
    };

    const openQuestion = (target: number) => {
        if (target > index && questions.slice(0, target).some((q) => q.kind === 'disc' && !isAnswered(q, answers[q.id]))) {
            setError('Marca una palabra en MÁS y otra distinta en MENOS antes de avanzar.');
            return;
        }
        setError('');
        setIndex(target);
    };

    const currentNeedsBothWords = question?.kind === 'disc' && !isAnswered(question, answers[question.id]);

    useEffect(() => {
        if (phase !== 'run') return;
        window.scrollTo({ top: 0, left: 0 });
    }, [index, phase]);

    const navButtons = (
        <div className="flex gap-2">
            <button
                type="button"
                disabled={index === 0}
                onClick={() => setIndex((n) => Math.max(0, n - 1))}
                className="min-h-14 flex-1 rounded-xl border border-slate-300 text-base font-semibold disabled:opacity-40 touch-manipulation"
            >
                Anterior
            </button>
            {index < questions.length - 1 ? (
                <button
                    type="button"
                    disabled={currentNeedsBothWords}
                    onClick={() => openQuestion(index + 1)}
                    title={currentNeedsBothWords ? 'Marca MÁS y MENOS para continuar' : undefined}
                    className="min-h-14 flex-[1.4] rounded-xl bg-teal-700 text-white text-base font-semibold disabled:opacity-40 touch-manipulation"
                >
                    Siguiente
                </button>
            ) : (
                <button
                    type="button"
                    disabled={loading || currentNeedsBothWords}
                    onClick={() => void sendAnswers(false)}
                    title={currentNeedsBothWords ? 'Marca MÁS y MENOS para enviar' : undefined}
                    className="min-h-14 flex-[1.4] rounded-xl bg-teal-700 text-white text-base font-semibold disabled:opacity-60 touch-manipulation"
                >
                    {loading ? 'Enviando…' : 'Enviar prueba'}
                </button>
            )}
        </div>
    );

    if (phase === 'run' && question) {
        return (
            <div className="min-h-[100dvh] overflow-x-hidden bg-slate-100 text-slate-900">
                <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
                    <div className="max-w-2xl mx-auto">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-base font-semibold truncate">{active ? ASSESSMENT_PUBLIC_LABELS[active.id] : ''}</p>
                            {remainingMs != null && (
                                <span className={`shrink-0 font-mono text-lg font-semibold ${remainingMs < 60_000 ? 'text-red-600' : 'text-slate-800'}`}>
                                    {formatRemaining(remainingMs)}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">Pregunta {index + 1} de {questions.length}</p>
                        <div className="h-1.5 bg-slate-100 rounded-full mt-2">
                            <div className="h-1.5 bg-teal-600 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </header>
                <main className="max-w-2xl mx-auto px-4 py-4 pb-52 sm:px-6">
                    {error && (
                        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                            {error}
                        </div>
                    )}
                    <QuestionView question={question} value={answers[question.id]} onChange={(value) => setAnswer(question.id, value)} />
                </main>
                <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
                    <div className="max-w-2xl mx-auto px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-3 sm:px-6">
                        <QuestionDots questions={questions} answers={answers} index={index} onPick={openQuestion} />
                        {navButtons}
                    </div>
                </footer>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] overflow-x-hidden bg-slate-100 text-slate-900">
            <div className={`mx-auto flex w-full max-w-lg flex-col px-4 py-6 sm:max-w-2xl sm:px-6 sm:py-10 ${phase === 'dni' ? 'min-h-[100dvh] justify-center' : ''}`}>
                <header className="mb-5 sm:mb-6">
                    <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Evaluación</p>
                    <h1 className="text-3xl font-bold leading-tight">Pruebas del proceso</h1>
                    {session && phase !== 'dni' && phase !== 'pick' && (
                        <p className="text-base text-slate-600 mt-1">
                            {session.name} · {session.processTitle}
                        </p>
                    )}
                </header>

                {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                        {error}
                    </div>
                )}

                {phase === 'dni' && (
                    <form onSubmit={(e) => void handleLookup(e)} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-sm">
                        <p className="text-base sm:text-lg leading-relaxed text-slate-700">
                            Escribe tu número de documento para ver las pruebas que debes resolver. Cada prueba se puede enviar una sola vez. Si necesitas repetirla, selección debe habilitar la reevaluación.
                        </p>
                        <label className="block text-base font-semibold">Número de documento</label>
                        <input
                            inputMode="numeric"
                            autoComplete="off"
                            autoCorrect="off"
                            autoFocus
                            value={dni}
                            onChange={(e) => setDni(e.target.value)}
                            placeholder="DNI"
                            className="w-full min-h-14 rounded-xl border border-slate-300 px-4 text-lg"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full min-h-14 rounded-xl bg-teal-700 text-white text-lg font-semibold hover:bg-teal-800 disabled:opacity-60 touch-manipulation"
                        >
                            {loading ? 'Buscando…' : 'Continuar'}
                        </button>
                    </form>
                )}

                {phase === 'pick' && (
                    <div className="space-y-3">
                        <p className="text-base leading-relaxed text-slate-700">Encontramos más de un proceso con tu documento. Elige en cuál vas a rendir las pruebas.</p>
                        {matches.map((match) => (
                            <button
                                key={match.candidateId}
                                type="button"
                                onClick={() => void handleLookup(undefined, match.candidateId)}
                                className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-400"
                            >
                                <span className="font-medium">{match.processTitle}</span>
                                <span className="block text-xs text-slate-500 mt-1">{match.name}</span>
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
                                        <h2 className="text-lg font-semibold">{ASSESSMENT_PUBLIC_LABELS[card.id]}</h2>
                                        <p className="text-sm text-slate-600 mt-1 whitespace-pre-line line-clamp-4">{card.instructions}</p>
                                    </div>
                                    {card.timeLimitSec ? (
                                        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {Math.round(card.timeLimitSec / 60)} min
                                        </span>
                                    ) : null}
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-sm text-slate-600">
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
                                            className="min-h-12 rounded-xl bg-teal-700 text-white px-4 text-base font-medium hover:bg-teal-800 disabled:opacity-60 touch-manipulation"
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
                        <h2 className="text-lg font-semibold">{ASSESSMENT_PUBLIC_LABELS[briefing.id]}</h2>
                        <p className="inline-flex items-center gap-1 text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-1">
                            <Clock className="w-4 h-4" />
                            {briefing.timeLimitSec ? `${Math.round(briefing.timeLimitSec / 60)} minutos` : 'Sin límite'}
                            . El tiempo empieza al confirmar.
                        </p>
                        <p className="text-base leading-relaxed text-slate-700 whitespace-pre-line">{briefing.instructions}</p>
                        <ExampleBlock testId={briefing.id} />
                        <div className="flex flex-col-reverse sm:flex-row gap-2">
                            <button
                                type="button"
                                onClick={() => { setPhase('list'); setBriefing(null); }}
                                className="min-h-12 px-3 text-base rounded-xl border border-slate-300 touch-manipulation"
                            >
                                Volver
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => void beginTest(briefing)}
                                className="min-h-12 px-3 text-base rounded-xl bg-teal-700 text-white font-medium disabled:opacity-60 touch-manipulation sm:flex-1"
                            >
                                {loading ? 'Abriendo…' : 'Estoy de acuerdo, empezar'}
                            </button>
                        </div>
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
                            className="min-h-12 rounded-xl bg-teal-700 text-white px-4 text-base font-medium touch-manipulation"
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
    const stripRef = useRef<HTMLDivElement>(null);
    const answered = useMemo(
        () => questions.filter((q) => isAnswered(q, answers[q.id])).length,
        [questions, answers]
    );
    useEffect(() => {
        const parent = stripRef.current;
        const current = parent?.querySelector<HTMLElement>('[data-current="true"]');
        if (!parent || !current) return;
        const left = current.offsetLeft - parent.clientWidth / 2 + current.clientWidth / 2;
        parent.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }, [index]);
    return (
        <div>
            <p className="text-[11px] text-slate-500 mb-1">{answered} de {questions.length} respondidas</p>
            <div ref={stripRef} className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {questions.map((q, i) => {
                    const done = isAnswered(q, answers[q.id]);
                    const current = i === index;
                    return (
                        <button
                            key={q.id}
                            type="button"
                            data-current={current ? 'true' : undefined}
                            onClick={() => onPick(i)}
                            className={`shrink-0 w-9 h-9 rounded-lg text-xs font-medium touch-manipulation ${
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
            <div className="space-y-2">
                <p className="text-lg font-medium mb-3 leading-snug">{question.prompt}</p>
                {(question.options || []).map((option) => {
                    const on = value === option;
                    return (
                        <button
                            key={option}
                            type="button"
                            onClick={() => onChange(option)}
                            aria-pressed={on}
                            className={`w-full min-h-14 text-left rounded-xl border px-4 py-3 text-lg leading-snug touch-manipulation ${
                                on ? 'border-teal-700 bg-teal-50 text-teal-950' : 'border-slate-200 bg-white'
                            }`}
                        >
                            {option}
                        </button>
                    );
                })}
            </div>
        );
    }
    if (question.kind === 'series') {
        return (
            <div>
                <p className="text-lg font-medium mb-3 leading-snug">{question.prompt}</p>
                <input
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Ejemplo: 30 y 50"
                    enterKeyHint="done"
                    className="w-full min-h-14 rounded-xl border border-slate-300 px-4 text-lg"
                />
            </div>
        );
    }
    if (question.kind === 'figure') {
        const selected = Number(value);
        const count = question.optionCount || 6;
        const cols = count > 6 ? 4 : 3;
        return (
            <div>
                <p className="text-lg font-medium mb-2 leading-snug">{question.prompt}</p>
                <p className="text-base text-slate-700 mb-3">Toca la pieza que completa la figura. El número queda sobre esa pieza.</p>
                <div className="relative">
                    {question.image && (
                        <img src={question.image} alt="" className="w-full block rounded-lg border border-slate-200 bg-white" />
                    )}
                    <div
                        className="absolute inset-x-0 bottom-0 grid"
                        style={{
                            height: '44%',
                            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                            gridTemplateRows: '1fr 1fr',
                        }}
                    >
                        {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
                            const on = selected === n;
                            return (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => onChange(n)}
                                    aria-label={`Pieza ${n}`}
                                    aria-pressed={on}
                                    className={`relative m-0.5 rounded-md border-2 touch-manipulation ${
                                        on ? 'border-teal-700 bg-teal-600/20' : 'border-transparent hover:border-teal-500 hover:bg-white/30'
                                    }`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm font-bold shadow-sm ${
                                            on ? 'bg-teal-700 text-white' : 'bg-white text-slate-900 border border-slate-400'
                                        }`}
                                    >
                                        {n}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
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
            <p className="text-base text-slate-700 mb-3">Toca MÁS en una palabra y MENOS en otra distinta. Las dos son obligatorias.</p>
            <div className="grid grid-cols-[1fr_4.75rem_4.75rem] gap-2 items-center sm:grid-cols-[1fr_5.5rem_5.5rem]">
                <span />
                <span className="text-center text-xs font-semibold text-slate-500">MÁS</span>
                <span className="text-center text-xs font-semibold text-slate-500">MENOS</span>
                {words.map((word, idx) => (
                    <React.Fragment key={`${question.id}-${idx}`}>
                        <span className="text-lg leading-snug break-words">{word}</span>
                        <button
                            type="button"
                            aria-label={`Más: ${word}`}
                            aria-pressed={row.most === idx}
                            onClick={() => setSide('most', idx)}
                            className={`min-h-14 rounded-xl border text-base font-semibold touch-manipulation ${
                                row.most === idx ? 'bg-teal-700 text-white border-teal-700' : 'bg-white border-slate-300'
                            }`}
                        >
                            MÁS
                        </button>
                        <button
                            type="button"
                            aria-label={`Menos: ${word}`}
                            aria-pressed={row.least === idx}
                            onClick={() => setSide('least', idx)}
                            className={`min-h-14 rounded-xl border text-base font-semibold touch-manipulation ${
                                row.least === idx ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-300'
                            }`}
                        >
                            MENOS
                        </button>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}
