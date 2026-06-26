import { formatBulkDate } from './bulkTableColumns';

export type DatePartName = 'dia' | 'mes' | 'anio';

export type DateDigitPart =
    | 'dd1' | 'dd2'
    | 'mm1' | 'mm2'
    | 'aa1' | 'aa2' | 'aa3' | 'aa4';

export type DecomposedKeySpec =
    | { kind: 'char'; baseKey: string; index: number }
    | { kind: 'datePart'; baseKey: string; part: DatePartName }
    | { kind: 'dateDigit'; baseKey: string; part: DateDigitPart };

const CHAR_KEY_RE = /^(.+?)[#_](\d{1,2})$/;
const DATE_PART_RE = /^(.+?)\.(dia|mes|anio|año)$/i;
const DATE_DIGIT_RE = /^(.+?)\.(dd|mm|aa|aaaa|yy)([1-4])$/i;

/** Detecta si un marcador descompone un campo base (letra, fecha, dígito). */
export function parseDecomposedTemplateKey(key: string): DecomposedKeySpec | null {
    const trimmed = key.trim();
    if (!trimmed) return null;

    const charMatch = trimmed.match(CHAR_KEY_RE);
    if (charMatch) {
        const index = parseInt(charMatch[2], 10);
        if (index >= 1 && index <= 99) {
            return { kind: 'char', baseKey: charMatch[1].trim(), index };
        }
    }

    const datePartMatch = trimmed.match(DATE_PART_RE);
    if (datePartMatch) {
        const raw = datePartMatch[2].toLowerCase();
        const part: DatePartName = raw === 'año' ? 'anio' : (raw as DatePartName);
        return { kind: 'datePart', baseKey: datePartMatch[1].trim(), part };
    }

    const dateDigitMatch = trimmed.match(DATE_DIGIT_RE);
    if (dateDigitMatch) {
        const prefix = dateDigitMatch[2].toLowerCase();
        const digit = parseInt(dateDigitMatch[3], 10);
        let part: DateDigitPart | null = null;
        if (prefix === 'dd' && digit >= 1 && digit <= 2) part = `dd${digit}` as DateDigitPart;
        if (prefix === 'mm' && digit >= 1 && digit <= 2) part = `mm${digit}` as DateDigitPart;
        if ((prefix === 'aa' || prefix === 'aaaa' || prefix === 'yy') && digit >= 1 && digit <= 4) {
            part = `aa${digit}` as DateDigitPart;
        }
        if (part) return { kind: 'dateDigit', baseKey: dateDigitMatch[1].trim(), part };
    }

    return null;
}

export function getDecomposedBaseKey(key: string): string {
    return parseDecomposedTemplateKey(key)?.baseKey ?? key;
}

export function isDecomposedTemplateKey(key: string): boolean {
    return parseDecomposedTemplateKey(key) !== null;
}

function parseBulkDateParts(value: string): { dia: string; mes: string; anio: string } | null {
    const formatted = formatBulkDate(value);
    if (!formatted) return null;
    const match = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    return { dia: match[1], mes: match[2], anio: match[3] };
}

/** Una letra del valor (índice 1 = primer carácter). Sin espacios; mayúsculas para formularios. */
export function extractCharAt(value: string, index: number, uppercase = true): string {
    const compact = value.replace(/\s+/g, '');
    if (!compact || index < 1) return '';
    const ch = compact[index - 1] ?? '';
    if (!ch) return '';
    return uppercase ? ch.toUpperCase() : ch;
}

export function resolveDatePartValue(value: string, part: DatePartName): string {
    const parts = parseBulkDateParts(value);
    if (!parts) return '';
    switch (part) {
        case 'dia': return parts.dia;
        case 'mes': return parts.mes;
        case 'anio': return parts.anio;
    }
}

export function resolveDateDigitValue(value: string, part: DateDigitPart): string {
    const parts = parseBulkDateParts(value);
    if (!parts) return '';
    const dd = parts.dia.padStart(2, '0');
    const mm = parts.mes.padStart(2, '0');
    const yyyy = parts.anio.padStart(4, '0');
    const map: Record<DateDigitPart, string> = {
        dd1: dd[0], dd2: dd[1],
        mm1: mm[0], mm2: mm[1],
        aa1: yyyy[0], aa2: yyyy[1], aa3: yyyy[2], aa4: yyyy[3],
    };
    return map[part] ?? '';
}

/** Obtiene el valor descompuesto a partir del valor completo del campo base (ya sanitizado) */
export function resolveDecomposedValue(baseValue: string, spec: DecomposedKeySpec): string {
    const clean = baseValue.trim();
    if (!clean) return '';

    switch (spec.kind) {
        case 'char':
            return extractCharAt(clean, spec.index);
        case 'datePart':
            return resolveDatePartValue(clean, spec.part);
        case 'dateDigit':
            return resolveDateDigitValue(clean, spec.part);
    }
}

/** Ejemplos de sintaxis para la ayuda en el editor de plantillas */
export const DECOMPOSED_FIELD_HELP = [
    { syntax: '{{Ap Paterno#1}}', desc: 'Letra 1 del apellido paterno (cada cuadro del formulario)' },
    { syntax: '{{Ap Paterno#2}}', desc: 'Letra 2, y así hasta #99' },
    { syntax: '{{DNI#1}} … {{DNI#8}}', desc: 'Cada dígito del DNI en su casilla' },
    { syntax: '{{F Nac.dia}}', desc: 'Día completo (ej. 05)' },
    { syntax: '{{F Nac.mes}}', desc: 'Mes completo (ej. 03)' },
    { syntax: '{{F Nac.anio}}', desc: 'Año completo (ej. 1990)' },
    { syntax: '{{F Nac.dd1}} {{F Nac.dd2}}', desc: 'Dígito a dígito del día' },
    { syntax: '{{F Nac.mm1}} {{F Nac.mm2}}', desc: 'Dígito a dígito del mes' },
    { syntax: '{{F Nac.aa1}} … {{F Nac.aa4}}', desc: 'Dígito a dígito del año' },
] as const;
