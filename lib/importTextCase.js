/** Campos de texto que no deben normalizarse (identificadores, URLs, etc.) */
const IMPORT_PROPER_CASE_EXCLUDE_KEYS = new Set([
    'email',
    'linkedinurl',
    'linkedin',
    'phone',
    'phone2',
    'telefono',
    'dni',
    'age',
    'edad',
]);

/** Nombres de persona y de lugar: mayúscula por palabra, partículas en minúscula. */
const IMPORT_NAME_CASE_FIELDS = new Set([
    'name',
    'nombres',
    'apellidopaterno',
    'apellidomaterno',
    'province',
    'provincia',
    'district',
    'distrito',
    'departamento',
    'ciudad',
    'source',
    'fuente',
    'address',
    'direccion',
]);

/** Párrafos: mayúscula al inicio y después de punto. No en cada palabra. */
const IMPORT_PROSE_FIELDS = new Set([
    'description',
    'descripcion',
    'perfil',
    'perfilprofesional',
    'resumen',
    'resumenprofesional',
    'experiencia',
    'experiencialaboral',
    'comentarios',
    'comentario',
    'observaciones',
    'observacion',
    'notas',
    'nota',
    'habilidades',
    'funciones',
    'logros',
    'objetivo',
    'objetivoprofesional',
    'presentacion',
    'sobremi',
    'acercademi',
]);

const IMPORT_NAME_PARTICLES = new Set([
    'de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'u',
    'da', 'do', 'das', 'dos', 'van', 'von', 'di',
]);

const IMPORT_ABBREVIATIONS = new Set([
    'sr', 'sra', 'srta', 'dr', 'dra', 'lic', 'ing', 'av', 'jr',
    'etc', 'ej', 'p', 'nro', 'num', 'pag', 'ud', 'uds',
]);

/** Siglas que deben quedar en mayúsculas aunque el texto se reescriba. */
const IMPORT_ACRONYMS = {
    kpi: 'KPI',
    kpis: 'KPIs',
    rpo: 'RPO',
    cv: 'CV',
    ats: 'ATS',
    dni: 'DNI',
    rrhh: 'RRHH',
    bpo: 'BPO',
    erp: 'ERP',
    sap: 'SAP',
    sql: 'SQL',
    api: 'API',
    okr: 'OKR',
    okrs: 'OKRs',
    ceo: 'CEO',
    cto: 'CTO',
    cfo: 'CFO',
    cio: 'CIO',
    hr: 'HR',
    it: 'IT',
    ti: 'TI',
    b2b: 'B2B',
    b2c: 'B2C',
    nps: 'NPS',
    sla: 'SLA',
    kam: 'KAM',
    hseq: 'HSEQ',
    sso: 'SSO',
    epp: 'EPP',
    iso: 'ISO',
    ong: 'ONG',
    sctr: 'SCTR',
    sunat: 'SUNAT',
    sunedu: 'SUNEDU',
    minedu: 'MINEDU',
    minsa: 'MINSA',
    mtpe: 'MTPE',
    onp: 'ONP',
    afp: 'AFP',
    ruc: 'RUC',
    crm: 'CRM',
    pdf: 'PDF',
};

const IMPORT_SPECIAL_CASE = {
    linkedin: 'LinkedIn',
    whatsapp: 'WhatsApp',
    facebook: 'Facebook',
    instagram: 'Instagram',
    essalud: 'EsSalud',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    excel: 'Excel',
    powerpoint: 'PowerPoint',
};

const IMPORT_PROPER_NOUNS = new Set([
    'lima', 'callao', 'arequipa', 'cusco', 'cuzco', 'trujillo', 'piura', 'chiclayo',
    'iquitos', 'huancayo', 'tacna', 'puno', 'ayacucho', 'cajamarca', 'chimbote',
    'juliaca', 'sullana', 'huaraz', 'pucallpa', 'tarapoto', 'tumbes', 'moquegua',
    'abancay', 'huanuco', 'miraflores', 'barranco', 'chorrillos', 'ventanilla',
    'surquillo', 'breña',
]);

