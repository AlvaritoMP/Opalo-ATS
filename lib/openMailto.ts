/**
 * Abre composición de correo sin congelar la SPA.
 * Usa mailto: en pestaña nueva — el navegador/OS abre el gestor configurado
 * (cliente de escritorio o webmail predeterminado: Gmail, Outlook, Yahoo, etc.).
 * No forzamos Google ni Microsoft.
 */

export interface OpenMailComposeOptions {
    to: string[];
    subject: string;
    body: string;
}

export interface OpenMailComposeResult {
    recipientCount: number;
    /** Destinatarios que cupieron en el mailto junto con el cuerpo */
    mailtoRecipientCount: number;
    /** true si el cuerpo completo solo está en el portapapeles (URL mailto demasiado larga) */
    bodyTruncatedInMailto: boolean;
    copiedToClipboard: boolean;
}

/**
 * Por encima de esto, Outlook en Windows abre un mensaje en blanco.
 * 1800 era corto: el cuerpo de la invitación a pruebas, ya codificado
 * (%20 y saltos CRLF), queda alrededor de 2000 caracteres.
 */
const MAILTO_MAX_HREF_LENGTH = 2083;

function encodeMailtoParam(value: string): string {
    return encodeURIComponent(value.replace(/\r?\n/g, '\r\n'));
}

export function buildMailtoHref(to: string[], subject: string, body: string): string {
    const emails = to.map(e => e?.trim()).filter(Boolean).join(';');
    const params: string[] = [];
    if (subject) params.push(`subject=${encodeMailtoParam(subject)}`);
    if (body) params.push(`body=${encodeMailtoParam(body)}`);
    const qs = params.join('&');
    return qs ? `mailto:${emails}?${qs}` : `mailto:${emails}`;
}

/** Incluye el cuerpo completo y la mayor cantidad de destinatarios que quepa. */
function fitMailtoWithBody(
    to: string[],
    subject: string,
    body: string
): { href: string; included: string[] } | null {
    const sizes = to.length > 0 ? to.map((_, index) => to.length - index) : [0];
    for (const count of sizes) {
        const included = to.slice(0, count);
        const href = buildMailtoHref(included, subject, body);
        if (href.length <= MAILTO_MAX_HREF_LENGTH) return { href, included };
    }
    return null;
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
    const text = [`Para: ${validTo.join(', ')}`, `Asunto: ${subject}`, '', body].join('\n');

    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

/**
 * Abre mailto en pestaña nueva (no navega la app) y copia borrador al portapapeles.
 */
export async function openMailCompose(
    options: OpenMailComposeOptions
): Promise<OpenMailComposeResult> {
    const validTo = options.to.map(e => e?.trim()).filter(Boolean);
    const { subject, body } = options;

    const copiedToClipboard = await copyMailComposeDraft(validTo, subject, body);

    const fitted = fitMailtoWithBody(validTo, subject, body);
    let bodyTruncatedInMailto = false;
    let mailtoRecipientCount = validTo.length;

    if (fitted) {
        openInNewTab(fitted.href);
        mailtoRecipientCount = fitted.included.length;
    } else {
        const shortHref = buildMailtoHref(validTo, subject, '');
        openInNewTab(
            shortHref.length <= MAILTO_MAX_HREF_LENGTH
                ? shortHref
                : buildMailtoHref(validTo.slice(0, 1), '', '')
        );
        bodyTruncatedInMailto = true;
        mailtoRecipientCount = 0;
    }

    return {
        recipientCount: validTo.length,
        mailtoRecipientCount,
        bodyTruncatedInMailto,
        copiedToClipboard,
    };
}

export function getMailComposeToastMessage(result: OpenMailComposeResult): string {
    const n = result.recipientCount;
    const countLabel = n === 1 ? '1 destinatario' : `${n} destinatarios`;

    if (result.bodyTruncatedInMailto) {
        return result.copiedToClipboard
            ? `Correo abierto (${countLabel}). El mensaje completo está en el portapapeles — pégalo en tu cliente web.`
            : `Correo abierto (${countLabel}). El mensaje es largo: copia el texto manualmente si hace falta.`;
    }

    if (result.mailtoRecipientCount < result.recipientCount) {
        const placed = result.mailtoRecipientCount;
        return result.copiedToClipboard
            ? `Correo abierto con el mensaje (${placed} de ${n} destinatarios). El resto está en el borrador del portapapeles.`
            : `Correo abierto con el mensaje (${placed} de ${n} destinatarios).`;
    }

    return result.copiedToClipboard
        ? `Correo abierto (${countLabel}). Se usará tu cliente predeterminado. Borrador copiado por si usas correo web.`
        : `Correo abierto (${countLabel}). Se usará el cliente de correo configurado en tu navegador.`;
}
