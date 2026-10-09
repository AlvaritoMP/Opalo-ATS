import React, { useEffect, useState } from 'react';
import { X, RotateCcw, Loader2 } from 'lucide-react';
import {
    enableAssessmentRetake,
    fetchAssessmentResults,
    rescoreAssessments,
} from '../lib/api/assessments';
import { ReporteEjecutivoCard } from './assessments/ReporteEjecutivoCard';
import { generateAssessmentInsights, isBehavioralInsightTest } from '../lib/assessments/insights';
import {
    ASSESSMENT_PROFILE_LABELS,
    ASSESSMENT_TEST_LABELS,
    BEHAVIORAL_TELEMETRY_LABELS,
    DISC_FACTOR_LABELS,
    type AssessmentResults,
    type AssessmentTestId,
    type DiscFactor,
} from '../lib/assessments/types';

interface Props {
    candidateId: string;
    candidateName: string;
    onClose: () => void;
}

const FACTORS: DiscFactor[] = ['D', 'I', 'S', 'C'];

export const CandidateAssessmentPanel: React.FC<Props> = ({ candidateId, candidateName, onClose }) => {
    const [results, setResults] = useState<AssessmentResults | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            setResults(await fetchAssessmentResults(candidateId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudieron cargar los resultados.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, [candidateId]);

    const enableRetake = async (testId: AssessmentTestId) => {
        if (!window.confirm('¿Habilitar una reevaluación? El candidato podrá resolver esta prueba una sola vez más. El resultado actual se conserva hasta que empiece de nuevo.')) return;
        setBusy(true);
        try {
            await enableAssessmentRetake(candidateId, testId);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo habilitar la reevaluación.');
        } finally {
            setBusy(false);
        }
    };

    const rescore = async () => {
        setBusy(true);
        setError('');
        try {
            await rescoreAssessments(candidateId);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo recalcular.');
        } finally {
            setBusy(false);
        }
    };

    const tests = results?.tests || {};
    const entries = (Object.keys(tests) as AssessmentTestId[]).filter((id) => tests[id]);

    return (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold">Resultados de pruebas</h2>
                        <p className="text-sm text-gray-500">{candidateName}</p>
                        {results?.profile && (
                            <p className="text-xs text-teal-800 mt-1">{ASSESSMENT_PROFILE_LABELS[results.profile]}</p>
                        )}
                    </div>
                    <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-5 space-y-4">
                    {loading && (
                        <p className="flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" /> Cargando resultados
                        </p>
                    )}
                    {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
                    {!loading && entries.length === 0 && !error && (
                        <p className="text-sm text-gray-600">Este candidato todavía no inicia ninguna prueba.</p>
                    )}
                    {entries.map((testId) => {
                        const test = tests[testId]!;
                        const insight = isBehavioralInsightTest(testId) && test.status === 'completed'
                            ? generateAssessmentInsights(testId, test.telemetry, { score: test.score, maxScore: test.maxScore })
                            : null;
                        return (
                            <section key={testId} className="border border-gray-200 rounded-xl p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-semibold">{ASSESSMENT_TEST_LABELS[testId]}</h3>
                                        <p className="text-xs text-gray-500">
                                            {test.status === 'completed' ? 'Enviada · un solo intento' : 'En curso'}
                                            {test.submittedAt ? ` · ${new Date(test.submittedAt).toLocaleString()}` : ''}
                                            {test.timedOut ? ' · se cerró por tiempo' : ''}
                                            {test.retakeEnabled ? ' · reevaluación habilitada' : ''}
                                        </p>
                                    </div>
                                    {test.status === 'completed' && !test.retakeEnabled && (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => void enableRetake(testId)}
                                            className="inline-flex items-center gap-1 text-xs border border-amber-300 text-amber-800 rounded-lg px-2 py-1 hover:bg-amber-50"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" /> Habilitar reevaluación
                                        </button>
                                    )}
                                </div>
                                {insight && (
                                    <ReporteEjecutivoCard
                                        insight={insight}
                                        telemetry={test.telemetry}
                                        score={test.score}
                                        maxScore={test.maxScore}
                                    />
                                )}
                                {!insight && test.interpretation && (
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 space-y-2">
                                        <p className="text-sm font-semibold text-slate-900">{test.interpretation.title}</p>
                                        <p className="text-sm text-slate-800">{test.interpretation.summary}</p>
                                    </div>
                                )}
                                {!insight && test.telemetry && Object.keys(test.telemetry).length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {Object.entries(test.telemetry).map(([key, value]) => (
                                            <div key={key} className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5">
                                                <p className="text-[11px] text-slate-500">{BEHAVIORAL_TELEMETRY_LABELS[key] || key}</p>
                                                <p className="text-sm font-semibold">{value == null ? '—' : String(value)}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {!insight && test.score != null && test.maxScore != null && (
                                    <p className="text-sm">
                                        Puntaje <strong>{test.score}</strong> de {test.maxScore}
                                        {test.scaledScore != null && testId === 'inteligencia' ? ` · escala informe ${test.scaledScore}/60` : ''}
                                        {test.intellectualLevelId ? ` · ${test.intellectualLevelId.replace(/_/g, ' ')}` : ''}
                                    </p>
                                )}
                                {testId === 'inteligencia' && test.score == null && test.status === 'completed' && (
                                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                        Las respuestas quedaron registradas. La clave de las 15 figuras todavía no está cargada, así que este puntaje no alimenta el nivel intelectual del informe.
                                    </p>
                                )}
                                {test.factors && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {FACTORS.map((factor) => {
                                            const row = test.factors![factor];
                                            return (
                                                <div key={factor} className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                                                    <p className="text-xs text-slate-500">{factor} · {DISC_FACTOR_LABELS[factor]}</p>
                                                    <p className="text-lg font-semibold">{row.net}</p>
                                                    <p className="text-[11px] text-slate-500">MÁS {row.most} · MENOS {row.least}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {test.items && test.items.length > 0 && (
                                    <details className="max-h-72 overflow-auto border border-gray-100 rounded-lg" open={!insight}>
                                        <summary className="cursor-pointer px-2 py-1.5 text-xs font-medium text-slate-600 bg-gray-50">Registro de respuestas</summary>
                                        <div>
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50 text-gray-500 sticky top-0">
                                                <tr>
                                                    <th className="text-left px-2 py-1">Ítem</th>
                                                    <th className="text-left px-2 py-1">Respuesta</th>
                                                    <th className="text-left px-2 py-1">Resultado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {test.items.map((item, i) => (
                                                    <tr key={item.id} className="border-t border-gray-100">
                                                        <td className="px-2 py-1 align-top">{i + 1}</td>
                                                        <td className="px-2 py-1 align-top">
                                                            {item.most || item.least
                                                                ? `MÁS: ${item.most || '—'} · MENOS: ${item.least || '—'}`
                                                                : item.choice
                                                                    ? `Figura ${item.choice}`
                                                                    : item.answer || '—'}
                                                        </td>
                                                        <td className="px-2 py-1 align-top">
                                                            {item.correct === true && 'Correcta'}
                                                            {item.correct === false && `Incorrecta${item.expected ? ` · clave: ${item.expected}` : ''}`}
                                                            {item.correct == null && item.mostFactor
                                                                ? `${item.mostFactor} / ${item.leastFactor || '—'}`
                                                                : ''}
                                                            {item.correct == null && !item.mostFactor && item.choice ? 'Sin clave' : ''}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        </div>
                                    </details>
                                )}
                            </section>
                        );
                    })}
                    {entries.length > 0 && (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void rescore()}
                            className="text-sm text-teal-800 underline disabled:opacity-50"
                        >
                            Recalcular puntajes y actualizar informe de operativos
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
