import { supabase } from '../supabase';
import { APP_NAME } from '../appConfig';
import { isMissingColumnError } from '../supabaseColumnErrors';
import { normalizeDniDigits } from '../complementaryFicha';
import type { AssessmentResults, AssessmentTestId } from '../assessments/types';

const FUNCTION_NAME = 'candidate-assessments';

function getSupabaseConfig(): { url: string; anonKey: string } {
    const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
    const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
    if (!url || !anonKey) throw new Error('Supabase no está configurado en este entorno.');
    return { url, anonKey };
}

async function callAssessments<T>(body: Record<string, unknown>): Promise<T> {
    const { url, anonKey } = getSupabaseConfig();
    const response = await fetch(`${url}/functions/v1/${FUNCTION_NAME}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
        },
        body: JSON.stringify(body),
    });
    const text = await response.text();
    let data: Record<string, unknown> = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { error: text || 'Respuesta inválida' };
    }
    if (!response.ok) {
        throw new Error(
            (typeof data.error === 'string' && data.error) ||
                `Error ${response.status} al contactar las pruebas`
        );
    }
    return data as T;
}

export interface AssessmentLookupMatch {
    candidateId: string;
    name: string;
    processId: string;
    processTitle: string;
    profile: 'mandos' | 'operativos';
}

export interface AssessmentTestCard {
    id: AssessmentTestId;
    title: string;
    instructions: string;
    timeLimitSec: number | null;
    status: 'pending' | 'in_progress' | 'completed' | 'retake';
    startedAt?: string | null;
    submittedAt?: string | null;
}

export interface AssessmentLookupPayload {
    candidateId: string;
    name: string;
    processId: string;
    processTitle: string;
    position: string;
    profile: 'mandos' | 'operativos';
    tests: AssessmentTestCard[];
}

export type AssessmentLookupResult =
    | { multiple: true; matches: AssessmentLookupMatch[] }
    | ({ multiple: false } & AssessmentLookupPayload);

export interface PublicQuestion {
    id: string;
    kind: 'choice' | 'series' | 'disc' | 'figure';
    prompt?: string;
    options?: string[];
    words?: string[];
    image?: string;
    optionCount?: number;
}

export function lookupAssessments(dni: string, candidateId?: string) {
    return callAssessments<AssessmentLookupResult>({
        action: 'lookup',
        dni: normalizeDniDigits(dni),
        candidateId: candidateId || undefined,
    });
}

export function startAssessment(dni: string, candidateId: string, testId: AssessmentTestId) {
    return callAssessments<{
        testId: AssessmentTestId;
        title: string;
        instructions: string;
        startedAt: string;
        deadlineAt: string | null;
        questions: PublicQuestion[];
    }>({
        action: 'start',
        dni: normalizeDniDigits(dni),
        candidateId,
        testId,
    });
}

export function submitAssessment(
    dni: string,
    candidateId: string,
    testId: AssessmentTestId,
    answers: Record<string, unknown>
) {
    return callAssessments<{ ok: true; submittedAt: string; timedOut: boolean }>({
        action: 'submit',
        dni: normalizeDniDigits(dni),
        candidateId,
        testId,
        answers,
    });
}

export function rescoreAssessments(candidateId: string) {
    return callAssessments<{ ok: true }>({ action: 'rescore', candidateId });
}

function parseResults(raw: unknown): AssessmentResults | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    return raw as AssessmentResults;
}

export async function fetchAssessmentResults(candidateId: string): Promise<AssessmentResults | null> {
    const { data, error } = await supabase
        .from('candidates')
        .select('assessment_results')
        .eq('id', candidateId)
        .eq('app_name', APP_NAME)
        .maybeSingle();
    if (error) {
        if (isMissingColumnError(error)) {
            throw new Error('Ejecuta MIGRATION_ADD_ASSESSMENT_RESULTS.sql en Supabase para ver los resultados.');
        }
        throw error;
    }
    return parseResults(data?.assessment_results);
}

export async function enableAssessmentRetake(candidateId: string, testId: AssessmentTestId): Promise<void> {
    const current = (await fetchAssessmentResults(candidateId)) || {};
    const tests = { ...(current.tests || {}) };
    const test = tests[testId];
    if (!test || test.status !== 'completed') {
        throw new Error('Solo se puede habilitar una reevaluación cuando la prueba ya fue enviada.');
    }
    tests[testId] = {
        ...test,
        retakeEnabled: true,
        retakeEnabledAt: new Date().toISOString(),
    };
    const { error } = await supabase
        .from('candidates')
        .update({
            assessment_results: {
                ...current,
                tests,
                updatedAt: new Date().toISOString(),
            },
        })
        .eq('id', candidateId)
        .eq('app_name', APP_NAME);
    if (error) throw error;
}
