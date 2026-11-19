import type { PsycholaboralInventory, ShortlistClientField, ShortlistFieldKind, ShortlistProfileField } from '../types';
import { normalizeColumnNameKey } from './bulkTableColumns';
import { createDefaultPsycholaboralInventory } from './psycholaboralDefaults';
import { getCompetencyLevelLabel, mergePsycholaboralInventory } from './psycholaboralUtils';

export interface ShortlistColumnRef {
    id: string;
    name: string;
}

export interface ShortlistProcessContext {
    columns: ShortlistColumnRef[];
    competencies: { id: string; name: string }[];
}

export interface ShortlistFieldOption {
    id: string;
    label: string;
    kind: ShortlistFieldKind;
    group: string;
    fichaKey?: string;
    /** El dato puede tomar también el valor de una columna del proceso. */
    acceptsColumns?: boolean;
}

const FICHA_OPTIONS: ShortlistFieldOption[] = [
    { id: 'ficha:estadoCivil', label: 'Estado civil', kind: 'ficha', group: 'Ficha', fichaKey: 'estadoCivil' },
    { id: 'ficha:nacionalidad', label: 'Nacionalidad', kind: 'ficha', group: 'Ficha', fichaKey: 'nacionalidad' },
    { id: 'ficha:sexo', label: 'Sexo', kind: 'ficha', group: 'Ficha', fichaKey: 'sexo' },
    { id: 'ficha:direccion', label: 'Dirección', kind: 'ficha', group: 'Ficha', fichaKey: 'direccion' },
    { id: 'ficha:departamento', label: 'Departamento', kind: 'ficha', group: 'Ficha', fichaKey: 'departamento' },
    { id: 'ficha:puestoContrato', label: 'Puesto', kind: 'ficha', group: 'Ficha', fichaKey: 'puestoContrato' },
];

export const SHORTLIST_FIELD_OPTIONS: ShortlistFieldOption[] = [
    { id: 'phone', label: 'Teléfono', kind: 'phone', group: 'Contacto' },
    { id: 'email', label: 'Correo', kind: 'email', group: 'Contacto' },
    { id: 'linkedin', label: 'LinkedIn', kind: 'linkedin', group: 'Contacto' },
    { id: 'age', label: 'Edad', kind: 'age', group: 'Perfil' },
    { id: 'location', label: 'Ubicación', kind: 'location', group: 'Perfil' },
    { id: 'description', label: 'Perfil', kind: 'description', group: 'Perfil' },
    { id: 'salary', label: 'Expectativa salarial', kind: 'salary', group: 'Perfil', acceptsColumns: true },
    { id: 'experience', label: 'Experiencia', kind: 'experience', group: 'Ficha', acceptsColumns: true },
    { id: 'education', label: 'Educación', kind: 'education', group: 'Ficha' },
    ...FICHA_OPTIONS,
    { id: 'psychSuitability', label: 'Aptitud', kind: 'psychSuitability', group: 'Informe' },
    { id: 'psychIntellectual', label: 'Nivel intelectual', kind: 'psychIntellectual', group: 'Informe' },
    { id: 'psychPersonality', label: 'Personalidad', kind: 'psychPersonality', group: 'Informe' },
    { id: 'psychCompetencies', label: 'Competencias', kind: 'psychCompetencies', group: 'Informe' },
];

const DEFAULT_IDS = ['phone', 'email', 'age', 'location', 'salary', 'linkedin', 'description', 'experience', 'education'];

const WIDE_KINDS = new Set<ShortlistFieldKind>(['description', 'experience', 'education', 'psychPersonality', 'psychCompetencies']);

export function defaultShortlistClientFields(): ShortlistClientField[] {
    return SHORTLIST_FIELD_OPTIONS.filter(option => DEFAULT_IDS.includes(option.id)).map(optionToField);
}

export function optionToField(option: ShortlistFieldOption): ShortlistClientField {
    return {
        id: option.id,
        label: option.label,
        kind: option.kind,
        fichaKey: option.fichaKey,
    };
}

export function columnField(name: string): ShortlistClientField {
    const label = name.trim();
    return {
        id: `column:${normalizeColumnNameKey(label)}`,
        label,
        kind: 'column',
        columnName: label,
    };
}

export function parseShortlistClientFields(raw: unknown): ShortlistClientField[] | undefined {
    if (!Array.isArray(raw)) return undefined;
    const fields: ShortlistClientField[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const row = item as Record<string, unknown>;
        const kind = text(row.kind) as ShortlistFieldKind;
        const label = text(row.label);
        const id = text(row.id);
        if (!kind || !label || !id) continue;
        if (!isKind(kind)) continue;
        const columnNames = Array.isArray(row.columnNames)
            ? row.columnNames.map(text).filter(Boolean)
            : undefined;
        fields.push({
            id,
            label,
            kind,
            columnName: text(row.columnName) || undefined,
            columnNames: columnNames?.length ? columnNames : undefined,
            fichaKey: text(row.fichaKey) || undefined,
        });
    }
    return fields;
}

