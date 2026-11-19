import * as XLSX from 'xlsx';
import type { Shortlist, ShortlistClientField, ShortlistMember } from '../types';
import { shortlistColumnLabel } from './shortlists';

/** Tabla con los datos que la sala muestra. No incluye el resto de la ficha del ATS. */
export function downloadShortlistTable(shortlist: Shortlist, members: ShortlistMember[]): void {
    const fields = visibleFields(shortlist);
    const headers = [
        'Candidato',
        'Paso',
        'Motivo de rechazo',
        'Proceso',
        'Etapa de origen',
        'Presentado',
        ...fieldHeaders(fields),
    ];
    if (shortlist.showAssessments) headers.push('Pruebas');
    headers.push('Documentos');

    const rows = members.map(member => {
        const values = new Map((member.candidate?.profileFields || []).map(field => [field.id, field.value]));
        const row = [
            member.candidate?.name || 'Candidato',
            member.status === 'rejected' ? 'Rechazado' : shortlistColumnLabel(member.column),
            member.rejectionReason || '',
            member.sourceProcessTitle || '',
            member.sourceStageName || '',
            member.addedAt ? new Date(member.addedAt).toLocaleDateString('es-PE') : '',
            ...fields.map(field => values.get(field.id) || ''),
        ];
        if (shortlist.showAssessments) {
            row.push((member.candidate?.tests || []).map(test => `${test.name}: ${test.summary}`).join('\n'));
        }
        row.push((member.candidate?.documents || []).map(doc => doc.name).join('\n'));
        return row;
    });

    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    sheet['!cols'] = headers.map(header => ({ wch: Math.min(Math.max(header.length + 2, 16), 40) }));
    XLSX.utils.book_append_sheet(book, sheet, sheetName(shortlist.title));
    XLSX.writeFile(book, `${fileName(shortlist.title)}.xlsx`);
}

function visibleFields(shortlist: Shortlist): ShortlistClientField[] {
    if (!shortlist.showProfile) return [];
    return (shortlist.clientFields ?? []).filter(field => field.kind === 'column' || (field.columnNames && field.columnNames.length > 0));
}

function fieldHeaders(fields: ShortlistClientField[]): string[] {
    const used = new Map<string, number>();
    return fields.map(field => {
        const count = used.get(field.label) || 0;
        used.set(field.label, count + 1);
        return count === 0 ? field.label : `${field.label} (${count + 1})`;
    });
}

function sheetName(title: string): string {
    const clean = title.replace(/[\\/?*[\]:]/g, ' ').trim() || 'Shortlist';
    return clean.slice(0, 31);
}

function fileName(title: string): string {
    const clean = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '');
    return clean ? `Shortlist_${clean}` : 'Shortlist';
}
