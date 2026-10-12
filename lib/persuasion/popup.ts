import type { BulkCandidate } from '../api/bulkCandidates';

const LAUNCH_PREFIX = 'opalo.persuasion.launch.';
export const LIENZO_CHANNEL = 'opalo-lienzo';

export interface LienzoCandidate {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    district?: string;
    province?: string;
    source?: string;
    stageId: string;
    processId: string;
}

export interface LienzoLaunch {
    processId: string;
    processTitle: string;
    candidateId: string;
    candidates: LienzoCandidate[];
}

const windows = new Map<string, Window>();

export function isLienzoRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('lienzo') === '1';
}

export function toLienzoCandidate(candidate: BulkCandidate): LienzoCandidate {
    return {
        id: candidate.id,
        name: candidate.name,
        phone: candidate.phone,
        email: candidate.email,
        district: candidate.district,
        province: candidate.province,
        source: candidate.source,
        stageId: candidate.stageId,
        processId: candidate.processId,
    };
}

export function lienzoToBulkCandidate(candidate: LienzoCandidate): BulkCandidate {
    return {
        id: candidate.id,
        name: candidate.name,
        phone: candidate.phone,
        email: candidate.email,
        district: candidate.district,
        province: candidate.province,
        source: candidate.source,
        stageId: candidate.stageId || '',
        processId: candidate.processId,
    };
}

export function loadLienzoLaunch(processId: string): LienzoLaunch | null {
    if (!processId) return null;
    try {
        const raw = localStorage.getItem(LAUNCH_PREFIX + processId);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as LienzoLaunch;
        if (!parsed || parsed.processId !== processId || !Array.isArray(parsed.candidates)) return null;
        const candidates = parsed.candidates.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string');
        if (candidates.length === 0) return null;
        return {
            processId,
            processTitle: typeof parsed.processTitle === 'string' ? parsed.processTitle : '',
            candidateId: typeof parsed.candidateId === 'string' ? parsed.candidateId : candidates[0].id,
            candidates,
        };
    } catch {
        return null;
    }
}

function lienzoUrl(processId: string, candidateId: string): string {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('lienzo', '1');
    url.searchParams.set('proceso', processId);
    url.searchParams.set('candidato', candidateId);
    return url.toString();
}

function publish(launch: LienzoLaunch): void {
    localStorage.setItem(LAUNCH_PREFIX + launch.processId, JSON.stringify(launch));
    const channel = new BroadcastChannel(LIENZO_CHANNEL);
    channel.postMessage({ type: 'open', ...launch });
    channel.close();
}

/** Abre el lienzo en otra ventana y deja la tabla en esta. */
export function openLienzoWindow(launch: LienzoLaunch): boolean {
    publish(launch);
    const name = `opalo-lienzo-${launch.processId}`;
    const known = windows.get(launch.processId);
    if (known && !known.closed) {
        known.focus();
        return true;
    }
    const width = Math.max(960, Math.min(1400, Math.round(window.screen.availWidth * 0.72)));
    const height = Math.max(700, Math.min(980, Math.round(window.screen.availHeight * 0.88)));
    const left = Math.max(0, window.screenX + 48);
    const top = Math.max(0, window.screenY + 32);
    const opened = window.open(
        lienzoUrl(launch.processId, launch.candidateId),
        name,
        `popup=yes,width=${width},height=${height},left=${left},top=${top}`
    );
    if (!opened) return false;
    windows.set(launch.processId, opened);
    opened.focus();
    return true;
}
