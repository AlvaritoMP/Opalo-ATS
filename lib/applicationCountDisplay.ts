/** Etiqueta visible para el número de postulación vía formulario */
export function getApplicationCountLabel(count?: number | null): string | null {
    const n = Number(count);
    if (!n || n <= 1) return null;
    return `${n}ª postulación`;
}

export function getApplicationCountPriorityClass(count?: number | null): string {
    const n = Number(count);
    if (n >= 4) return 'bg-red-100 text-red-800 border-red-200';
    if (n >= 3) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (n >= 2) return 'bg-amber-100 text-amber-800 border-amber-200';
    return '';
}
