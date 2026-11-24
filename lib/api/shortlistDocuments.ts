const FUNCTION_NAME = 'shortlist-document';

function getSupabaseConfig(): { url: string; anonKey: string } {
    const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
    const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
    if (!url || !anonKey) throw new Error('No se pudo preparar la descarga.');
    return { url, anonKey };
}

export function isGoogleDriveFileUrl(url?: string | null): boolean {
    const value = url?.trim() || '';
    if (!value) return false;
    if (/\/folders\//i.test(value)) return false;
    return /drive\.google\.com|docs\.google\.com/i.test(value);
}

function filenameFromDisposition(header: string | null, fallback: string): string {
    if (!header) return fallback;
    const star = header.match(/filename\*=UTF-8''([^;]+)/i);
    if (star?.[1]) {
        try {
            return decodeURIComponent(star[1]);
        } catch {
            return fallback;
        }
    }
    const plain = header.match(/filename="([^"]+)"/i);
    return plain?.[1] || fallback;
}

/** Pide el archivo a la sala ya abierta con el DNI. Drive no se abre en el navegador. */
export async function downloadShortlistDocument(input: {
    token: string;
    dni: string;
    attachmentId: string;
    fallbackName: string;
}): Promise<void> {
    const { url, anonKey } = getSupabaseConfig();
    const response = await fetch(`${url}/functions/v1/${FUNCTION_NAME}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
        },
        body: JSON.stringify({
            token: input.token,
            dni: input.dni,
            attachmentId: input.attachmentId,
        }),
    });

    if (!response.ok) {
        let message = 'No se pudo descargar el documento.';
        try {
            const data = await response.json();
            const detail = typeof data.error === 'string' ? data.error : typeof data.message === 'string' ? data.message : '';
            if (/requested function was not found/i.test(detail)) {
                message = 'La descarga todavía no está publicada en el servidor.';
            } else if (detail.trim()) {
                message = detail.trim();
            } else if (response.status === 404) {
                message = 'La descarga todavía no está publicada en el servidor.';
            }
        } catch {
            if (response.status === 404) message = 'La descarga todavía no está publicada en el servidor.';
        }
        throw new Error(message);
    }

    const blob = await response.blob();
    const name = filenameFromDisposition(response.headers.get('Content-Disposition'), input.fallbackName || 'documento');
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = name;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
