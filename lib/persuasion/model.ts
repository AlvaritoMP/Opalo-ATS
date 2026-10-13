export const PERSUASION_PHASES = ['rompehielo', 'sondeo', 'objecion', 'cierre'] as const;
export type PersuasionPhase = (typeof PERSUASION_PHASES)[number];

export const PHASE_LABEL: Record<PersuasionPhase, string> = {
    rompehielo: 'Rompehielo',
    sondeo: 'Sondeo',
    objecion: 'Objeciones',
    cierre: 'Cierre',
};

export const AXES = [
    { id: 'familia_hijos', label: 'Familia e hijos' },
    { id: 'capacidades', label: 'Capacidades y experiencia' },
    { id: 'curriculum', label: 'Mejorar su CV' },
    { id: 'rapidez', label: 'Rapidez para entrar' },
    { id: 'competencia', label: 'Frente a la competencia' },
    { id: 'contexto', label: 'Contexto para encontrar trabajo' },
] as const;
export type AxisId = (typeof AXES)[number]['id'];

/** Resumen del objetivo del eje. No es el guion que se lee. */
export const AXIS_OBJECTIVE: Record<AxisId, string> = {
    familia_hijos: 'Que conecte el puesto con apoyar a su familia y sienta que por eso encaja y debe postular.',
    capacidades: 'Reconocer su iniciativa y experiencia para que quiera aprender, crecer y postular con confianza.',
    curriculum: 'Ofrecer ayuda con su CV y la entrevista a cambio de que venga a la oficina a dejar la postulación.',
    rapidez: 'Que venga pronto a la sede, salga evaluado y se decida a empezar al día siguiente.',
    competencia: 'Que elija Opalo por continuidad, pago puntual y supervisor cerca, en vez de otra oferta.',
    contexto: 'Que vea el trabajo formal y los beneficios como la razón para postular ahora.',
};

export const LEVERS = [
    { id: 'urgencia', label: 'Urgencia' },
    { id: 'familia', label: 'Familia' },
    { id: 'estabilidad', label: 'Estabilidad' },
] as const;
export type LeverId = (typeof LEVERS)[number]['id'];

export const COMMITMENTS = [
    { id: 'bajo', label: 'Bajo' },
    { id: 'medio', label: 'Medio' },
    { id: 'alto', label: 'Alto' },
] as const;
export type CommitmentId = (typeof COMMITMENTS)[number]['id'];

export const OBJECTIONS = [
    { id: 'distancia', label: 'Distancia' },
    { id: 'familia_cuidado', label: 'Familia / cuidado' },
    { id: 'esfuerzo_fisico', label: 'Esfuerzo físico' },
    { id: 'estatus', label: 'Estatus' },
    { id: 'cachuelo', label: 'Cachuelo' },
    { id: 'salario', label: 'Salario' },
] as const;
export type ObjectionCode = (typeof OBJECTIONS)[number]['id'];

export const OBJECTION_SCRIPT: Record<ObjectionCode, string> = {
    distancia:
        'El primer día el pasaje se reconoce si llegas. Miremos la hora de salida desde tu casa, no el mapa en abstracto. ¿A qué hora tendrías que salir para estar a la hora de ingreso?',
    familia_cuidado:
        'No te pido que los dejes solos. Si alguien los ve en la mañana, tú entras al turno y vuelves. ¿Quién puede cubrir esas horas?',
    esfuerzo_fisico:
        'Los primeros días el cuerpo se acostumbra y el puesto rota. ¿Qué te preocupa más, el peso o estar de pie?',
    estatus:
        'El pago es en planilla, no un cachuelo que se corta. ¿Qué pesa más, el uniforme o lo que dirían en casa?',
    cachuelo:
        'El cachuelo puede quedar para el domingo. Esto cubre el fijo de la semana. ¿Cuánto te deja hoy el cachuelo, para compararlo?',
    salario:
        'El mínimo más las horas del turno se ve en la quincena. ¿Cuánto necesitas llevar a casa este mes para estar tranquilo?',
};

