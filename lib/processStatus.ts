import type { ProcessStatus } from '../types';

export const PROCESS_STATUS_LABELS: Record<ProcessStatus, string> = {
    en_proceso: 'En Proceso',
    standby: 'Stand By',
    terminado: 'Terminado',
    cancelado: 'Cancelado',
    trunco: 'Trunco',
};

export const PROCESS_STATUS_COLORS: Record<ProcessStatus, string> = {
    en_proceso: 'bg-green-100 text-green-800',
    standby: 'bg-yellow-100 text-yellow-800',
    terminado: 'bg-gray-200 text-gray-700',
    cancelado: 'bg-red-100 text-red-800',
    trunco: 'bg-orange-100 text-orange-800',
};

/** Solo los procesos en este estado generan alertas y acciones pendientes. */
export function isProcessActive(status: ProcessStatus | undefined): boolean {
    return (status || 'en_proceso') === 'en_proceso';
}

/** Proceso cerrado sin continuidad operativa (hasta volver a En Proceso). */
export function isProcessEnded(status: ProcessStatus | undefined): boolean {
    return status === 'terminado' || status === 'cancelado' || status === 'trunco';
}

/** Permite mover candidatos y otras acciones de gestión (standby sigue operativo). */
export function isProcessOperational(status: ProcessStatus | undefined): boolean {
    const s = status || 'en_proceso';
    return s === 'en_proceso' || s === 'standby';
}
