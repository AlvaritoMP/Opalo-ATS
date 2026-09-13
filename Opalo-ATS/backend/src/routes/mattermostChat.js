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
    linkMattermostUser,
    listAtsUsers,
    resolveMattermostId,
    toPublicUser,
} from '../lib/atsUsers.js';

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

async function loadDirectory(token, appName) {
    const cfg = getMattermostConfig();
    const atsUsers = await listAtsUsers(appName);
    const byMmId = new Map();
    const byEmail = new Map();
    const byId = new Map();

    for (const row of atsUsers) {
        byId.set(row.id, row);
        byEmail.set(String(row.email || '').toLowerCase(), row);
        if (row.mattermost_user_id) byMmId.set(row.mattermost_user_id, row);
    }

    const missing = atsUsers.filter((u) => !u.mattermost_user_id);
    await Promise.all(
        missing.map(async (user) => {
            try {
                const mmId = await resolveMattermostId({
                    userToken: token,
                    botToken: cfg.botToken,
                    atsUser: user,
                    appName,
                });
                if (mmId) byMmId.set(mmId, user);
            } catch (err) {
                if (err.status !== 403 && err.status !== 404) {
                    console.warn(`Lookup Mattermost ${user.email}:`, err.message);
                }
            }
        }),
    );

    return { atsUsers, byMmId, byEmail, byId };
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
        const me = await mmFetch(token, '/api/v4/users/me');
        const { atsUsers, byMmId } = await loadDirectory(token, appNameFromReq(req));
        const meAts = byMmId.get(me.id) || atsUsers.find((u) => u.email?.toLowerCase() === me.email?.toLowerCase());
        res.json({
            me: meAts ? toPublicUser(meAts) : null,
            peers: atsUsers
                .filter((u) => u.id !== meAts?.id && u.mattermost_user_id)
                .map((u) => toPublicUser(u)),
        });
    } catch (error) {
        console.error('Error listando peers Mattermost:', error);
        res.status(error.status || 500).json({ error: error.message || 'No se pudo listar usuarios' });
    }
});

router.get('/dms', async (req, res) => {
    const token = requireToken(req, res);
    if (!token) return;
    try {
        const appName = appNameFromReq(req);
        const me = await mmFetch(token, '/api/v4/users/me');
        const { atsUsers, byMmId } = await loadDirectory(token, appName);
        let meAts = byMmId.get(me.id);
        if (!meAts) {
            meAts = atsUsers.find((u) => u.email?.toLowerCase() === String(me.email || '').toLowerCase());
            if (meAts) {
                await linkMattermostUser(meAts.id, me, appName);
                byMmId.set(me.id, meAts);
            }
        }
        if (!meAts) {
            return res.status(403).json({ error: 'Tu cuenta de Mattermost no está vinculada a un usuario del ATS.' });
        }

        const dms = await listDirectChannels(token, me.id);

        const channelInfos = [];
        for (const channel of dms) {
            const otherMmId = otherUserIdFromDirectChannel(channel, me.id);
            if (!otherMmId) continue;
            const partner = byMmId.get(otherMmId);
            if (!partner) continue;
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

        res.json({
            me: toPublicUser(meAts),
            threads: details.map(({ messages, ...thread }) => thread),
            messages: details.flatMap((d) => d.messages),
            peers: atsUsers
                .filter((u) => u.id !== meAts.id && u.mattermost_user_id)
                .map((u) => toPublicUser(u)),
        });
    } catch (error) {
        console.error('Error cargando DMs Mattermost:', error);
        res.status(error.status || 500).json({ error: error.message || 'No se pudieron cargar los mensajes' });
    }
});

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
    const { byId } = await loadDirectory(token, appName);
    const partner = byId.get(partnerId);
    if (!partner) {
        const err = new Error('Usuario del ATS no encontrado');
        err.status = 404;
        throw err;
    }
    const cfg = getMattermostConfig();
    const otherMmId = await resolveMattermostId({
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
    const channel = await mmFetch(token, '/api/v4/channels/direct', {
        method: 'POST',
        body: JSON.stringify([me.id, otherMmId]),
    });
    return { me, channel, partner };
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
        res.status(error.status || 500).json({ error: error.message || 'No se pudo abrir la conversación' });
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
        const appName = appNameFromReq(req);
        const { me, channel, partner } = await openDirectChannel(req);
        const { byMmId, atsUsers } = await loadDirectory(token, appName);
        const meAts =
            byMmId.get(me.id) ||
            atsUsers.find((u) => u.email?.toLowerCase() === String(me.email || '').toLowerCase());
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
        res.status(error.status || 500).json({ error: error.message || 'No se pudo enviar el mensaje' });
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
        res.status(error.status || 500).json({ error: error.message || 'No se pudo marcar como leído' });
    }
});

export default router;