export type MarkId = 'day1_repeat' | 'route' | 'no_objection';

export type AlternativeEffect =
    | { type: 'axis'; axis: AxisId }
    | { type: 'objection'; code: ObjectionCode }
    | { type: 'lever'; lever: LeverId }
    | { type: 'commitment'; commitment: CommitmentId }
    | { type: 'mark'; mark: MarkId };

export interface ScriptAlternative {
    id: string;
    label: string;
    /**
     * Preguntas siguientes de este eje, en orden.
     * En la llamada se abre la primera; al responderla, la que sigue.
     */
    opens: string[];
    effect?: AlternativeEffect;
    /** Guion para leer en voz alta cuando la alternativa es una objeción. */
    battlecard?: string;
}

export interface ScriptNode {
    id: string;
    phase: PersuasionPhase;
    /** Texto que el consultor lee. Acepta {nombre} y {puesto}. */
    say: string;
    /** Eje de esta pregunta. Enciende el chip aunque todavía no haya respuesta. */
    axis?: AxisId;
    /** Primera pregunta visible de la llamada. */
    entry?: boolean;
    alternatives: ScriptAlternative[];
}

export interface PersuasionScript {
    nodes: ScriptNode[];
}

export type EvidenceKind = 'chat' | 'dni' | 'ruta' | 'otro';

export interface BoardEvidence {
    id: string;
    kind: EvidenceKind;
    name: string;
    dataUrl: string;
}

export interface BoardNote {
    id: string;
    text: string;
    at: string;
}

/** Pregunta o respuesta anotada en la llamada, fuera de los botones del guion. */
export interface FreeAnswer {
    id: string;
    question: string;
    answer: string;
    at: string;
    /** Si viene de una pregunta del guion cuya respuesta no estaba en los botones. */
    nodeId?: string;
}

/** Avance guardado de un postulante, con el momento en que se registró. */
export interface BoardCheckpoint {
    id: string;
    at: string;
    kind: 'save' | 'reset';
    answered: number;
    total: number;
    /** Temperatura de llegada al día 1 en ese momento, ya con el ajuste del consultor. */
    temperature: number;
}

/** 0 es el más frío y 4 el más caliente. Sirve para marcar un eje que hay que recordar. */
export const AXIS_HEAT_LEVELS = [0, 1, 2, 3, 4] as const;
export type AxisHeat = (typeof AXIS_HEAT_LEVELS)[number];

export const AXIS_HEAT_COLOR: Record<AxisHeat, string> = {
    0: '#0369a1',
    1: '#38bdf8',
    2: '#f59e0b',
    3: '#f97316',
    4: '#dc2626',
};

export const AXIS_HEAT_LABEL: Record<AxisHeat, string> = {
    0: 'Frío',
    1: 'Fresco',
    2: 'Tibio',
    3: 'Cálido',
    4: 'Caliente',
};

export interface CriticalPoint {
    id: string;
    /** Lo que el consultor detectó en la conversación o en el candidato. */
    point: string;
    /** Hacia dónde seguir el convencimiento a partir de ese punto. */
    theory: string;
}

export const NEXT_ACTION_PRESETS = [
    { id: 'confirmar_cita', label: 'Confirmar día y hora en la sede' },
    { id: 'enviar_ubicacion', label: 'Enviar ubicación y qué debe llevar' },
    { id: 'volver_llamar', label: 'Volver a llamar si todavía duda' },
    { id: 'quien_recibe', label: 'Dejar dicho quién lo recibe' },
    { id: 'repetir_cita', label: 'Pedirle que repita la cita' },
] as const;

export interface WhatsappArgument {
    id: string;
    /** Nombre corto del botón. */
    label: string;
    /** Texto que se copia. Acepta {nombre} y {puesto}. */
    text: string;
}

