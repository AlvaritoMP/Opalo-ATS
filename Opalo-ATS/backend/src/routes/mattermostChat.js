import express from 'express';
import {
    getBearerToken,
    getMattermostConfig,
    isUserPost,
    mmFetch,
    otherUserIdFromDirectChannel,
    postDisplayText,
} from '../lib/mattermost.js';
import {
    findAtsUserByEmail,
    listAtsUsers,
    normalizeEmail,
    resolveMattermostId,
    toPublicUser,
} from '../lib/atsUsers.js';

const DIRECTORY_TTL_MS = 60_000;
const DIRECTORY_FAIL_TTL_MS = 20_000;
const DIRECTORY_STALE_MS = 10 * 60_000;
const ATS_LIST_TIMEOUT_MS = 4_000;
const ATS_LOOKUP_TIMEOUT_MS = 2_500;

const directoryCache = new Map();

function isOriginUnavailable(error) {
    const msg = String(error?.message || error || '');
    return (
        msg.includes('<!DOCTYPE') ||
        msg.includes('Error code 522') ||
        msg.includes('Connection timed out') ||
        msg.includes('canceling statement due to statement timeout') ||
        error?.code === '57014' ||
        error?.code === 'TIMEOUT'
    );
}

function publicRouteError(error, fallback) {
    if (isOriginUnavailable(error)) {
        return {
            status: 503,
            message: 'Supabase no respondió a tiempo. Intenta de nuevo en unos minutos.',
        };
    }
    const msg = String(error?.message || fallback);
    if (msg.includes('<') || msg.length > 280) {
        return { status: error?.status || 500, message: fallback };
    }
    return { status: error?.status || 500, message: msg || fallback };
}

async function withTimeout(promise, ms, label) {
    let timer;
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = setTimeout(() => {
                    const err = new Error(`${label || 'Operación'} tardó demasiado`);
                    err.status = 503;
                    err.code = 'TIMEOUT';
                    reject(err);
                }, ms);
            }),
        ]);
    } finally {
        clearTimeout(timer);
    }
}

function mapsFromUsers(atsUsers) {
    const byMmId = new Map();
    const byEmail = new Map();
    const byId = new Map();
    for (const row of atsUsers || []) {
        byId.set(row.id, row);
        if (row.email) byEmail.set(normalizeEmail(row.email), row);
        if (row.mattermost_user_id) byMmId.set(row.mattermost_user_id, row);
    }
    return { atsUsers: atsUsers || [], byMmId, byEmail, byId };
}

function displayNameFromMm(mmUser) {
    const full = [mmUser?.first_name, mmUser?.last_name].filter(Boolean).join(' ').trim();
    return mmUser?.nickname || full || mmUser?.username || 'Usuario';
}

function syntheticUserFromMm(mmUser, fallbackId) {
    return {
        id: fallbackId || `mm:${mmUser.id}`,
        name: displayNameFromMm(mmUser),
        email: mmUser?.email || '',
        role: 'recruiter',
        mattermost_user_id: mmUser.id,
        mattermost_username: mmUser.username,
    };
}

function parseSyntheticMmId(partnerId) {
    const s = String(partnerId || '');
    return s.startsWith('mm:') ? s.slice(3) : null;
}

function atsUserIdFromReq(req) {
    return String(req.headers['x-ats-user-id'] || '').trim();
}

function rememberDirectoryUsers(appName, extraUsers) {
    if (!extraUsers?.length) return;
    const cached = directoryCache.get(appName);
    const users = [...(cached?.users || [])];
    const byId = new Set(users.map((u) => u.id));
    for (const row of extraUsers) {
        if (!row?.id || byId.has(row.id)) continue;
        users.push(row);
        byId.add(row.id);
    }
    directoryCache.set(appName, { at: cached?.at || 0, users });
}

async function loadDirectory(appName) {
    const now = Date.now();
    const cached = directoryCache.get(appName);
    const ttl = cached?.failed ? DIRECTORY_FAIL_TTL_MS : DIRECTORY_TTL_MS;
    if (cached && now - cached.at < ttl) {
        return mapsFromUsers(cached.users);
    }
    try {
        const atsUsers = await withTimeout(listAtsUsers(appName), ATS_LIST_TIMEOUT_MS, 'Directorio ATS');
        directoryCache.set(appName, { at: now, users: atsUsers, failed: false });
        return mapsFromUsers(atsUsers);
    } catch (err) {
        console.warn('Directorio ATS no disponible:', err.message);
        const staleUsers = cached?.users && now - (cached.at || 0) < DIRECTORY_STALE_MS ? cached.users : [];
        directoryCache.set(appName, { at: now, users: staleUsers, failed: true });
        return mapsFromUsers(staleUsers);
    }
}

