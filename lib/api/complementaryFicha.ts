import type {
    ComplementaryFichaData,
    ComplementaryLookupMatch,
    ComplementaryPrefillPayload,
} from '../complementaryFicha';
import { normalizeDniDigits } from '../complementaryFicha';

const FUNCTION_NAME = 'candidate-complementary-ficha';

function getSupabaseConfig(): { url: string; anonKey: string } {
    const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
    const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
    if (!url || !anonKey) {
        throw new Error('Supabase no está configurado en este entorno.');
    }
    return { url, anonKey };
}

async function callComplementaryFicha<T>(body: Record<string, unknown>): Promise<T> {
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
                `Error ${response.status} al contactar el servicio de ficha`
        );
    }

    return data as T;
}

export type ComplementaryLookupResult =
    | { multiple: true; matches: ComplementaryLookupMatch[] }
    | { multiple: false; prefill: ComplementaryPrefillPayload };

export async function lookupComplementaryFicha(
    dni: string,
    candidateId?: string
): Promise<ComplementaryLookupResult> {
    return callComplementaryFicha<ComplementaryLookupResult>({
        action: 'lookup',
        dni: normalizeDniDigits(dni),
        candidateId: candidateId || undefined,
    });
}

export async function submitComplementaryFicha(params: {
    dni: string;
    candidateId: string;
    form: ComplementaryFichaData;
}): Promise<{ success: true; candidateId: string; filledAt?: string }> {
    return callComplementaryFicha({
        action: 'submit',
        dni: normalizeDniDigits(params.dni),
        candidateId: params.candidateId,
        form: params.form,
    });
}
