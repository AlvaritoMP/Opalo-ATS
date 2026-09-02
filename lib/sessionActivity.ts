import { trySetLocalStorageItem } from './localStorageQuota';

export const SESSION_USER_KEY = 'ats_pro_user';
export const SESSION_ACTIVITY_KEY = 'ats_pro_last_activity';
export const SESSION_EXPIRED_NOTICE_KEY = 'ats_session_expired_notice';
export const SESSION_STORAGE_QUOTA_ERROR = 'SESSION_STORAGE_QUOTA';

/** 1 hora de inactividad antes de cerrar sesión automáticamente */
export const SESSION_INACTIVITY_MS = 60 * 60 * 1000;

export function getStoredUserId(): string | null {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    if (!raw) return null;
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed) as { id?: unknown };
            if (typeof parsed?.id === 'string' && parsed.id) return parsed.id;
        } catch {
            /* valor legado que no es JSON de usuario */
        }
    }
    return raw;
}

export function getSessionActivityAt(): number | null {
    const raw = localStorage.getItem(SESSION_ACTIVITY_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

export function touchSessionActivity(now = Date.now()): void {
    trySetLocalStorageItem(SESSION_ACTIVITY_KEY, String(now));
}

/** Sesiones previas sin marca de actividad: iniciar el reloj desde ahora (no expulsar al desplegar). */
export function ensureSessionActivityBaseline(): void {
    if (getStoredUserId() && getSessionActivityAt() === null) {
        touchSessionActivity();
    }
}

export function isSessionExpired(now = Date.now()): boolean {
    const userId = getStoredUserId();
    if (!userId) return false;
    const last = getSessionActivityAt();
    if (last === null) return false;
    return now - last > SESSION_INACTIVITY_MS;
}

/** Persiste el id de sesión. Si el almacenamiento está lleno, libera caché y reintenta. */
export function establishSession(userId: string): boolean {
    const savedUser = trySetLocalStorageItem(SESSION_USER_KEY, userId);
    const savedActivity = trySetLocalStorageItem(SESSION_ACTIVITY_KEY, String(Date.now()));
    return savedUser && savedActivity;
}

export function clearStoredSession(): void {
    localStorage.removeItem(SESSION_USER_KEY);
    localStorage.removeItem(SESSION_ACTIVITY_KEY);
}

export function markSessionExpiredNotice(): void {
    try {
        sessionStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, '1');
    } catch {
        /* ignore */
    }
}

export function consumeSessionExpiredNotice(): boolean {
    try {
        const had = sessionStorage.getItem(SESSION_EXPIRED_NOTICE_KEY) === '1';
        if (had) sessionStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
        return had;
    } catch {
        return false;
    }
}

export function expireSessionDueToInactivity(): void {
    markSessionExpiredNotice();
    clearStoredSession();
}
