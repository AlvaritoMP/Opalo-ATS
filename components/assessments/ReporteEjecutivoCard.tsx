import React from 'react';
import type { AssessmentInsight, InsightTone, RoleFitLevel } from '../../lib/assessments/insights';
import { telemetryRows } from '../../lib/assessments/insights';

const TONE: Record<InsightTone, string> = {
    sky: 'bg-sky-100 text-sky-950 border-sky-200',
    teal: 'bg-teal-100 text-teal-950 border-teal-200',
    rose: 'bg-rose-100 text-rose-950 border-rose-200',
    amber: 'bg-amber-100 text-amber-950 border-amber-200',
    emerald: 'bg-emerald-100 text-emerald-950 border-emerald-200',
    slate: 'bg-slate-200 text-slate-900 border-slate-300',
};

const FIT: Record<RoleFitLevel, string> = {
    Alto: 'bg-emerald-100 text-emerald-900',
    Medio: 'bg-amber-100 text-amber-900',
    Bajo: 'bg-rose-100 text-rose-900',
};

interface Props {
    insight: AssessmentInsight;
    telemetry?: Record<string, number | string | null>;
    score?: number | null;
    maxScore?: number | null;
}

export const ReporteEjecutivoCard: React.FC<Props> = ({ insight, telemetry, score, maxScore }) => {
    const numbers = telemetryRows(telemetry);
    if (score != null && maxScore != null) {
        numbers.unshift({ key: 'aciertos', label: 'Aciertos', value: `${score} de ${maxScore}` });
    }
    return (
        <article className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Perfil conductual</p>
                <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${TONE[insight.tone]}`}>
                    {insight.profile}
                </span>
            </div>
            <div className="px-4 py-3 space-y-4">
                <section>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Dictamen</h4>
                    <p className="text-sm text-slate-800 leading-relaxed">{insight.verdict}</p>
                    {insight.callouts.map((line) => (
                        <p key={line} className="mt-2 text-sm text-slate-800 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                            {line}
                        </p>
                    ))}
                </section>
                <section>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Fortalezas observadas</h4>
                    <ul className="text-sm text-slate-800 list-disc pl-4 space-y-1">
                        {insight.strengths.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                </section>
                <section>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Riesgos en el puesto</h4>
                    <ul className="text-sm text-slate-800 list-disc pl-4 space-y-1">
                        {insight.risks.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                </section>
                <section>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Ajuste por familia de puestos</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {insight.fit.map((item) => (
                            <div key={item.id} className="rounded-lg border border-slate-100 px-2 py-2">
                                <p className="text-[11px] text-slate-500 leading-snug">{item.label}</p>
                                <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${FIT[item.level]}`}>{item.level}</p>
                            </div>
                        ))}
                    </div>
                </section>
                <section>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Preguntas para la entrevista</h4>
                    <ol className="text-sm text-slate-800 list-decimal pl-4 space-y-1">
                        {insight.questions.map((line) => <li key={line}>{line}</li>)}
                    </ol>
                </section>
                {numbers.length > 0 && (
                    <details className="rounded-lg border border-slate-200 bg-slate-50">
                        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-700">Detalle numérico</summary>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-3 pb-3">
                            {numbers.map((row) => (
                                <div key={row.key}>
                                    <p className="text-[11px] text-slate-500">{row.label}</p>
                                    <p className="text-sm font-semibold text-slate-800">{row.value}</p>
                                </div>
                            ))}
                        </div>
                    </details>
                )}
            </div>
        </article>
    );
};
