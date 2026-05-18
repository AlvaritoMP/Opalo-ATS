import { BulkProcessConfig, CustomColumn } from '../types';

export interface BaseColumn {
    id: string;
    label: string;
    importKey?: string;
}

export const BASE_COLUMNS: BaseColumn[] = [
    { id: 'name', label: 'Nombre', importKey: 'name' },
    { id: 'dni', label: 'DNI', importKey: 'dni' },
    { id: 'email', label: 'Email', importKey: 'email' },
    { id: 'scoreIa', label: 'Score IA' },
    { id: 'status', label: 'Status' },
    { id: 'phone', label: 'Teléfono', importKey: 'phone' },
    { id: 'lastInteraction', label: 'Última Interacción' },
    { id: 'contact', label: 'Contacto' },
    { id: 'nextInterview', label: 'Próxima Entrevista' },
    { id: 'schedule', label: 'Agendar' },
    { id: 'stage', label: 'Etapa' },
];

export const DEFAULT_COLUMN_ORDER = BASE_COLUMNS.map(c => c.id);

export const IMPORT_FIELD_ALIASES: Record<string, string> = {
    name: 'name',
    nombre: 'name',
    email: 'email',
    correo: 'email',
    phone: 'phone',
    teléfono: 'phone',
    telefono: 'phone',
    phone2: 'phone2',
    'teléfono 2': 'phone2',
    telefono2: 'phone2',
    'teléfono2': 'phone2',
    description: 'description',
    descripción: 'description',
    descripcion: 'description',
    source: 'source',
    fuente: 'source',
    salaryexpectation: 'salaryExpectation',
    'expectativa salarial': 'salaryExpectation',
    expectativasalarial: 'salaryExpectation',
    agreedsalary: 'agreedSalary',
    'salario acordado': 'agreedSalary',
    salarioacordado: 'agreedSalary',
    age: 'age',
    edad: 'age',
    dni: 'dni',
    linkedinurl: 'linkedinUrl',
    linkedin: 'linkedinUrl',
    address: 'address',
    dirección: 'address',
    direccion: 'address',
    province: 'province',
    provincia: 'province',
    district: 'district',
    distrito: 'district',
};

export const OPTIONAL_IMPORT_FIELDS = [
    'phone', 'phone2', 'description', 'source', 'salaryExpectation',
    'agreedSalary', 'age', 'dni', 'linkedinUrl', 'address', 'province', 'district',
];

export function getCustomColumnIds(customColumns: CustomColumn[] = []): string[] {
    return customColumns.map(c => `custom_${c.id}`);
}

export function buildAllColumnIds(customColumns: CustomColumn[] = []): string[] {
    return [...DEFAULT_COLUMN_ORDER, ...getCustomColumnIds(customColumns)];
}

export function resolveColumnOrder(
    bulkConfig?: BulkProcessConfig,
    customColumns: CustomColumn[] = []
): string[] {
    const allIds = buildAllColumnIds(customColumns);

    if (bulkConfig?.columnOrder?.length) {
        const ordered = bulkConfig.columnOrder.filter(id => allIds.includes(id));
        const missing = allIds.filter(id => !ordered.includes(id));
        return [...ordered, ...missing];
    }

    return allIds;
}

export function getColumnLabel(
    colId: string,
    customColumns: CustomColumn[] = []
): string {
    if (colId.startsWith('custom_')) {
        const customCol = customColumns.find(c => c.id === colId.replace('custom_', ''));
        return customCol?.name || colId;
    }
    return BASE_COLUMNS.find(c => c.id === colId)?.label || colId;
}

export function getImportHeaders(
    bulkConfig?: BulkProcessConfig
): { header: string; field: string; isCustom: boolean; columnId?: string }[] {
    const customColumns = bulkConfig?.customColumns || [];
    const hiddenColumns = new Set(bulkConfig?.hiddenColumns || []);
    const columnOrder = resolveColumnOrder(bulkConfig, customColumns);

    const headers: { header: string; field: string; isCustom: boolean; columnId?: string }[] = [];

    columnOrder.forEach(colId => {
        if (hiddenColumns.has(colId)) return;

        if (colId.startsWith('custom_')) {
            const customCol = customColumns.find(c => c.id === colId.replace('custom_', ''));
            if (customCol) {
                headers.push({
                    header: customCol.name,
                    field: customCol.name,
                    isCustom: true,
                    columnId: customCol.id,
                });
            }
            return;
        }

        const baseCol = BASE_COLUMNS.find(c => c.id === colId);
        if (baseCol?.importKey) {
            headers.push({
                header: baseCol.importKey,
                field: baseCol.importKey,
                isCustom: false,
            });
        }
    });

    return headers;
}

export function mapImportHeader(header: string): string | null {
    const normalized = header.trim().toLowerCase();
    return IMPORT_FIELD_ALIASES[normalized] || null;
}

export function getColumnValuesStorageKey(processId: string): string {
    return `bulkColumnValues_${processId}`;
}
