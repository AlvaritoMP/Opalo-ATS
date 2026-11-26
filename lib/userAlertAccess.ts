import type { Process, Section, User, UserRole } from '../types';
import { filterProcessesForUser } from './demoProcessAccess';
import { isProcessActive } from './processStatus';

const DEFAULT_SECTIONS: Record<UserRole, Section[]> = {
    admin: [
        'dashboard', 'intelligence', 'processes', 'archived', 'candidates', 'forms', 'letters',
        'calendar', 'planning', 'reports', 'compare', 'bulk-processes', 'opsflow-handoffs', 'shortlists', 'user-activity', 'users', 'settings',
    ],
    recruiter: [
        'dashboard', 'processes', 'shortlists', 'archived', 'candidates', 'forms', 'letters',
        'calendar', 'planning', 'reports', 'compare', 'bulk-processes', 'opsflow-handoffs',
    ],
    client: ['dashboard', 'processes', 'candidates', 'calendar', 'reports', 'compare'],
    viewer: ['dashboard', 'processes', 'candidates', 'calendar', 'planning', 'reports'],
};

export function getVisibleSectionsForUser(user: User | null): Section[] {
    if (!user) return [];
    let sections: Section[];
    if (user.visibleSections && user.visibleSections.length > 0) {
        sections = [...user.visibleSections];
    } else {
        sections = DEFAULT_SECTIONS[user.role] || [];
    }
    if (user.role === 'admin' && !sections.includes('intelligence')) {
        sections = [...sections, 'intelligence'];
    }
    if (user.role === 'admin' && !sections.includes('user-activity')) {
        sections = [...sections, 'user-activity'];
    }
    if (user.role !== 'admin') {
        sections = sections.filter(s => s !== 'user-activity');
    }
    if ((user.role === 'admin' || user.role === 'recruiter') && !sections.includes('planning')) {
        sections = [...sections, 'planning'];
    }
    if ((user.role === 'admin' || user.role === 'recruiter') && !sections.includes('shortlists')) {
        sections = [...sections, 'shortlists'];
    }
    return sections;
}

/** Procesos activos que el usuario puede ver según clientes, procesos DEMO y secciones del menú. */
export function getProcessesVisibleToUser(user: User, processes: Process[]): Process[] {
    const sections = new Set(getVisibleSectionsForUser(user));
    return filterProcessesForUser(user, processes)
        .filter(p => isProcessActive(p.status))
        .filter(p => {
            if (p.isBulkProcess) return sections.has('bulk-processes');
            return sections.has('processes');
        });
}
