import {
    createSeedScript,
    fillEmptyAxes,
    emptyBoard,
    PERSUASION_PHASES,
    AXES,
    clampPredictionDelta,
    seedWhatsappArguments,
    type AxisHeat,
    type AxisId,
    type BoardCheckpoint,
    type CandidateBoard,
    type CriticalPoint,
    type NextAction,
    type PersuasionPhase,
    type WhatsappArgument,
    type PersuasionScript,
    type ScriptAlternative,
    type ScriptNode,
} from './model';

const SCRIPT_PREFIX = 'opalo.persuasion.script.';
const BOARD_PREFIX = 'opalo.persuasion.board.';
const WHATSAPP_PREFIX = 'opalo.persuasion.whatsapp.';
const PROCESS_STAMP_PREFIX = 'opalo.persuasion.processAt.';
const BOARD_STAMP_PREFIX = 'opalo.persuasion.boardAt.';
const SCRIPT_VERSION = 3;

export function persuasionScriptStorageKey(processId: string): string {
    return SCRIPT_PREFIX + processId;
}

function isAxisId(value: unknown): value is AxisId {
    return typeof value === 'string' && AXES.some(axis => axis.id === value);
}

function isPhase(value: unknown): value is PersuasionPhase {
    return typeof value === 'string' && (PERSUASION_PHASES as readonly string[]).includes(value);
}

function sanitizeAlternative(value: unknown): ScriptAlternative | null {
    if (!value || typeof value !== 'object') return null;
    const alt = value as ScriptAlternative;
    if (typeof alt.id !== 'string' || typeof alt.label !== 'string') return null;
    return {
        id: alt.id,
        label: alt.label,
        opens: Array.isArray(alt.opens) ? alt.opens.filter(id => typeof id === 'string') : [],
        effect: alt.effect,
        battlecard: typeof alt.battlecard === 'string' ? alt.battlecard : undefined,
    };
}

function sanitizeNode(value: unknown): ScriptNode | null {
    if (!value || typeof value !== 'object') return null;
    const node = value as ScriptNode;
    if (typeof node.id !== 'string' || typeof node.say !== 'string' || !isPhase(node.phase)) return null;
    const alternatives = Array.isArray(node.alternatives)
        ? node.alternatives.map(sanitizeAlternative).filter((alt): alt is ScriptAlternative => !!alt)
        : [];
    return {
        id: node.id,
        phase: node.phase,
        say: node.say,
        entry: node.entry === true,
        axis: isAxisId(node.axis) ? node.axis : undefined,
        alternatives,
    };
}

export function hasStoredScript(processId: string): boolean {
    try {
        return localStorage.getItem(SCRIPT_PREFIX + processId) != null;
    } catch {
        return false;
    }
}

export function scriptFromPayload(payload: unknown): PersuasionScript | null {
    if (!payload || typeof payload !== 'object') return null;
    const body = payload as { version?: number; nodes?: unknown[] };
    if (body.version != null && body.version !== SCRIPT_VERSION) return null;
    const nodes = Array.isArray(body.nodes)
        ? body.nodes.map(sanitizeNode).filter((node): node is ScriptNode => !!node)
        : [];
    if (nodes.length === 0) return null;
    return fillEmptyAxes({ nodes });
}

export function loadScript(processId: string): PersuasionScript {
    try {
        const raw = localStorage.getItem(SCRIPT_PREFIX + processId);
        if (!raw) return createSeedScript();
        return scriptFromPayload(JSON.parse(raw) as unknown) ?? createSeedScript();
    } catch {
        return createSeedScript();
    }
}

export function readStoredScript(processId: string): PersuasionScript | null {
    if (!hasStoredScript(processId)) return null;
    return loadScript(processId);
}

export function readProcessStamp(processId: string): string {
    try {
        return localStorage.getItem(PROCESS_STAMP_PREFIX + processId) || '';
    } catch {
        return '';
    }
}

export function saveScript(processId: string, script: PersuasionScript, stamp = new Date().toISOString()): void {
    localStorage.setItem(SCRIPT_PREFIX + processId, JSON.stringify({ version: SCRIPT_VERSION, nodes: script.nodes }));
    localStorage.setItem(PROCESS_STAMP_PREFIX + processId, stamp);
}

function sanitizeWhatsappArgument(value: unknown): WhatsappArgument | null {
    if (!value || typeof value !== 'object') return null;
    const item = value as WhatsappArgument;
    if (typeof item.id !== 'string' || typeof item.label !== 'string' || typeof item.text !== 'string') return null;
    const label = item.label.trim();
    const text = item.text.trim();
    if (!label || !text) return null;
    return { id: item.id, label, text };
}

export function hasStoredWhatsappArguments(processId: string): boolean {
    try {
        return localStorage.getItem(WHATSAPP_PREFIX + processId) != null;
    } catch {
        return false;
    }
}

export function loadWhatsappArguments(processId: string): WhatsappArgument[] {
    try {
        const raw = localStorage.getItem(WHATSAPP_PREFIX + processId);
        if (!raw) return seedWhatsappArguments();
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return seedWhatsappArguments();
        return parsed.map(sanitizeWhatsappArgument).filter((item): item is WhatsappArgument => !!item);
    } catch {
        return seedWhatsappArguments();
    }
}

export function readStoredWhatsappArguments(processId: string): WhatsappArgument[] | null {
    if (!hasStoredWhatsappArguments(processId)) return null;
    return loadWhatsappArguments(processId);
}

export function saveWhatsappArguments(processId: string, items: WhatsappArgument[], stamp = new Date().toISOString()): void {
    localStorage.setItem(WHATSAPP_PREFIX + processId, JSON.stringify(items));
    localStorage.setItem(PROCESS_STAMP_PREFIX + processId, stamp);
}

