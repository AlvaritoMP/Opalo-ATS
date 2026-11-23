const inflight = new Map<string, Promise<unknown>>();
const fresh = new Map<string, { at: number; value: unknown }>();

/** Une llamadas idénticas disparadas a pocos milisegundos (doble montaje o dos efectos). */
export function dedupedRead<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const hit = fresh.get(key);
    if (hit && Date.now() - hit.at < ttlMs) {
        return Promise.resolve(hit.value as T);
    }
    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;

    const promise = fn()
        .then(value => {
            fresh.set(key, { at: Date.now(), value });
            inflight.delete(key);
            return value;
        })
        .catch(error => {
            inflight.delete(key);
            throw error;
        });
    inflight.set(key, promise);
    return promise;
}

export function invalidateDedupedRead(key: string): void {
    fresh.delete(key);
    inflight.delete(key);
}

/** Tope por petición PostgREST. Las lecturas largas se parten en páginas de este tamaño. */
export const REST_PAGE_SIZE = 50;
