const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `moved_by` / FKs UUID: nombres como "Diana Mañuico" o "System" no son válidos. */
export function toUuidOrNull(value: string | null | undefined): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return UUID_RE.test(trimmed) ? trimmed : null;
}