export function seedWhatsappArguments(): WhatsappArgument[] {
    return [
        {
            id: 'wa-familia',
            label: 'Apoyo en casa',
            text: 'Hola {nombre}, este puesto de {puesto} deja un ingreso fijo con el que puedes apoyar en casa. Si te encaja, lo dejamos encaminado.',
        },
        {
            id: 'wa-formal',
            label: 'Trabajo formal',
            text: 'Hola {nombre}, la vacante de {puesto} es formal: desde el primer día hay beneficios y más tranquilidad. Si eso es lo que buscas, postulamos.',
        },
        {
            id: 'wa-sede',
            label: 'Venir a la sede',
            text: 'Hola {nombre}, para apartar tu lugar en {puesto} tienes que venir a la sede. Ahí te evaluamos y puedes salir listo para empezar al día siguiente.',
        },
        {
            id: 'wa-pago',
            label: 'Pago puntual',
            text: 'Hola {nombre}, en Opalo el pago de {puesto} es puntual y la empresa lleva años en pie. Si estás comparando, aquí la continuidad es la diferencia.',
        },
        {
            id: 'wa-supervisor',
            label: 'No te dejan solo',
            text: 'Hola {nombre}, en {puesto} tienes supervisor y coordinador pendientes de ti. No entras y te dejan solo. Si eso te decide, seguimos con tu postulación.',
        },
    ];
}

export interface NextAction {
    id: string;
    label: string;
    done: boolean;
    custom?: boolean;
}

export interface CandidateBoard {
    answers: Record<string, string>;
    answerOrder: string[];
    anchorPhrase: string;
    dirtyNote: string;
    notes: BoardNote[];
    customAnswers: FreeAnswer[];
    evidence: BoardEvidence[];
    whatsappCopied: boolean;
    /** Argumentos de WhatsApp ya copiados con este postulante. */
    usedWhatsappArgumentIds: string[];
    routeAgreed: boolean;
    day1Repeated: boolean;
    noObjection: boolean;
    /** Ajuste manual de la predicción. Negativo la castiga, positivo la sube. */
    predictionDelta: number;
    checkpoints: BoardCheckpoint[];
    /** Color frío a caliente por eje, para destacarlo en llamadas posteriores. */
    axisHeat: Partial<Record<AxisId, AxisHeat>>;
    criticalPoints: CriticalPoint[];
    nextActions: NextAction[];
    overrides: {
        axes?: Partial<Record<AxisId, boolean>>;
        lever?: LeverId | null;
        commitment?: CommitmentId | null;
        objections?: Partial<Record<ObjectionCode, 'abierta' | 'desmontada'>>;
    };
}

export interface CallSnapshot {
    active: ScriptNode | null;
    pending: ScriptNode[];
    path: { node: ScriptNode; alternative: ScriptAlternative }[];
    axes: Record<AxisId, boolean>;
    lever: LeverId | null;
    commitment: CommitmentId | null;
    objections: { code: ObjectionCode; state: 'abierta' | 'desmontada'; script: string }[];
    milestones: { id: string; label: string; done: boolean }[];
}

export function newPersuasionId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyBoard(): CandidateBoard {
    return {
        answers: {},
        answerOrder: [],
        anchorPhrase: '',
        dirtyNote: '',
        notes: [],
        customAnswers: [],
        evidence: [],
        whatsappCopied: false,
        usedWhatsappArgumentIds: [],
        routeAgreed: false,
        day1Repeated: false,
        noObjection: false,
        predictionDelta: 0,
        checkpoints: [],
        axisHeat: {},
        criticalPoints: [],
        nextActions: [],
        overrides: {},
    };
}

export const PREDICTION_DELTA_LIMIT = 40;

export function clampPredictionDelta(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(-PREDICTION_DELTA_LIMIT, Math.min(PREDICTION_DELTA_LIMIT, Math.round(value)));
}

function alt(id: string, label: string, opens: string[], effect?: AlternativeEffect, battlecard?: string): ScriptAlternative {
    return { id, label, opens, effect, battlecard };
}

interface SeedQuestion {
    id: string;
    say: string;
    alternatives: { id: string; label: string; effect?: AlternativeEffect }[];
}

