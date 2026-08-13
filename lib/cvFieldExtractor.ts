/**
 * Extracción de campos de CV por reglas (capa 1).
 * Recorre todo el texto: email, celular peruano, DNI y LinkedIn se buscan
 * por patrón, da igual en qué parte del documento estén.
 * No usa IA. No inventa datos si no hay confianza.
 */

import { applyImportTextCaseToCandidate } from './importTextCase';

export type CvExtractedFields = {
    name?: string;
    email?: string;
    phone?: string;
    phone2?: string;
    dni?: string;
    linkedinUrl?: string;
    address?: string;
    province?: string;
    district?: string;
    age?: number;
    salaryExpectation?: string;
    description?: string;
};

/** Campos que puede aportar la capa 2 (Gemini). Aún no se llama. */
export type CvAiEnrichment = CvExtractedFields & {
    metadataIa?: string;
    scoreIa?: number;
};

export type CvExtractLocationOptions = {
    provinces?: string[];
    districts?: Record<string, string[]>;
};

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%À-ÿ]+\/?/gi;

const CV_TITLE_LINE_RE =
    /^(curriculum\s*vitae|curr[ií]culum\s*vitae|curriculum|curr[ií]culum|hoja\s+de\s+vida|resume|cv|datos\s+personales|informaci[oó]n\s+personal)$/i;

const GENERIC_ROLE_LINE_RE =
    /^(ingenier[oa]|licenciado\/?a?|lic\.?|bachiller|t[eé]cnic[oa]|analista|asistente|auxiliar|practicante|pasante|coordinador(?:a)?|supervisor(?:a)?|jefe(?:a)?|gerente|director(?:a)?|ejecutivo(?:a)?|especialista|desarrollador(?:a)?|programador(?:a)?|administrador(?:a)?|contador(?:a)?|abogado(?:a)?|psic[oó]log[oa]|vendedor(?:a)?|cajero(?:a)?|operari[oa]|chofer|conductor(?:a)?|secretaria|recepcionista|consultor(?:a)?|recursos\s+humanos|rr\.?\s*hh\.?|full\s*stack|frontend|backend)(\b|$)/i;

const NAME_PARTICLE_RE = /^(de|del|la|las|los|y|da|do|dos|das|e|san|santa|van|von)$/i;
const NAME_WORD_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ'’. -]*$/;

const SKIP_EMAIL_RE = /^(image|picture|photo|cid|noreply|no-reply)/i;

function uniquePreserve<T>(items: T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of items) {
        const key = String(item);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
    }
    return out;
}

/** Texto con saltos y espacios alrededor de @/. suavizados para contactos partidos en columnas. */
export function textForContactPatterns(text: string): string {
    return text
        .replace(/\s*@\s*/g, '@')
        .replace(/(\w)\s*\.\s*(\w)/g, '$1.$2');
}

export function extractEmails(text: string): string[] {
    const sources = [text, textForContactPatterns(text)];
    const found: string[] = [];
    for (const source of sources) {
        const matches = source.match(EMAIL_RE) || [];
        for (const raw of matches) {
            const email = raw.replace(/[.,;:)]+$/, '').toLowerCase();
            if (email.length < 6) continue;
            if (SKIP_EMAIL_RE.test(email)) continue;
            if (/\.(png|jpe?g|gif|webp|svg)$/i.test(email)) continue;
            found.push(email);
        }
    }
    return uniquePreserve(found);
}

function normalizeMobileDigits(raw: string): string | undefined {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 9 && digits.startsWith('9')) return digits;
    if (digits.length === 11 && digits.startsWith('51') && digits[2] === '9') return digits.slice(2);
    if (digits.length === 13 && digits.startsWith('0051') && digits[4] === '9') return digits.slice(4);
    if (digits.length >= 9) {
        const last9 = digits.slice(-9);
        if (last9.startsWith('9')) return last9;
    }
    return undefined;
}

/** Celulares peruanos: 9 dígitos que empiezan con 9, con o sin +51. */
export function extractPeruvianMobiles(text: string): string[] {
    const found: string[] = [];
    const patterns = [
        /(?:\+|00)?51[\s.\-]*9(?:[\s.\-]?\d){8}/g,
        /(?<!\d)9(?:[\s.\-]?\d){8}(?!\d)/g,
    ];
    for (const re of patterns) {
        const matches = text.match(re) || [];
        for (const raw of matches) {
            const normalized = normalizeMobileDigits(raw);
            if (normalized) found.push(normalized);
        }
    }
    return uniquePreserve(found);
}