async function resolveMeAts({ me, directory, headerAtsId, appName }) {
    const { byMmId, byEmail, byId } = directory;
    let meAts = byMmId.get(me.id);
    if (!meAts && me.email) meAts = byEmail.get(normalizeEmail(me.email));
    if (!meAts && headerAtsId) meAts = byId.get(headerAtsId);

    if (!meAts && headerAtsId) {
        return syntheticUserFromMm(me, headerAtsId);
    }

    if (!meAts && me.email) {
        try {
            meAts = await withTimeout(
                findAtsUserByEmail(me.email, appName),
                ATS_LOOKUP_TIMEOUT_MS,
                'Usuario ATS',
            );
            if (meAts) rememberDirectoryUsers(appName, [meAts]);
        } catch (err) {
            console.warn('Usuario ATS por email no disponible:', err.message);
        }
    }

    if (!meAts) {
        meAts = syntheticUserFromMm(me, headerAtsId || undefined);
    } else if (!meAts.mattermost_user_id) {
        meAts = { ...meAts, mattermost_user_id: me.id, mattermost_username: me.username };
    }
    return meAts;
}

async function getUsersByIds(token, ids) {
    const unique = [...new Set((ids || []).filter(Boolean))];
    if (unique.length === 0) return [];
    try {
        const users = await mmFetch(token, '/api/v4/users/ids', {
            method: 'POST',
            body: JSON.stringify(unique),
        });
        return Array.isArray(users) ? users : [];
    } catch (err) {
        console.warn('POST /users/ids falló, consultando uno a uno:', err.message);
        const rows = await Promise.all(
            unique.map((id) => mmFetch(token, `/api/v4/users/${id}`).catch(() => null)),
        );
        return rows.filter(Boolean);
    }
}

const router = express.Router();

function appNameFromReq(req) {
    return String(req.headers['x-app-name'] || req.query.app_name || process.env.APP_NAME || 'Opalo ATS').trim();
}

function isoFromMillis(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n) || n <= 0) return new Date().toISOString();
    return new Date(n).toISOString();
}

function requireToken(req, res) {
    const token = getBearerToken(req);
    if (!token) {
        res.status(401).json({ error: 'Sesión de Mattermost requerida' });
        return null;
    }
    return token;
}

async function listDirectChannels(token, userId) {
    const asDirect = (channels) =>
        (channels || []).filter((ch) => ch && ch.type === 'D' && !ch.delete_at);

    try {
        return asDirect(await mmFetch(token, `/api/v4/users/${userId}/channels`));
    } catch (err) {
        if (err.status && err.status !== 404 && err.status !== 400 && err.status !== 501) {
            console.warn('GET /users/{id}/channels falló, usando equipos:', err.message);
        }
        const teams = await mmFetch(token, `/api/v4/users/${userId}/teams`);
        const nested = await Promise.all(
            (teams || []).map((team) =>
                mmFetch(token, `/api/v4/users/${userId}/teams/${team.id}/channels`).catch(() => []),
            ),
        );
        const seen = new Set();
        return nested.flat().filter((ch) => {
            if (!ch || ch.type !== 'D' || ch.delete_at || seen.has(ch.id)) return false;
            seen.add(ch.id);
            return true;
        });
    }
}

async function getChannelPosts(token, channelId, perPage = 40) {
    const data = await mmFetch(token, `/api/v4/channels/${channelId}/posts?per_page=${perPage}&page=0`);
    const order = Array.isArray(data?.order) ? data.order : [];
    const posts = data?.posts || {};
    return order
        .map((id) => posts[id])
        .filter(isUserPost)
        .sort((a, b) => a.create_at - b.create_at);
}

router.get('/peers', async (req, res) => {
    const token = requireToken(req, res);
    if (!token) return;
    try {
        const appName = appNameFromReq(req);
        const me = await mmFetch(token, '/api/v4/users/me');
        const directory = await loadDirectory(appName);
        const meAts = await resolveMeAts({
            me,
            directory,
            headerAtsId: atsUserIdFromReq(req),
            appName,
        });
        const { atsUsers } = directory;
        res.json({
            me: toPublicUser(meAts),
            peers: atsUsers
                .filter((u) => u.id !== meAts?.id && u.mattermost_user_id)
                .map((u) => toPublicUser(u)),
        });
    } catch (error) {
        console.error('Error listando peers Mattermost:', error);
        const { status, message } = publicRouteError(error, 'No se pudo listar usuarios');
        res.status(status).json({ error: message });
    }
});