function seedAxis(
    axis: AxisId,
    phase: PersuasionPhase,
    questions: SeedQuestion[],
    nextId: string | null,
    entry: boolean,
): ScriptNode[] {
    return questions.map((question, index) => {
        const opens = questions[index + 1]?.id ?? nextId;
        return {
            id: question.id,
            phase,
            axis,
            entry: entry && index === 0,
            say: question.say,
            alternatives: question.alternatives.map(item =>
                alt(item.id, item.label, opens ? [opens] : [], item.effect),
            ),
        };
    });
}

export function createSeedScript(): PersuasionScript {
    const familia: AlternativeEffect = { type: 'lever', lever: 'familia' };
    const urgencia: AlternativeEffect = { type: 'lever', lever: 'urgencia' };
    const estabilidad: AlternativeEffect = { type: 'lever', lever: 'estabilidad' };
    const alto: AlternativeEffect = { type: 'commitment', commitment: 'alto' };
    const medio: AlternativeEffect = { type: 'commitment', commitment: 'medio' };
    return {
        nodes: [
            ...seedAxis('familia_hijos', 'sondeo', [
                {
                    id: 'fam-1',
                    say: '{nombre}, si este trabajo te deja un ingreso fijo, ¿a quién podrías apoyar en casa?',
                    alternatives: [
                        { id: 'fam-1-hijos', label: 'A sus hijos o personas a cargo', effect: familia },
                        { id: 'fam-1-casa', label: 'A sus padres o a la casa', effect: familia },
                        { id: 'fam-1-propio', label: 'Quiere salir adelante por su cuenta' },
                    ],
                },
                {
                    id: 'fam-2',
                    say: 'Varias personas entran con nosotros para tener tranquilidad con su familia. ¿Eso también te haría postular?',
                    alternatives: [
                        { id: 'fam-2-si', label: 'Sí, busca esa tranquilidad', effect: familia },
                        { id: 'fam-2-duda', label: 'Le importa, pero aún duda', effect: medio },
                        { id: 'fam-2-no', label: 'No lo nombró' },
                    ],
                },
                {
                    id: 'fam-3',
                    say: 'Por lo que me cuentas, tu perfil puede encajar y el puesto te ayuda en casa. ¿Postulamos hoy?',
                    alternatives: [
                        { id: 'fam-3-si', label: 'Sí, quiere postular', effect: alto },
                        { id: 'fam-3-pensa', label: 'Quiere pensarlo', effect: medio },
                        { id: 'fam-3-no', label: 'Por ahora no' },
                    ],
                },
            ], 'cap-1', true),
            ...seedAxis('capacidades', 'sondeo', [
                {
                    id: 'cap-1',
                    say: 'Postulaste enseguida, y eso ya dice iniciativa. ¿Qué te hizo dar el paso?',
                    alternatives: [
                        { id: 'cap-1-ya', label: 'Quería empezar ya' },
                        { id: 'cap-1-puesto', label: 'Le interesó el puesto' },
                        { id: 'cap-1-reco', label: 'Alguien se lo recomendó' },
                    ],
                },
                {
                    id: 'cap-2',
                    say: 'Con tu experiencia podemos confiarte el puesto y, más adelante, otras tareas. ¿Te gustaría aprender más aquí?',
                    alternatives: [
                        { id: 'cap-2-si', label: 'Sí, quiere aprender y crecer' },
                        { id: 'cap-2-sabe', label: 'Confía en que ya puede hacerlo' },
                        { id: 'cap-2-no', label: 'No está seguro', effect: medio },
                    ],
                },
                {
                    id: 'cap-3',
                    say: 'Si ingresas, puedes crecer. ¿Te animas a postular para quedarte y tomar más responsabilidad?',
                    alternatives: [
                        { id: 'cap-3-si', label: 'Sí, quiere postular y crecer', effect: alto },
                        { id: 'cap-3-prueba', label: 'Primero quiere probar el puesto', effect: medio },
                        { id: 'cap-3-no', label: 'Prefiere no complicarse' },
                    ],
                },
            ], 'cv-1', false),
            ...seedAxis('curriculum', 'sondeo', [
                {
                    id: 'cv-1',
                    say: 'No solo cubrimos la vacante: te ayudamos con el CV y la entrevista. ¿Quieres esa ayuda para postular con más chances?',
                    alternatives: [
                        { id: 'cv-1-si', label: 'Sí, quiere ayuda con su CV' },
                        { id: 'cv-1-listo', label: 'Su CV ya está listo' },
                        { id: 'cv-1-no', label: 'No le interesa' },
                    ],
                },
                {
                    id: 'cv-2',
                    say: 'Para orientarte necesitamos que vengas a la oficina. ¿Te comprometes a acercarte y dejar tu postulación?',
                    alternatives: [
                        { id: 'cv-2-si', label: 'Se compromete a venir', effect: alto },
                        { id: 'cv-2-otro', label: 'Puede ir otro día', effect: medio },
                        { id: 'cv-2-no', label: 'No quiere acercarse' },
                    ],
                },
                {
                    id: 'cv-3',
                    say: 'Nosotros ponemos la ayuda. ¿Qué día vienes a la sede para encaminar tu ingreso?',
                    alternatives: [
                        { id: 'cv-3-ya', label: 'Hoy o mañana', effect: alto },
                        { id: 'cv-3-semana', label: 'Esta semana', effect: medio },
                        { id: 'cv-3-no', label: 'Todavía no puede' },
                    ],
                },
            ], 'rap-1', false),
            ...seedAxis('rapidez', 'cierre', [
                {
                    id: 'rap-1',
                    say: 'Quien llega primero a entrevista tiene prioridad. ¿Puedes venir pronto a la sede para apartar tu lugar?',
                    alternatives: [
                        { id: 'rap-1-ya', label: 'Puede ir ya', effect: urgencia },
                        { id: 'rap-1-semana', label: 'Puede esta semana' },
                        { id: 'rap-1-no', label: 'No tiene fecha' },
                    ],
                },
                {
                    id: 'rap-2',
                    say: 'Ahí te evaluamos, conoces al supervisor y te tomamos la talla para empezar al día siguiente. ¿Te sirve entrar así de rápido?',
                    alternatives: [
                        { id: 'rap-2-si', label: 'Sí, quiere empezar al día siguiente', effect: urgencia },
                        { id: 'rap-2-dias', label: 'Necesita unos días', effect: medio },
                        { id: 'rap-2-no', label: 'No puede empezar ya' },
                    ],
                },
                {
                    id: 'rap-3',
                    say: 'Estamos priorizando a quien está disponible. ¿Confirmas que quieres postular y empezar por esta vía?',
                    alternatives: [
                        { id: 'rap-3-si', label: 'Confirma y postula', effect: alto },
                        { id: 'rap-3-pensa', label: 'Quiere pensarlo', effect: medio },
                        { id: 'rap-3-no', label: 'No le alcanza el tiempo' },
                    ],
                },
            ], 'comp-1', false),
            ...seedAxis('competencia', 'objecion', [
                {
                    id: 'comp-1',
                    say: 'Hay muchas ofertas, pero varias no pagan a tiempo o no son claras. ¿Estás comparando esta con otras?',
                    alternatives: [
                        { id: 'comp-1-solo', label: 'Solo mira esta oferta' },
                        { id: 'comp-1-compara', label: 'Está comparando' },
                        { id: 'comp-1-otra', label: 'Ya tiene otra opción' },
                    ],
                },
                {
                    id: 'comp-2',
                    say: 'Opalo tiene más de 18 años, sigue en pie y paga puntual. ¿Prefieres esa estabilidad y postular aquí?',
                    alternatives: [
                        { id: 'comp-2-si', label: 'Le importa estabilidad y pago puntual', effect: estabilidad },
                        { id: 'comp-2-sueldo', label: 'Le pesa el sueldo de otra oferta' },
                        { id: 'comp-2-no', label: 'No lo había pensado' },
                    ],
                },
                {
                    id: 'comp-3',
                    say: 'Aquí tienes supervisor y coordinador pendientes de ti, no te dejan solo. ¿Eso te decide a postular con nosotros?',
                    alternatives: [
                        { id: 'comp-3-si', label: 'Sí, valora el acompañamiento', effect: estabilidad },
                        { id: 'comp-3-igual', label: 'Le da igual' },
                        { id: 'comp-3-otra', label: 'Prefiere otra empresa' },
                    ],
                },
            ], 'ctx-1', false),
            ...seedAxis('contexto', 'cierre', [
                {
                    id: 'ctx-1',
                    say: 'Hoy el trabajo está inestable. ¿Tú también buscas algo más seguro para decidirte a postular?',
                    alternatives: [
                        { id: 'ctx-1-si', label: 'Sí, busca estabilidad', effect: estabilidad },
                        { id: 'ctx-1-ingreso', label: 'Busca cualquier ingreso' },
                        { id: 'ctx-1-mira', label: 'Solo está mirando' },
                    ],
                },
                {
                    id: 'ctx-2',
                    say: 'Esta vacante es formal: desde el primer día hay beneficios y más tranquilidad. ¿Eso es lo que necesitas para postular?',
                    alternatives: [
                        { id: 'ctx-2-si', label: 'Sí, busca trabajo formal con beneficios', effect: estabilidad },
                        { id: 'ctx-2-detalle', label: 'Quiere el detalle de los beneficios' },
                        { id: 'ctx-2-compara', label: 'Sigue comparando' },
                    ],
                },
                {
                    id: 'ctx-3',
                    say: 'Si te encaja la continuidad, apartamos tu lugar ahora. ¿Postulas en este momento?',
                    alternatives: [
                        { id: 'ctx-3-si', label: 'Sí, postula ahora', effect: alto },
                        { id: 'ctx-3-confirma', label: 'Quiere que le confirmen los beneficios', effect: medio },
                        { id: 'ctx-3-no', label: 'Todavía no' },
                    ],
                },
            ], null, false),
        ],
    };
}

