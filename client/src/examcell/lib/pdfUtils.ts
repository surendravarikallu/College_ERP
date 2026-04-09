import { jsPDF } from "jspdf";
import { formatSemester } from "./utils";

// Helper for generating PDF headers
export const addPdfHeader = async (doc: jsPDF, title: string, branch: string, batch: string, program: string, extra?: string) => {
  const pageW = doc.internal.pageSize.width;
  const LEFT_PAD = 30;

  const { url: headerDataUrl, ratio } = await new Promise<{ url: string, ratio: number }>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve({ url: canvas.toDataURL('image/png'), ratio: img.naturalWidth / img.naturalHeight });
      } else {
        resolve({ url: '', ratio: 1 });
      }
    };
    img.onerror = () => resolve({ url: '', ratio: 1 });
    img.src = '/Screenshot 2025-07-25 113411_1753423944040.webp';
  });

  let HEADER_IMG_H = headerDataUrl ? 72 : 0;
  let HEADER_IMG_W = headerDataUrl ? HEADER_IMG_H * ratio : 0;

  if (HEADER_IMG_W > pageW - 40) {
    HEADER_IMG_W = pageW - 40;
    HEADER_IMG_H = HEADER_IMG_W / ratio;
  }

  if (headerDataUrl) {
    doc.addImage(headerDataUrl, 'PNG', (pageW - HEADER_IMG_W) / 2, 5, HEADER_IMG_W, HEADER_IMG_H);
  }

  const HEADER_BOTTOM = (headerDataUrl ? HEADER_IMG_H + 5 : 0) + 6;
  doc.setDrawColor('#aaa');
  doc.setLineWidth(0.5);
  doc.line(LEFT_PAD, HEADER_BOTTOM, pageW - LEFT_PAD, HEADER_BOTTOM);

  const TITLE_Y = HEADER_BOTTOM + 14;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000');
  doc.text(title, pageW / 2, TITLE_Y, { align: 'center' });
  doc.setLineWidth(0.4);
  const textWidth = doc.getTextWidth(title);
  doc.line(pageW / 2 - (textWidth / 2) - 5, TITLE_Y + 2, pageW / 2 + (textWidth / 2) + 5, TITLE_Y + 2);

  const META_Y = TITLE_Y + 16;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000');
  doc.text(`Course: ${program || 'B.TECH'}`, LEFT_PAD, META_Y);
  doc.text(`Branch: ${branch || 'ALL'}`, pageW / 2, META_Y, { align: 'center' });
  doc.text(`Batch: ${batch || 'ALL'}`, pageW - LEFT_PAD, META_Y, { align: 'right' });

  if (extra) {
    const lines = extra.split('\n');
    lines.forEach((line, i) => {
      doc.text(line, pageW / 2, META_Y + 12 + (i * 12), { align: 'center' });
    });
    return META_Y + 12 + ((lines.length - 1) * 12);
  }

  return META_Y;
};
