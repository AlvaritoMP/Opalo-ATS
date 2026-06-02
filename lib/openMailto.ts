/**
 * Abre composición de correo sin congelar la SPA.
 * Evita window.location.href = mailto: (bloquea si no hay cliente de correo en el PC).
 */

export interface OpenMailComposeOptions {
    to: string[];
    subject: string;
    body: string;
}

export interface OpenMailComposeResult {
    recipientCount: number;
    /** mailto en pestaña nueva, o Gmail si la URL era demasiado larga */
    method: 'mailto' | 'gmail';
    copiedToClipboard: boolean;
}

/** Límite práctico de longitud para mailto: en muchos navegadores ~2 KB */
const MAILTO_MAX_HREF_LENGTH = 1800;

export function buildMailtoHref(to: string[], subject: string, body: string): string {
    const emails = to.map(e => e?.trim()).filter(Boolean).join(';');
    return `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildGmailComposeUrl(to: string[], subject: string, body: string): string {
    const toParam = to.map(e => e?.trim()).filter(Boolean).join(',');
    const params = new URLSearchParams({
        view: 'cm',
        fs: '1',
        to: toParam,
        su: subject,
        body,
    });
    return `https://mail.google.com/mail/?${params.toString()}`;
}

export function buildOutlookWebComposeUrl(to: string[], subject: string, body: string): string {
    const toParam = to.map(e => e?.trim()).filter(Boolean).join(';');
    const params = new URLSearchParams({
        to: toParam,
        subject,
        body,
    });
    return `https://outlook.live.com/mail/0/deeplink/compose?${params.toString()}`;
}

function openInNewTab(url: string): boolean {
    try {
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (win) return true;
    } catch {
        /* ignore */
    }

    try {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        return true;
    } catch {
        return false;
    }
}

export async function copyMailComposeDraft(
    to: string[],
    subject: string,
    body: string
): Promise<boolean> {
    const validTo = to.map(e => e?.trim()).filter(Boolean);
    const text = [
        `Para: ${validTo.join(', ')}`,
        `Asunto: ${subject}`,
        '',
        body,
        '',
        '---',
        'Gmail (pegar en nuevo mensaje): https://mail.google.com',
        'Outlook web: https://outlook.live.com',
    ].join('\n');

    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

/**
 * Abre el correo en una pestaña nueva (no navega la app) y copia borrador al portapapeles.
 */
export async function openMailCompose(
    options: OpenMailComposeOptions
): Promise<OpenMailComposeResult> {
    const validTo = options.to.map(e => e?.trim()).filter(Boolean);
    const { subject, body } = options;

    const copiedToClipboard = await copyMailComposeDraft(validTo, subject, body);

    const mailtoHref = buildMailtoHref(validTo, subject, body);
    let method: OpenMailComposeResult['method'] = 'mailto';

    if (mailtoHref.length > MAILTO_MAX_HREF_LENGTH) {
        openInNewTab(buildGmailComposeUrl(validTo, subject, body));
        method = 'gmail';
    } else {
        openInNewTab(mailtoHref);
    }

    return {
        recipientCount: validTo.length,
        method,
        copiedToClipboard,
    };
}

/** Mensaje de toast según resultado (para webmail sin cliente en PC). */
export function getMailComposeToastMessage(result: OpenMailComposeResult): string {
    const n = result.recipientCount;
    const countLabel = n === 1 ? '1 destinatario' : `${n} destinatarios`;

    if (result.method === 'gmail') {
        return result.copiedToClipboard
            ? `Gmail abierto en nueva pestaña (${countLabel}). Borrador copiado al portapapeles.`
            : `Gmail abierto en nueva pestaña (${countLabel}).`;
    }

    return result.copiedToClipboard
        ? `Correo abierto en nueva pestaña (${countLabel}). Si no se abre, pega el borrador en Gmail u Outlook web.`
        : `Correo abierto en nueva pestaña (${countLabel}). Si no se abre, usa Gmail: mail.google.com`;
}
