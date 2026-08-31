export const USER_ACTIVITY_CATEGORIES = [
    'session',
    'navigation',
    'candidates',
    'contact',
    'bulk',
    'processes',
    'calendar',
    'comments',
    'messaging',
    'documents',
    'settings',
    'users',
] as const;

export type UserActivityCategory = (typeof USER_ACTIVITY_CATEGORIES)[number];

export const USER_ACTIVITY_CATEGORY_LABELS: Record<UserActivityCategory, string> = {
    session: 'Sesión',
    navigation: 'Navegación',
    candidates: 'Candidatos',
    contact: 'Contacto',
    bulk: 'Procesos masivos',
    processes: 'Procesos',
    calendar: 'Calendario',
    comments: 'Notas y comentarios',
    messaging: 'Mensajería',
    documents: 'Documentos y OpsFlow',
    settings: 'Configuración',
    users: 'Usuarios',
};

export const USER_ACTIVITY_CATEGORY_STYLES: Record<UserActivityCategory, string> = {
    session: 'bg-emerald-100 text-emerald-800',
    navigation: 'bg-slate-100 text-slate-700',
    candidates: 'bg-blue-100 text-blue-800',
    contact: 'bg-amber-100 text-amber-800',
    bulk: 'bg-violet-100 text-violet-800',
    processes: 'bg-indigo-100 text-indigo-800',
    calendar: 'bg-sky-100 text-sky-800',
    comments: 'bg-orange-100 text-orange-800',
    messaging: 'bg-pink-100 text-pink-800',
    documents: 'bg-teal-100 text-teal-800',
    settings: 'bg-gray-100 text-gray-700',
    users: 'bg-red-100 text-red-800',
};

const VIEW_NAVIGATION: Record<string, { action: string; summary: string }> = {
    dashboard: { action: 'view_dashboard', summary: 'Abrió el panel' },
    intelligence: { action: 'view_intelligence', summary: 'Abrió Inteligencia' },
    processes: { action: 'view_processes', summary: 'Abrió procesos' },
    'process-view': { action: 'view_process', summary: 'Abrió un proceso' },
    archived: { action: 'view_archived', summary: 'Abrió archivados' },
    candidates: { action: 'view_candidates', summary: 'Abrió candidatos' },
    forms: { action: 'view_forms', summary: 'Abrió formularios' },
    letters: { action: 'view_letters', summary: 'Abrió cartas' },
    calendar: { action: 'view_calendar', summary: 'Abrió el calendario' },
    reports: { action: 'view_reports', summary: 'Abrió reportes' },
    compare: { action: 'view_compare', summary: 'Abrió el comparador' },
    users: { action: 'view_users', summary: 'Abrió gestión de usuarios' },
    settings: { action: 'view_settings', summary: 'Abrió configuración' },
    'bulk-import': { action: 'view_bulk_import', summary: 'Abrió importación masiva' },
    'bulk-processes': { action: 'view_bulk_processes', summary: 'Abrió procesos masivos' },
    'opsflow-handoffs': { action: 'view_opsflow', summary: 'Abrió envíos OpsFlow' },
    'user-activity': { action: 'view_user_activity', summary: 'Abrió actividad de usuarios' },
};

export function navigationActivityForView(viewType: string): { action: string; summary: string } | null {
    return VIEW_NAVIGATION[viewType] || null;
}

export function isUserActivityCategory(value: string): value is UserActivityCategory {
    return (USER_ACTIVITY_CATEGORIES as readonly string[]).includes(value);
}

type BulkActionType = string;

export function categoryForBulkAction(actionType: BulkActionType): UserActivityCategory {
    switch (actionType) {
        case 'contact_attempt':
        case 'contact_status':
        case 'contact_reset':
            return 'contact';
        case 'stage_change':
        case 'bulk_stage_change':
        case 'bulk_discard':
        case 'bulk_archive':
        case 'bulk_approve':
        case 'candidate_delete':
        case 'candidate_transfer':
        case 'add_row':
            return 'candidates';
        case 'opsflow_send':
            return 'documents';
        case 'config_change':
            return 'processes';
        default:
            return 'bulk';
    }
}

const BULK_ACTION_SUMMARIES: Record<string, string> = {
    cell_edit: 'Editó una celda en proceso masivo',
    stage_change: 'Cambió la etapa de un candidato',
    bulk_stage_change: 'Cambió etapas de forma masiva',
    bulk_discard: 'Descartó candidatos de forma masiva',
    bulk_archive: 'Archivó candidatos de forma masiva',
    bulk_approve: 'Aprobó candidatos de forma masiva',
    candidate_delete: 'Eliminó un candidato',
    import: 'Importó candidatos',
    config_change: 'Cambió la configuración de un proceso masivo',
    cell_meta: 'Actualizó color o comentario de celda',
    paste: 'Pegó datos en la tabla masiva',
    contact_attempt: 'Registró un intento de contacto',
    contact_status: 'Actualizó el estado de contacto',
    contact_reset: 'Reinició el seguimiento de contacto',
    add_row: 'Añadió una fila en proceso masivo',
    opsflow_send: 'Envió candidatos a OpsFlow',
    candidate_transfer: 'Trasladó un candidato entre procesos',
};

export function summaryForBulkAction(actionType: string, candidateName?: string): string {
    const base = BULK_ACTION_SUMMARIES[actionType] || `Acción en proceso masivo: ${actionType}`;
    return candidateName ? `${base}: ${candidateName}` : base;
}

export function formatActivityDateTime(iso: string): string {
    return new Date(iso).toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatActivityTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-PE', {
        timeZone: 'America/Lima',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatActivityRelative(iso: string, now = Date.now()): string {
    const diffMs = now - new Date(iso).getTime();
    if (!Number.isFinite(diffMs) || diffMs < 0) return formatActivityDateTime(iso);
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    return formatActivityDateTime(iso);
}

export const RECENTLY_ACTIVE_MS = 15 * 60 * 1000;
