import type { WorkPlanAssignment } from '../types';

export type PlanInterval = {
    startsAt: string;
    endsAt: string;
};

export type WeekSegment<T> = {
    item: T;
    startCol: number;
    endCol: number;
    lane: number;
    continuesBefore: boolean;
    continuesAfter: boolean;
};

export const PROCESS_PALETTE = [
    { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
    { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
    { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
    { bg: '#ccfbf1', text: '#115e59', border: '#5eead4' },
    { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
    { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
    { bg: '#fae8ff', text: '#86198f', border: '#f0abfc' },
    { bg: '#ffe4e6', text: '#9f1239', border: '#fda4af' },
] as const;

export const USER_DOTS = [
    '#2563eb',
    '#7c3aed',
    '#db2777',
    '#059669',
    '#d97706',
    '#0891b2',
    '#4f46e5',
    '#ea580c',
    '#0f766e',
    '#be123c',
] as const;

export function colorFromKey(key: string, palette: readonly { bg: string; text: string; border: string }[]) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
}

export function dotFromKey(key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return USER_DOTS[hash % USER_DOTS.length];
}

export function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 0);
}

export function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

export function startOfWeekMonday(date: Date): Date {
    const day = startOfDay(date);
    const weekday = day.getDay();
    const diff = weekday === 0 ? -6 : 1 - weekday;
    return addDays(day, diff);
}

export function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
    return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

export function diffCalendarDays(later: Date, earlier: Date): number {
    const utcLater = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
    const utcEarlier = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
    return Math.round((utcLater - utcEarlier) / 86400000);
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
    return aStart.getTime() <= bEnd.getTime() && aEnd.getTime() >= bStart.getTime();
}

export function upcomingFriday(anchor: Date): Date {
    const day = startOfDay(anchor);
    const weekday = day.getDay();
    if (weekday === 5) return day;
    if (weekday === 6) return addDays(day, 6);
    if (weekday === 0) return addDays(day, 5);
    return addDays(day, 5 - weekday);
}

export function toDateInput(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

export function toTimeInput(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function parseDateInput(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
}

export function combineDateAndTime(dateValue: string, timeValue: string | null, asEnd: boolean): Date | null {
    const date = parseDateInput(dateValue);
    if (!date) return null;
    if (!timeValue) {
        return asEnd ? endOfDay(date) : startOfDay(date);
    }
    const match = /^(\d{2}):(\d{2})$/.exec(timeValue);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, asEnd ? 59 : 0, 0);
}

export function monthWeeks(anchor: Date): Date[][] {
    const first = startOfWeekMonday(startOfMonth(anchor));
    const last = startOfDay(endOfMonth(anchor));
    const weeks: Date[][] = [];
    let cursor = first;
    while (weeks.length < 6) {
        const week = Array.from({ length: 7 }, (_, index) => addDays(cursor, index));
        weeks.push(week);
        if (week[6].getTime() >= last.getTime()) break;
        cursor = addDays(cursor, 7);
    }
    return weeks;
}

export function layoutWeek<T extends PlanInterval>(weekStart: Date, items: T[]): WeekSegment<T>[] {
    const weekDay = startOfDay(weekStart);
    const weekEnd = endOfDay(addDays(weekDay, 6));
    const segments: WeekSegment<T>[] = [];

    for (const item of items) {
        const start = new Date(item.startsAt);
        const end = new Date(item.endsAt);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
        if (!rangesOverlap(start, end, weekDay, weekEnd)) continue;
        const rawStart = diffCalendarDays(startOfDay(start), weekDay);
        const rawEnd = diffCalendarDays(startOfDay(end), weekDay);
        segments.push({
            item,
            startCol: Math.max(0, Math.min(6, rawStart)),
            endCol: Math.max(0, Math.min(6, rawEnd)),
            lane: 0,
            continuesBefore: rawStart < 0,
            continuesAfter: rawEnd > 6,
        });
    }

    segments.sort((a, b) => a.startCol - b.startCol || (b.endCol - b.startCol) - (a.endCol - a.startCol));
    const laneEnds: number[] = [];
    for (const segment of segments) {
        let lane = laneEnds.findIndex(endCol => endCol < segment.startCol);
        if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(segment.endCol);
        } else {
            laneEnds[lane] = segment.endCol;
        }
        segment.lane = lane;
    }
    return segments;
}

export function assignmentsOverlap(a: PlanInterval, b: PlanInterval): boolean {
    return rangesOverlap(new Date(a.startsAt), new Date(a.endsAt), new Date(b.startsAt), new Date(b.endsAt));
}

export function formatWhen(assignment: Pick<WorkPlanAssignment, 'startsAt' | 'endsAt' | 'allDay'>): string {
    const start = new Date(assignment.startsAt);
    const end = new Date(assignment.endsAt);
    const day: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const time: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
    const startDay = start.toLocaleDateString('es-PE', day);
    const endDay = end.toLocaleDateString('es-PE', day);
    if (assignment.allDay) {
        return isSameDay(start, end) ? startDay : `${startDay} – ${endDay}`;
    }
    const startTime = start.toLocaleTimeString('es-PE', time);
    const endTime = end.toLocaleTimeString('es-PE', time);
    if (isSameDay(start, end)) return `${startDay}, ${startTime} – ${endTime}`;
    return `${startDay} ${startTime} – ${endDay} ${endTime}`;
}

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
