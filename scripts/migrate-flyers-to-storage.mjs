import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
    fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
        .split(/\r?\n/)
        .filter(line => line.includes('=') && !line.trim().startsWith('#'))
        .map(line => {
            const index = line.indexOf('=');
            return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
        })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

const APP = 'Opalo ATS';
const BUCKET = 'app-files';

function decodeDataUrl(value) {
    const match = String(value).match(/^data:([^;,]+)(;base64)?,(.*)$/s);
    if (!match) return null;
    const contentType = match[1] || 'image/png';
    const payload = match[3] || '';
    const bytes = match[2] ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload));
    const subtype = contentType.split('/')[1]?.split('+')[0] || 'png';
    const ext = subtype === 'jpeg' ? 'jpg' : subtype.replace(/[^a-z0-9]/g, '') || 'png';
    return { bytes, contentType, ext };
}

const { data: rows, error: listError } = await supabase
    .from('processes')
    .select('id')
    .eq('app_name', APP)
    .not('flyer_url', 'is', null);

if (listError) throw listError;

let moved = 0;
let skipped = 0;
const failed = [];

for (const row of rows || []) {
    const { data, error } = await supabase
        .from('processes')
        .select('flyer_url')
        .eq('id', row.id)
        .eq('app_name', APP)
        .maybeSingle();
    if (error) {
        failed.push({ id: row.id, step: 'read', message: error.message });
        continue;
    }
    const flyer = data?.flyer_url || '';
    if (!flyer.startsWith('data:')) {
        skipped += 1;
        continue;
    }
    const decoded = decodeDataUrl(flyer);
    if (!decoded || decoded.bytes.length === 0) {
        failed.push({ id: row.id, step: 'decode', message: 'data-url vacía' });
        continue;
    }
    const path = `flyers/${row.id}.${decoded.ext}`;
    const upload = await supabase.storage.from(BUCKET).upload(path, new Blob([decoded.bytes], { type: decoded.contentType }), {
        contentType: decoded.contentType,
        cacheControl: '31536000',
        upsert: true,
    });
    if (upload.error) {
        failed.push({ id: row.id, step: 'upload', message: upload.error.message });
        continue;
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const update = await supabase
        .from('processes')
        .update({ flyer_url: pub.publicUrl })
        .eq('id', row.id)
        .eq('app_name', APP)
        .select('id');
    if (update.error || !update.data?.length) {
        failed.push({ id: row.id, step: 'update', message: update.error?.message || 'sin filas' });
        continue;
    }
    moved += 1;
    console.log(`ok ${row.id} ${decoded.bytes.length} -> ${pub.publicUrl.length} chars`);
}

console.log(JSON.stringify({ listed: (rows || []).length, moved, skipped, failed }, null, 2));
if (failed.length > 0) process.exitCode = 1;