export function resolveShortlistProfile(
    row: Record<string, unknown>,
    fields: ShortlistClientField[],
    process: ShortlistProcessContext | undefined,
    inventoryInput?: PsycholaboralInventory | null,
): { profileFields: ShortlistProfileField[]; age?: number; city?: string; district?: string; province?: string } {
    const inventory = mergePsycholaboralInventory(inventoryInput || createDefaultPsycholaboralInventory());
    const profileFields: ShortlistProfileField[] = [];
    let age: number | undefined;
    let city: string | undefined;
    let district: string | undefined;
    let province: string | undefined;

    for (const field of fields) {
        const value = valueForField(row, field, process, inventory);
        if (!value) continue;
        if (field.kind === 'age') {
            const parsed = Number(value.replace(',', '.'));
            if (Number.isFinite(parsed) && parsed > 0 && parsed < 120) age = Math.round(parsed);
        }
        if (field.kind === 'location') {
            const place = placeFrom(row, field, process);
            district = place.district;
            province = place.province;
            city = place.city;
        }
        profileFields.push({
            id: field.id,
            label: field.label,
            value: field.kind === 'age' && age ? `${age} años` : value,
            href: field.kind === 'linkedin' ? linkOf(value) : undefined,
            wide: WIDE_KINDS.has(field.kind) || value.length > 80 || value.includes('\n'),
        });
    }

    return { profileFields, age, city, district, province };
}

function valueForField(
    row: Record<string, unknown>,
    field: ShortlistClientField,
    process: ShortlistProcessContext | undefined,
    inventory: PsycholaboralInventory,
): string {
    const columns = namedColumns(row, field.columnNames || [], process);
    switch (field.kind) {
        case 'phone':
            return first([text(row.phone), fichaText(row, 'telefono'), columns]);
        case 'email':
            return first([text(row.email), fichaText(row, 'email'), columns]);
        case 'age':
            return first([text(row.age), fichaText(row, 'edad'), columns]);
        case 'location':
            return placeLabel(placeFrom(row, field, process));
        case 'linkedin':
            return text(row.linkedin_url);
        case 'description':
            return first([text(row.description), columns]);
        case 'salary':
            return first([text(row.salary_expectation), columns]);
        case 'experience':
            return uniqueJoin([experienceText(row), columns]);
        case 'education':
            return educationText(row);
        case 'ficha':
            return field.fichaKey ? fichaText(row, field.fichaKey) : '';
        case 'column':
            return columnText(row, field.columnName || field.label, process);
        case 'psychSuitability':
            return suitabilityText(row);
        case 'psychIntellectual':
            return intellectualText(row, inventory);
        case 'psychPersonality':
            return personalityText(row, inventory);
        case 'psychCompetencies':
            return competencyText(row, inventory, process);
        default:
            return '';
    }
}

function placeFrom(
    row: Record<string, unknown>,
    field: ShortlistClientField,
    process: ShortlistProcessContext | undefined,
): { city?: string; district?: string; province?: string } {
    const district = first([text(row.district), fichaText(row, 'distrito'), columnText(row, 'distrito', process)]) || undefined;
    const province = first([text(row.province), fichaText(row, 'provincia'), columnText(row, 'provincia', process)]) || undefined;
    const city = columnText(row, 'ciudad', process) || province;
    const extra = namedColumns(row, field.columnNames || [], process);
    return {
        district,
        province,
        city: city || (extra && !district && !province ? extra : undefined),
    };
}

function placeLabel(place: { city?: string; district?: string; province?: string }): string {
    return [place.district, place.city && place.city !== place.province ? place.city : '', place.province].filter(Boolean).join(', ');
}

function namedColumns(row: Record<string, unknown>, names: string[], process: ShortlistProcessContext | undefined): string {
    const parts = names.map(name => columnText(row, name, process)).filter(Boolean);
    return uniqueJoin(parts);
}

function columnText(row: Record<string, unknown>, name: string, process: ShortlistProcessContext | undefined): string {
    const wanted = normalizeColumnNameKey(name);
    if (!wanted) return '';
    const bulk = objectOf(row.bulk_column_values);
    for (const [key, value] of Object.entries(bulk)) {
        const bare = key.startsWith('__name__') ? key.slice('__name__'.length) : key;
        if (normalizeColumnNameKey(bare) !== wanted) continue;
        const cell = cellText(value);
        if (cell) return cell;
    }
    const column = process?.columns.find(item => normalizeColumnNameKey(item.name) === wanted);
    if (!column) return '';
    return cellText(bulk[column.id]);
}

function fichaText(row: Record<string, unknown>, key: string): string {
    const data = objectOf(row.complementary_data);
    const value = data[key];
    if (typeof value === 'boolean') return value ? 'Sí' : '';
    return cellText(value);
}

