import { ASSESSMENT_TEST_LABELS, BEHAVIORAL_TELEMETRY_LABELS, type AssessmentResults, type AssessmentTestId } from './types';

export type BehavioralInsightTest = 'riesgo' | 'atencion' | 'esfuerzo';

export type RoleFitLevel = 'Alto' | 'Medio' | 'Bajo';

export type InsightTone = 'sky' | 'teal' | 'rose' | 'amber' | 'emerald' | 'slate';

export interface RoleFit {
    id: 'operativo' | 'comercial' | 'administrativo';
    label: string;
    level: RoleFitLevel;
}

export interface AssessmentInsight {
    testType: BehavioralInsightTest;
    profile: string;
    tone: InsightTone;
    verdict: string;
    strengths: string[];
    risks: string[];
    fit: RoleFit[];
    questions: string[];
    callouts: string[];
}

export const BEHAVIORAL_REPORT_START = '[Pruebas de conducta]';
export const BEHAVIORAL_REPORT_END = '[/Pruebas de conducta]';

const FIT_LABELS: Record<RoleFit['id'], string> = {
    operativo: 'Operativos, seguridad y cumplimiento',
    comercial: 'Comerciales, ventas y cierre de metas',
    administrativo: 'Administrativos, analíticos y calidad',
};

function fit(operativo: RoleFitLevel, comercial: RoleFitLevel, administrativo: RoleFitLevel): RoleFit[] {
    return [
        { id: 'operativo', label: FIT_LABELS.operativo, level: operativo },
        { id: 'comercial', label: FIT_LABELS.comercial, level: comercial },
        { id: 'administrativo', label: FIT_LABELS.administrativo, level: administrativo },
    ];
}

