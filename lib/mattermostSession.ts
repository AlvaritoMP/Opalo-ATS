const SESSION_KEY = 'ats_mm_session';

export interface MattermostSession {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    mmUserId?: string;
    atsUserId?: string;
}

function canUseStorage(): boolean {
    try {
        return typeof localStorage !== 'undefined';
    } catch {
        return false;
    }
}

export function getMattermostSession(): MattermostSession | null {
    if (!canUseStorage()) return null;
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as MattermostSession;
        if (!parsed?.accessToken) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function setMattermostSession(session: MattermostSession): void {
    if (!canUseStorage()) return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearMattermostSession(): void {
    if (!canUseStorage()) return;
    localStorage.removeItem(SESSION_KEY);
}

export function hasMattermostSession(): boolean {
    return Boolean(getMattermostSession()?.accessToken);
}
