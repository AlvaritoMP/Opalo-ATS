import express from 'express';
import {
    consumeOAuthState,
    consumeOAuthTicket,
    createOAuthState,
    createOAuthTicket,
    exchangeOAuthCode,
    getMattermostConfig,
    mmFetch,
    refreshOAuthToken,
    tokenPayloadFromOAuth,
} from '../lib/mattermost.js';
import { findAtsUserByEmail, linkMattermostUser, toPublicUser } from '../lib/atsUsers.js';

const router = express.Router();

function safeFrontendUrl(candidate, fallback) {
    const fallbackOrigin = (fallback || process.env.FRONTEND_URL || 'http://localhost:3001').replace(/\/$/, '');
    try {
        const parsed = new URL(String(candidate || fallbackOrigin));
        const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
        if ((parsed.protocol === 'https:' || (parsed.protocol === 'http:' && isLocal)) && !parsed.username && !parsed.password) {
            return parsed.origin;
        }
    } catch {
        /* use fallback */
    }
    return fallbackOrigin;
}

function redirectWithError(res, frontendUrl, code) {
    const url = new URL(frontendUrl);
    url.searchParams.set('mm_error', code);
    return res.redirect(url.toString());
}

router.get('/status', (_req, res) => {
    const cfg = getMattermostConfig();
    res.json({
        enabled: cfg.enabled,
        passwordResetUrl: cfg.passwordResetUrl,
    });
});

function startOAuth(req, res) {
    const cfg = getMattermostConfig();
    const frontendUrl = safeFrontendUrl(
        req.query.frontend_url,
        process.env.FRONTEND_URL || 'http://localhost:3001',
    );
    if (!cfg.enabled) {
        return redirectWithError(res, frontendUrl, 'not_configured');
    }
    const appName = String(req.query.app_name || process.env.APP_NAME || 'Opalo ATS').trim();
    const state = createOAuthState({ frontendUrl, appName });
    const authorize = new URL(`${cfg.baseUrl}/oauth/authorize`);
    authorize.searchParams.set('response_type', 'code');
    authorize.searchParams.set('client_id', cfg.clientId);
    authorize.searchParams.set('redirect_uri', cfg.redirectUri);
    authorize.searchParams.set('state', state);
    res.redirect(authorize.toString());
}

router.get('/', startOAuth);
router.get('/start', startOAuth);

router.get('/callback', async (req, res) => {
    const cfg = getMattermostConfig();
    const stateEntry = consumeOAuthState(String(req.query.state || ''));
    const frontendUrl = safeFrontendUrl(
        stateEntry?.frontendUrl,
        process.env.FRONTEND_URL || 'http://localhost:3001',
    );
    const appName = stateEntry?.appName || process.env.APP_NAME || 'Opalo ATS';

    if (!cfg.enabled) {
        return redirectWithError(res, frontendUrl, 'not_configured');
    }
    if (!stateEntry) {
        return redirectWithError(res, frontendUrl, 'oauth_failed');
    }
    if (req.query.error) {
        return redirectWithError(res, frontendUrl, 'denied');
    }
    const code = String(req.query.code || '');
    if (!code) {
        return redirectWithError(res, frontendUrl, 'oauth_failed');
    }

    try {
        const oauth = await exchangeOAuthCode(code);
        const tokens = tokenPayloadFromOAuth(oauth);
        const mmUser = await mmFetch(tokens.accessToken, '/api/v4/users/me');
        if (!mmUser?.email) {
            return redirectWithError(res, frontendUrl, 'no_email');
        }
        if (mmUser.delete_at) {
            return redirectWithError(res, frontendUrl, 'mm_inactive');
        }

        const atsRow = await findAtsUserByEmail(mmUser.email, appName);
        if (!atsRow) {
            return redirectWithError(res, frontendUrl, 'no_user');
        }

        await linkMattermostUser(atsRow.id, mmUser, appName);
        const ticket = createOAuthTicket({
            user: toPublicUser({
                ...atsRow,
                mattermost_user_id: mmUser.id,
                mattermost_username: mmUser.username,
            }),
            tokens,
            mmUserId: mmUser.id,
            appName,
        });

        const url = new URL(frontendUrl);
        url.searchParams.set('mm_ticket', ticket);
        console.log(`✅ Mattermost OAuth: ${mmUser.email} → ATS ${atsRow.id}`);
        return res.redirect(url.toString());
    } catch (error) {
        console.error('Error en Mattermost OAuth callback:', error);
        return redirectWithError(res, frontendUrl, 'oauth_failed');
    }
});

router.get('/complete', (req, res) => {
    const ticket = consumeOAuthTicket(String(req.query.ticket || ''));
    if (!ticket) {
        return res.status(400).json({ error: 'El inicio de sesión expiró. Intenta de nuevo.' });
    }
    res.json({
        user: ticket.user,
        tokens: ticket.tokens,
        mmUserId: ticket.mmUserId,
    });
});

router.post('/refresh', async (req, res) => {
    const refreshToken = String(req.body?.refreshToken || req.body?.refresh_token || '');
    if (!refreshToken) {
        return res.status(400).json({ error: 'refreshToken requerido' });
    }
    try {
        const oauth = await refreshOAuthToken(refreshToken);
        res.json(tokenPayloadFromOAuth(oauth));
    } catch (error) {
        console.error('Error refrescando token Mattermost:', error);
        res.status(error.status || 401).json({ error: error.message || 'No se pudo renovar la sesión' });
    }
});

router.post('/logout', async (req, res) => {
    const token = String(req.body?.accessToken || '').trim();
    if (token) {
        try {
            await mmFetch(token, '/api/v4/users/logout', { method: 'POST' });
        } catch (error) {
            console.warn('No se pudo cerrar sesión en Mattermost:', error.message);
        }
    }
    res.json({ ok: true });
});

export default router;