function sanitizeHeat(value: unknown): Partial<Record<AxisId, AxisHeat>> {
    if (!value || typeof value !== 'object') return {};
    const heat: Partial<Record<AxisId, AxisHeat>> = {};
    for (const axis of AXES) {
        const level = Number((value as Record<string, unknown>)[axis.id]);
        if (level >= 0 && level <= 4) heat[axis.id] = Math.round(level) as AxisHeat;
    }
    return heat;
}

function sanitizeCriticalPoint(value: unknown): CriticalPoint | null {
    if (!value || typeof value !== 'object') return null;
    const item = value as CriticalPoint;
    if (typeof item.id !== 'string') return null;
    return {
        id: item.id,
        point: typeof item.point === 'string' ? item.point : '',
        theory: typeof item.theory === 'string' ? item.theory : '',
    };
}

function sanitizeNextAction(value: unknown): NextAction | null {
    if (!value || typeof value !== 'object') return null;
    const item = value as NextAction;
    if (typeof item.id !== 'string' || typeof item.label !== 'string') return null;
    return {
        id: item.id,
        label: item.label,
        done: item.done === true,
        custom: item.custom === true ? true : undefined,
    };
}

function sanitizeCheckpoint(value: unknown): BoardCheckpoint | null {
    if (!value || typeof value !== 'object') return null;
    const item = value as BoardCheckpoint;
    if (typeof item.id !== 'string' || typeof item.at !== 'string') return null;
    const temperature = Number(item.temperature);
    const answered = Number(item.answered);
    const total = Number(item.total);
    return {
        id: item.id,
        at: item.at,
        kind: item.kind === 'reset' ? 'reset' : 'save',
        temperature: Number.isFinite(temperature) ? Math.max(0, Math.min(100, Math.round(temperature))) : 0,
        answered: Number.isFinite(answered) ? Math.max(0, Math.round(answered)) : 0,
        total: Number.isFinite(total) ? Math.max(0, Math.round(total)) : 0,
    };
}

function readBoardRaw(candidateId: string): string | null {
    const key = BOARD_PREFIX + candidateId;
    const local = localStorage.getItem(key);
    if (local) return local;
    const session = sessionStorage.getItem(key);
    if (!session) return null;
    try {
        localStorage.setItem(key, session);
    } catch {
        return session;
    }
    return session;
}

export function normalizeBoard(parsed: Partial<CandidateBoard> | null | undefined): CandidateBoard {
    const base = emptyBoard();
    const source = parsed || {};
    return {
        ...base,
        ...source,
        answers: source.answers || {},
        answerOrder: Array.isArray(source.answerOrder) ? source.answerOrder : [],
        notes: Array.isArray(source.notes) ? source.notes : [],
        customAnswers: Array.isArray(source.customAnswers) ? source.customAnswers : [],
        evidence: Array.isArray(source.evidence) ? source.evidence : [],
        overrides: source.overrides || {},
        anchorPhrase: source.anchorPhrase || '',
        dirtyNote: source.dirtyNote || '',
        predictionDelta: clampPredictionDelta(Number(source.predictionDelta) || 0),
        checkpoints: Array.isArray(source.checkpoints)
            ? source.checkpoints.map(sanitizeCheckpoint).filter((item): item is BoardCheckpoint => !!item)
            : [],
        axisHeat: sanitizeHeat(source.axisHeat),
        criticalPoints: Array.isArray(source.criticalPoints)
            ? source.criticalPoints.map(sanitizeCriticalPoint).filter((item): item is CriticalPoint => !!item)
            : [],
        nextActions: Array.isArray(source.nextActions)
            ? source.nextActions.map(sanitizeNextAction).filter((item): item is NextAction => !!item)
            : [],
        usedWhatsappArgumentIds: Array.isArray(source.usedWhatsappArgumentIds)
            ? source.usedWhatsappArgumentIds.filter((id): id is string => typeof id === 'string')
            : [],
    };
}

export function loadBoard(candidateId: string): CandidateBoard {
    try {
        const raw = readBoardRaw(candidateId);
        if (!raw) return emptyBoard();
        return normalizeBoard(JSON.parse(raw) as CandidateBoard);
    } catch {
        return emptyBoard();
    }
}

export function hasStoredBoard(candidateId: string): boolean {
    return readBoardRaw(candidateId) != null;
}

export function readStoredBoard(candidateId: string): CandidateBoard | null {
    if (!hasStoredBoard(candidateId)) return null;
    return loadBoard(candidateId);
}

export function readBoardStamp(candidateId: string): string {
    try {
        return localStorage.getItem(BOARD_STAMP_PREFIX + candidateId) || '';
    } catch {
        return '';
    }
}

export function saveBoard(candidateId: string, board: CandidateBoard, stamp = new Date().toISOString()): boolean {
    const key = BOARD_PREFIX + candidateId;
    const writeStamp = () => {
        try {
            localStorage.setItem(BOARD_STAMP_PREFIX + candidateId, stamp);
        } catch {
            /* el tablero igual puede quedar guardado */
        }
    };
    try {
        localStorage.setItem(key, JSON.stringify(board));
        writeStamp();
        return true;
    } catch {
        try {
            const light: CandidateBoard = {
                ...board,
                evidence: board.evidence.map(item => ({ ...item, dataUrl: '' })),
            };
            localStorage.setItem(key, JSON.stringify(light));
            writeStamp();
            return false;
        } catch {
            return false;
        }
    }
}

export async function fileToEvidenceUrl(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file);
    const maxWidth = 960;
    const scale = Math.min(1, maxWidth / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) {
        bitmap.close();
        throw new Error('No se pudo preparar la imagen');
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.72);
}
