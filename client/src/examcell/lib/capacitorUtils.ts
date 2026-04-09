import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { jsPDF } from 'jspdf';
import * as ExcelJS from 'exceljs';

export async function saveAndShareFile(filename: string, base64Data: string, mimeType: string = 'application/octet-stream') {
    if (Capacitor.isNativePlatform()) {
        try {
            const savedFile = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Documents,
            });

            await Share.share({
                title: filename,
                url: savedFile.uri,
            });
        } catch (error) {
            console.error('Error saving or sharing file natively:', error);
            throw error;
        }
    } else {
        // Fallback for web, although libraries usually handle it natively (e.g. doc.save),
        // we offer this standard web fallback just in case.
        const link = document.createElement('a');
        link.href = `data:${mimeType};base64,${base64Data}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export async function saveBlobAndShareUrl(filename: string, blob: Blob, mimeType: string = 'application/octet-stream') {
    if (Capacitor.isNativePlatform()) {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                try {
                    const base64data = (reader.result as string).split(',')[1];
                    await saveAndShareFile(filename, base64data, mimeType);
                    resolve();
                } catch (e) { reject(e); }
            };
            reader.onerror = reject;
        });
    } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

export function addGlobalFooterToJsPdf(doc: jsPDF) {
    const pageCount = (doc.internal.pages as any[]).length - 1;
    const now = new Date();
    const timestamp = now.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    }) + ' ' + now.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        const width = doc.internal.pageSize.width;
        const height = doc.internal.pageSize.height;
        doc.text(`Page ${i} of ${pageCount}`, width - 30, height - 20, { align: 'right' });
        doc.text(`Generated on: ${timestamp}`, 30, height - 20, { align: 'left' });
    }
}

export async function saveJsPdfAndShare(doc: jsPDF, filename: string) {
    addGlobalFooterToJsPdf(doc);

    if (Capacitor.isNativePlatform()) {
        const base64Data = doc.output('datauristring').split(',')[1];
        await saveAndShareFile(filename, base64Data, 'application/pdf');
    } else {
        doc.save(filename);
    }
}

export async function saveXlsxAndShare(workbook: ExcelJS.Workbook, filename: string) {
    if (Capacitor.isNativePlatform()) {
        const buffer = await workbook.xlsx.writeBuffer();
        const base64Data = btoa(
            new Uint8Array(buffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        await saveAndShareFile(filename, base64Data, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