router.get('/dms', async (req, res) => {
    const token = requireToken(req, res);
    if (!token) return;
    try {
        const appName = appNameFromReq(req);
        const me = await mmFetch(token, '/api/v4/users/me');
        const directory = await loadDirectory(appName);
        const { atsUsers, byMmId } = directory;
        const meAts = await resolveMeAts({
            me,
            directory,
            headerAtsId: atsUserIdFromReq(req),
            appName,
        });

        const dms = await listDirectChannels(token, me.id);
        const otherMmIds = dms
            .map((channel) => otherUserIdFromDirectChannel(channel, me.id))
            .filter(Boolean);
        const unknownMmIds = otherMmIds.filter((id) => !byMmId.has(id));
        const mmProfiles = await getUsersByIds(token, unknownMmIds);
        for (const mmUser of mmProfiles) {
            if (!mmUser?.id || byMmId.has(mmUser.id)) continue;
            byMmId.set(mmUser.id, syntheticUserFromMm(mmUser));
        }

        const channelInfos = [];
        for (const channel of dms) {
            const otherMmId = otherUserIdFromDirectChannel(channel, me.id);
            if (!otherMmId) continue;
            const partner = byMmId.get(otherMmId) || syntheticUserFromMm({ id: otherMmId, username: 'Usuario' });
            channelInfos.push({ channel, partner, otherMmId });
        }

        const details = await Promise.all(
            channelInfos.map(async ({ channel, partner }) => {
                const [posts, unread] = await Promise.all([
                    getChannelPosts(token, channel.id, 40),
                    mmFetch(token, `/api/v4/users/${me.id}/channels/${channel.id}/unread`).catch(() => ({
                        msg_count: 0,
                    })),
                ]);
                const unreadCount = Number(unread?.msg_count) || 0;
                const incoming = posts.filter((p) => p.user_id !== me.id);
                const unreadIncomingIds = new Set(incoming.slice(-unreadCount).map((p) => p.id));
                const messages = posts.map((post) => {
                    const mine = post.user_id === me.id;
                    return {
                        id: post.id,
                        senderId: mine ? meAts.id : partner.id,
                        recipientId: mine ? partner.id : meAts.id,
                        text: postDisplayText(post),
                        createdAt: isoFromMillis(post.create_at),
                        readAt: mine || !unreadIncomingIds.has(post.id) ? isoFromMillis(post.create_at) : undefined,
                        channelId: channel.id,
                    };
                });
                const last = messages[messages.length - 1];
                return {
                    partnerId: partner.id,
                    partnerName: partner.name,
                    channelId: channel.id,
                    unread: unreadCount,
                    lastMessage: last || null,
                    messages,
                };
            }),
        );

        details.sort((a, b) => {
            const ta = a.lastMessage ? Date.parse(a.lastMessage.createdAt) : 0;
            const tb = b.lastMessage ? Date.parse(b.lastMessage.createdAt) : 0;
            return tb - ta;
        });

        const peerMap = new Map();
        for (const u of atsUsers) {
            if (u.id !== meAts.id && u.mattermost_user_id) peerMap.set(u.id, toPublicUser(u));
        }
        for (const { partner } of channelInfos) {
            if (partner.id !== meAts.id) peerMap.set(partner.id, toPublicUser(partner));
        }

        res.json({
            me: toPublicUser(meAts),
            threads: details.map(({ messages, ...thread }) => thread),
            messages: details.flatMap((d) => d.messages),
            peers: [...peerMap.values()],
        });
    } catch (error) {
        console.error('Error cargando DMs Mattermost:', error);
        const { status, message } = publicRouteError(error, 'No se pudieron cargar los mensajes');
        res.status(status).json({ error: message });
    }
});

