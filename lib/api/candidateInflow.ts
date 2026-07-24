import { supabase } from '../supabase';
import { APP_NAME } from '../appConfig';

export interface CandidateInflowRow {
    processId: string;
    createdAt: string;
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 200;

/**
 * Altas reales por created_at (formulario / manual / re-postulación).
 * Los traslados por movimiento conservan created_at original → no entran como ingreso del día.
 */
export async function fetchCandidateInflowRows(
    processIds: string[],
    sinceIso: string
): Promise<CandidateInflowRow[]> {
    if (processIds.length === 0) return [];

    const out: CandidateInflowRow[] = [];

    // PostgREST .in() se degrada con listas enormes; trocear procesos.
    for (let p = 0; p < processIds.length; p += 50) {
        const idChunk = processIds.slice(p, p + 50);
        for (let page = 0; page < MAX_PAGES; page++) {
            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;
            const { data, error } = await supabase
                .from('candidates')
                .select('process_id, created_at')
                .eq('app_name', APP_NAME)
                .eq('archived', false)
                .eq('discarded', false)
                .in('process_id', idChunk)
                .gte('created_at', sinceIso)
                .order('created_at', { ascending: true })
                .range(from, to);

            if (error) throw error;

            const rows = (data || []) as Array<{ process_id: string; created_at: string }>;
            for (const row of rows) {
                if (!row.process_id || !row.created_at) continue;
                out.push({ processId: row.process_id, createdAt: row.created_at });
            }
            if (rows.length < PAGE_SIZE) break;
        }
    }

    return out;
}

/** Inicio del día Lima (UTC-5) → ISO para filtrar created_at en BD. */
export function limaDateKeyToStartIso(dateKey: string): string {
    return `${dateKey}T00:00:00-05:00`;
}
