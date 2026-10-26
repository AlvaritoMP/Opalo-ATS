/**
 * Corrige en Supabase las fechas de calendario guardadas como aaaa-mm-dd
 * (las que llegaron de Tally) y las deja en dd/mm/aaaa.
 *
 * Uso: node scripts/repair-iso-bulk-dates.mjs
 */
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const ISO_CALENDAR_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.\d+)?(?:Z|[+-]00:?00)?)?$/;

function loadEnv(file) {
    if (!fs.existsSync(file)) return {};
    const env = {};
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx < 0) continue;
        let value = trimmed.slice(idx + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        env[trimmed.slice(0, idx).trim()] = value;
    }
    return env;
}

function isoCalendarDateToDisplay(value) {
    if (typeof value !== 'string') return null;
    const match = value.trim().match(ISO_CALENDAR_RE);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${match[3]}/${match[2]}/${match[1]}`;
}

function repairRecord(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
        return { next: record, changed: false };
    }
    const next = { ...record };
    let changed = false;
    for (const [key, raw] of Object.entries(next)) {
        const display = isoCalendarDateToDisplay(raw);
        if (display && display !== raw) {
            next[key] = display;
            changed = true;
        }
    }
    return { next, changed };
}

function repairComplementary(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
        return { next: record, changed: false };
    }
    const next = { ...record };
    let changed = false;
    for (const [key, raw] of Object.entries(next)) {
        const norm = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const looksLikeDate = norm.includes('fecha') || norm.includes('nac') || norm.includes('birth') || norm.includes('fnac');
        if (!looksLikeDate) continue;
        const display = isoCalendarDateToDisplay(raw);
        if (display && display !== raw) {
            next[key] = display;
            changed = true;
        }
    }
    return { next, changed };
}

const env = {
    ...loadEnv('.env.local'),
    ...loadEnv('Opalo-ATS/backend/.env'),
};
const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const appName = (env.VITE_APP_NAME || env.APP_NAME || 'Opalo ATS').trim();

if (!url || !key) {
    console.error('Faltan SUPABASE_URL y la llave de servicio en .env.local o backend/.env');
    process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const checkOnly = process.argv.includes('--check');
let scanned = 0;
let updated = 0;
let cells = 0;
let otherIso = 0;
let from = 0;
const pageSize = 200;

while (from < 100000) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
        .from('candidates')
        .select('id, bulk_column_values, complementary_data')
        .eq('app_name', appName)
        .not('bulk_column_values', 'is', null)
        .range(from, to);

    if (error) {
        console.error('No se pudieron leer candidatos:', error.message);
        process.exit(1);
    }

    const rows = data || [];
    scanned += rows.length;

    for (const row of rows) {
        for (const raw of Object.values(row.bulk_column_values || {})) {
            if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw.trim()) && !isoCalendarDateToDisplay(raw)) {
                otherIso += 1;
            }
        }
        const bulk = repairRecord(row.bulk_column_values);
        const ficha = repairComplementary(row.complementary_data);
        if (!bulk.changed && !ficha.changed) continue;
        if (checkOnly) {
            updated += 1;
            if (bulk.changed) {
                cells += Object.keys(row.bulk_column_values || {}).filter(key => isoCalendarDateToDisplay(row.bulk_column_values[key])).length;
            }
            continue;
        }

        const patch = {};
        if (bulk.changed) {
            patch.bulk_column_values = bulk.next;
            cells += Object.keys(row.bulk_column_values || {}).filter(key => {
                const before = row.bulk_column_values[key];
                return isoCalendarDateToDisplay(before) && bulk.next[key] !== before;
            }).length;
        }
        if (ficha.changed) patch.complementary_data = ficha.next;

        const { error: updateError } = await supabase
            .from('candidates')
            .update(patch)
            .eq('id', row.id)
            .eq('app_name', appName);

        if (updateError) {
            console.error('No se pudo actualizar un candidato:', updateError.message);
            process.exit(1);
        }
        updated += 1;
    }

    if (rows.length < pageSize) break;
    from += pageSize;
}

console.log(`Revisados: ${scanned}. Candidatos corregidos: ${updated}. Celdas de fecha: ${cells}. Otras celdas con hora: ${otherIso}.`);