/** Si un eje quedó sin preguntas, recupera las 3 de ese tema. No toca los ejes que ya tienen. */
export function fillEmptyAxes(script: PersuasionScript): PersuasionScript {
    const present = new Set(script.nodes.map(node => node.axis).filter((axis): axis is AxisId => !!axis));
    if (AXES.every(axis => present.has(axis.id))) return script;
    const ids = new Set(script.nodes.map(node => node.id));
    const extra = createSeedScript().nodes.filter(node => node.axis && !present.has(node.axis) && !ids.has(node.id));
    if (extra.length === 0) return script;
    return { nodes: [...script.nodes, ...extra] };
}

export function interpolateSay(say: string, nombre: string, puesto: string): string {
    return say.replaceAll('{nombre}', nombre || 'tú').replaceAll('{puesto}', puesto || 'el puesto');
}

export function effectValue(effect?: AlternativeEffect): string {
    if (!effect) return '';
    switch (effect.type) {
        case 'axis':
            return `axis:${effect.axis}`;
        case 'objection':
            return `objection:${effect.code}`;
        case 'lever':
            return `lever:${effect.lever}`;
        case 'commitment':
            return `commitment:${effect.commitment}`;
        case 'mark':
            return `mark:${effect.mark}`;
        default:
            return '';
    }
}

