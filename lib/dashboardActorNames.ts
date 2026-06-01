import type { User } from '../types';
import type { ContactAttempt } from './contactTracking';

export type DashboardActorUser = Pick<User, 'id' | 'name' | 'email' | 'role'>;

/** Roles que pueden aparecer en rankings del panel (consultores + administrador). */
export function isDashboardStaffRole(role?: User['role']): boolean {
    return role === 'admin' || role === 'recruiter';
}

/** Asegura que el usuario en sesión (p. ej. admin) esté en el lookup aunque falte en la lista cargada. */
export function buildUserLookupForStats(
    users: DashboardActorUser[],
    currentUser?: DashboardActorUser | null
): DashboardActorUser[] {
    if (!currentUser?.id) return users;
    if (users.some(u => u.id === currentUser.id)) return users;
    return [...users, currentUser];
}

export function resolveActorDisplayName(
    actor: { userId?: string; userName?: string },
    users: DashboardActorUser[]
): string {
    const trimmed = actor.userName?.trim();
    if (trimmed && trimmed !== 'Usuario') return trimmed;

    if (actor.userId) {
        const byId = users.find(u => u.id === actor.userId);
        if (byId?.name?.trim()) return byId.name.trim();
        if (byId?.email?.trim()) {
            const local = byId.email.trim().split('@')[0];
            if (local) return local;
        }
    }

    return trimmed || 'Sin consultor';
}

export function enrichContactAttemptsForStats(
    attempts: ContactAttempt[],
    users: DashboardActorUser[]
): ContactAttempt[] {
    return attempts.map(a => ({
        ...a,
        userName: resolveActorDisplayName({ userId: a.userId, userName: a.userName }, users),
    }));
}
