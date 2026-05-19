import jsPDF from 'jspdf';
import {
    Candidate,
    Process,
    PsycholaboralEvaluation,
    PsycholaboralInventory,
    PsycholaboralCompetency,
    PersonalityLevel,
} from '../types';
import { formatearFechaPeruana } from './dateFormatter';
import {
    calculateCompetencyTotals,
    getCompetencyLevelLabel,
    mergePsycholaboralInventory,
} from './psycholaboralUtils';

const PRIMARY = '#1e40af';
const GRAY = '#6b7280';
const BORDER = '#d1d5db';

interface ReportContext {
    candidate: Pick<Candidate, 'name' | 'dni' | 'age' | 'avatarUrl'>;
    process?: Process;
    evaluation: PsycholaboralEvaluation;
    competencies: PsycholaboralCompetency[];
    inventory: PsycholaboralInventory;
    logoUrl?: string;
    companyName?: string;
}

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [
        parseInt(h.substring(0, 2), 16),
        parseInt(h.substring(2, 4), 16),
        parseInt(h.substring(4, 6), 16),
    ];
}

function wrapText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string, i: number) => {
        doc.text(line, x, y + i * lineHeight);
    });
    return y + lines.length * lineHeight;
}

export async function generatePsycholaboralPdf(ctx: ReportContext): Promise<Blob> {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const inventory = mergePsycholaboralInventory(ctx.inventory);
    const intellectual = inventory.intellectualLevels.find(l => l.id === ctx.evaluation.intellectualLevelId);
    const { totalExpected, totalObtained, percentage } = calculateCompetencyTotals(
        ctx.competencies,
        ctx.evaluation.competencies
    );

    const position =
        ctx.evaluation.positionApplied ||
        ctx.process?.bulkConfig?.psycholaboral?.defaultPositionTitle ||
        ctx.process?.title ||
        '';

    const reportDate = ctx.evaluation.reportDate
        ? formatearFechaPeruana(ctx.evaluation.reportDate)
        : formatearFechaPeruana();

    const [pr, pg, pb] = hexToRgb(PRIMARY);

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(pr, pg, pb);
    doc.text('INFORME DE EVALUACIÓN PSICOLABORAL', pageWidth / 2, y + 12, { align: 'center' });
    if (ctx.companyName) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(ctx.companyName, pageWidth - margin, y + 8, { align: 'right' });
    }
    y += 28;
    doc.setDrawColor(...hexToRgb(BORDER));
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;

    const sectionTitle = (title: string) => {
        if (y > pageHeight - 80) {
            doc.addPage();
            y = margin;
        }
        doc.setFillColor(239, 246, 255);
        doc.rect(margin, y, contentWidth, 18, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(pr, pg, pb);
        doc.text(title, margin + 6, y + 12);
        y += 24;
    };

    // 1. Datos personales
    sectionTitle('1. Datos Personales');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    const photoSize = 56;
    const textX = margin + photoSize + 12;
    doc.setDrawColor(...hexToRgb(BORDER));
    doc.rect(margin, y, photoSize, photoSize);

    const fields = [
        ['Nombre:', ctx.candidate.name],
        ['DNI:', ctx.candidate.dni || '—'],
        ['Edad:', ctx.candidate.age ? `${ctx.candidate.age} años` : '—'],
        ['Puesto:', position || '—'],
        ['Fecha:', reportDate],
    ];
    let fieldY = y + 10;
    fields.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, textX, fieldY);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), textX + 52, fieldY);
        fieldY += 14;
    });
    y = Math.max(y + photoSize, fieldY) + 12;

    // 2. Nivel intelectual
    sectionTitle('2. Nivel Intelectual');
    const levels = inventory.intellectualLevels;
    const levelWidth = contentWidth / levels.length;
    levels.forEach((level, i) => {
        const lx = margin + i * levelWidth;
        const isSelected = level.id === ctx.evaluation.intellectualLevelId;
        doc.setFontSize(7);
        doc.setFont('helvetica', isSelected ? 'bold' : 'normal');
        doc.setTextColor(isSelected ? pr : 80, isSelected ? pg : 80, isSelected ? pb : 80);
        doc.text(level.name, lx + levelWidth / 2, y, { align: 'center', maxWidth: levelWidth - 4 });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(120, 120, 120);
        doc.text(level.scoreRange, lx + levelWidth / 2, y + 10, { align: 'center' });
        if (isSelected) {
            doc.setFillColor(pr, pg, pb);
            doc.circle(lx + levelWidth / 2, y + 18, 3, 'F');
        }
    });
    y += 32;
    doc.setDrawColor(...hexToRgb(BORDER));
    doc.rect(margin, y, contentWidth, 48);
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    y = wrapText(
        doc,
        intellectual?.interpretation || '',
        margin + 6,
        y + 12,
        contentWidth - 12,
        10
    ) + 8;

    // 3. Recursos de personalidad
    sectionTitle('3. Recursos de Personalidad');
    const colWidths = [contentWidth * 0.38, contentWidth * 0.12, contentWidth * 0.12, contentWidth * 0.12, contentWidth * 0.26];
    const headers = ['Rasgo / Definición', 'Bajo', 'Promedio', 'Alto', 'Observaciones'];
    let cx = margin;
    doc.setFillColor(249, 250, 251);
    doc.rect(margin, y, contentWidth, 16, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    headers.forEach((h, i) => {
        doc.text(h, cx + 3, y + 10, { maxWidth: colWidths[i] - 6 });
        cx += colWidths[i];
    });
    y += 18;

    inventory.personalityTraits.forEach(trait => {
        const rating = ctx.evaluation.personality.find(p => p.traitId === trait.id);
        const level = rating?.level || 'promedio';
        if (y > pageHeight - 60) {
            doc.addPage();
            y = margin;
        }
        cx = margin;
        doc.setDrawColor(...hexToRgb(BORDER));
        doc.rect(margin, y, contentWidth, 36);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(trait.name, cx + 3, y + 9, { maxWidth: colWidths[0] - 6 });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        wrapText(doc, trait.definition, cx + 3, y + 18, colWidths[0] - 6, 8);
        doc.setTextColor(0, 0, 0);
        cx += colWidths[0];
        (['bajo', 'promedio', 'alto'] as PersonalityLevel[]).forEach((lvl, idx) => {
            const w = colWidths[idx + 1];
            doc.setFont('helvetica', level === lvl ? 'bold' : 'normal');
            doc.text(level === lvl ? 'X' : '', cx + w / 2 - 2, y + 14);
            cx += w;
        });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        wrapText(doc, rating?.observations || '', cx + 3, y + 10, colWidths[4] - 6, 9);
        y += 38;
    });
    y += 6;

    // 4. Competencias
    sectionTitle('4. Competencias Psicolaborales');
    doc.setFontSize(7);
    doc.setTextColor(GRAY);
    doc.text('Leyenda: 1-3 Bajo | 4-6 Promedio | 7-9 Alto', margin, y);
    y += 12;

    const compCols = [contentWidth * 0.42, contentWidth * 0.12, contentWidth * 0.12, contentWidth * 0.34];
    const compHeaders = ['Competencia', 'Ptje. Esp.', 'Ptje. Obt.', 'Observaciones'];
    cx = margin;
    doc.setFillColor(249, 250, 251);
    doc.rect(margin, y, contentWidth, 14, 'F');
    doc.setFont('helvetica', 'bold');
    compHeaders.forEach((h, i) => {
        doc.text(h, cx + 3, y + 9);
        cx += compCols[i];
    });
    y += 16;

    ctx.competencies.forEach(comp => {
        const rating = ctx.evaluation.competencies.find(r => r.competencyId === comp.id);
        if (y > pageHeight - 50) {
            doc.addPage();
            y = margin;
        }
        cx = margin;
        doc.rect(margin, y, contentWidth, 32);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(comp.name, cx + 3, y + 9, { maxWidth: compCols[0] - 6 });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        wrapText(doc, comp.definition, cx + 3, y + 16, compCols[0] - 6, 7);
        doc.setTextColor(0, 0, 0);
        cx += compCols[0];
        doc.text(String(comp.expectedScore), cx + 8, y + 14);
        cx += compCols[1];
        const obtained = rating?.obtainedScore ?? 0;
        doc.text(`${obtained} (${getCompetencyLevelLabel(obtained)})`, cx + 3, y + 14);
        cx += compCols[2];
        wrapText(doc, rating?.observations || '', cx + 3, y + 10, compCols[3] - 6, 8);
        y += 34;
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(
        `Total competencias: Esperado ${totalExpected} | Obtenido ${totalObtained} — ${percentage}% de competencias alcanzadas`,
        margin,
        y + 10
    );
    y += 22;

    // 5. Conclusiones
    sectionTitle('5. Conclusiones');
    doc.setDrawColor(...hexToRgb(BORDER));
    doc.rect(margin, y, contentWidth, 72);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    wrapText(doc, ctx.evaluation.conclusions || '', margin + 6, y + 12, contentWidth - 12, 11);

    return doc.output('blob');
}

export function downloadPsycholaboralPdf(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}
