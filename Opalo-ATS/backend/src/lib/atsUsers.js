import { createClient } from '@supabase/supabase-js';
import { mmFetch } from './mattermost.js';

let supabase;

export function getSupabaseAdmin() {
    if (supabase) return supabase;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
        throw new Error('SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar configurados');
    }
    supabase = createClient(url, key);
    return supabase;
}

export function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

export function toPublicUser(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        avatarUrl: row.avatar_url || undefined,
        permissions: row.permissions || undefined,
        visibleSections: row.visible_sections || undefined,
        allowedClientIds:
            Array.isArray(row.allowed_client_ids) && row.allowed_client_ids.length > 0
                ? row.allowed_client_ids
                : undefined,
        mattermostUserId: row.mattermost_user_id || undefined,
        mattermostUsername: row.mattermost_username || undefined,
    };
}

export async function findAtsUserByEmail(email, appName) {
    const db = getSupabaseAdmin();
    const { data, error } = await db
        .from('users')
        .select('*')
        .eq('email', normalizeEmail(email))
        .eq('app_name', appName)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function listAtsUsers(appName) {
    const db = getSupabaseAdmin();
    const { data, error } = await db
        .from('users')
        .select('id, name, email, role, avatar_url, mattermost_user_id, mattermost_username')
        .eq('app_name', appName)
        .order('name', { ascending: true });
    if (error) {
        if (isMissingMattermostColumn(error)) {
            const fallback = await db
                .from('users')
                .select('id, name, email, role, avatar_url')
                .eq('app_name', appName)
                .order('name', { ascending: true });
            if (fallback.error) throw fallback.error;
            return fallback.data || [];
        }
        throw error;
    }
    return data || [];
}

export async function linkMattermostUser(atsUserId, mmUser, appName) {
    if (!atsUserId || !mmUser?.id) return;
    const db = getSupabaseAdmin();
    const { error } = await db
        .from('users')
        .update({
            mattermost_user_id: mmUser.id,
            mattermost_username: mmUser.username || null,
        })
        .eq('id', atsUserId)
        .eq('app_name', appName);
    if (error && !isMissingMattermostColumn(error)) {
        console.warn('No se pudo guardar mattermost_user_id:', error.message);
    }
}

export function isMissingMattermostColumn(error) {
    const msg = String(error?.message || error?.details || '').toLowerCase();
    return (
        error?.code === '42703' ||
        msg.includes('mattermost_user_id') ||
        msg.includes('mattermost_username')
    );
}

export async function lookupMattermostByEmail(token, email) {
    const encoded = encodeURIComponent(normalizeEmail(email));
    try {
        return await mmFetch(token, `/api/v4/users/email/${encoded}`);
    } catch (err) {
        if (err.status === 404) return null;
        throw err;
    }
}

export async function resolveMattermostId({ userToken, botToken, atsUser, appName }) {
    if (atsUser.mattermost_user_id) return atsUser.mattermost_user_id;
    const token = botToken || userToken;
    const mmUser = await lookupMattermostByEmail(token, atsUser.email);
    if (!mmUser) return null;
    await linkMattermostUser(atsUser.id, mmUser, appName);
    atsUser.mattermost_user_id = mmUser.id;
    atsUser.mattermost_username = mmUser.username;
    return mmUser.id;
}
