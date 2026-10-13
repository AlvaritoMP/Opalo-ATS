import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/** Una sola página A4 en horizontal — escala todo el contenido para encajar mejor el aspect ratio. */
export async function captureElementToPdf(element: HTMLElement): Promise<Blob> {
    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const marginMm = 6;
    const maxW = pageWidth - marginMm * 2;
    const maxH = pageHeight - marginMm * 2;

    const cw = canvas.width;
    const ch = canvas.height;

    /** Redondear mm para evitar desbordes de coma flotante en algunos visores PDF */
    let drawW = maxW;
    let drawH = (ch * drawW) / cw;
    if (drawH > maxH) {
        drawH = maxH;
        drawW = (cw * drawH) / ch;
    }
    drawW = Math.floor(drawW * 1000) / 1000;
    drawH = Math.floor(drawH * 1000) / 1000;

    const x = marginMm + (maxW - drawW) / 2;
    const y = marginMm + (maxH - drawH) / 2;

    pdf.addImage(imgData, 'PNG', x, y, drawW, drawH, undefined, 'FAST');

    while (pdf.getNumberOfPages() > 1) {
        pdf.deletePage(pdf.getNumberOfPages());
    }

    return pdf.output('blob');
}

type Range = [number, number];

/** Reparte la altura en páginas sin partir los bloques marcados (salvo que uno solo no quepa en una hoja). */
function paginateBlocks(blocks: Range[], totalHeight: number, pageHeight: number): Range[] {
    const ranges: Range[] = [];
    let start = 0;
    const cutUntil = (to: number) => {
        while (to - start > pageHeight) {
            ranges.push([start, start + pageHeight]);
            start += pageHeight;
        }
    };
    blocks.forEach(([top, bottom], i) => {
        if (bottom - start <= pageHeight) return;
        /**
         * El corte va en el centro del espacio libre entre el bloque anterior y este,
         * nunca pegado al borde del texto (html2canvas desplaza el texto unos px y se verían letras cortadas).
         */
        const prevBottom = i > 0 ? Math.max(blocks[i - 1][1], start) : top;
        const cut = Math.min(top, (prevBottom + top) / 2);
        if (cut > start) {
            cutUntil(cut);
            if (cut > start) {
                ranges.push([start, cut]);
                start = cut;
            }
        }
        cutUntil(bottom);
    });
    cutUntil(totalHeight);
    if (totalHeight - start > 8 || ranges.length === 0) ranges.push([start, totalHeight]);
    return ranges;
}

/**
 * A4 vertical multipágina. Corta solo entre elementos `[data-pdf-block]` y, si reducir
 * ligeramente la escala ahorra hojas, la reduce.
 */
export async function captureElementToPaginatedPdf(
    element: HTMLElement,
    options: { footerLabel?: string } = {}
): Promise<Blob> {
    const rootTop = element.getBoundingClientRect().top;
    const cssW = element.scrollWidth;
    const cssH = element.scrollHeight;
    const measured = Array.from(element.querySelectorAll<HTMLElement>('[data-pdf-block]'))
        .map(el => {
            const r = el.getBoundingClientRect();
            return { range: [r.top - rootTop, r.bottom - rootTop] as Range, keep: el.hasAttribute('data-pdf-keep') };
        })
        .filter(m => m.range[1] > m.range[0])
        .sort((a, b) => a.range[0] - b.range[0]);
    /** `data-pdf-keep` une el bloque con el siguiente (p. ej. un título con su primera fila) para no dejarlo huérfano. */
    const blocks: Range[] = [];
    for (let i = 0; i < measured.length; i++) {
        const top = measured[i].range[0];
        let bottom = measured[i].range[1];
        let j = i;
        while (measured[j].keep && j + 1 < measured.length) {
            j++;
            bottom = measured[j].range[1];
        }
        i = j;
        blocks.push([top, bottom]);
    }

    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: cssW,
        height: cssH,
        windowWidth: cssW,
        windowHeight: cssH,
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const marginX = 9;
    const marginTop = 9;
    const marginBottom = 13;
    const availW = pageW - marginX * 2;
    const availH = pageH - marginTop - marginBottom;

    let best: { scale: number; pxPerMm: number; ranges: Range[] } | null = null;
    for (const scale of [1, 0.94, 0.88]) {
        const pxPerMm = cssW / (availW * scale);
        const ranges = paginateBlocks(blocks, cssH, availH * pxPerMm);
        if (!best || ranges.length < best.ranges.length) best = { scale, pxPerMm, ranges };
    }
    const { scale, pxPerMm, ranges } = best!;

    const ratio = canvas.width / cssW;
    const drawW = availW * scale;
    const x = (pageW - drawW) / 2;
    const total = ranges.length;

    ranges.forEach(([from, to], i) => {
        const sy = Math.round(from * ratio);
        const sh = Math.max(1, Math.min(canvas.height - sy, Math.round((to - from) * ratio)));
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = sh;
        const ctx = slice.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);

        if (i > 0) pdf.addPage();
        pdf.addImage(slice.toDataURL('image/png'), 'PNG', x, marginTop, drawW, sh / ratio / pxPerMm, undefined, 'FAST');

        const footerY = pageH - 6.5;
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.2);
        pdf.line(marginX, footerY - 3.5, pageW - marginX, footerY - 3.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(100, 116, 139);
        if (options.footerLabel) pdf.text(options.footerLabel, marginX, footerY);
        pdf.text(`Página ${i + 1} de ${total}`, pageW - marginX, footerY, { align: 'right' });
    });

    return pdf.output('blob');
}

export function downloadPsycholaboralPdf(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

/** @deprecated Use captureElementToPdf with PsycholaboralReportDocument */
export async function generatePsycholaboralPdf(): Promise<Blob> {
    throw new Error('Use captureElementToPdf con el componente PsycholaboralReportDocument');
}
