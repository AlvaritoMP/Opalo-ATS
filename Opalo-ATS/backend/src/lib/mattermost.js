import crypto from 'crypto';

const TICKET_TTL_MS = 5 * 60 * 1000;
const STATE_TTL_MS = 10 * 60 * 1000;

const oauthTickets = new Map();
const oauthStates = new Map();

function pruneMap(map, now = Date.now()) {
    for (const [key, value] of map) {
        if (!value?.expiresAt || value.expiresAt < now) map.delete(key);
    }
}

export function getMattermostConfig() {
    const baseUrl = String(process.env.MATTERMOST_URL || '').trim().replace(/\/$/, '');
    const clientId = String(process.env.MATTERMOST_OAUTH_CLIENT_ID || '').trim();
    const clientSecret = String(process.env.MATTERMOST_OAUTH_CLIENT_SECRET || '').trim();
    const redirectUri = String(process.env.MATTERMOST_OAUTH_REDIRECT_URI || '').trim();
    const botToken = String(process.env.MATTERMOST_BOT_TOKEN || '').trim();
    return {
        baseUrl,
        clientId,
        clientSecret,
        redirectUri,
        botToken,
        enabled: Boolean(baseUrl && clientId && clientSecret && redirectUri),
        passwordResetUrl: baseUrl ? `${baseUrl}/reset_password` : '',
    };
}

export async function mmFetch(token, path, options = {}) {
    const { baseUrl } = getMattermostConfig();
    if (!baseUrl) {
        const err = new Error('Mattermost no está configurado');
        err.status = 503;
        throw err;
    }
    const headers = {
        Authorization: `Bearer ${token}`,
        ...(options.body && !(options.body instanceof URLSearchParams)
            ? { 'Content-Type': 'application/json' }
            : {}),
        ...(options.headers || {}),
    };
    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        let message = text || res.statusText;
        try {
            const parsed = JSON.parse(text);
            message = parsed.message || parsed.error || message;
        } catch {
            /* keep text */
        }
        const err = new Error(message);
        err.status = res.status;
        err.body = text;
        throw err;
    }
    if (res.status === 204) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    return res.json();
}

export async function exchangeOAuthCode(code) {
    const { baseUrl, clientId, clientSecret, redirectUri } = getMattermostConfig();
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
    });
    const res = await fetch(`${baseUrl}/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
        const err = new Error(data.error_description || data.error || 'No se pudo obtener el token de Mattermost');
        err.status = res.status || 400;
        throw err;
    }
    return data;
}

export async function refreshOAuthToken(refreshToken) {
    const { baseUrl, clientId, clientSecret } = getMattermostConfig();
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
    });
    const res = await fetch(`${baseUrl}/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
        const err = new Error(data.error_description || data.error || 'No se pudo renovar la sesión de Mattermost');
        err.status = res.status || 401;
        throw err;
    }
    return data;
}

export function createOAuthState({ frontendUrl, appName }) {
    pruneMap(oauthStates);
    const state = crypto.randomBytes(24).toString('hex');
    oauthStates.set(state, {
        frontendUrl,
        appName,
        expiresAt: Date.now() + STATE_TTL_MS,
    });
    return state;
}

export function consumeOAuthState(state) {
    pruneMap(oauthStates);
    const entry = oauthStates.get(state);
    if (!entry) return null;
    oauthStates.delete(state);
    return entry;
}

export function createOAuthTicket(payload) {
    pruneMap(oauthTickets);
    const id = crypto.randomUUID();
    oauthTickets.set(id, {
        ...payload,
        expiresAt: Date.now() + TICKET_TTL_MS,
    });
    return id;
}

export function consumeOAuthTicket(ticketId) {
    pruneMap(oauthTickets);
    const entry = oauthTickets.get(ticketId);
    if (!entry) return null;
    oauthTickets.delete(ticketId);
    return entry;
}

export function getBearerToken(req) {
    const header = String(req.headers.authorization || '');
    if (!header.toLowerCase().startsWith('bearer ')) return '';
    return header.slice(7).trim();
}

export function postDisplayText(post) {
    const msg = String(post?.message || '').trim();
    if (msg) return msg;
    if (Array.isArray(post?.file_ids) && post.file_ids.length > 0) return '📎 Archivo';
    return '';
}

export function isUserPost(post) {
    if (!post || post.delete_at) return false;
    const type = String(post.type || '');
    if (type && type.startsWith('system_')) return false;
    return Boolean(postDisplayText(post));
}

export function otherUserIdFromDirectChannel(channel, myUserId) {
    const name = String(channel?.name || '');
    const parts = name.split('__');
    if (parts.length !== 2) return null;
    return parts[0] === myUserId ? parts[1] : parts[0];
}

export function tokenPayloadFromOAuth(data) {
    const expiresIn = Number(data.expires_in);
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || '',
        expiresAt: Number.isFinite(expiresIn) && expiresIn > 0
            ? Date.now() + expiresIn * 1000
            : Date.now() + 24 * 60 * 60 * 1000,
        tokenType: data.token_type || 'bearer',
    };
}
