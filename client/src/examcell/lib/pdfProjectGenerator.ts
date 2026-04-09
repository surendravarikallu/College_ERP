import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { saveJsPdfAndShare, addGlobalFooterToJsPdf } from "./capacitorUtils";
import { numberToWords } from "./numberToWords";
import { addPdfHeader } from "./pdfUtils";

export interface ProjectInternalMarkRow {
    sNo: number;
    rollNumber: string;
    name: string;
    prcAssessment: number;
    report: number;
    seminar: number;
    total: number;
}

export interface ProjectInternalContext {
    projectName: string;
    projectCode: string;
    facultyName: string;
    dateOfExam: string;
    academicYear: string;
    yearSem: string;
    branch: string;
    regulation: string;
    program?: string;
    batch?: string;
}

export const generateProjectInternalPDF = async (
    data: ProjectInternalMarkRow[],
    context: ProjectInternalContext,
    forPreview: boolean = false
): Promise<string | null> => {
    const doc = new jsPDF("l", "pt", "a4");

    const pageWidth = doc.internal.pageSize.getWidth();
    // Header using shared utility for professionalism
    const currentY = await addPdfHeader(
        doc, 
        "PROJECT AWARD SHEET", 
        context.branch, 
        context.academicYear, 
        context.program || "B.TECH", 
        `Subject: ${context.projectCode} - ${context.projectName} | Faculty: ${context.facultyName}\nYear/Sem: ${context.yearSem} | Date: ${context.dateOfExam}`
    );

    const tableData = data.map((row) => [
        row.sNo,
        row.rollNumber,
        row.name,
        row.prcAssessment.toString(),
        row.report.toString(),
        row.seminar.toString(),
        row.total.toString(),
        row.total !== null ? numberToWords(row.total) : '-'
    ]);

    autoTable(doc, {
        startY: currentY + 20,
        head: [
            [
                { content: "S.NO", rowSpan: 2 },
                { content: "Regd No", rowSpan: 2 },
                { content: "Name", rowSpan: 2 },
                { content: "Project Internal Marks", colSpan: 4 },
                { content: "In words", rowSpan: 2 }
            ],
            [
                "PRC Assessment",
                "Report",
                "Seminar",
                "Total"
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
            0: { cellWidth: 25 },
            1: { cellWidth: 75 },
            2: { cellWidth: 180, halign: 'left' },
            3: { cellWidth: 45 },
            4: { cellWidth: 45 },
            5: { cellWidth: 45 },
            6: { cellWidth: 45 },
            7: { cellWidth: "auto", halign: "left" }
        },
        margin: { left: 30, right: 30 },
        didDrawPage: (data) => {
            // Optional: Footer on each page if needed
        }
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
        await saveJsPdfAndShare(doc, `Project_Evaluation_Report_${context.projectCode}_${context.academicYear}.pdf`);
        return null;
    }
};
