import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Render an HTMLElement to a multi-page A4 PDF.
 * Slices the source canvas into clean per-page canvases (no negative-offset overlap),
 * which avoids visual duplication and gives crisper page breaks.
 *
 * Note: page breaks are pixel-based, not DOM-aware, so a row may still be cut.
 * Callers should use generous row padding so a half-cut row remains readable.
 */
export async function exportElementToA4PDF(
  element: HTMLElement,
  fileName: string,
  options?: { background?: string; scale?: number; returnBlob?: boolean }
): Promise<Blob | void> {
  const scale = options?.scale ?? 2;
  const background = options?.background ?? '#FAFAF7';


  const canvas = await html2canvas(element, {
    scale,
    backgroundColor: background,
    useCORS: true,
    onclone: (_doc, cloned) => {
      // Neutralize preview-only scale transform so PDF captures full size
      (cloned as HTMLElement).style.transform = 'none';
      (cloned as HTMLElement).style.boxShadow = 'none';
    },
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWmm = 210;
  const pageHmm = 297;

  // Pixels-per-page based on A4 ratio applied to canvas width
  const pxPerPage = Math.floor((canvas.width * pageHmm) / pageWmm);
  const totalPages = Math.max(1, Math.ceil(canvas.height / pxPerPage));

  for (let i = 0; i < totalPages; i++) {
    const sliceY = i * pxPerPage;
    const sliceH = Math.min(pxPerPage, canvas.height - sliceY);

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceH;
    const ctx = pageCanvas.getContext('2d');
    if (!ctx) continue;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, sliceY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

    const imgData = pageCanvas.toDataURL('image/png');
    const imgHmm = (sliceH * pageWmm) / canvas.width;
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, 0, pageWmm, imgHmm);
  }

  pdf.save(fileName);
}
