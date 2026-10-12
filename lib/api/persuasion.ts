import { supabase } from '../supabase';
import { APP_NAME } from '../appConfig';
import {
    createSeedScript,
    emptyBoard,
    seedWhatsappArguments,
    type CandidateBoard,
    type PersuasionScript,
    type WhatsappArgument,
} from '../persuasion/model';
import {
    loadWhatsappArguments,
    normalizeBoard,
    readProcessStamp,
    readStoredScript,
    readStoredWhatsappArguments,
    readBoardStamp,
    readStoredBoard,
    saveBoard,
    saveScript,
    saveWhatsappArguments,
    scriptFromPayload,
} from '../persuasion/storage';

const SCRIPTS = 'persuasion_scripts';
const BOARDS = 'persuasion_boards';

export type PersuasionSaveStatus = 'ok' | 'light' | 'local' | 'error';

export interface PersuasionProcessSnapshot {
    script: PersuasionScript;
    arguments: WhatsappArgument[];
    updatedAt: string;
}

let remoteEnabled: boolean | null = null;

function isMissingTableError(error: { code?: string; message?: string; status?: number }): boolean {
    const msg = (error.message || '').toLowerCase();
    return (
        error.status === 404 ||
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        msg.includes('persuasion_scripts') ||
        msg.includes('persuasion_boards') ||
        msg.includes('does not exist') ||
        msg.includes('schema cache') ||
        msg.includes('not found')
    );
}

function timeIsAfter(left: string, right: string): boolean {
    const a = Date.parse(left);
    const b = Date.parse(right);
    return Number.isFinite(a) && Number.isFinite(b) && a > b;
}

function isPayloadError(error: { message?: string; status?: number }): boolean {
    const msg = (error.message || '').toLowerCase();
    return error.status === 413 || msg.includes('payload') || msg.includes('too large') || msg.includes('request entity');
}

function markRemoteOff(error: { code?: string; message?: string; status?: number }): boolean {
    if (!isMissingTableError(error)) return false;
    remoteEnabled = false;
    return true;
}

function scriptFromRemote(payload: unknown): PersuasionScript | null {
    return scriptFromPayload(payload);
}

function argumentsFromPayload(payload: unknown): WhatsappArgument[] | null {
    if (!payload || typeof payload !== 'object') return null;
    const body = payload as { whatsappArguments?: unknown };
    if (!Array.isArray(body.whatsappArguments)) return null;
    return body.whatsappArguments
        .map(item => {
            if (!item || typeof item !== 'object') return null;
            const row = item as WhatsappArgument;
            if (typeof row.id !== 'string' || typeof row.label !== 'string' || typeof row.text !== 'string') return null;
            const label = row.label.trim();
            const text = row.text.trim();
            if (!label || !text) return null;
            return { id: row.id, label, text };
        })
        .filter((item): item is WhatsappArgument => !!item);
}

function localProcess(processId: string): PersuasionProcessSnapshot {
    return {
        script: readStoredScript(processId) ?? createSeedScript(),
        arguments: readStoredWhatsappArguments(processId) ?? seedWhatsappArguments(),
        updatedAt: readProcessStamp(processId),
    };
}

function cacheProcess(processId: string, snapshot: PersuasionProcessSnapshot): void {
    const stamp = snapshot.updatedAt || new Date().toISOString();
    saveScript(processId, snapshot.script, stamp);
    saveWhatsappArguments(processId, snapshot.arguments, stamp);
}

function boardHasWork(board: CandidateBoard): boolean {
    return (
        Object.keys(board.answers || {}).length > 0 ||
        (board.notes || []).length > 0 ||
        (board.customAnswers || []).length > 0 ||
        (board.evidence || []).length > 0 ||
        (board.checkpoints || []).length > 0 ||
        (board.criticalPoints || []).some(item => item.point.trim() || item.theory.trim()) ||
        (board.nextActions || []).length > 0 ||
        (board.usedWhatsappArgumentIds || []).length > 0 ||
        board.dirtyNote.trim().length > 0 ||
        board.anchorPhrase.trim().length > 0 ||
        Object.keys(board.axisHeat || {}).length > 0 ||
        board.predictionDelta !== 0 ||
        board.routeAgreed ||
        board.day1Repeated ||
        board.noObjection ||
        board.whatsappCopied
    );
}