export function effectFromValue(value: string): AlternativeEffect | undefined {
    const [kind, id] = value.split(':');
    if (!kind || !id) return undefined;
    if (kind === 'axis' && AXES.some(a => a.id === id)) return { type: 'axis', axis: id as AxisId };
    if (kind === 'objection' && OBJECTIONS.some(o => o.id === id)) return { type: 'objection', code: id as ObjectionCode };
    if (kind === 'lever' && LEVERS.some(l => l.id === id)) return { type: 'lever', lever: id as LeverId };
    if (kind === 'commitment' && COMMITMENTS.some(c => c.id === id)) return { type: 'commitment', commitment: id as CommitmentId };
    if (kind === 'mark' && (id === 'day1_repeat' || id === 'route' || id === 'no_objection')) return { type: 'mark', mark: id };
    return undefined;
}

export const EFFECT_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'No marca nada' },
    ...LEVERS.map(l => ({ value: `lever:${l.id}`, label: `Palanca · ${l.label}` })),
    ...COMMITMENTS.map(c => ({ value: `commitment:${c.id}`, label: `Compromiso · ${c.label}` })),
    ...AXES.map(a => ({ value: `axis:${a.id}`, label: `Eje · ${a.label}` })),
    ...OBJECTIONS.map(o => ({ value: `objection:${o.id}`, label: `Objeción · ${o.label}` })),
    { value: 'mark:route', label: 'Hito · ruta acordada' },
    { value: 'mark:day1_repeat', label: 'Hito · repitió día y hora' },
    { value: 'mark:no_objection', label: 'Hito · sin objeción' },
];