async function resolvePartner(token, appName, partnerId, directory) {
    const { byId, byMmId } = directory;
    const syntheticMm = parseSyntheticMmId(partnerId);
    if (syntheticMm) {
        const existing = byMmId.get(syntheticMm);
        if (existing) return { partner: existing, otherMmId: syntheticMm };
        const mmUser = await mmFetch(token, `/api/v4/users/${syntheticMm}`);
        return { partner: syntheticUserFromMm(mmUser), otherMmId: syntheticMm };
    }

    const partner = byId.get(partnerId);
    if (partner) {
        const cfg = getMattermostConfig();
        const otherMmId = partner.mattermost_user_id
            || await resolveMattermostId({
                userToken: token,
                botToken: cfg.botToken,
                atsUser: partner,
                appName,
            });
        if (!otherMmId) {
            const err = new Error('Este usuario no tiene cuenta en Mattermost');
            err.status = 404;
            throw err;
        }
        return { partner, otherMmId };
    }

    try {
        const mmUser = await mmFetch(token, `/api/v4/users/${partnerId}`);
        if (mmUser?.id) {
            const existing = byMmId.get(mmUser.id);
            return { partner: existing || syntheticUserFromMm(mmUser), otherMmId: mmUser.id };
        }
    } catch {
        /* partnerId is not a Mattermost user id */
    }

    const err = new Error('Usuario del ATS no encontrado');
    err.status = 404;
    throw err;
}

async function openDirectChannel(req) {
    const token = getBearerToken(req);
    const appName = appNameFromReq(req);
    const partnerId = String(req.body?.partnerId || req.body?.recipientId || '');
    if (!partnerId) {
        const err = new Error('partnerId requerido');
        err.status = 400;
        throw err;
    }
    const me = await mmFetch(token, '/api/v4/users/me');
    const directory = await loadDirectory(appName);
    const { partner, otherMmId } = await resolvePartner(token, appName, partnerId, directory);
    const channel = await mmFetch(token, '/api/v4/channels/direct', {
        method: 'POST',
        body: JSON.stringify([me.id, otherMmId]),
    });
    return { me, channel, partner, directory, appName };
}

async function markDirectChannelRead(token, userId, channelId) {
    await mmFetch(token, '/api/v4/channels/members/me/view', {
        method: 'POST',
        body: JSON.stringify({
            channel_id: channelId,
            prev_channel_id: '',
            collapsed_threads_supported: true,
        }),
    });
    const posts = await getChannelPosts(token, channelId, 60);
    const now = Date.now();
    const threadIds = [...new Set(posts.map((post) => post.root_id || post.id).filter(Boolean))];
    await Promise.all(
        threadIds.map((threadId) =>
            mmFetch(token, `/api/v4/users/${userId}/threads/${threadId}/read/${now}`, {
                method: 'PUT',
            }).catch(() => null),
        ),
    );
}

router.post('/dms', async (req, res) => {
    const token = requireToken(req, res);
    if (!token) return;
    try {
        const { channel, partner } = await openDirectChannel(req);
        res.json({ channelId: channel.id, partner: toPublicUser(partner) });
    } catch (error) {
        console.error('Error abriendo DM Mattermost:', error);
        const { status, message } = publicRouteError(error, 'No se pudo abrir la conversación');
        res.status(status).json({ error: message });
    }
});

router.post('/posts', async (req, res) => {
    const token = requireToken(req, res);
    if (!token) return;
    try {
        const text = String(req.body?.text || req.body?.message || '').trim();
        if (!text) {
            return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
        }
        const { me, channel, partner, directory, appName } = await openDirectChannel(req);
        const meAts = await resolveMeAts({
            me,
            directory,
            headerAtsId: atsUserIdFromReq(req),
            appName,
        });
        const post = await mmFetch(token, '/api/v4/posts', {
            method: 'POST',
            body: JSON.stringify({ channel_id: channel.id, message: text }),
        });
        res.json({
            id: post.id,
            senderId: meAts?.id,
            recipientId: partner.id,
            text: postDisplayText(post),
            createdAt: isoFromMillis(post.create_at),
            readAt: isoFromMillis(post.create_at),
            channelId: channel.id,
        });
    } catch (error) {
        console.error('Error enviando post Mattermost:', error);
        const { status, message } = publicRouteError(error, 'No se pudo enviar el mensaje');
        res.status(status).json({ error: message });
    }
});

router.post('/read', async (req, res) => {
    const token = requireToken(req, res);
    if (!token) return;
    try {
        const { me, channel } = await openDirectChannel(req);
        await markDirectChannelRead(token, me.id, channel.id);
        res.json({ ok: true, channelId: channel.id });
    } catch (error) {
        console.error('Error marcando leído Mattermost:', error);
        const { status, message } = publicRouteError(error, 'No se pudo marcar como leído');
        res.status(status).json({ error: message });
    }
});

export default router;
