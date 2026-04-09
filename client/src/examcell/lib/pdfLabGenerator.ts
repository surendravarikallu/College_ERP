import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { saveJsPdfAndShare, addGlobalFooterToJsPdf } from "./capacitorUtils";
import { addPdfHeader } from "./pdfUtils";

export interface LabInternalMarkRow {
    sNo: number;
    rollNumber: string;
    name: string;
    dayToDay: number;
    record: number;
    labTest: number;
    viva: number;
    total: number;
    inWords: string;
}

export interface LabInternalContext {
    labName: string;
    labCode: string;
    facultyName: string;
    dateOfExam: string;
    academicYear: string;
    yearSem: string;
    branch: string;
    regulation: string;
    program?: string;
    batch?: string;
    reportType?: string;
}

export const generateLabInternalPDF = async (
    data: LabInternalMarkRow[],
    context: LabInternalContext,
    forPreview: boolean = false
): Promise<string | null> => {
    const doc = new jsPDF("l", "pt", "a4");

    const pageWidth = doc.internal.pageSize.getWidth();

    // Use shared professional header
    const currentY = await addPdfHeader(
        doc,
        context.reportType ? `AWARD LIST FOR ${context.reportType.toUpperCase()}` : "AWARD LIST FOR LAB INTERNAL EVALUATION",
        context.branch,
        context.batch || context.academicYear,
        context.program || "B.TECH",
        `Lab: ${context.labCode} - ${context.labName} | Faculty: ${context.facultyName}\nYear/Sem: ${context.yearSem} | Date: ${context.dateOfExam}`
    );

    const tableData = data.map((row) => [
        row.sNo,
        row.rollNumber,
        row.name,
        row.dayToDay.toString(),
        row.record.toString(),
        row.labTest.toString(),
        row.viva.toString(),
        row.total.toString(),
        row.inWords
    ]);

    autoTable(doc, {
        startY: currentY + 20,
        head: [
            [
                { content: "S.No", rowSpan: 2 },
                { content: "Regd. No", rowSpan: 2 },
                { content: "Student Name", rowSpan: 2 },
                { content: "Lab Internal Marks", colSpan: 5 },
                { content: "In Words", rowSpan: 2 }
            ],
            [
                "Day to Day\n(5 Marks)",
                "Record\n(5 Marks)",
                "Internal Lab Test\n(15 Marks)",
                "Viva\n(5 Marks)",
                "Total\n(30 Marks)"
            ]
        ],
        body: tableData,
        theme: "grid",
        headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            halign: "center",
            valign: "middle",
            fontSize: 9,
            fontStyle: "bold",
            lineWidth: 0.1,
            lineColor: [0, 0, 0]
        },
        bodyStyles: {
            halign: "center",
            valign: "middle",
            fontSize: 9,
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            textColor: [0, 0, 0]
        },
        columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 80 },
            2: { cellWidth: 200 }, // Increased from 120
            3: { cellWidth: 55 }, // Increased from 45
            4: { cellWidth: 55 }, // Increased from 45
            5: { cellWidth: 65 }, // Increased from 55
            6: { cellWidth: 55 }, // Increased from 45
            7: { cellWidth: 55 }, // Increased from 45
            8: { cellWidth: "auto", halign: "left", fontSize: 8 }
        },
        margin: { left: 30, right: 30 }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    const footerY = Math.min(finalY + 40, doc.internal.pageSize.getHeight() - 30);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Signature of the Faculty", 30, footerY);
    doc.text("Head of the Department", pageWidth / 2, footerY, { align: "center" });
    doc.text("Principal", pageWidth - 30, footerY, { align: "right" });

    if (forPreview) {
        addGlobalFooterToJsPdf(doc);
        return doc.output('bloburl').toString();
    } else {
        await saveJsPdfAndShare(doc, `Lab_Marks_${context.labCode}_${context.branch}.pdf`);
        return null;
    }
};