function findNode(script: PersuasionScript, id: string): ScriptNode | undefined {
    return script.nodes.find(n => n.id === id);
}

interface Derived {
    lever?: LeverId;
    commitment?: CommitmentId;
    axes: Set<AxisId>;
    objections: Map<ObjectionCode, string>;
    marks: Set<MarkId>;
}

function derive(script: PersuasionScript, board: CandidateBoard): Derived {
    const derived: Derived = {
        axes: new Set(),
        objections: new Map(),
        marks: new Set(),
    };
    for (const nodeId of board.answerOrder) {
        const node = findNode(script, nodeId);
        if (node?.axis) derived.axes.add(node.axis);
        const alternative = node?.alternatives.find(a => a.id === board.answers[nodeId]);
        const effect = alternative?.effect;
        if (!effect) continue;
        if (effect.type === 'axis') derived.axes.add(effect.axis);
        if (effect.type === 'lever') derived.lever = effect.lever;
        if (effect.type === 'commitment') derived.commitment = effect.commitment;
        if (effect.type === 'mark') derived.marks.add(effect.mark);
        if (effect.type === 'objection') {
            derived.objections.set(effect.code, alternative?.battlecard || OBJECTION_SCRIPT[effect.code]);
        }
        if (effect.type === 'mark' && effect.mark === 'day1_repeat') {
            derived.commitment = 'alto';
        }
    }
    return derived;
}