const IMPORT_TEXT_LETTER_RE = /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g;
const IMPORT_WORD_RE = /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+(?:'[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+)*/g;

function normalizeFieldKey(field) {
    if (!field) return undefined;
    return field
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

function isExcludedImportField(field) {
    const key = normalizeFieldKey(field);
    return key ? IMPORT_PROPER_CASE_EXCLUDE_KEYS.has(key) : false;
}

export function isImportTextAllCaps(text) {
    const letters = text.match(IMPORT_TEXT_LETTER_RE);
    if (!letters?.length) return false;
    return letters.every(c => c === c.toUpperCase() && c !== c.toLowerCase());
}

export function isImportTextAllLower(text) {
    const letters = text.match(IMPORT_TEXT_LETTER_RE);
    if (!letters?.length) return false;
    return letters.every(c => c === c.toLowerCase() && c !== c.toUpperCase());
}

function shouldNormalizeImportWord(word) {
    return isImportTextAllCaps(word) || isImportTextAllLower(word);
}

function isSimpleTitleCaseWord(word) {
    if (word.length < 2) return false;
    const first = word.charAt(0);
    const rest = word.slice(1);
    return first === first.toUpperCase()
        && first !== first.toLowerCase()
        && rest === rest.toLowerCase()
        && /[a-záéíóúñü]/.test(rest);
}

function keepMixedShape(word) {
    if (isImportTextAllCaps(word) || isImportTextAllLower(word)) return false;
    return /[A-ZÁÉÍÓÚÑÜ]/.test(word.slice(1));
}

/** True cuando casi todas las palabras empiezan en mayúscula (efecto del normalizador anterior). */
function isTitleCaseHeavy(text) {
    const words = text.match(IMPORT_WORD_RE) || [];
    const significant = words.filter(word => word.length >= 3);
    if (significant.length < 6) return false;
    const titled = significant.filter(isSimpleTitleCaseWord).length;
    return titled / significant.length >= 0.6;
}

function capitalizeWord(lower) {
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function formatKnownWord(word, sentenceStart) {
    if (keepMixedShape(word)) return word;
    const lower = word.toLowerCase();
    if (IMPORT_ACRONYMS[lower]) return IMPORT_ACRONYMS[lower];
    if (IMPORT_SPECIAL_CASE[lower]) return IMPORT_SPECIAL_CASE[lower];
    if (IMPORT_PROPER_NOUNS.has(lower)) return capitalizeWord(lower);
    if (sentenceStart) return capitalizeWord(lower);
    return lower;
}

function walkWords(text, formatWord) {
    const re = new RegExp(IMPORT_WORD_RE.source, 'g');
    let result = '';
    let lastIndex = 0;
    let sentenceStart = true;
    let previousWord = '';
    let match;
    while ((match = re.exec(text)) !== null) {
        const gap = text.slice(lastIndex, match.index);
        if (lastIndex > 0) {
            const abbreviationDot = IMPORT_ABBREVIATIONS.has(previousWord.toLowerCase()) && /^\.\s*$/.test(gap);
            if (/[.!?]/.test(gap) && !abbreviationDot) sentenceStart = true;
            if (/\n/.test(gap)) sentenceStart = true;
        }
        result += gap;
        result += formatWord(match[0], sentenceStart);
        sentenceStart = false;
        previousWord = match[0];
        lastIndex = match.index + match[0].length;
    }
    result += text.slice(lastIndex);
    return result;
}

export function toImportProperCase(text) {
    return text.replace(IMPORT_WORD_RE, word => {
        const lower = word.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
    });
}

export function toImportNameCase(text) {
    let first = true;
    return text.replace(IMPORT_WORD_RE, word => {
        const lower = word.toLowerCase();
        const atStart = first;
        first = false;
        if (!atStart && IMPORT_NAME_PARTICLES.has(lower)) return lower;
        if (IMPORT_ACRONYMS[lower]) return IMPORT_ACRONYMS[lower];
        if (keepMixedShape(word)) return word;
        return capitalizeWord(lower);
    });
}

export function toImportSentenceCase(text) {
    return walkWords(text, formatKnownWord);
}

function toImportGentleCase(text) {
    return walkWords(text, (word, sentenceStart) => {
        if (keepMixedShape(word)) return word;
        if (isImportTextAllCaps(word)) return formatKnownWord(word, sentenceStart);
        if (isImportTextAllLower(word) && sentenceStart) return capitalizeWord(word);
        return word;
    });
}

function normalizeProseText(value) {
    if (isImportTextAllCaps(value) || isImportTextAllLower(value) || isTitleCaseHeavy(value)) {
        return toImportSentenceCase(value);
    }
    return toImportGentleCase(value);
}

function looksLikeProse(value) {
    const words = value.match(IMPORT_WORD_RE) || [];
    if (words.length >= 8) return true;
    return words.length >= 4 && /[.!?]/.test(value);
}

function shouldLeaveUntouched(value) {
    const trimmed = value.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true;
    return /https?:\/\//i.test(trimmed) && trimmed.split(/\s+/).length <= 2;
}

export function normalizeImportTextCase(value, opts = {}) {
    const { field, columnType, selectOptions } = opts;

    if (isExcludedImportField(field) || shouldLeaveUntouched(value)) return value;
    if (columnType === 'number' || columnType === 'date' || columnType === 'checkbox' || columnType === 'route_cost') {
        return value;
    }

    if (columnType === 'select' && selectOptions?.length) {
        const match = selectOptions.find(option => option.toLowerCase() === value.toLowerCase());
        if (match) return match;
    }

    const key = normalizeFieldKey(field);
    if (key && IMPORT_NAME_CASE_FIELDS.has(key)) return toImportNameCase(value);
    if ((key && IMPORT_PROSE_FIELDS.has(key)) || looksLikeProse(value)) return normalizeProseText(value);

    return value.replace(IMPORT_WORD_RE, word =>
        shouldNormalizeImportWord(word) ? toImportProperCase(word) : word
    );
}

export const IMPORT_TEXT_CASE_CANDIDATE_FIELDS = [
    'name',
    'nombres',
    'apellidoPaterno',
    'apellido_paterno',
    'apellidoMaterno',
    'apellido_materno',
    'description',
    'source',
    'salaryExpectation',
    'salary_expectation',
    'agreedSalary',
    'agreed_salary',
    'address',
    'province',
    'district',
];

export function applyImportTextCaseToCandidate(candidate, fields = IMPORT_TEXT_CASE_CANDIDATE_FIELDS) {
    for (const field of fields) {
        const val = candidate[field];
        if (typeof val === 'string' && val.trim()) {
            candidate[field] = normalizeImportTextCase(val, { field });
        }
    }
    return candidate;
}
