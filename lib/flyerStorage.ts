import { supabase } from './supabase';

const BUCKET = 'app-files';

function extensionFor(file: File): string {
    if (file.type === 'image/jpeg') return 'jpg';
    if (file.type === 'image/webp') return 'webp';
    if (file.type === 'image/gif') return 'gif';
    if (file.type === 'image/png') return 'png';
    const fromName = file.name.split('.').pop()?.toLowerCase() || '';
    if (/^[a-z0-9]{2,5}$/.test(fromName)) return fromName === 'jpeg' ? 'jpg' : fromName;
    return 'png';
}

/** Sube el archivo a Storage y devuelve la URL pública. No guarda base64 en la base. */
export async function uploadFlyerFile(file: File): Promise<string> {
    const path = `flyers/${crypto.randomUUID()}.${extensionFor(file)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || 'image/png',
        cacheControl: '31536000',
        upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (!data.publicUrl) throw new Error('No se obtuvo la URL pública del flyer');
    return data.publicUrl;
}

export async function downloadFlyer(url: string, title: string): Promise<void> {
    const safeTitle = (title || 'proceso').replace(/[^\w\-]+/g, '_').slice(0, 50);
    let href = url;
    let ext = 'png';
    let revoke: string | null = null;

    if (url.startsWith('data:')) {
        const mimeMatch = url.match(/^data:image\/([\w+.-]+);/);
        const rawExt = mimeMatch?.[1]?.split('+')[0] || 'png';
        ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
    } else {
        const pathExt = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
        ext = /^[a-z0-9]{2,5}$/.test(pathExt) ? pathExt : 'png';
        const response = await fetch(url);
        if (!response.ok) throw new Error('No se pudo descargar la imagen');
        href = URL.createObjectURL(await response.blob());
        revoke = href;
    }

    const a = document.createElement('a');
    a.href = href;
    a.download = `flyer_${safeTitle}.${ext}`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (revoke) URL.revokeObjectURL(revoke);
}
