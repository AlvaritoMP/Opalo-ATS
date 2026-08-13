/**
 * Capa 2 — IA opcional (Gemini). NO IMPLEMENTADA AÚN.
 *
 * Plan (no llamar desde el navegador a Gemini: CORS y exposición de clave):
 * - Edge Function de Supabase `parse-cv` (verify_jwt = true, usuario logueado).
 * - Recibe: texto extraído del PDF + título del proceso + `bulkConfig.aiPrompt` si existe.
 * - Devuelve JSON con los mismos campos de ficha + `metadataIa` + `scoreIa` (0-100).
 * - Secret: `GEMINI_API_KEY` en Supabase Edge Functions (no en Vite / el cliente).
 * - Si la function no está desplegada, falla o no hay clave: el flujo sigue solo con reglas.
 * - Fusión: `mergeCvExtraction` en `lib/cvFieldExtractor.ts` — las reglas ganan en
 *   email/teléfono/DNI/LinkedIn; la IA puede completar nombre, dirección, resumen y score.
 */

import type { CvAiEnrichment, CvExtractedFields } from '../cvFieldExtractor';

export type ParseCvRequest = {
    text: string;
    processTitle?: string;
    aiPrompt?: string;
};

export type ParseCvResult = CvAiEnrichment;

/** Mientras la Edge Function no exista, siempre es false. */
export function isParseCvAvailable(): boolean {
    return false;
}

/**
 * Cliente previsto: `supabase.functions.invoke('parse-cv', { body })`.
 * Hoy no llama a nada; devolver `null` permite seguir solo con reglas.
 */
export async function parseCvWithAi(
    _request: ParseCvRequest
): Promise<ParseCvResult | null> {
    return null;
}

/** Reserva de firma para cuando se active la capa 2. */
export function shouldSkipAiFallback(_fields: CvExtractedFields): boolean {
    return true;
}
