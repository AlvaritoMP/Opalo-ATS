import type { BulkCandidate } from './api/bulkCandidates';
import type { InterviewEvent } from '../types';

export function interviewEventToCandidateFields(
    event: Pick<InterviewEvent, 'id' | 'start' | 'interviewerId'>
): Pick<BulkCandidate, 'nextInterviewAt' | 'nextInterviewerId' | 'nextInterviewEventId'> {
    const start =
        event.start instanceof Date ? event.start : new Date(event.start);
    return {
        nextInterviewAt: start.toISOString(),
        nextInterviewerId: event.interviewerId,
        nextInterviewEventId: event.id,
    };
}

/** Completa entrevistas próximas desde interview_events cuando la query paginada no las trae. */
export function enrichCandidatesWithNextInterviews(
    candidates: BulkCandidate[],
    events: InterviewEvent[]
): BulkCandidate[] {
    if (events.length === 0) return candidates;

    const now = Date.now();
    const nextByCandidate = new Map<
        string,
        { start: string; interviewerId: string; eventId: string }
    >();

    for (const ev of events) {
        const startMs = new Date(ev.start).getTime();
        if (Number.isNaN(startMs) || startMs < now) continue;

        const existing = nextByCandidate.get(ev.candidateId);
        if (!existing || startMs < new Date(existing.start).getTime()) {
            nextByCandidate.set(ev.candidateId, {
                start: new Date(ev.start).toISOString(),
                interviewerId: ev.interviewerId,
                eventId: ev.id,
            });
        }
    }

    if (nextByCandidate.size === 0) return candidates;

    return candidates.map(c => {
        const next = nextByCandidate.get(c.id);
        if (!next) return c;

        if (!c.nextInterviewAt) {
            return {
                ...c,
                nextInterviewAt: next.start,
                nextInterviewerId: next.interviewerId,
                nextInterviewEventId: next.eventId,
            };
        }

        const dbMs = new Date(c.nextInterviewAt).getTime();
        const evMs = new Date(next.start).getTime();
        if (Number.isNaN(dbMs) || evMs < dbMs) {
            return {
                ...c,
                nextInterviewAt: next.start,
                nextInterviewerId: next.interviewerId,
                nextInterviewEventId: next.eventId,
            };
        }

        return c;
    });
}
