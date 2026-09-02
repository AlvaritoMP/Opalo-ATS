/** Claves de sesión que no se deben borrar salvo al reescribir el login. */
const SESSION_KEYS = new Set(['ats_pro_user', 'ats_pro_last_activity']);

const DISPOSABLE_EXACT = new Set([
    'bulkProcessesTableTemplates',
    'bulkProcessesCustomColumns',
    'ats_pro_settings',
    'bulkProcessesSelectedId',
]);

const DISPOSABLE_PREFIXES = [
    'bulkColumnValues_',
    'bulkCellMeta_',
    'opalo_bulk_config_snapshot_v1_',
    'opalo_bulk_table_layout_v1_',
    'psycholaboral_inventory_',
];

export function isQuotaExceededError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const e = error as { name?: string; code?: number | string; message?: string };
    const message = String(e.message || '');
    return (
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e.code === 22 ||
        e.code === 1014 ||
        message.includes('QuotaExceeded') ||
        message.includes('exceeded the quota')
    );
}

function listLocalStorageKeys(): string[] {
    const keys: string[] = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) keys.push(key);
        }
    } catch {
        /* ignore */
    }
    return keys;
}

function isDisposableKey(key: string): boolean {
    return DISPOSABLE_EXACT.has(key) || DISPOSABLE_PREFIXES.some(prefix => key.startsWith(prefix));
}

/** Borra cachés locales reconstruibles desde Supabase. Devuelve cuántas claves se eliminaron. */
export function freeLocalStorageQuota(options?: { preserveSession?: boolean }): number {
    const preserveSession = options?.preserveSession !== false;
    let removed = 0;
    try {
        for (const key of listLocalStorageKeys()) {
            if (preserveSession && SESSION_KEYS.has(key)) continue;
            if (!isDisposableKey(key)) continue;
            localStorage.removeItem(key);
            removed++;
        }
    } catch {
        /* ignore */
    }
    return removed;
}

/** Último recurso: quita las claves más grandes (excepto sesión y la que se quiere escribir). */
export function freeLargestLocalStorageKeys(keepKeys: string[] = [], maxKeys = 10): number {
    const keep = new Set([...SESSION_KEYS, ...keepKeys]);
    let removed = 0;
    try {
        const ranked = listLocalStorageKeys()
            .filter(key => !keep.has(key))
            .map(key => ({ key, size: (localStorage.getItem(key) || '').length }))
            .sort((a, b) => b.size - a.size);
        for (const item of ranked.slice(0, maxKeys)) {
            localStorage.removeItem(item.key);
            removed++;
        }
    } catch {
        /* ignore */
    }
    return removed;
}

/**
 * Escribe en localStorage. Si no hay cuota, libera caché y reintenta.
 * En Safari hace falta borrar la clave antes de volver a escribir.
 */
export function trySetLocalStorageItem(key: string, value: string): boolean {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        if (!isQuotaExceededError(error)) return false;
    }

    try {
        localStorage.removeItem(key);
    } catch {
        /* ignore */
    }
    freeLocalStorageQuota({ preserveSession: !SESSION_KEYS.has(key) });

    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        if (!isQuotaExceededError(error)) return false;
    }

    freeLargestLocalStorageKeys([key]);
    try {
        localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}
