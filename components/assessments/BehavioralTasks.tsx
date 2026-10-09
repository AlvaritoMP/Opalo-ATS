import React, { useEffect, useRef, useState } from 'react';
import type { BehavioralPlan } from '../../lib/api/assessments';

interface RunnerProps {
    plan: BehavioralPlan;
    expired: boolean;
    onSubmit: (answers: Record<string, unknown>) => void;
}

export const BehavioralTaskRunner: React.FC<RunnerProps> = ({ plan, expired, onSubmit }) => {
    if (plan.kind === 'riesgo') return <RiskTask plan={plan} expired={expired} onSubmit={onSubmit} />;
    if (plan.kind === 'atencion') return <AttentionTask plan={plan} expired={expired} onSubmit={onSubmit} />;
    return <EffortTask plan={plan} expired={expired} onSubmit={onSubmit} />;
};

function RiskTask({ plan, expired, onSubmit }: { plan: Extract<BehavioralPlan, { kind: 'riesgo' }>; expired: boolean; onSubmit: RunnerProps['onSubmit'] }) {
    const [round, setRound] = useState(0);
    const [pumps, setPumps] = useState(0);
    const [banked, setBanked] = useState(0);
    const [popped, setPopped] = useState(false);
    const [done, setDone] = useState(false);
    const log = useRef<Array<{ pumps: number; cashed: boolean; latenciesMs: number[] }>>([]);
    const latencies = useRef<number[]>([]);
    const lastTick = useRef(performance.now());
    const sent = useRef(false);

    const finish = (rows: typeof log.current) => {
        if (sent.current) return;
        sent.current = true;
        setDone(true);
        onSubmit({ rounds: rows });
    };

    useEffect(() => {
        if (!expired || sent.current) return;
        const rows = [...log.current];
        if (round < plan.burstAt.length && (popped || pumps > 0)) {
            rows.push({
                pumps,
                cashed: !popped && pumps > 0 && pumps < plan.burstAt[round],
                latenciesMs: latencies.current,
            });
        }
        finish(rows);
    }, [expired]);

    const pump = () => {
        if (done || popped || round >= plan.burstAt.length) return;
        const now = performance.now();
        latencies.current.push(Math.round(now - lastTick.current));
        lastTick.current = now;
        const next = pumps + 1;
        if (next >= plan.burstAt[round]) {
            setPumps(plan.burstAt[round]);
            setPopped(true);
            return;
        }
        setPumps(next);
    };

    const closeRound = (cashed: boolean) => {
        log.current.push({ pumps, cashed, latenciesMs: latencies.current });
        latencies.current = [];
        lastTick.current = performance.now();
        const nextRound = round + 1;
        if (nextRound >= plan.burstAt.length) {
            finish(log.current);
            return;
        }
        setRound(nextRound);
        setPumps(0);
        setPopped(false);
    };

    const cash = () => {
        if (done || popped || pumps === 0) return;
        setBanked((n) => n + pumps * 10);
        closeRound(true);
    };

    const scale = 0.45 + Math.min(pumps, 32) / 32 * 0.9;

    return (
        <div className="max-w-lg mx-auto px-4 py-6 space-y-5 select-none">
            <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Globo {Math.min(round + 1, plan.burstAt.length)} de {plan.burstAt.length}</span>
                <span>Guardados: <strong className="text-slate-900">{banked}</strong></span>
            </div>
            <div className="flex items-center justify-center h-64">
                <div
                    className={`rounded-full border-4 transition-transform duration-150 ${popped ? 'bg-red-200 border-red-500' : 'bg-sky-200 border-sky-500'}`}
                    style={{ width: 140, height: 170, transform: `scale(${popped ? 0.3 : scale})` }}
                />
            </div>
            <p className="text-center text-lg font-semibold">
                {popped ? 'El globo reventó. Esta ronda queda en cero.' : `Esta ronda: ${pumps * 10} puntos`}
            </p>
            {popped ? (
                <button type="button" onClick={() => closeRound(false)} className="w-full min-h-14 rounded-xl bg-slate-800 text-white text-lg font-semibold">
                    Siguiente globo
                </button>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button type="button" onClick={pump} className="min-h-14 rounded-xl bg-teal-700 text-white text-lg font-semibold touch-manipulation">
                        Inflar (+10)
                    </button>
                    <button type="button" onClick={cash} disabled={pumps === 0} className="min-h-14 rounded-xl border border-slate-300 text-lg font-semibold disabled:opacity-40 touch-manipulation">
                        Cobrar puntos
                    </button>
                </div>
            )}
        </div>
    );
}