export function extractDni(text: string, phones: string[] = []): string | undefined {
    const labeled = [
        ...text.matchAll(
            /(?:dni|d\.n\.i\.?|doc(?:umento)?(?:\s+nacional)?(?:\s+de\s+identidad)?|c[eé]dula)\s*[:\-#º°]*\s*(\d{8})\b/gi
        ),
    ];
    if (labeled.length > 0) return labeled[0][1];

    const phoneSet = new Set(phones);
    const unlabeled: string[] = [];
    for (const match of text.matchAll(/(?<!\d)(\d{8})(?!\d)/g)) {
        const dni = match[1];
        if (phoneSet.has(dni)) continue;
        if ([...phoneSet].some(p => p.includes(dni))) continue;
        unlabeled.push(dni);
    }
    return unlabeled[0];
}

export function extractLinkedinUrl(text: string): string | undefined {
    const sources = [text, textForContactPatterns(text)];
    for (const source of sources) {
        const match = source.match(LINKEDIN_RE);
        if (!match?.[0]) continue;
        let url = match[0].replace(/[.,;)]+$/, '');
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
        return url.replace(/\/+$/, '');
    }
    return undefined;
}

function looksLikePersonName(line: string): boolean {
    const cleaned = line.replace(/\s+/g, ' ').trim().replace(/[|•·]/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned.length < 5 || cleaned.length > 70) return false;
    if (/[\d@/\\:]/.test(cleaned)) return false;
    if (CV_TITLE_LINE_RE.test(cleaned)) return false;
    if (GENERIC_ROLE_LINE_RE.test(cleaned)) return false;
    if (/linkedin|gmail|hotmail|outlook|whatsapp|tel[eé]fono|celular|direcci[oó]n/i.test(cleaned)) {
        return false;
    }
    const words = cleaned.split(' ').filter(Boolean);
    if (words.length < 2 || words.length > 6) return false;
    if (!words.every(w => NAME_WORD_RE.test(w))) return false;
    const substantial = words.filter(w => !NAME_PARTICLE_RE.test(w));
    return substantial.length >= 2;
}

/**
 * Nombre: primeras líneas, descartando “curriculum vitae” y cargos genéricos.
 * Si no hay confianza, queda vacío para que el usuario lo complete.
 */
export function extractNameHeuristic(text: string): string | undefined {
    const lines = text
        .split(/\r?\n/)
        .map(l => l.replace(/\s+/g, ' ').trim())
        .filter(Boolean);

    const candidates: string[] = [];
    for (const line of lines.slice(0, 20)) {
        if (CV_TITLE_LINE_RE.test(line)) continue;
        if (looksLikePersonName(line)) candidates.push(line);
        if (candidates.length >= 3) break;
    }
    return candidates[0];
}

export function extractAge(text: string): number | undefined {
    const labeled = text.match(/(?:edad|age)\s*[:\-]?\s*(\d{1,2})\b/i);
    if (labeled) {
        const n = parseInt(labeled[1], 10);
        if (n >= 16 && n <= 80) return n;
    }
    const years = text.match(/\b(\d{1,2})\s*a[ñn]os\b/i);
    if (years) {
        const n = parseInt(years[1], 10);
        if (n >= 16 && n <= 80) return n;
    }
    return undefined;
}

export function extractSalaryExpectation(text: string): string | undefined {
    const labeled = text.match(
        /(?:pretensi[oó]n(?:es)?(?:\s+salarial(?:es)?)?|expectativa(?:s)?(?:\s+salarial(?:es)?)?|sueldo(?:\s+pretendido)?|salario(?:\s+(?:esperado|deseado|pretendido))?)\s*[:\-]?\s*([^\n]{3,50})/i
    );
    if (!labeled?.[1]) return undefined;
    const value = labeled[1].replace(/\s+/g, ' ').trim().replace(/[.;,]+$/, '');
    return value || undefined;
}

export function extractAddress(text: string): string | undefined {
    const labeled = text.match(
        /(?:direcci[oó]n|domicilio|address|av\.?|jr\.?|calle)\s*[:\-]?\s*([^\n]{8,90})/i
    );
    if (!labeled?.[1]) return undefined;
    const value = labeled[1].replace(/\s+/g, ' ').trim().replace(/[.;]+$/, '');
    if (/^(linkedin|http|www\.)/i.test(value)) return undefined;
    return value || undefined;
}