export function projectCall(script: PersuasionScript, board: CandidateBoard): CallSnapshot {
    const derived = derive(script, board);
    const revealed = new Set<string>();
    const revealedOrder: string[] = [];
    const reveal = (id: string) => {
        if (!id || revealed.has(id) || !findNode(script, id)) return;
        revealed.add(id);
        revealedOrder.push(id);
    };
    for (const node of script.nodes) {
        if (node.entry) reveal(node.id);
    }
    for (const nodeId of board.answerOrder) {
        const node = findNode(script, nodeId);
        const alternative = node?.alternatives.find(a => a.id === board.answers[nodeId]);
        if (!alternative) continue;
        for (const id of alternative.opens) {
            reveal(id);
            if (!board.answers[id]) break;
        }
    }

    const pending = revealedOrder
        .filter(id => !board.answers[id])
        .map(id => findNode(script, id))
        .filter((node): node is ScriptNode => !!node);

    const path: CallSnapshot['path'] = [];
    for (const nodeId of board.answerOrder) {
        const node = findNode(script, nodeId);
        const alternative = node?.alternatives.find(a => a.id === board.answers[nodeId]);
        if (node && alternative) path.push({ node, alternative });
    }

    const axes = {} as Record<AxisId, boolean>;
    for (const axis of AXES) {
        const manual = board.overrides.axes?.[axis.id];
        axes[axis.id] = manual !== undefined ? manual : derived.axes.has(axis.id);
    }

    const lever = board.overrides.lever !== undefined ? board.overrides.lever : derived.lever ?? null;
    const commitment =
        board.overrides.commitment !== undefined ? board.overrides.commitment : derived.commitment ?? null;

    const codes = new Set<ObjectionCode>(derived.objections.keys());
    for (const code of Object.keys(board.overrides.objections || {}) as ObjectionCode[]) {
        codes.add(code);
    }
    const objections: CallSnapshot['objections'] = [];
    for (const code of codes) {
        const state = board.overrides.objections?.[code] || 'abierta';
        objections.push({
            code,
            state,
            script: derived.objections.get(code) || OBJECTION_SCRIPT[code],
        });
    }

    const openObjections = objections.filter(o => o.state === 'abierta');
    const objectionDone =
        (objections.length > 0 && openObjections.length === 0) ||
        board.noObjection ||
        derived.marks.has('no_objection');
    const routeDone = board.routeAgreed || derived.marks.has('route');
    const day1Done = board.day1Repeated || derived.marks.has('day1_repeat');

    return {
        active: pending[0] ?? null,
        pending,
        path,
        axes,
        lever,
        commitment,
        objections,
        milestones: [
            { id: 'lever', label: 'Palanca nombrada', done: !!lever },
            { id: 'objection', label: 'Objeción trabajada o ninguna', done: objectionDone },
            { id: 'anchor', label: 'Punto crítico', done: (board.criticalPoints ?? []).some(item => item.point.trim().length > 0) || board.anchorPhrase.trim().length > 0 },
            { id: 'commitment', label: 'Compromiso alto', done: commitment === 'alto' },
            { id: 'day1', label: 'Repitió día y hora', done: day1Done },
            { id: 'route', label: 'Ruta acordada', done: routeDone },
            { id: 'reminder', label: 'Argumento de WhatsApp usado', done: (board.usedWhatsappArgumentIds ?? []).length > 0 || board.whatsappCopied },
        ],
    };
}

export interface Day1Prediction {
    /** Lo que sale del guion, sin el ajuste del consultor. */
    base: number;
    delta: number;
    /** Temperatura final, de 0 a 100. */
    value: number;
}

export function predictDay1(script: PersuasionScript, board: CandidateBoard, snapshot: CallSnapshot): Day1Prediction {
    const total = Math.max(1, script.nodes.length);
    const answered = script.nodes.filter(node => board.answers[node.id]).length;
    let base = Math.round((answered / total) * 22);
    for (const axis of AXES) {
        const nodes = script.nodes.filter(node => node.axis === axis.id);
        if (nodes.some(node => board.answers[node.id])) base += 4;
    }
    if (snapshot.commitment === 'alto') base += 16;
    else if (snapshot.commitment === 'medio') base += 8;
    else if (snapshot.commitment === 'bajo') base += 3;
    if (snapshot.lever) base += 6;
    const done = (id: string) => snapshot.milestones.some(item => item.id === id && item.done);
    if (done('route')) base += 12;
    if (done('day1')) base += 14;
    if (done('reminder')) base += 8;
    if (done('anchor')) base += 6;
    if (done('objection')) base += 6;
    base -= snapshot.objections.filter(item => item.state === 'abierta').length * 8;
    base = Math.max(0, Math.min(100, base));
    const delta = clampPredictionDelta(board.predictionDelta || 0);
    return { base, delta, value: Math.max(0, Math.min(100, base + delta)) };
}

export function answerNode(board: CandidateBoard, nodeId: string, alternativeId: string): CandidateBoard {
    const answers = { ...board.answers, [nodeId]: alternativeId };
    const answerOrder = board.answerOrder.filter(id => id !== nodeId);
    answerOrder.push(nodeId);
    return { ...board, answers, answerOrder };
}

export function undoLastAnswer(board: CandidateBoard): CandidateBoard {
    if (board.answerOrder.length === 0) return board;
    const answerOrder = board.answerOrder.slice(0, -1);
    const removed = board.answerOrder[board.answerOrder.length - 1];
    const answers = { ...board.answers };
    delete answers[removed];
    return { ...board, answers, answerOrder };
}

export function objectionLabel(code: ObjectionCode): string {
    return OBJECTIONS.find(o => o.id === code)?.label || code;
}