function lightBoard(board: CandidateBoard): CandidateBoard {
    return { ...board, evidence: board.evidence.map(item => ({ ...item, dataUrl: '' })) };
}

async function fetchProcess(processId: string): Promise<PersuasionProcessSnapshot | null | 'off'> {
    if (remoteEnabled === false) return 'off';
    const { data, error } = await supabase
        .from(SCRIPTS)
        .select('payload, updated_at')
        .eq('process_id', processId)
        .eq('app_name', APP_NAME)
        .maybeSingle();
    if (error) {
        if (markRemoteOff(error)) return 'off';
        throw error;
    }
    remoteEnabled = true;
    if (!data) return null;
    const payload = data.payload;
    return {
        script: scriptFromRemote(payload) ?? createSeedScript(),
        arguments: argumentsFromPayload(payload) ?? seedWhatsappArguments(),
        updatedAt: (data.updated_at as string) || '',
    };
}

async function fetchBoard(candidateId: string): Promise<{ board: CandidateBoard; updatedAt: string } | null | 'off'> {
    if (remoteEnabled === false) return 'off';
    const { data, error } = await supabase
        .from(BOARDS)
        .select('payload, updated_at')
        .eq('candidate_id', candidateId)
        .eq('app_name', APP_NAME)
        .maybeSingle();
    if (error) {
        if (markRemoteOff(error)) return 'off';
        throw error;
    }
    remoteEnabled = true;
    if (!data) return null;
    return {
        board: normalizeBoard((data.payload || {}) as CandidateBoard),
        updatedAt: (data.updated_at as string) || '',
    };
}

export async function syncPersuasionProcess(processId: string): Promise<PersuasionProcessSnapshot> {
    let remote: PersuasionProcessSnapshot | null | 'off' = 'off';
    try {
        remote = await fetchProcess(processId);
    } catch {
        return localProcess(processId);
    }
    if (remote === 'off') return localProcess(processId);

    const localAt = readProcessStamp(processId);
    const storedScript = readStoredScript(processId);
    const storedArgs = readStoredWhatsappArguments(processId);
    const localIsNewer = !!remote?.updatedAt && timeIsAfter(localAt, remote.updatedAt) && (!!storedScript || !!storedArgs);

    if (!remote || localIsNewer) {
        const snapshot: PersuasionProcessSnapshot = {
            script: storedScript ?? remote?.script ?? createSeedScript(),
            arguments: storedArgs ?? remote?.arguments ?? seedWhatsappArguments(),
            updatedAt: new Date().toISOString(),
        };
        const status = await pushPersuasionProcess(processId, snapshot.script, snapshot.arguments);
        if (status === 'ok') {
            const refreshed = await fetchProcess(processId);
            if (refreshed && refreshed !== 'off') {
                cacheProcess(processId, refreshed);
                return refreshed;
            }
        }
        cacheProcess(processId, snapshot);
        return snapshot;
    }

    cacheProcess(processId, remote);
    return remote;
}

export async function pushPersuasionProcess(
    processId: string,
    script: PersuasionScript,
    whatsappArguments?: WhatsappArgument[]
): Promise<PersuasionSaveStatus> {
    if (remoteEnabled === false) return 'local';
    let args = whatsappArguments;
    if (!args) {
        try {
            const remote = await fetchProcess(processId);
            if (remote === 'off') return 'local';
            args = remote?.arguments ?? readStoredWhatsappArguments(processId) ?? loadWhatsappArguments(processId);
        } catch {
            args = readStoredWhatsappArguments(processId) ?? seedWhatsappArguments();
        }
    }
    const payload = { version: 3, nodes: script.nodes, whatsappArguments: args };
    const { error } = await supabase.from(SCRIPTS).upsert(
        {
            process_id: processId,
            app_name: APP_NAME,
            payload,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'process_id' }
    );
    if (error) {
        if (markRemoteOff(error)) return 'local';
        return 'error';
    }
    remoteEnabled = true;
    return 'ok';
}