function matchListedName(text: string, names: string[]): string | undefined {
    const sorted = [...names].filter(Boolean).sort((a, b) => b.length - a.length);
    for (const name of sorted) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(?:^|[\\s,;:.(])${escaped}(?:$|[\\s,;:.)])`, 'i');
        if (re.test(text)) return name;
    }
    return undefined;
}

export function extractProvinceDistrict(
    text: string,
    options?: CvExtractLocationOptions
): { province?: string; district?: string } {
    const provinces = options?.provinces || [];
    const districtsMap = options?.districts || {};
    const province = provinces.length ? matchListedName(text, provinces) : undefined;

    let district: string | undefined;
    if (province && districtsMap[province]?.length) {
        district = matchListedName(text, districtsMap[province]);
    }
    if (!district) {
        const allDistricts = Object.entries(districtsMap).flatMap(([prov, list]) =>
            (list || []).map(d => ({ prov, d }))
        );
        const sorted = allDistricts.sort((a, b) => b.d.length - a.d.length);
        for (const { prov, d } of sorted) {
            const escaped = d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(`(?:^|[\\s,;:.(])${escaped}(?:$|[\\s,;:.)])`, 'i');
            if (re.test(text)) {
                district = d;
                return { province: province || prov, district };
            }
        }
    }
    return { province, district };
}

export function extractDescription(text: string): string | undefined {
    const match = text.match(
        /(?:^|\n)\s*(?:perfil(?:\s+profesional)?|resumen(?:\s+profesional)?|acerca\s+de(?:\s+m[ií])?|objetivo(?:\s+profesional)?|sobre\s+m[ií]|professional\s+summary|profile)\s*:?\s*\n+([\s\S]{20,600}?)(?=\n\s*(?:experiencia|educaci[oó]n|formaci[oó]n|habilidad|idiomas|logros|certific|referenc))/i
    );
    if (!match?.[1]) return undefined;
    const value = match[1].replace(/\s+/g, ' ').trim();
    return value.slice(0, 500) || undefined;
}

export function extractCvFields(text: string, options?: CvExtractLocationOptions): CvExtractedFields {
    const emails = extractEmails(text);
    const phones = extractPeruvianMobiles(text);
    const location = extractProvinceDistrict(text, options);

    const fields: CvExtractedFields = {
        name: extractNameHeuristic(text),
        email: emails[0],
        phone: phones[0],
        phone2: phones[1],
        dni: extractDni(text, phones),
        linkedinUrl: extractLinkedinUrl(text),
        address: extractAddress(text),
        province: location.province,
        district: location.district,
        age: extractAge(text),
        salaryExpectation: extractSalaryExpectation(text),
        description: extractDescription(text),
    };

    applyImportTextCaseToCandidate(fields);
    return fields;
}

const RULE_LOCKED_KEYS: (keyof CvExtractedFields)[] = [
    'email',
    'phone',
    'phone2',
    'dni',
    'linkedinUrl',
];

/**
 * Fusión prevista para capa 2: las reglas ganan en email/teléfono/DNI/LinkedIn
 * si ya los encontraron; la IA puede completar nombre, dirección, resumen y score.
 */
export function mergeCvExtraction(
    rules: CvExtractedFields,
    ai?: CvAiEnrichment | null
): CvExtractedFields & Pick<CvAiEnrichment, 'metadataIa' | 'scoreIa'> {
    if (!ai) return { ...rules };
    const merged: CvExtractedFields & Pick<CvAiEnrichment, 'metadataIa' | 'scoreIa'> = {
        ...ai,
        ...rules,
    };
    for (const key of RULE_LOCKED_KEYS) {
        const ruleVal = rules[key];
        if (ruleVal) {
            (merged as Record<string, unknown>)[key] = ruleVal;
        } else if (ai[key]) {
            (merged as Record<string, unknown>)[key] = ai[key];
        }
    }
    for (const key of Object.keys(ai) as (keyof CvAiEnrichment)[]) {
        if (RULE_LOCKED_KEYS.includes(key as keyof CvExtractedFields)) continue;
        const ruleVal = (rules as Record<string, unknown>)[key];
        const aiVal = ai[key];
        if ((ruleVal === undefined || ruleVal === '' || ruleVal === null) && aiVal !== undefined && aiVal !== '') {
            (merged as Record<string, unknown>)[key] = aiVal;
        }
    }
    applyImportTextCaseToCandidate(merged);
    return merged;
}
