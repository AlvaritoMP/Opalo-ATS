import { APP_NAME } from '../appConfig';
import {
    clearMattermostSession,
    getMattermostSession,
    setMattermostSession,
    type MattermostSession,
} from '../mattermostSession';
import type { User, UserMessage } from '../../types';

const API_BASE_URL = String(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export interface MattermostAuthStatus {
    enabled: boolean;
    passwordResetUrl?: string;
}

export interface MattermostPeer {
    id: string;
    name: string;
    email: string;
    mattermostUserId?: string;
    mattermostUsername?: string;
    avatarUrl?: string;
}

export interface MattermostThread {
    partnerId: string;
    partnerName: string;
    channelId: string;
    unread: number;
    lastMessage: UserMessage | null;
}

export interface MattermostDmsPayload {
    me: User | null;
    threads: MattermostThread[];
    messages: UserMessage[];
    peers: MattermostPeer[];
}

function authUrl(path: string): string {
    return `${API_BASE_URL}/api/auth/mattermost${path}`;
}

function chatUrl(path: string): string {
    return `${API_BASE_URL}/api/mattermost${path}`;
}

async function parseError(res: Response): Promise<string> {
    try {
        const data = await res.json();
        return data.error || data.message || res.statusText;
    } catch {
        return res.statusText || 'Error de Mattermost';
    }
}

async function refreshSession(): Promise<MattermostSession | null> {
    const session = getMattermostSession();
    if (!session?.refreshToken) return null;
    const res = await fetch(authUrl('/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!res.ok) {
        clearMattermostSession();
        return null;
    }
    const tokens = await res.json();
    const next: MattermostSession = {
        ...session,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || session.refreshToken,
        expiresAt: tokens.expiresAt,
    };
    setMattermostSession(next);
    return next;
}

async function chatFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
    const session = getMattermostSession();
    if (!session?.accessToken) {
        throw new Error('No hay sesión de Mattermost');
    }
    const res = await fetch(chatUrl(path), {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
            'X-App-Name': APP_NAME,
            ...(init.headers || {}),
        },
    });
    if (res.status === 401 && retry) {
        const refreshed = await refreshSession();
        if (refreshed) return chatFetch(path, init, false);
    }
    return res;
}

export const mattermostAuthApi = {
    startLoginUrl(): string {
        const url = new URL(authUrl('/start'));
        url.searchParams.set('frontend_url', window.location.origin);
        url.searchParams.set('app_name', APP_NAME);
        return url.toString();
    },

    async getStatus(): Promise<MattermostAuthStatus> {
        try {
            const res = await fetch(authUrl('/status'));
            if (!res.ok) return { enabled: false };
            return res.json();
        } catch {
            return { enabled: false };
        }
    },

    async completeTicket(ticket: string): Promise<{ user: User; session: MattermostSession }> {
        const res = await fetch(authUrl(`/complete?ticket=${encodeURIComponent(ticket)}`));
        if (!res.ok) throw new Error(await parseError(res));
        const data = await res.json();
        const session: MattermostSession = {
            accessToken: data.tokens.accessToken,
            refreshToken: data.tokens.refreshToken,
            expiresAt: data.tokens.expiresAt,
            mmUserId: data.mmUserId,
            atsUserId: data.user?.id,
        };
        setMattermostSession(session);
        return { user: data.user, session };
    },

    async logout(): Promise<void> {
        const session = getMattermostSession();
        try {
            if (session?.accessToken) {
                await fetch(authUrl('/logout'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accessToken: session.accessToken }),
                });
            }
        } catch {
            /* ignore */
        } finally {
            clearMattermostSession();
        }
    },
};

export const mattermostChatApi = {
    isConfigured(): boolean {
        return Boolean(getMattermostSession()?.accessToken);
    },

    async getDms(): Promise<MattermostDmsPayload> {
        const res = await chatFetch('/dms');
        if (!res.ok) throw new Error(await parseError(res));
        return res.json();
    },

    async send(partnerId: string, text: string): Promise<UserMessage> {
        const res = await chatFetch('/posts', {
            method: 'POST',
            body: JSON.stringify({ partnerId, text }),
        });
        if (!res.ok) throw new Error(await parseError(res));
        return res.json();
    },

    async markRead(partnerId: string): Promise<void> {
        const res = await chatFetch('/read', {
            method: 'POST',
            body: JSON.stringify({ partnerId }),
        });
        if (!res.ok) throw new Error(await parseError(res));
    },
};
