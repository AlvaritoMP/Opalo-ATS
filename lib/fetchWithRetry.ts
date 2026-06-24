const TRANSIENT_PATTERNS = [
    'err_quic',
    'quic_protocol',
    'failed to fetch',
    'network',
    'load failed',
    'connection reset',
    'econnreset',
    'timeout',
    '522',
    '503',
    '502',
    '504',
];

export function isTransientFetchError(error: unknown): boolean {
    const msg = `${error instanceof Error ? error.message : String(error)}`.toLowerCase();
    const code = (error as { code?: string; status?: number })?.code?.toLowerCase() ?? '';
    const status = (error as { status?: number })?.status;
    if (status && status >= 502 && status <= 504) return true;
    return TRANSIENT_PATTERNS.some(p => msg.includes(p) || code.includes(p));
}

/** Reintenta errores de red transitorios (p. ej. ERR_QUIC_PROTOCOL_ERROR en Supabase). */
export async function fetchWithRetry<T>(
    fn: () => Promise<T>,
    options: { attempts?: number; delayMs?: number } = {},
): Promise<T> {
    const attempts = options.attempts ?? 3;
    const delayMs = options.delayMs ?? 800;
    let lastError: unknown;

    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (!isTransientFetchError(error) || i === attempts - 1) throw error;
            await new Promise(r => setTimeout(r, delayMs * (i + 1)));
        }
    }

    throw lastError;
}