function metric(raw: Record<string, number | string | null | undefined>, key: string): number | null {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function insight(
    testType: BehavioralInsightTest,
    profile: string,
    tone: InsightTone,
    verdict: string,
    strengths: string[],
    risks: string[],
    roles: RoleFit[],
    questions: string[],
    callouts: string[] = [],
): AssessmentInsight {
    return { testType, profile, tone, verdict, strengths, risks, fit: roles, questions, callouts };
}

export function generateAssessmentInsights(
    testType: BehavioralInsightTest,
    rawMetrics: Record<string, number | string | null | undefined> | null | undefined,
    extras?: { score?: number | null; maxScore?: number | null },
): AssessmentInsight | null {
    const metrics = rawMetrics || {};
    if (testType === 'riesgo') return insightRisk(metrics);
    if (testType === 'atencion') return insightAttention(metrics, extras);
    return insightEffort(metrics);
}

function insightRisk(metrics: Record<string, number | string | null | undefined>): AssessmentInsight | null {
    const pumps = metric(metrics, 'adjustedAveragePumps');
    const burst = metric(metrics, 'popRate');
    if (pumps == null && burst == null) return null;
    const post = metric(metrics, 'postFailureAveragePumps');
    const latency = metric(metrics, 'meanPumpLatencyMs');
    const popped = metric(metrics, 'popped');
    const callouts: string[] = [];

    if (pumps != null && post != null && pumps > 0) {
        const drop = (pumps - post) / pumps;
        if (drop > 0.4) {
            callouts.push('Sensible a la frustración: después de un error baja con fuerza el nivel de exposición.');
        } else if (Math.abs(post - pumps) / pumps <= 0.2) {
            callouts.push('Firmeza emocional: el error no le desarma el método de trabajo.');
        } else if (post > pumps * 1.2) {
            callouts.push('Después del fallo sube la exposición. El error no lo frena y a veces lo empuja a insistir más.');
        }
    } else if (popped === 0) {
        callouts.push('No hubo explosiones, así que no se observa cómo se recupera después de una pérdida.');
    }

    if (latency != null && latency < 250) {
        callouts.push('El bombeo es muy rápido: decide la siguiente inflada casi sin pausa.');
    } else if (latency != null && latency > 900) {
        callouts.push('Se toma una pausa clara entre infladas antes de seguir exponiendo el resultado.');
    }

    const safeBurst = burst ?? 0;

    if ((pumps != null && pumps > 18) || (burst != null && burst > 40)) {
        return insight(
            'riesgo',
            'Arriesgado / Impulsivo',
            'rose',
            'Le cuesta postergar la ganancia inmediata o detenerse cuando aparecen señales de quiebre. Tiende a forzar el resultado hasta perder lo acumulado, y bajo presión sostiene la apuesta en lugar de proteger lo ya ganado.',
            [
                'Tiene audacia para ir por objetivos altos.',
                'Persiste bajo presión y no se achica ante una meta agresiva.',
            ],
            [
                'En caja, activos o cumplimiento estricto puede perder el resultado por no frenar a tiempo.',
                'El exceso de confianza eleva el riesgo de saltos de protocolo, accidentes o pérdidas.',
            ],
            fit('Bajo', 'Alto', 'Bajo'),
            [
                'Cuéntame una vez en que insististe de más y el resultado se te fue de las manos. ¿Qué harías distinto?',
                '¿Qué señal te indica que debes parar, aunque el premio todavía parezca cerca?',
            ],
            callouts,
        );
    }

    if (pumps != null && pumps < 8 && safeBurst <= 20) {
        return insight(
            'riesgo',
            'Prudente / Conservador (Aversión al riesgo)',
            'sky',
            'Prioriza la seguridad y la preservación de resultados sobre el beneficio potencial. Prefiere una ganancia modesta y segura antes que exponerse a un error, y decide con cautela cuando el costo de fallar es alto.',
            [
                'Cuida lo ya ganado y se apega a la norma.',
                'Comete pocos errores por precipitación.',
                'Es confiable en control de activos, caja y tareas de seguridad.',
            ],
            [
                'Puede conformarse con un resultado menor y evitar metas ambiciosas.',
                'En venta agresiva o con poca información tiende a frenarse y a no cerrar.',
            ],
            fit('Alto', 'Bajo', 'Alto'),
            [
                'Cuéntame de una situación laboral donde tuviste que asumir una decisión con poca información. ¿Cómo manejaste el temor a equivocarte?',
                '¿En qué momento decides que ya es suficiente y dejas de buscar un resultado mayor?',
            ],
            callouts,
        );
    }

    if (pumps != null && pumps >= 8 && pumps <= 18 && burst != null && burst >= 15 && burst <= 35) {
        return insight(
            'riesgo',
            'Calculado / Estratégico',
            'teal',
            'Busca maximizar el retorno con riesgos que puede sostener. Lee el entorno y equilibra ambición con prudencia, sin llevar la mayoría de las decisiones al límite.',
            [
                'Adapta el nivel de riesgo según cómo viene la situación.',
                'Orienta el esfuerzo a un logro que se puede sostener.',
                'Equilibra velocidad y cuidado al decidir.',
            ],
            [
                'El margen se estrecha si el puesto no admite ninguna desviación de la norma.',
                'Si el entorno cambia de golpe, puede tardar un momento en recalibrar la apuesta.',
            ],
            fit('Alto', 'Alto', 'Alto'),
            [
                'Cuéntame una meta ambiciosa que lograste sin saltarte el procedimiento.',
                '¿Cómo decides hasta dónde arriesgas cuando el premio es alto y la pérdida también?',
            ],
            callouts,
        );
    }

    return insight(
        'riesgo',
        'Perfil mixto',
        'amber',
        `El patrón no se instala en un extremo${pumps != null ? ` (promedio de ${pumps} infladas en lo cobrado` : ''}${burst != null ? `${pumps != null ? ', ' : ' ('}${burst}% de quiebres` : ''}${pumps != null || burst != null ? ')' : ''}. A veces cuida el resultado y a veces lo estira. Conviene leerlo con el puesto concreto, porque no muestra una aversión clara ni un impulso sostenido.`,
        [
            'No se encierra en una sola forma de decidir.',
            'Puede subir o bajar la exposición según la ronda.',
        ],
        [
            'El estilo puede verse inconsistente si el rol pide una conducta muy estable.',
            'Esta prueba, sola, no alcanza para asignar un puesto de alto riesgo o de venta agresiva.',
        ],
        fit('Medio', 'Medio', 'Medio'),
        [
            '¿Cómo decides el nivel de riesgo cuando no tienes una regla clara?',
            'Cuéntame un resultado que cuidaste y otro que estiraste de más.',
        ],
        callouts,
    );
}

function insightAttention(
    metrics: Record<string, number | string | null | undefined>,
    extras?: { score?: number | null; maxScore?: number | null },
): AssessmentInsight | null {
    const flanker = metric(metrics, 'flankerEffectMs');
    const errCong = metric(metrics, 'errorCongruentPct');
    const errIncong = metric(metrics, 'errorIncongruentPct');
    const first10 = metric(metrics, 'errorFirst10Pct');
    const last10 = metric(metrics, 'errorLast10Pct');
    const fastErrors = metric(metrics, 'fastErrors');
    let accuracy: number | null = null;
    if (extras?.score != null && extras.maxScore != null && extras.maxScore > 0) {
        accuracy = (extras.score / extras.maxScore) * 100;
    } else if (errCong != null && errIncong != null) {
        accuracy = 100 - (errCong + errIncong) / 2;
    }
    if (accuracy == null && flanker == null) return null;

    const callouts: string[] = [];
    if (first10 != null && last10 != null && last10 - first10 >= 20) {
        callouts.push('La atención se desgasta: falla bastante más al final de la serie que al inicio.');
    } else if (first10 != null && last10 != null && last10 - first10 <= -10) {
        callouts.push('Sostiene el rendimiento: los últimos intentos no empeoran respecto de los primeros.');
    }
    if (fastErrors != null && fastErrors >= 3) {
        callouts.push('Hay varios errores en menos de 200 ms: responde antes de mirar el dato central.');
    }

    const safeAccuracy = accuracy ?? 100;

    if (accuracy != null && accuracy >= 90 && flanker != null && flanker < 70) {
        return insight(
            'atencion',
            'Alta concentración y control de interferencias',
            'emerald',
            'Aísla lo que no importa y sostiene la precisión cuando hay ruido alrededor. Bajo presión del entorno se queda con la instrucción central y no deja que el estímulo contrario le baje la calidad de la respuesta.',
            [
                'Mantiene la precisión aunque el entorno empuje en otra dirección.',
                'Responde a la consigna central sin dejarse llevar por el ruido.',
                'Encaja en control de calidad, digitación, auditoría y operaciones que no admiten fallo.',
            ],
            [
                'La serie es breve: una jornada larga con fatiga puede no verse por completo aquí.',
                'En un rol que pide cambiar de foco todo el tiempo, este control tan estricto puede sentirse rígido.',
            ],
            fit('Alto', 'Medio', 'Alto'),
            [
                'Cuéntame una tarea en la que tenías que acertar pese a interrupciones. ¿Cómo sostuviste la precisión?',
                '¿Qué haces cuando el ritmo te exige ir más rápido de lo que puedes revisar?',
            ],
            callouts,
        );
    }

    if ((accuracy != null && accuracy < 80) || (flanker != null && flanker > 120)) {
        return insight(
            'atencion',
            'Vulnerable a distractores / sobrecarga cognitiva',
            'amber',
            'El ruido de alrededor o la presión de tiempo le baja la calidad de la respuesta. Le cuesta quedarse con la instrucción central cuando hay señales en conflicto, y eso se nota en demora o en error.',
            [
                'El intento está: el dato es pérdida de precisión bajo interferencia, no falta de respuesta.',
                errIncong != null && errCong != null && errIncong > errCong
                    ? 'Cuando la señal es clara y no contradice, el error baja.'
                    : 'La dificultad aparece incluso cuando la tarea se ve simple.',
            ],
            [
                'Con interrupciones, clientes o varias órdenes a la vez, la calidad de la respuesta se deteriora.',
                'Tarda o falla más cuando el entorno contradice lo que tiene que ejecutar.',
            ],
            fit('Bajo', 'Medio', 'Bajo'),
            [
                '¿Cómo organizas tu jornada cuando tienes interrupciones constantes de compañeros o clientes?',
                'Cuéntame un error que cometiste por ir rápido o por distraerte. ¿Qué cambiaste después?',
            ],
            callouts,
        );
    }

    const accuracyText = accuracy == null ? 'sin un porcentaje cerrado de aciertos' : `con ${Math.round(safeAccuracy)}% de aciertos`;
    const flankerText = flanker == null ? 'sin una diferencia clara de tiempo' : `y una interferencia de ${Math.round(flanker)} ms`;
    return insight(
        'atencion',
        'Concentración funcional',
        'teal',
        `Filtra parte del ruido ${accuracyText} ${flankerText}. La interferencia todavía le cuesta algo de tiempo o algún error. Sirve para tareas con foco, y en lo crítico conviene supervisión.`,
        [
            'Sostiene una precisión utilizable en la mayor parte de la serie.',
            'No se desarma del todo cuando las señales de alrededor contradicen la instrucción.',
        ],
        [
            'Bajo ruido fuerte o tiempo muy corto, la calidad puede bajar.',
            'No es el perfil de una operación crítica que no admite distracción.',
        ],
        fit('Medio', 'Medio', 'Medio'),
        [
            '¿Cómo proteges la precisión de tu trabajo cuando hay ruido o varias cosas a la vez?',
            'Cuéntame una jornada en la que el ritmo te hizo fallar. ¿Cómo lo corregiste?',
        ],
        callouts,
    );
}

function insightEffort(metrics: Record<string, number | string | null | undefined>): AssessmentInsight | null {
    const at20 = metric(metrics, 'hardChoiceAt20Pct');
    const at50 = metric(metrics, 'hardChoiceAt50Pct');
    const at80 = metric(metrics, 'hardChoiceAt80Pct');
    const completion = metric(metrics, 'hardCompletionPct');
    const decision = metric(metrics, 'meanDecisionMs');
    const buckets = [at20, at50, at80].filter((value): value is number => value != null);
    if (buckets.length === 0 && completion == null) return null;
    const overall = buckets.length ? buckets.reduce((sum, value) => sum + value, 0) / buckets.length : null;

    const callouts: string[] = [];
    if (completion != null && at50 != null && at50 >= 60 && completion < 50) {
        callouts.push('Elige la tarea exigente, pero una parte importante de esas rondas no la termina.');
    } else if (completion != null && completion >= 80 && (at50 != null && at50 >= 60)) {
        callouts.push('Cuando elige la tarea exigente, la termina.');
    }
    if (decision != null && decision < 800) {
        callouts.push('Elige muy rápido, casi sin sopesar el retorno.');
    } else if (decision != null && decision > 8000) {
        callouts.push('Se toma varios segundos antes de decidir si vale el esfuerzo.');
    }

    if (at50 != null && at50 >= 60) {
        const finishes = completion != null && completion >= 70;
        return insight(
            'esfuerzo',
            'Alta motivación al logro y tenacidad',
            'teal',
            'Está dispuesto a invertir esfuerzo extra por un retorno mayor, también cuando el premio no está asegurado. Tolera la exigencia y se mueve con proactividad cuando la recompensa justifica el trabajo.',
            [
                'Elige la tarea más exigente aun con una probabilidad media de cobrar.',
                finishes
                    ? 'Sostiene el esfuerzo hasta completar lo que eligió.'
                    : 'Se inclina por la meta alta; el cierre de esa exigencia hay que confirmarlo en la entrevista.',
                'Encaja en puestos por objetivo, producción y cierre.',
            ],
            [
                'Puede sobrecomprometerse si el premio es incierto y el costo del esfuerzo es alto.',
                finishes
                    ? 'En un rol de tarea mínima y muy regulada puede impacientarse con lo fácil.'
                    : 'Elegir lo difícil no basta si deja rondas a medias: el puesto tiene que poder sostener ese ritmo.',
            ],
            fit('Alto', 'Alto', 'Medio'),
            [
                'Cuéntame una meta en la que elegiste el camino más difícil. ¿La terminaste?',
                '¿Qué haces cuando el esfuerzo extra no tiene el premio asegurado?',
            ],
            callouts,
        );
    }

    if (overall != null && overall < 30) {
        return insight(
            'esfuerzo',
            'Economizador de esfuerzo / pragmático',
            'slate',
            'Cumple lo requerido y reserva el esfuerzo extra para cuando el beneficio está casi asegurado. No se desgasta por un retorno incierto y administra la energía en favor de la tarea segura.',
            [
                'No gasta energía en tareas de bajo retorno.',
                'Cumple la opción segura cuando la elige.',
            ],
            [
                'En metas agresivas o producción variable puede quedarse en el mínimo.',
                'Evita la exigencia extra si el premio no está garantizado.',
            ],
            fit('Alto', 'Bajo', 'Medio'),
            [
                '¿En qué casos das un esfuerzo por encima de lo pedido, y en qué casos te quedas en lo justo?',
                'Cuéntame una meta en la que el resultado no estaba asegurado. ¿Cómo decidiste cuánto invertir?',
            ],
            callouts,
        );
    }

    return insight(
        'esfuerzo',
        'Motivación selectiva',
        'amber',
        'Mide el esfuerzo según qué tan seguro ve el retorno. No se queda siempre en lo fácil ni se va siempre a lo difícil: sube la exigencia cuando la chance de cobrar mejora.',
        [
            'Distingue cuándo el esfuerzo extra vale la pena.',
            'Puede tomar la tarea difícil si la probabilidad de retorno es alta.',
        ],
        [
            'Con un premio incierto tiende a no estirarse.',
            'En un puesto de meta permanente puede rendir por debajo de quien busca el retorno mayor por sistema.',
        ],
        fit('Medio', 'Medio', 'Medio'),
        [
            '¿Qué tiene que estar claro para que aceptes una tarea más pesada?',
            'Cuéntame un objetivo en el que decidiste no esforzarte de más. ¿Por qué?',
        ],
        callouts,
    );
}

export function isBehavioralInsightTest(testId: AssessmentTestId): testId is BehavioralInsightTest {
    return testId === 'riesgo' || testId === 'atencion' || testId === 'esfuerzo';
}

export function insightsFromResults(results: AssessmentResults | null | undefined): Array<{ testId: BehavioralInsightTest; insight: AssessmentInsight }> {
    const tests = results?.tests || {};
    const out: Array<{ testId: BehavioralInsightTest; insight: AssessmentInsight }> = [];
    (['riesgo', 'atencion', 'esfuerzo'] as const).forEach((testId) => {
        const test = tests[testId];
        if (!test || test.status !== 'completed') return;
        const insightRow = generateAssessmentInsights(testId, test.telemetry || {}, {
            score: test.score,
            maxScore: test.maxScore,
        });
        if (insightRow) out.push({ testId, insight: insightRow });
    });
    return out;
}

export function formatAssessmentInsightsForReport(rows: Array<{ testId: BehavioralInsightTest; insight: AssessmentInsight }>): string {
    if (rows.length === 0) return '';
    const body = rows.map(({ testId, insight: row }) => {
        const fitLine = row.fit.map((item) => `${item.label.split(',')[0]} ${item.level}`).join('; ');
        return [
            `${ASSESSMENT_TEST_LABELS[testId]}: ${row.profile}.`,
            row.verdict,
            `Fortalezas: ${row.strengths.join(' ')}`,
            `Riesgos en el puesto: ${row.risks.join(' ')}`,
            `Ajuste sugerido: ${fitLine}.`,
            row.callouts.length ? `Alerta: ${row.callouts.join(' ')}` : '',
        ].filter(Boolean).join(' ');
    }).join('\n\n');
    return `${BEHAVIORAL_REPORT_START}\n${body}\n${BEHAVIORAL_REPORT_END}`;
}

export function upsertBehavioralConclusions(current: string, block: string): string {
    const text = current || '';
    const start = text.indexOf(BEHAVIORAL_REPORT_START);
    const end = text.indexOf(BEHAVIORAL_REPORT_END);
    if (start >= 0 && end > start) {
        const before = text.slice(0, start).trimEnd();
        const after = text.slice(end + BEHAVIORAL_REPORT_END.length).trim();
        return [before, block, after].filter(Boolean).join('\n\n');
    }
    const base = text.trim();
    return base ? `${base}\n\n${block}` : block;
}

export function telemetryRows(raw: Record<string, number | string | null | undefined> | null | undefined): Array<{ key: string; label: string; value: string }> {
    if (!raw) return [];
    return Object.entries(raw).map(([key, value]) => ({
        key,
        label: BEHAVIORAL_TELEMETRY_LABELS[key] || key,
        value: value == null || value === '' ? '—' : String(value),
    }));
}