function experienceText(row: Record<string, unknown>): string {
    const items = Array.isArray(objectOf(row.complementary_data).experienciaLaboral)
        ? objectOf(row.complementary_data).experienciaLaboral as unknown[]
        : [];
    return uniqueJoin(items.map(item => {
        const job = objectOf(item);
        const role = [text(job.puesto), text(job.empresa)].filter(Boolean).join(' · ');
        const dates = [text(job.fechaIngreso), text(job.fechaCese)].filter(Boolean).join(' – ');
        return [role, dates].filter(Boolean).join('\n');
    }));
}

function educationText(row: Record<string, unknown>): string {
    const items = Array.isArray(objectOf(row.complementary_data).educacion)
        ? objectOf(row.complementary_data).educacion as unknown[]
        : [];
    return uniqueJoin(items.map(item => {
        const study = objectOf(item);
        return [text(study.nivel), text(study.grado), text(study.institucion), text(study.periodo)].filter(Boolean).join(' · ');
    }));
}

function suitabilityText(row: Record<string, unknown>): string {
    const status = text(objectOf(row.psycholaboral_evaluation).suitabilityStatus);
    if (status === 'apto') return 'Apto';
    if (status === 'no_apto') return 'No apto';
    if (status === 'apto_reservas') return 'Apto con reservas';
    return '';
}

function intellectualText(row: Record<string, unknown>, inventory: PsycholaboralInventory): string {
    const psych = objectOf(row.psycholaboral_evaluation);
    const id = text(psych.intellectualLevelId);
    if (!id) return '';
    const level = inventory.intellectualLevels.find(item => item.id === id);
    const score = typeof psych.intellectualScore === 'number' ? ` (${psych.intellectualScore})` : '';
    return `${level?.name || id}${score}`;
}

function personalityText(row: Record<string, unknown>, inventory: PsycholaboralInventory): string {
    const ratings = Array.isArray(objectOf(row.psycholaboral_evaluation).personality)
        ? objectOf(row.psycholaboral_evaluation).personality as unknown[]
        : [];
    return uniqueJoin(ratings.map(item => {
        const rating = objectOf(item);
        const traitId = text(rating.traitId);
        if (!traitId) return '';
        const name = inventory.personalityTraits.find(trait => trait.id === traitId)?.name || traitId;
        const level = levelLabel(text(rating.level));
        const note = text(rating.observations);
        return [level ? `${name}: ${level}` : name, note].filter(Boolean).join('. ');
    }));
}

function competencyText(
    row: Record<string, unknown>,
    inventory: PsycholaboralInventory,
    process: ShortlistProcessContext | undefined,
): string {
    const ratings = Array.isArray(objectOf(row.psycholaboral_evaluation).competencies)
        ? objectOf(row.psycholaboral_evaluation).competencies as unknown[]
        : [];
    const names = new Map<string, string>();
    for (const set of inventory.competencySets) {
        for (const competency of set.competencies || []) names.set(competency.id, competency.name);
    }
    for (const competency of process?.competencies || []) names.set(competency.id, competency.name);
    return uniqueJoin(ratings.map(item => {
        const rating = objectOf(item);
        const id = text(rating.competencyId);
        if (!id) return '';
        const score = typeof rating.obtainedScore === 'number' ? rating.obtainedScore : null;
        const name = names.get(id) || id;
        const level = score === null ? '' : getCompetencyLevelLabel(score);
        const note = text(rating.observations);
        const head = score === null ? name : `${name}: ${score}${level ? ` (${level})` : ''}`;
        return [head, note].filter(Boolean).join('. ');
    }));
}

function levelLabel(value: string): string {
    if (value === 'bajo') return 'Bajo';
    if (value === 'promedio') return 'Promedio';
    if (value === 'alto') return 'Alto';
    return '';
}

function linkOf(value: string): string | undefined {
    if (/^https?:\/\//i.test(value)) return value;
    if (value.includes('.')) return `https://${value.replace(/^\/+/, '')}`;
    return undefined;
}

function first(parts: string[]): string {
    return parts.map(part => part.trim()).find(Boolean) || '';
}

function uniqueJoin(parts: string[]): string {
    const seen = new Set<string>();
    const kept: string[] = [];
    for (const part of parts) {
        const clean = part.trim();
        if (!clean || seen.has(clean)) continue;
        seen.add(clean);
        kept.push(clean);
    }
    return kept.join('\n');
}

function objectOf(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
}

function cellText(value: unknown): string {
    if (typeof value === 'boolean') return value ? 'Sí' : '';
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return typeof value === 'string' ? value.trim() : '';
}

function text(value: unknown): string {
    return cellText(value);
}

function isKind(value: string): value is ShortlistFieldKind {
    return SHORTLIST_FIELD_OPTIONS.some(option => option.kind === value) || value === 'column' || value === 'ficha';
}
