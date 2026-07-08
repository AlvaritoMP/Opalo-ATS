import type { Process, Section, User, UserRole } from '../types';
import { isProcessActive } from './processStatus';

const DEFAULT_SECTIONS: Record<UserRole, Section[]> = {
    admin: [
        'dashboard', 'processes', 'archived', 'candidates', 'forms', 'letters',
        'calendar', 'reports', 'compare', 'bulk-processes', 'opsflow-handoffs', 'users', 'settings',
    ],
    recruiter: [
        'dashboard', 'processes', 'archived', 'candidates', 'forms', 'letters',
        'calendar', 'reports', 'compare', 'bulk-processes', 'opsflow-handoffs',
    ],
    client: ['dashboard', 'processes', 'candidates', 'calendar', 'reports', 'compare'],
    viewer: ['dashboard', 'processes', 'candidates', 'calendar', 'reports'],
};

export function getVisibleSectionsForUser(user: User | null): Section[] {
    if (!user) return [];
    if (user.visibleSections && user.visibleSections.length > 0) {
        return user.visibleSections;
    }
    return DEFAULT_SECTIONS[user.role] || [];
}

/** Procesos activos que el usuario puede ver según clientes y secciones del menú. */
export function getProcessesVisibleToUser(user: User, processes: Process[]): Process[] {
    const sections = new Set(getVisibleSectionsForUser(user));
    let filtered = processes.filter(p => isProcessActive(p.status));

    if (user.allowedClientIds && user.allowedClientIds.length > 0) {
        const allowed = new Set(user.allowedClientIds);
        filtered = filtered.filter(p => p.clientId && allowed.has(p.clientId));
    }

    return filtered.filter(p => {
        if (p.isBulkProcess) return sections.has('bulk-processes');
        return sections.has('processes');
    });
}