export async function persuasionProcessRevision(processId: string): Promise<string | null> {
    if (remoteEnabled === false) return null;
    const { data, error } = await supabase
        .from(SCRIPTS)
        .select('updated_at')
        .eq('process_id', processId)
        .eq('app_name', APP_NAME)
        .maybeSingle();
    if (error) {
        markRemoteOff(error);
        return null;
    }
    remoteEnabled = true;
    return (data?.updated_at as string) || null;
}

export async function syncPersuasionBoard(processId: string, candidateId: string): Promise<CandidateBoard> {
    const local = readStoredBoard(candidateId) ?? emptyBoard();
    let remote: { board: CandidateBoard; updatedAt: string } | null | 'off' = 'off';
    try {
        remote = await fetchBoard(candidateId);
    } catch {
        return local;
    }
    if (remote === 'off') return local;

    const localAt = readBoardStamp(candidateId);
    const localIsNewer = !!remote?.updatedAt && timeIsAfter(localAt, remote.updatedAt) && boardHasWork(local);

    if (!remote) {
        if (!boardHasWork(local)) return local;
        await pushPersuasionBoard(processId, candidateId, local);
        return readStoredBoard(candidateId) ?? local;
    }
    if (localIsNewer) {
        await pushPersuasionBoard(processId, candidateId, local);
        return local;
    }
    saveBoard(candidateId, remote.board, remote.updatedAt || new Date().toISOString());
    return remote.board;
}

export async function pushPersuasionBoard(processId: string, candidateId: string, board: CandidateBoard): Promise<PersuasionSaveStatus> {
    if (remoteEnabled === false) return 'local';
    const send = async (payload: CandidateBoard) =>
        supabase.from(BOARDS).upsert(
            {
                candidate_id: candidateId,
                process_id: processId,
                app_name: APP_NAME,
                payload,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'candidate_id' }
        );

    let { error } = await send(board);
    if (error && isPayloadError(error)) {
        const retry = await send(lightBoard(board));
        error = retry.error;
        if (!error) {
            remoteEnabled = true;
            return 'light';
        }
    }
    if (error) {
        if (markRemoteOff(error)) return 'local';
        return 'error';
    }
    remoteEnabled = true;
    return 'ok';
}

const processTimers = new Map<string, { timer: number; script: PersuasionScript; arguments?: WhatsappArgument[] }>();
const boardTimers = new Map<string, { timer: number; processId: string; board: CandidateBoard }>();

export function queuePersuasionProcessPush(processId: string, script: PersuasionScript, whatsappArguments?: WhatsappArgument[]): void {
    const previous = processTimers.get(processId);
    if (previous) window.clearTimeout(previous.timer);
    processTimers.set(processId, {
        script,
        arguments: whatsappArguments,
        timer: window.setTimeout(() => {
            const pending = processTimers.get(processId);
            processTimers.delete(processId);
            if (!pending) return;
            void pushPersuasionProcess(processId, pending.script, pending.arguments);
        }, 700),
    });
}

export function queuePersuasionBoardPush(
    processId: string,
    candidateId: string,
    board: CandidateBoard,
    onStatus?: (status: PersuasionSaveStatus) => void
): void {
    const previous = boardTimers.get(candidateId);
    if (previous) window.clearTimeout(previous.timer);
    boardTimers.set(candidateId, {
        processId,
        board,
        timer: window.setTimeout(() => {
            const pending = boardTimers.get(candidateId);
            boardTimers.delete(candidateId);
            if (!pending) return;
            void pushPersuasionBoard(pending.processId, candidateId, pending.board).then(status => onStatus?.(status));
        }, 700),
    });
}

function flushPersuasionQueues(): void {
    for (const [processId, pending] of processTimers) {
        window.clearTimeout(pending.timer);
        processTimers.delete(processId);
        void pushPersuasionProcess(processId, pending.script, pending.arguments);
    }
    for (const [candidateId, pending] of boardTimers) {
        window.clearTimeout(pending.timer);
        boardTimers.delete(candidateId);
        void pushPersuasionBoard(pending.processId, candidateId, pending.board);
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flushPersuasionQueues);
}