function AttentionTask({ plan, expired, onSubmit }: { plan: Extract<BehavioralPlan, { kind: 'atencion' }>; expired: boolean; onSubmit: RunnerProps['onSubmit'] }) {
    const [index, setIndex] = useState(0);
    const [phase, setPhase] = useState<'fixation' | 'stimulus' | 'feedback' | 'done'>('fixation');
    const [feedback, setFeedback] = useState<'ok' | 'bad' | null>(null);
    const log = useRef<Array<{ choice: 'left' | 'right' | null; rtMs: number | null }>>([]);
    const onset = useRef(0);
    const answered = useRef(false);
    const sent = useRef(false);
    const phaseRef = useRef(phase);
    const indexRef = useRef(index);
    phaseRef.current = phase;
    indexRef.current = index;
    const limit = plan.limitMs || 800;

    const finish = () => {
        if (sent.current) return;
        sent.current = true;
        setPhase('done');
        onSubmit({ trials: log.current });
    };

    const respond = (choice: 'left' | 'right' | null) => {
        if (phaseRef.current !== 'stimulus' || answered.current || sent.current) return;
        answered.current = true;
        const rt = Math.round(performance.now() - onset.current);
        const spec = plan.trials[indexRef.current];
        const correct = !!spec && choice === spec.direction && rt <= limit;
        log.current.push({ choice, rtMs: choice ? rt : null });
        setFeedback(correct ? 'ok' : 'bad');
        setPhase('feedback');
    };

    useEffect(() => {
        if (expired) finish();
    }, [expired]);

    useEffect(() => {
        if (phase === 'done' || index >= plan.trials.length) return;
        answered.current = false;
        if (phase === 'fixation') {
            const t = window.setTimeout(() => setPhase('stimulus'), 350);
            return () => window.clearTimeout(t);
        }
        if (phase === 'stimulus') {
            onset.current = performance.now();
            const t = window.setTimeout(() => respond(null), limit);
            return () => window.clearTimeout(t);
        }
        const t = window.setTimeout(() => {
            if (index + 1 >= plan.trials.length) finish();
            else {
                setIndex((n) => n + 1);
                setPhase('fixation');
                setFeedback(null);
            }
        }, 280);
        return () => window.clearTimeout(t);
    }, [phase, index]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') respond('left');
            if (event.key === 'ArrowRight') respond('right');
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const spec = plan.trials[index];
    const arrows = spec
        ? Array.from({ length: 5 }, (_, i) => {
            const center = spec.direction;
            const flank = spec.congruent ? center : (center === 'left' ? 'right' : 'left');
            return i === 2 ? center : flank;
        })
        : [];

    if (phase === 'done') return null;

    return (
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6 select-none">
            <p className="text-sm text-slate-600">Figura {Math.min(index + 1, plan.trials.length)} de {plan.trials.length}. Mira solo la del centro.</p>
            <div className={`min-h-28 flex items-center justify-center text-4xl tracking-[0.35em] ${feedback === 'ok' ? 'text-emerald-600' : feedback === 'bad' ? 'text-red-600' : 'text-slate-900'}`}>
                {phase === 'fixation' && <span className="tracking-normal text-3xl">+</span>}
                {phase !== 'fixation' && arrows.map((dir) => (dir === 'left' ? '←' : '→')).join('')}
            </div>
            <div className="grid grid-cols-2 gap-3">
                <button type="button" onPointerDown={() => respond('left')} className="min-h-16 rounded-xl bg-slate-800 text-white text-lg font-semibold touch-manipulation">
                    Izquierda
                </button>
                <button type="button" onPointerDown={() => respond('right')} className="min-h-16 rounded-xl bg-slate-800 text-white text-lg font-semibold touch-manipulation">
                    Derecha
                </button>
            </div>
        </div>
    );
}

function EffortTask({ plan, expired, onSubmit }: { plan: Extract<BehavioralPlan, { kind: 'esfuerzo' }>; expired: boolean; onSubmit: RunnerProps['onSubmit'] }) {
    const [index, setIndex] = useState(0);
    const [choice, setChoice] = useState<'easy' | 'hard' | null>(null);
    const [taps, setTaps] = useState(0);
    const [leftMs, setLeftMs] = useState(0);
    const [note, setNote] = useState('');
    const log = useRef<Array<{ choice: 'easy' | 'hard'; decisionMs: number; taps: number; elapsedMs: number }>>([]);
    const shownAt = useRef(performance.now());
    const startedAt = useRef(0);
    const sent = useRef(false);
    const tapping = useRef(false);
    const closed = useRef(false);
    const tapsRef = useRef(0);
    const commitRef = useRef<(finalTaps: number) => void>(() => undefined);

    const finish = () => {
        if (sent.current) return;
        sent.current = true;
        onSubmit({ rounds: log.current });
    };

    commitRef.current = (finalTaps: number) => {
        if (!choice || sent.current || closed.current) return;
        closed.current = true;
        tapping.current = false;
        const elapsed = Math.round(performance.now() - startedAt.current);
        const ok = choice === 'easy' ? finalTaps >= 10 && elapsed <= 4200 : finalTaps >= 35 && elapsed <= 6200;
        log.current.push({
            choice,
            decisionMs: Math.round(startedAt.current - shownAt.current),
            taps: finalTaps,
            elapsedMs: elapsed,
        });
        setNote(ok ? 'Ronda completada.' : 'No se completó a tiempo.');
        window.setTimeout(() => {
            setNote('');
            setChoice(null);
            tapsRef.current = 0;
            setTaps(0);
            if (index + 1 >= plan.rounds.length) finish();
            else setIndex((n) => n + 1);
        }, 700);
    };

    useEffect(() => {
        if (expired) finish();
    }, [expired]);

    useEffect(() => {
        shownAt.current = performance.now();
    }, [index]);

    useEffect(() => {
        if (!choice) return;
        closed.current = false;
        tapping.current = true;
        startedAt.current = performance.now();
        const total = choice === 'easy' ? 4000 : 6000;
        setLeftMs(total);
        const timer = window.setInterval(() => {
            const elapsed = performance.now() - startedAt.current;
            setLeftMs(Math.max(0, total - elapsed));
            if (elapsed >= total) {
                window.clearInterval(timer);
                tapping.current = false;
                commitRef.current(tapsRef.current);
            }
        }, 50);
        return () => window.clearInterval(timer);
    }, [choice, index]);

    const spec = plan.rounds[index];
    if (!spec) return null;
    const target = choice === 'hard' ? 35 : 10;
    const limit = choice === 'hard' ? 6000 : 4000;

    const tap = () => {
        if (!choice || !tapping.current || sent.current) return;
        const next = taps + 1;
        tapsRef.current = next;
        setTaps(next);
        if (next >= target) commitRef.current(next);
        else if (performance.now() - startedAt.current >= limit) commitRef.current(next);
    };

    return (
        <div className="max-w-lg mx-auto px-4 py-6 space-y-5 select-none">
            <p className="text-sm text-slate-600">Ronda {index + 1} de {plan.rounds.length}</p>
            {!choice && (
                <div className="space-y-3">
                    <button type="button" onClick={() => setChoice('easy')} className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 touch-manipulation">
                        <span className="block text-lg font-semibold">Tarea fácil</span>
                        <span className="block text-sm text-slate-600 mt-1">10 toques en 4 segundos. 1 crédito seguro si la completas.</span>
                    </button>
                    <button type="button" onClick={() => setChoice('hard')} className="w-full text-left rounded-2xl border border-teal-300 bg-teal-50 p-4 touch-manipulation">
                        <span className="block text-lg font-semibold">Tarea retadora · {spec.probability} %</span>
                        <span className="block text-sm text-slate-700 mt-1">35 toques en 6 segundos. 3 créditos si la completas y sale favorecida ({spec.probability} % de chance).</span>
                    </button>
                </div>
            )}
            {choice && (
                <div className="space-y-4">
                    <p className="text-center text-lg font-semibold">{taps} de {target}</p>
                    <p className="text-center text-sm text-slate-500">{(leftMs / 1000).toFixed(1)} s</p>
                    <button type="button" onPointerDown={tap} className="w-full min-h-40 rounded-3xl bg-teal-700 text-white text-2xl font-semibold touch-manipulation">
                        Tocar
                    </button>
                </div>
            )}
            {note && <p className="text-center text-base font-medium">{note}</p>}
        </div>
    );
}
