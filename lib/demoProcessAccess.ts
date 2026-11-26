import type { Candidate, InterviewEvent, Shortlist, User } from '../types';
import { supabase } from './supabase';

/** Cliente ficticio de la revisión. Sus procesos no se muestran al equipo real. */
export const DEMO_ONLY_CLIENT_ID = 'a1000001-0000-4000-8000-000000000001';

/** Perfil de reclutador creado para la demostración (puede cambiar de nombre o correo). */
export const DEMO_RECRUITER_USER_ID = 'a1000001-0000-4000-8000-000000000002';

const SEEDED_DEMO_PROCESS_IDS = [
    'a1000001-0000-4000-8000-000000000010',
    'a1000001-0000-4000-8000-000000000020',
];

const hiddenDemoProcessIds = new Set<string>(SEEDED_DEMO_PROCESS_IDS);

type ProcessMark = {
    id?: string;
    clientId?: string | null;
    serviceOrderCode?: string | null;
    title?: string | null;
};

export function canViewDemoOnlyContent(user: Pick<User, 'id' | 'role'> | null | undefined): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.id === DEMO_RECRUITER_USER_ID;
}

export function isDemoOnlyProcess(process: ProcessMark): boolean {
    if (process.id && hiddenDemoProcessIds.has(process.id) && process.clientId === undefined && !process.title && !process.serviceOrderCode) {
        return true;
    }
    if (process.clientId === DEMO_ONLY_CLIENT_ID) return true;
    const code = (process.serviceOrderCode || '').trim().toUpperCase();
    if (code.startsWith('DEMO')) return true;
    const title = (process.title || '').trim().toUpperCase();
    return title.startsWith('DEMO -') || title.startsWith('DEMO-');
}

function rememberDemoProcess(process: ProcessMark) {
    if (process.id && isDemoOnlyProcess({ ...process, id: undefined })) {
        hiddenDemoProcessIds.add(process.id);
    }
}

export function isDemoProcessId(processId?: string | null): boolean {
    return Boolean(processId && hiddenDemoProcessIds.has(processId));
}

export function isDemoOnlyShortlist(shortlist: Pick<Shortlist, 'clientId' | 'title' | 'clientLabel'>): boolean {
    if (shortlist.clientId === DEMO_ONLY_CLIENT_ID) return true;
    const title = (shortlist.title || '').trim().toUpperCase();
    if (title.startsWith('DEMO -') || title.startsWith('DEMO-')) return true;
    const label = (shortlist.clientLabel || '').trim().toUpperCase();
    return label.startsWith('DEMO ');
}

/** Aplica la restricción de clientes del usuario y oculta los procesos DEMO al resto del equipo. */
export function filterProcessesForUser<T extends ProcessMark>(user: User | null | undefined, processes: T[]): T[] {
    for (const process of processes) rememberDemoProcess(process);
    const seeDemo = canViewDemoOnlyContent(user);
    const restrictClients = user?.allowedClientIds != null;
    const allowed = restrictClients ? new Set(user.allowedClientIds) : null;
    return processes.filter(process => {
        if (!seeDemo && isDemoOnlyProcess(process)) return false;
        if (allowed && (!process.clientId || !allowed.has(process.clientId))) return false;
        return true;
    });
}

export function isCandidateHiddenAsDemo(
    user: User | null | undefined,
    candidate: Pick<Candidate, 'processId'>,
    processes: Process[] = []
): boolean {
    if (canViewDemoOnlyContent(user)) return false;
    if (hiddenDemoProcessIds.has(candidate.processId)) return true;
    const process = processes.find(item => item.id === candidate.processId);
    return Boolean(process && isDemoOnlyProcess(process));
}

export async function excludeDemoInterviewEvents(
    user: User | null | undefined,
    events: InterviewEvent[]
): Promise<InterviewEvent[]> {
    if (canViewDemoOnlyContent(user) || events.length === 0) return events;
    const candidateIds = [...new Set(events.map(event => event.candidateId).filter(Boolean))];
    if (candidateIds.length === 0) return events;

    const { data: candidates, error } = await supabase
        .from('candidates')
        .select('id, process_id')
        .in('id', candidateIds);
    if (error || !candidates) return events;

    const processIds = [...new Set(candidates.map(row => row.process_id).filter(Boolean))];
    if (processIds.length === 0) return events;

    const { data: processes, error: processError } = await supabase
        .from('processes')
        .select('id, title, client_id, service_order_code')
        .in('id', processIds);
    if (processError || !processes) return events;

    const hiddenProcessIds = new Set<string>();
    for (const process of processes) {
        const mark = {
            id: process.id as string,
            clientId: process.client_id as string | null,
            title: process.title as string | null,
            serviceOrderCode: process.service_order_code as string | null,
        };
        rememberDemoProcess(mark);
        if (isDemoOnlyProcess(mark)) hiddenProcessIds.add(mark.id!);
    }

    const hiddenCandidateIds = new Set(
        candidates.filter(row => hiddenProcessIds.has(row.process_id)).map(row => row.id as string)
    );
    return events.filter(event => !hiddenCandidateIds.has(event.candidateId));
}
