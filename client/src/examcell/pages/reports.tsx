import React, { useState } from "react";
import { useBacklogReports, useCumulativeResultsReport, useToppersReport, useConsolidatedReport, useInternalMarksReport } from "../hooks/use-reports";
import { FileWarning, Loader2, Download, Filter, FileText, Trophy, Users, CheckCircle, XCircle, ArrowLeft, Calculator, AlertCircle } from "lucide-react";
import { authFetch } from "../hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { pdf } from "@react-pdf/renderer";
import { TranscriptDocument } from "../components/pdf/TranscriptDocument";
import { PDFDocument } from "pdf-lib";
import { formatSemester } from "../lib/utils";
import { BranchSelector, BatchSelector, ProgramSelector, SectionSelector, AcYearSelector } from "../components/academics/ReportFilters";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import * as ExcelJS from "exceljs";
import { saveJsPdfAndShare, saveXlsxAndShare, saveBlobAndShareUrl, addGlobalFooterToJsPdf } from "../lib/capacitorUtils";
import { generateProjectInternalPDF, ProjectInternalMarkRow, ProjectInternalContext } from "../lib/pdfProjectGenerator";
import { generateLabInternalPDF, LabInternalMarkRow, LabInternalContext } from "../lib/pdfLabGenerator";
import { numberToWords } from "../lib/numberToWords";
import { addPdfHeader } from "../lib/pdfUtils";




export default function Reports() {
  const [activeReport, setActiveReport] = useState("backlogs"); // backlogs, cumulative, toppers

  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [batch, setBatch] = useState("");
  const [program, setProgram] = useState("");
  const [section, setSection] = useState("");
  const [subjectCode, setSubjectCode] = useState("");

  // New States
  const [cumulativeYear, setCumulativeYear] = useState("All");
  const [toppersType, setToppersType] = useState("Semester");
  const [toppersTopN, setToppersTopN] = useState(5);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  const [internalReportType, setInternalReportType] = useState("WITH_QUIZ");
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const availableSemesters = (program === "MCA" || branch === "MCA")
    ? ["I", "II", "III", "IV"]
    : ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

  // Auto-lock branch when MCA is selected
  React.useEffect(() => {
    if (program === 'MCA') {
      setBranch('MCA');
    }
  }, [program]);

  // Data Hooks
  const { data: backlogs, isLoading: loadersBacklogs } = useBacklogReports({ branch, semester, batch, program, section });
  const { data: cumulativeData, isLoading: loadersCumulative } = useCumulativeResultsReport({ branch, batch, year: cumulativeYear, program, section });
  const { data: toppersData, isLoading: loadersToppers } = useToppersReport({
    branch, batch, program, section, type: toppersType,
    semester: toppersType === "Semester" ? semester || "I" : undefined,
    year: toppersType === "Year" ? cumulativeYear === "All" ? "1st" : cumulativeYear : undefined,
    topN: toppersTopN
  });
  const { data: consolidatedData, isLoading: loadersConsolidated } = useConsolidatedReport({
    branch, semester, academicYear, batch, program, section
  });

  // Internal Marks logic
  const { data: mappings } = useQuery<any[]>({
    queryKey: ['/api/v1/examcell/faculty-mappings'],
    queryFn: () => authFetch('/api/v1/examcell/faculty-mappings')
  });

  const availableSubjects = mappings?.filter((m: any) => {
    const branchList = m.branch.split(',').map((b: string) => b.trim().toUpperCase());
    const isBranchMatch = !branch || branchList.includes(branch.toUpperCase()) || branchList.includes('ALL');
    
    return isBranchMatch &&
      (!semester || m.semester === semester) &&
      (!batch || m.batch === batch) &&
      (!section || m.section === section);
  }) || [];

  const uniqueSubjects = Array.from(new Map(availableSubjects.map((item: any) => [item.subjectCode, item])).values())
    .filter((item: any) => {
      const name = (item.subjectName || "").toUpperCase();
      const code = (item.subjectCode || "").toUpperCase();
      const isProject = code.endsWith('P') || name.includes("PROJECT") || name.includes("SEMINAR") || name.includes("MINI PROJECT");
      const isLab = ["LAB", "LABORATORY", "WORKSHOP", "FULL STACK", "PYTHON", "SOFT SKILL"].some(kw => name.includes(kw));

      if (internalReportType === 'PROJECT') return isProject;
      if (internalReportType === 'LAB') return isLab && !isProject;
      
      // For regular reports, exclude projects and labs
      return !isProject && !isLab;
    });
  const canFetchInternal = !!(semester && batch && (branch ? subjectCode : true));

  const { data: internalMarksData, isLoading: loadersInternalMarks, isFetching: isFetchingInternalMarks } = useInternalMarksReport({
    branch, semester, subjectCode: branch ? subjectCode : "", batch, section
  });

  const exportInternalExcel = async () => {
    if (internalReportType === 'LAB' || internalReportType === 'PROJECT') {
      try {
        setIsGeneratingPdf(true);
        const workbook = new ExcelJS.Workbook();
        const safeName = subjectCode.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 31) || "Marks";
        const worksheet = workbook.addWorksheet(safeName);

        worksheet.mergeCells('A1:O1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = `INTERNAL MARKS CONSOLIDATED REPORT - ${subjectCode}`;
        titleCell.font = { size: 14, bold: true };
        titleCell.alignment = { horizontal: 'center' };

        if (internalReportType === 'PROJECT') {
          worksheet.addRow(['S.No', 'Roll Number', 'Name', 'PRC Assessment', 'Report', 'Seminar', 'Total']);
          worksheet.getRow(2).font = { bold: true };
          filteredInternalMarks.forEach((s: any, idx: number) => {
             worksheet.addRow([
               idx + 1, s.rollNumber, s.name,
               s.project?.assessment ?? '-', s.project?.report ?? '-', s.project?.seminar ?? '-', s.calc?.finalInternal ?? '-'
             ]);
          });
        } else {
          worksheet.addRow(['S.No', 'Roll Number', 'Name', 'Day to Day', 'Record', 'Internal Lab Test', 'Viva', 'Total']);
          worksheet.getRow(2).font = { bold: true };
          filteredInternalMarks.forEach((s: any, idx: number) => {
             worksheet.addRow([
               idx + 1, s.rollNumber, s.name,
               s.lab?.dayToDay ?? '-', s.lab?.record ?? '-', s.lab?.internal ?? '-', s.lab?.viva ?? '-', s.calc?.finalInternal ?? '-'
             ]);
          });
        }
        worksheet.columns.forEach((column: any) => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, (cell: any) => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) maxLength = columnLength;
          });
          column.width = maxLength < 10 ? 10 : maxLength + 2;
        });

        await saveXlsxAndShare(workbook, `${internalReportType}_Marks_${subjectCode}_${batch}.xlsx`);
      } catch (err) {
        console.error(err); alert(`Failed to export ${internalReportType} Excel`);
      } finally {
        setIsGeneratingPdf(false);
      }
      return;
    }

    const qs = new URLSearchParams({ branch, semester, subjectCode, batch, section: section || "" }).toString();
    const token = localStorage.getItem("auth_token");
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    
    try {
      const res = await fetch(`/api/v1/examcell/internal-marks/excel?${qs}`, { headers });
      if (!res.ok) throw new Error("Failed to download Excel");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('style', 'display: none');
      a.href = url;
      a.download = `Internal_Marks_${subjectCode}_${batch}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error(err);
      alert("Failed to export Excel due to authorization or server error.");
    }
  };

  const processStudentMarks = (row: any, reportType: string, isMCA: boolean) => {
    if (reportType === 'PROJECT') {
      const finalInternal = row.project?.total !== null && row.project?.total !== undefined ? Number(row.project.total) : null;
      return { ...row, calc: { finalInternal } };
    }
    if (reportType === 'LAB') {
      const finalInternal = row.lab?.total !== null && row.lab?.total !== undefined ? Number(row.lab.total) : null;
      return { ...row, calc: { finalInternal } };
    }
    let m1Total = null;
    let m2Total = null;
    if (reportType === 'WITH_QUIZ') {
      m1Total = row.mid1?.total ?? null;
      m2Total = row.mid2?.total ?? null;
    } else {
      m1Total = row.mid1 && (row.mid1.assgn !== null || row.mid1.desc !== null) ? ((row.mid1.assgn || 0) + (row.mid1.desc || 0)) : null;
      m2Total = row.mid2 && (row.mid2.assgn !== null || row.mid2.desc !== null) ? ((row.mid2.assgn || 0) + (row.mid2.desc || 0)) : null;
    }
    let best = null, least = null, eightyPercent = null, twentyPercent = null, finalInternal = null;
    if (isMCA) {
      if (m1Total !== null && m2Total !== null) {
        finalInternal = Math.ceil((m1Total + m2Total) / 2);
      } else if (m1Total !== null) {
        finalInternal = m1Total;
      } else if (m2Total !== null) {
        finalInternal = m2Total;
      }
      return { ...row, calc: { best: m1Total, least: m2Total, eightyPercent, twentyPercent, finalInternal }, noQuiz: { m1Total, m2Total, best: m1Total, least: m2Total, eightyPercent, twentyPercent, finalInternal } };
    }
    if (m1Total !== null && m2Total !== null) {
      best = Math.max(m1Total, m2Total);
      least = Math.min(m1Total, m2Total);
      eightyPercent = Number((best * 0.8).toFixed(2));
      twentyPercent = Number((least * 0.2).toFixed(2));
      if (row.isDesignThinking) {
        const scaledSum = eightyPercent + twentyPercent;
        const scaledMid = Number((scaledSum * 0.75).toFixed(2));
        finalInternal = Math.ceil(scaledMid + (row.labDayToDay || 0));
      } else {
        finalInternal = Math.round(eightyPercent + twentyPercent);
      }
    } else if (m1Total !== null) {
      best = m1Total; least = 0;
      eightyPercent = Number((best * 0.8).toFixed(2)); twentyPercent = 0;
      if (row.isDesignThinking) {
        const scaledMid = Number((eightyPercent * 0.75).toFixed(2));
        finalInternal = Math.ceil(scaledMid + (row.labDayToDay || 0));
      } else {
        finalInternal = Math.round(m1Total);
      }
    } else if (m2Total !== null) {
      best = m2Total; least = 0;
      eightyPercent = Number((best * 0.8).toFixed(2)); twentyPercent = 0;
      if (row.isDesignThinking) {
        const scaledMid = Number((eightyPercent * 0.75).toFixed(2));
        finalInternal = Math.ceil(scaledMid + (row.labDayToDay || 0));
      } else {
        finalInternal = Math.round(m2Total);
      }
    }
    return { ...row, calc: { best, least, eightyPercent, twentyPercent, finalInternal }, noQuiz: { m1Total, m2Total, best, least, eightyPercent, twentyPercent, finalInternal } };
  };

  const filteredInternalMarks = React.useMemo(() => {
    if (!internalMarksData) return [];
    return internalMarksData.map((row: any) => processStudentMarks(row, internalReportType, program === "MCA"));
  }, [internalMarksData, internalReportType, program]);

  const generateInternalMarksPdf = async (forPreview: boolean = false, overrideSubjectCode?: string, overrideData?: any[], existingDoc?: jsPDF) => {
    const currentData = overrideData || filteredInternalMarks;
    const currentSubjectCode = overrideSubjectCode || subjectCode;
    if (!currentData || currentData.length === 0) return null;
    try {
      if (!forPreview && !existingDoc) setIsGeneratingPdf(true);
      
      const doc = existingDoc || new jsPDF('landscape', 'pt', 'a4');
      if (existingDoc && (doc as any).internal.getNumberOfPages() > 0) {
        if ((doc as any).lastAutoTable) {
           doc.addPage('a4', 'landscape');
        }
      }

      const pageW = doc.internal.pageSize.width;

      let typeLabel = "WITH QUIZ";
      if (internalReportType === "PROJECT") typeLabel = "PROJECT MARKS";
      else if (internalReportType === "LAB") typeLabel = "LAB MARKS";
      else if (internalReportType === "WITHOUT_QUIZ") typeLabel = "WITHOUT QUIZ";
      else if (internalReportType === "WITHOUT_QUIZ_MID1") typeLabel = "MID-1 (NO QUIZ)";
      else if (internalReportType === "WITHOUT_QUIZ_MID2") typeLabel = "MID-2 (NO QUIZ)";
      else if (internalReportType === "WITHOUT_QUIZ_OVERALL") typeLabel = "OVERALL (NO QUIZ)";

      const selectedSubj = uniqueSubjects.find((s: any) => s.subjectCode === currentSubjectCode);
      const selectedMapping = availableSubjects.find((m: any) => m.subjectCode === currentSubjectCode);
      const subName = selectedSubj?.subjectName || "";
      const facName = selectedMapping?.facultyName || "Multiple Faculties";

      if (internalReportType === "LAB") {
        const labData: LabInternalMarkRow[] = currentData.map((row: any, index: number) => ({
          sNo: index + 1,
          rollNumber: row.rollNumber,
          name: row.name,
          dayToDay: row.lab?.dayToDay ?? 0,
          record: row.lab?.record ?? 0,
          labTest: row.lab?.internal ?? 0,
          viva: row.lab?.viva ?? 0,
          total: row.lab?.total ?? 0,
          inWords: row.lab?.total ? numberToWords(row.lab.total) : ''
        }));
        const context: LabInternalContext = {
          labName: subName,
          labCode: currentSubjectCode,
          facultyName: facName,
          dateOfExam: new Date().toLocaleDateString(),
          academicYear: batch?.split('-')[0] || "",
          yearSem: `${formatSemester(semester || 'I', program)}`,
          branch: branch || "",
          regulation: "R20",
          program: program,
          batch: batch
        };
        if (forPreview) return await generateLabInternalPDF(labData, context, true);
        await generateLabInternalPDF(labData, context, false);
        return null;
      }

      if (internalReportType === "PROJECT") {
        const projectData: ProjectInternalMarkRow[] = filteredInternalMarks.map((row: any, index: number) => ({
          sNo: index + 1,
          rollNumber: row.rollNumber,
          name: row.name,
          prcAssessment: row.project?.assessment ?? 0,
          report: row.project?.report ?? 0,
          seminar: row.project?.seminar ?? 0,
          total: row.project?.total ?? 0
        }));

        const context: ProjectInternalContext = {
          projectName: subName,
          projectCode: subjectCode,
          facultyName: facName,
          dateOfExam: new Date().toLocaleDateString(),
          academicYear: batch?.split('-')[0] || "",
          yearSem: `${formatSemester(semester || 'I', program)}`,
          branch: branch || "",
          regulation: "R20"
        };

        if (forPreview) {
          return await generateProjectInternalPDF(projectData, context, true);
        } else {
          await generateProjectInternalPDF(projectData, context, false);
          return null;
        }
      }

      let currentY = await addPdfHeader(doc, `INTERNAL MARKS REPORT - ${typeLabel}`, branch, batch, program,
        `Subject: ${subjectCode} - ${subName} | Faculty: ${facName}\nSemester: ${formatSemester(semester || 'I', program)}${section ? ` | Section: ${section}` : ''}`);
      currentY += 20;

      let head: any[] = [];
      let body: any[] = [];

      if (internalReportType === "WITH_QUIZ") {
        if (program === "MCA") {
          head = [
            [
              { content: 'S.No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
              { content: 'Roll No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
              { content: 'Name', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
              { content: 'MID-1 Marks', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
              { content: 'MID-2 Marks', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
              { content: 'Average', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
              { content: 'Final Internal', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
            ],
            []
          ];
          body = filteredInternalMarks.map((row: any, i: number) => [
            i + 1, row.rollNumber, row.name,
            row.mid1Total ?? '-', row.mid2Total ?? '-',
            row.calc?.finalInternal ?? '-', row.calc?.finalInternal ?? '-'
          ]);
        } else {
          const isDesignThinkingSub = filteredInternalMarks.some((r: any) => r.isDesignThinking);
          head = [
            [
              { content: 'S.No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
              { content: 'Roll No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
              { content: 'Name', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
              { content: 'MID 1', colSpan: 4, styles: { halign: 'center' } }, { content: 'MID 2', colSpan: 4, styles: { halign: 'center' } },
              { content: 'Best / Least', colSpan: 2, styles: { halign: 'center' } }, { content: isDesignThinkingSub ? 'Design Thinking Support' : 'Final Internal', colSpan: 3, styles: { halign: 'center' } }
            ],
            isDesignThinkingSub 
              ? ['Desc', 'Assgn', 'Quiz', 'Total', 'Desc', 'Assgn', 'Quiz', 'Total', 'Best', 'Least', 'Scale(22.5)', 'Day(7.5)', 'Total(30)']
              : ['Desc', 'Assgn', 'Quiz', 'Total', 'Desc', 'Assgn', 'Quiz', 'Total', 'Best', 'Least', '80%', '20%', 'Final']
          ];
          body = filteredInternalMarks.map((row: any, i: number) => [
            i + 1, row.rollNumber, row.name,
            row.mid1?.desc ?? '-', row.mid1?.assgn ?? '-', row.mid1?.quiz ?? '-', row.mid1?.total ?? '-',
            row.mid2?.desc ?? '-', row.mid2?.assgn ?? '-', row.mid2?.quiz ?? '-', row.mid2?.total ?? '-',
            row.calc?.best ?? '-', row.calc?.least ?? '-', 
            isDesignThinkingSub ? (row.calc?.eightyPercent !== null && row.calc?.twentyPercent !== null ? Number(((Number(row.calc.eightyPercent) + Number(row.calc.twentyPercent)) * 0.75).toFixed(2)) : '-') : (row.calc?.eightyPercent ?? '-'),
            isDesignThinkingSub ? (row.labDayToDay ?? '-') : (row.calc?.twentyPercent ?? '-'),
            row.calc?.finalInternal ?? '-'
          ]);
        }
      } else if (internalReportType === "WITHOUT_QUIZ") {
        head = [
          [
            { content: 'S.No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Roll No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Name', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'MID 1', colSpan: 3, styles: { halign: 'center' } }, { content: 'MID 2', colSpan: 3, styles: { halign: 'center' } }
          ],
          ['Desc', 'Assgn', 'Total', 'Desc', 'Assgn', 'Total']
        ];
        body = filteredInternalMarks.map((row: any, i: number) => [
          i + 1, row.rollNumber, row.name,
          row.mid1?.desc ?? '-', row.mid1?.assgn ?? '-', row.noQuiz.m1Total ?? '-',
          row.mid2?.desc ?? '-', row.mid2?.assgn ?? '-', row.noQuiz.m2Total ?? '-'
        ]);
      } else if (internalReportType === "WITHOUT_QUIZ_MID1") {
        head = [
          [
            { content: 'S.No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Roll No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Name', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'MID 1', colSpan: 3, styles: { halign: 'center' } }
          ],
          ['Desc', 'Assgn', 'Total']
        ];
        body = filteredInternalMarks.map((row: any, i: number) => [
          i + 1, row.rollNumber, row.name,
          row.mid1?.desc ?? '-', row.mid1?.assgn ?? '-', row.noQuiz.m1Total ?? '-'
        ]);
      } else if (internalReportType === "WITHOUT_QUIZ_MID2") {
        head = [
          [
            { content: 'S.No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Roll No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Name', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'MID 2', colSpan: 3, styles: { halign: 'center' } }
          ],
          ['Desc', 'Assgn', 'Total']
        ];
        body = filteredInternalMarks.map((row: any, i: number) => [
          i + 1, row.rollNumber, row.name,
          row.mid2?.desc ?? '-', row.mid2?.assgn ?? '-', row.noQuiz.m2Total ?? '-'
        ]);
      } else if (internalReportType === "WITHOUT_QUIZ_OVERALL") {
        head = [
          [
            { content: 'S.No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Roll No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Name', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'MID 1', colSpan: 3, styles: { halign: 'center' } }, { content: 'MID 2', colSpan: 3, styles: { halign: 'center' } },
            { content: 'Best / Least', colSpan: 2, styles: { halign: 'center' } }, { content: 'Final Internal', colSpan: 3, styles: { halign: 'center' } }
          ],
          ['Desc', 'Assgn', 'Total', 'Desc', 'Assgn', 'Total', 'Best', 'Least', '80%', '20%', 'Final']
        ];
        body = filteredInternalMarks.map((row: any, i: number) => [
          i + 1, row.rollNumber, row.name,
          row.mid1?.desc ?? '-', row.mid1?.assgn ?? '-', row.noQuiz.m1Total ?? '-',
          row.mid2?.desc ?? '-', row.mid2?.assgn ?? '-', row.noQuiz.m2Total ?? '-',
          row.noQuiz.best ?? '-', row.noQuiz.least ?? '-', row.noQuiz.eightyPercent ?? '-', row.noQuiz.twentyPercent ?? '-', row.noQuiz.finalInternal ?? '-'
        ]);
      } else if (internalReportType === "PROJECT") {
        const subName = uniqueSubjects.find((s: any) => s.subjectCode === subjectCode)?.subjectName || "Subject";
        const facName = availableSubjects.find((s: any) => s.subjectCode === subjectCode)?.facultyName || "Faculty";

        const context: ProjectInternalContext = {
          projectName: subName,
          projectCode: subjectCode,
          facultyName: facName,
          dateOfExam: "",
          academicYear: academicYear || "",
          yearSem: `${formatSemester(semester, program)}`,
          branch: branch,
          regulation: ""
        };
        const rows: ProjectInternalMarkRow[] = filteredInternalMarks.map((row: any, i: number) => ({
          sNo: i + 1,
          rollNumber: row.rollNumber,
          name: row.name,
          prcAssessment: row.project?.assessment ?? 0,
          report: row.project?.report ?? 0,
          seminar: row.project?.seminar ?? 0,
          total: row.project?.total ?? 0
        }));

        if (forPreview) {
          return await generateProjectInternalPDF(rows, context, true);
        } else {
          await generateProjectInternalPDF(rows, context, false);
          return null;
        }
      }

      autoTable(doc, {
        startY: currentY, head: head, body: body, theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, halign: 'center', textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 65 }, 2: { cellWidth: 180, halign: 'left' } },
        didParseCell: function (data) {
          if (data.section === 'body') {
            const rawCol = data.column.index;
            if (rawCol === 2) data.cell.styles.halign = 'left';
          }
        },
      });

      const lastY = (doc as any).lastAutoTable.finalY + 40;
      doc.setFontSize(10);
      doc.text("Signature of the Faculty", 40, lastY);
      doc.text("Head of the Department", doc.internal.pageSize.width / 2, lastY, { align: 'center' });
      doc.text("Principal", doc.internal.pageSize.width - 40, lastY, { align: 'right' });

      if (forPreview) {
        addGlobalFooterToJsPdf(doc);
        return doc.output('bloburl');
      } else {
        if (!existingDoc) {
          await saveJsPdfAndShare(doc, `Internal_Marks_${currentSubjectCode}_${batch}.pdf`);
        }
        return null;
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF");
      return null;
    } finally {
      if (!forPreview && !existingDoc) setIsGeneratingPdf(false);
    }
  };

  const exportInternalPdf = () => generateInternalMarksPdf(false);
  const previewInternalPdf = async () => {
    const url = await generateInternalMarksPdf(true);
    if (url) setPreviewPdfUrl(url.toString());
  };

  const exportBulkInternalPdf = async () => {
    if (!semester || !batch) {
      alert("Please select Semester and Batch for bulk export.");
      return;
    }
    if (uniqueSubjects.length === 0) {
      alert("No subjects available for this selection.");
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const token = (localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'));
      const doc = new jsPDF('landscape', 'pt', 'a4');
      
      let regularCount = 0;

      for (let i = 0; i < uniqueSubjects.length; i++) {
        const subj = uniqueSubjects[i];
        setPdfProgress(`Processing ${subj.subjectCode} (${i+1}/${uniqueSubjects.length})...`);
        
        const qs = new URLSearchParams({ semester, subjectCode: subj.subjectCode, batch, section: section || "" }).toString();
        const res = await fetch(`/api/v1/examcell/internal-marks/report?${qs}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) continue;
        const rawData = await res.json();
        if (!rawData || rawData.length === 0) continue;
        
        const processedData = rawData.map((row: any) => processStudentMarks(row, internalReportType, program === "MCA"));

        if (internalReportType !== 'PROJECT' && internalReportType !== 'LAB') {
          await generateInternalMarksPdf(false, subj.subjectCode, processedData, doc);
          regularCount++;
        } else {
          await generateInternalMarksPdf(false, subj.subjectCode, processedData); 
        }
      }
      
      if (internalReportType !== 'PROJECT' && internalReportType !== 'LAB' && regularCount > 0) {
        await saveJsPdfAndShare(doc, `Bulk_Internal_Marks_${batch}.pdf`);
      }
    } catch (err) {
      console.error(err); alert("Failed to generate bulk PDF");
    } finally {
      setIsGeneratingPdf(false); setPdfProgress("");
    }
  };

  const exportBulkInternalExcel = async () => {
    if (!semester || !batch) {
      alert("Please select Semester and Batch for bulk export.");
      return;
    }
    if (uniqueSubjects.length === 0) {
      alert("No subjects available for this selection.");
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const token = (localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'));
      const workbook = new ExcelJS.Workbook();
      
      let regularCount = 0;

      for (let i = 0; i < uniqueSubjects.length; i++) {
        const subj = uniqueSubjects[i];
        setPdfProgress(`Processing Excel ${subj.subjectCode} (${i+1}/${uniqueSubjects.length})...`);
        
        const qs = new URLSearchParams({ semester, subjectCode: subj.subjectCode, batch, section: section || "" }).toString();
        const res = await fetch(`/api/v1/examcell/internal-marks/report?${qs}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) continue;
        const rawData = await res.json();
        if (!rawData || rawData.length === 0) continue;
        
        const isProject = subj.subjectCode.endsWith('P') || (subj.subjectName||"").toUpperCase().includes("PROJECT") || (subj.subjectName||"").toUpperCase().includes("SEMINAR") || (subj.subjectName||"").toUpperCase().includes("MINI PROJECT");
        const isLab = ["LAB", "LABORATORY", "WORKSHOP", "FULL STACK", "PYTHON", "SOFT SKILL"].some(kw => (subj.subjectName||"").toUpperCase().includes(kw));
        const reportType = isProject ? 'PROJECT' : (isLab ? 'LAB' : internalReportType);
        const processedData = rawData.map((row: any) => processStudentMarks(row, reportType, program === "MCA"));

        const safeName = subj.subjectCode.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 31);
        let worksheet;
        try {
          worksheet = workbook.addWorksheet(safeName); 
        } catch(e) {
          worksheet = workbook.addWorksheet(safeName + "_" + i); 
        }

        worksheet.mergeCells('A1:O1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = `INTERNAL MARKS CONSOLIDATED REPORT - ${subj.subjectCode}`;
        titleCell.font = { size: 14, bold: true };
        titleCell.alignment = { horizontal: 'center' };

        if (reportType === 'PROJECT') {
          worksheet.addRow(['S.No', 'Roll Number', 'Name', 'PRC Assessment', 'Report', 'Seminar', 'Total']);
          worksheet.getRow(2).font = { bold: true };
           processedData.forEach((s: any, idx: number) => {
             worksheet.addRow([
               idx + 1, s.rollNumber, s.name,
               s.project?.assessment ?? '-', s.project?.report ?? '-', s.project?.seminar ?? '-', s.calc?.finalInternal ?? '-'
             ]);
          });
        } else if (reportType === 'LAB') {
          worksheet.addRow(['S.No', 'Roll Number', 'Name', 'Day to Day', 'Record', 'Internal Lab Test', 'Viva', 'Total']);
          worksheet.getRow(2).font = { bold: true };
          processedData.forEach((s: any, idx: number) => {
             worksheet.addRow([
               idx + 1, s.rollNumber, s.name,
               s.lab?.dayToDay ?? '-', s.lab?.record ?? '-', s.lab?.internal ?? '-', s.lab?.viva ?? '-', s.calc?.finalInternal ?? '-'
             ]);
          });
        } else if (reportType === 'WITH_QUIZ' && program === 'MCA') {
          worksheet.addRow(['S.No', 'Roll Number', 'Name', 'MID-1 Marks', 'MID-2 Marks', 'Average', 'Final Internal']);
          worksheet.getRow(2).font = { bold: true };
          processedData.forEach((s: any, idx: number) => {
             worksheet.addRow([
               idx + 1, s.rollNumber, s.name,
               s.mid1Total ?? '-', s.mid2Total ?? '-', s.calc?.finalInternal ?? '-', s.calc?.finalInternal ?? '-'
             ]);
          });
        } else {
          worksheet.addRow(['S.No', 'Roll Number', 'Name', 'MID-1 Desc', 'MID-1 Assgn', 'MID-1 Quiz', 'MID-1 Total', 'MID-2 Desc', 'MID-2 Assgn', 'MID-2 Quiz', 'MID-2 Total', 'Best', 'Least', '80%', '20%', 'Final Internal']);
          worksheet.getRow(2).font = { bold: true };
          processedData.forEach((s: any, idx: number) => {
            worksheet.addRow([
              idx + 1,
              s.rollNumber,
              s.name,
              s.mid1?.desc ?? '-', s.mid1?.assgn ?? '-', s.mid1?.quiz ?? '-', s.mid1?.total ?? '-',
              s.mid2?.desc ?? '-', s.mid2?.assgn ?? '-', s.mid2?.quiz ?? '-', s.mid2?.total ?? '-',
              s.calc?.best ?? '-', s.calc?.least ?? '-',
              s.calc?.eightyPercent ?? '-', s.calc?.twentyPercent ?? '-',
              s.calc?.finalInternal ?? '-'
            ]);
          });
        }
        
        worksheet.columns.forEach((column: any) => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, (cell: any) => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) maxLength = columnLength;
          });
          column.width = maxLength < 10 ? 10 : maxLength + 2;
        });
        
        regularCount++;
      }
      
      if (regularCount > 0) {
        await saveXlsxAndShare(workbook, `Bulk_Internal_Marks_${batch}.xlsx`);
      } else {
        alert("No internal marks found for any subjects.");
      }
    } catch (err) {
      console.error(err); alert("Failed to generate bulk Excel");
    } finally {
      setIsGeneratingPdf(false); setPdfProgress("");
    }
  };


  // --- EXPORT logic for existing BACKLOGS ---
  const exportBacklogsCSV = () => {
    if (!backlogs || backlogs.length === 0) return;
    const headers = ["Roll Number", "Name", "Branch", "Semester", "Subject Code", "Subject Name", "Attempts"];
    const rows = backlogs.map((b: any) => [
      b.student?.rollNumber || b.rollNumber,
      b.student?.name || b.name,
      b.student?.branch || b.branch,
      b.semester || "Multiple",
      b.subjectCode || "Multiple",
      `"${b.subjectName || "Multiple"}"`,
      b.attemptNo || b.backlogCount || 1
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map((e: any[]) => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `backlogs_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // --- EXCEL EXPORT: Backlogs (same data as PDF) ---
  const exportBacklogsExcel = async () => {
    try {
      const response = await fetch(`/api/v1/examcell/reports/cumulative-backlogs?branch=${encodeURIComponent(branch)}&batch=${encodeURIComponent(batch)}`, {
        headers: { 'Authorization': `Bearer ${(localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'))}` }
      });
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      if (!data || data.length === 0) { alert("No data"); return; }

      const semesters = availableSemesters;
      const semShortMap: Record<string, string> = { "I": "I - Sem I", "II": "I - Sem II", "III": "II - Sem I", "IV": "II - Sem II", "V": "III - Sem I", "VI": "III - Sem II", "VII": "IV - Sem I", "VIII": "IV - Sem II" };
      const semLabel = (s: string) => program === "MCA" ? formatSemester(s, program) : (semShortMap[s] ?? s);

      // Build two-row header (matching PDF layout)
      // Row 1: Sno, Roll No, Name, Branch, [semester group headers spanning 4 cols each], Total Blgs, CGPA, Tot. Crs
      const headerRow1: any[] = ['Sno', 'Roll No', 'Name of the Student', 'Branch'];
      semesters.forEach(sem => { headerRow1.push(semLabel(sem), '', '', ''); });
      headerRow1.push('Total Blgs', 'CGPA', 'Tot. Crs');

      // Row 2: empty for first 4, then Backlogs/Blgs/Crs/SGPA repeated, then empty for last 3
      const headerRow2: any[] = ['', '', '', ''];
      semesters.forEach(() => { headerRow2.push('Backlogs', 'Blgs', 'Crs', 'SGPA'); });
      headerRow2.push('', '', '');

      // Build data rows
      const rows = data.map((item: any, index: number) => {
        const row: (string | number)[] = [index + 1, item.student.rollNumber, item.student.name, item.student.branch];
        semesters.forEach(sem => {
          const sData = item.semesterData[sem] || { backlogs: [], backlogCount: 0, credits: 0, sgpa: 0 };
          row.push(sData.backlogs.join(', '));
          row.push(sData.backlogCount);
          row.push(sData.credits);
          row.push(Number(sData.sgpa.toFixed(2)));
        });
        row.push(item.totalBacklogs);
        row.push(Number(item.cgpa.toFixed(2)));
        row.push(item.totalCredits);
        return row;
      });

      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet('Backlogs');

      // Build two-row header (matching PDF layout)
      ws.addRow(headerRow1);
      ws.addRow(headerRow2);

      // Add data rows
      rows.forEach((row: (string | number)[]) => ws.addRow(row));

      // Merge cells for the two-row header (matching PDF)
      // Merge Sno, Roll No, Name, Branch across rows 1-2
      for (let c = 1; c <= 4; c++) ws.mergeCells(1, c, 2, c);
      
      // Merge each semester label across 4 columns in row 1
      semesters.forEach((_, i) => {
        const startCol = 5 + i * 4;
        ws.mergeCells(1, startCol, 1, startCol + 3);
      });
      
      // Merge Total Blgs, CGPA, Tot. Crs across rows 1-2
      const lastCols = [5 + 8 * 4, 5 + 8 * 4 + 1, 5 + 8 * 4 + 2];
      lastCols.forEach(c => ws.mergeCells(1, c, 2, c));

      // Set column widths
      ws.columns = [
        { width: 5 }, { width: 16 }, { width: 22 }, { width: 12 },
        ...semesters.flatMap(() => [{ width: 18 }, { width: 6 }, { width: 6 }, { width: 6 }]),
        { width: 8 }, { width: 6 }, { width: 6 }
      ];

      await saveXlsxAndShare(workbook, `Cumulative_Backlogs_${branch || 'ALL'}_${batch || 'ALL'}.xlsx`);
    } catch (err) { console.error(err); alert("Failed to generate Excel"); }
  };

  const exportBacklogsPDF = async () => {
    try {
      setIsGeneratingPdf(true);
      const response = await fetch(`/api/v1/examcell/reports/cumulative-backlogs?branch=${encodeURIComponent(branch)}&batch=${encodeURIComponent(batch)}`, { headers: { 'Authorization': `Bearer ${(localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'))}` } });
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      if (!data || data.length === 0) { alert("No data"); return; }

      const doc = new jsPDF('landscape', 'pt', 'a4');
      const HEADER_HEIGHT = await addPdfHeader(doc, 'BACKLOGS REPORT', branch, batch, program);

      const semesters = availableSemesters;
      const semShortLabel = (s: string) => program === "MCA" ? formatSemester(s, program) : ({ "I": "I - Sem I", "II": "I - Sem II", "III": "II - Sem I", "IV": "II - Sem II", "V": "III - Sem I", "VI": "III - Sem II", "VII": "IV - Sem I", "VIII": "IV - Sem II" }[s] ?? s);

      const head = [
        [
          { content: 'Sno', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Roll No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Name of the Student', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Branch', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          ...semesters.map(sem => ({ content: semShortLabel(sem), colSpan: 4, styles: { halign: 'center' } })),
          { content: 'Total\nBlgs', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'CGPA', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Tot.\nCrs', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ],
        [
          ...Array(8).fill([{ content: 'Backlogs', styles: { halign: 'center' } }, { content: 'Blgs', styles: { halign: 'center' } }, { content: 'Crs', styles: { halign: 'center' } }, { content: 'SGPA', styles: { halign: 'center' } }]).flat()
        ]
      ];

      const body = data.map((item: any, index: number) => {
        const row = [index + 1, item.student.rollNumber, item.student.name, item.student.branch];
        semesters.forEach(sem => {
          const sData = item.semesterData[sem] || { backlogs: [], backlogCount: 0, credits: 0, sgpa: 0 };
          row.push({ content: sData.backlogs.join(", "), styles: { cellWidth: 'auto', minCellWidth: 35 } });
          row.push(sData.backlogCount === 0 ? "0" : sData.backlogCount);
          row.push(sData.credits);
          row.push(sData.sgpa.toFixed(2));
        });
        row.push(item.totalBacklogs);
        row.push(item.cgpa.toFixed(2));
        row.push(item.totalCredits);
        return row;
      });

      autoTable(doc, {
        startY: HEADER_HEIGHT + 38, head, body, theme: 'grid',
        styles: { fontSize: 5, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1, cellPadding: 1, overflow: 'linebreak' },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', valign: 'middle', fontSize: 6 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 40, halign: 'center' },
          2: { cellWidth: 50 },
          3: { cellWidth: 35, halign: 'center' },
          // Crs columns (index 4+2, 8+2, 12+2, ...)
          6: { minCellWidth: 12 },
          10: { minCellWidth: 12 },
          14: { minCellWidth: 12 },
          18: { minCellWidth: 12 },
          22: { minCellWidth: 12 },
          26: { minCellWidth: 12 },
          30: { minCellWidth: 12 },
          34: { minCellWidth: 12 },
        },
        didParseCell: function (data) {
          if (data.section === 'body') {
            const rawCol = data.column.index;
            if (rawCol >= 4 && rawCol <= 35) {
              const semColIndex = (rawCol - 4) % 4;
              if (semColIndex === 1 || semColIndex === 2 || semColIndex === 3) data.cell.styles.halign = 'center';
              if (semColIndex === 0) data.cell.styles.fontSize = 4;
            }
            if (rawCol >= 36) data.cell.styles.halign = 'center';
          }
        },
      });

      await saveJsPdfAndShare(doc, `Cumulative_Backlogs_${branch || 'ALL'}_${batch || 'ALL'}.pdf`);
    } catch (error) {
      console.error(error); alert("Failed to generate PDF");
    } finally { setIsGeneratingPdf(false); }
  };

  // --- EXPORT logic for CUMULATIVE REPORT ---
  const exportCumulativePDF = async () => {
    if (!cumulativeData) return;
    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF('portrait', 'pt', 'a4');
      let currentY = await addPdfHeader(doc, 'CUMULATIVE RESULT REPORT', branch, batch, program, `Target: ${cumulativeYear === 'All' ? 'All Semesters' : cumulativeYear + ' Year'}`);
      currentY += 20;

      // Summary Table
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text("Semester Wise Summary", 30, currentY);
      currentY += 10;

      const summaryHead = [["Semester", "Registered", "Passed", "Failed", "Pass %"]];
      const summaryBody = Object.keys(cumulativeData.summary).map(sem => {
        const stats = cumulativeData.summary[sem];
        const pct = stats.registered > 0 ? ((stats.passed / stats.registered) * 100).toFixed(2) : "0.00";
        return [formatSemester(sem, program), stats.registered, stats.passed, stats.failed, `${pct}%`];
      });

      autoTable(doc, {
        startY: currentY, head: summaryHead, body: summaryBody, theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 30;

      // Passed List
      if (cumulativeData.passed.length > 0) {
        doc.setFontSize(11);
        const meanGpa = (cumulativeData.passed.reduce((acc: number, s: any) => acc + (parseFloat(s.cgpa) || 0), 0) / cumulativeData.passed.length).toFixed(2);
        doc.text(`Passed Students (0 Backlogs in target period)`, 30, currentY);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Average / Mean GPA of passed students: ${meanGpa}`, 30, currentY + 12);
        currentY += 22;

        let targetSems: string[] = [];
        if (cumulativeYear === '1st') targetSems = ["I", "II"];
        else if (cumulativeYear === '2nd') targetSems = ["III", "IV"];
        else if (cumulativeYear === '3rd') targetSems = ["V", "VI"];
        else if (cumulativeYear === '4th') targetSems = ["VII", "VIII"];
        else targetSems = availableSemesters;

        const passHead = [["S.No", "Roll Number", "Name", "Branch", ...targetSems.map(s => `${formatSemester(s, program)} SGPA`), "CGPA", "Percentage"]];
        const passBody = cumulativeData.passed.map((s: any, i: number) => {
          const rowData = [i + 1, s.rollNumber, s.name, s.branch];
          targetSems.forEach(sem => rowData.push(s.sgpas?.[sem] || "-"));
          rowData.push(s.cgpa || "-");
          rowData.push(s.percentage ? `${s.percentage}%` : "-");
          return rowData;
        });

        autoTable(doc, {
          startY: currentY,
          head: passHead,
          body: passBody,
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [230, 255, 230], textColor: [0, 0, 0] }
        });
        currentY = (doc as any).lastAutoTable.finalY + 30;
      }

      // Failed List
      if (cumulativeData.failed.length > 0) {
        doc.setFontSize(11);
        doc.text("Failed Students", 30, currentY);
        currentY += 10;
        const failHead = [["S.No", "Roll Number", "Name", "Branch"]];
        const failBody = cumulativeData.failed.map((s: any, i: number) => [i + 1, s.rollNumber, s.name, s.branch]);
        autoTable(doc, { startY: currentY, head: failHead, body: failBody, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [255, 230, 230], textColor: [0, 0, 0] } });
      }

      await saveJsPdfAndShare(doc, `Cumulative_Result_${branch || 'ALL'}_${batch || 'ALL'}.pdf`);
    } catch (err) { console.error(err); alert("Failed"); } finally { setIsGeneratingPdf(false); }
  };

  // --- EXCEL EXPORT: Cumulative (exact match to PDF) ---
  const exportCumulativeExcel = async () => {
    if (!cumulativeData) return;
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Semester Wise Summary (same as PDF summary table)
    const summaryWs = workbook.addWorksheet('Summary');
    const summaryHeader = ['Semester', 'Registered', 'Passed', 'Failed', 'Pass %'];
    summaryWs.addRow(summaryHeader);
    
    Object.keys(cumulativeData.summary).forEach(sem => {
      const s = cumulativeData.summary[sem];
      const pct = s.registered > 0 ? ((s.passed / s.registered) * 100).toFixed(2) : '0.00';
      summaryWs.addRow([formatSemester(sem, program), s.registered, s.passed, s.failed, `${pct}%`]);
    });

    // Sheet 2: Passed Students (exact same columns as PDF)
    let targetSems: string[] = [];
    if (cumulativeYear === '1st') targetSems = ['I', 'II'];
    else if (cumulativeYear === '2nd') targetSems = ['III', 'IV'];
    else if (cumulativeYear === '3rd') targetSems = ['V', 'VI'];
    else if (cumulativeYear === '4th') targetSems = ['VII', 'VIII'];
    else targetSems = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

    if (cumulativeData.passed.length > 0) {
      const passWs = workbook.addWorksheet('Passed Students');
      const passHeader = ['S.No', 'Roll Number', 'Name', 'Branch', ...targetSems.map(s => `${formatSemester(s, program)} SGPA`), 'CGPA', 'Percentage'];
      passWs.addRow(passHeader);
      
      cumulativeData.passed.forEach((s: any, i: number) => {
        const row: any[] = [i + 1, s.rollNumber, s.name, s.branch];
        targetSems.forEach(sem => row.push(s.sgpas?.[sem] || '-'));
        row.push(s.cgpa || '-');
        row.push(s.percentage ? `${s.percentage}%` : '-');
        passWs.addRow(row);
      });
    }

    // Sheet 3: Failed Students (exact same columns as PDF: S.No, Roll Number, Name, Branch)
    if (cumulativeData.failed.length > 0) {
      const failWs = workbook.addWorksheet('Failed Students');
      const failHeader = ['S.No', 'Roll Number', 'Name', 'Branch'];
      failWs.addRow(failHeader);
      cumulativeData.failed.forEach((s: any, i: number) => {
        failWs.addRow([i + 1, s.rollNumber, s.name, s.branch]);
      });
    }

    await saveXlsxAndShare(workbook, `Cumulative_Result_${branch || 'ALL'}_${batch || 'ALL'}.xlsx`);
  };

  // --- EXPORT logic for TOPPERS ---
  const exportToppersPDF = async () => {
    if (!toppersData || toppersData.length === 0) return;
    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF('portrait', 'pt', 'a4');
      const timeTarget = toppersType === "Semester" ? formatSemester(semester || "I", program) : `${cumulativeYear === 'All' ? '1st' : cumulativeYear} Year`;
      let currentY = await addPdfHeader(doc, `TOPPERS REPORT - ${toppersType.toUpperCase()}`, branch, batch, program, `Target: ${timeTarget}`);
      currentY += 20;

      const head = [["Rank", "Roll Number", "Name", "Branch", "GPA"]];
      const body = toppersData.map((s: any) => [s.rank, s.rollNumber, s.name, s.branch, s.gpa.toFixed(2)]);

      autoTable(doc, {
        startY: currentY, head: head, body: body, theme: 'grid',
        styles: { fontSize: 9, cellPadding: 4, halign: 'center' },
        columnStyles: { 2: { halign: 'left' } },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] }
      });

      await saveJsPdfAndShare(doc, `Toppers_${branch || 'ALL'}_${batch || 'ALL'}.pdf`);
    } catch (err) { console.error(err); alert("Failed"); } finally { setIsGeneratingPdf(false); }
  };

  // --- EXCEL EXPORT: Toppers (exact match to PDF) ---
  const exportToppersExcel = async () => {
    if (!toppersData || toppersData.length === 0) return;
    const header = ['Rank', 'Roll Number', 'Name', 'Branch', 'GPA'];
    const rows = toppersData.map((s: any) => [s.rank, s.rollNumber, s.name, s.branch, Number(s.gpa.toFixed(2))]);
    
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Toppers');
    ws.addRow(header);
    rows.forEach((row: any[]) => ws.addRow(row));
    
    ws.columns = [
      { width: 6 }, { width: 16 }, { width: 25 }, { width: 15 }, { width: 8 }
    ];
    
    await saveXlsxAndShare(workbook, `Toppers_${branch || 'ALL'}_${batch || 'ALL'}.xlsx`);
  };

  // --- EXPORT logic for BULK TRANSCRIPTS ---
  const exportBulkTranscripts = async () => {
    if (!branch || !batch) {
      alert("Please select both Branch and Batch to export transcripts.");
      return;
    }
    try {
      setIsGeneratingPdf(true);
      const token = (localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'));
      const res = await fetch(`/api/reports/batch-transcripts?branch=${encodeURIComponent(branch)}&batch=${encodeURIComponent(batch)}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Failed to fetch transcripts");
      const studentsDataRaw = await res.json();

      if (!studentsDataRaw || studentsDataRaw.length === 0) {
        alert("No students found for this branch and batch.");
        return;
      }

      const formattedData = studentsDataRaw.map((s: any) => ({
        student: s,
        results: s.results || [],
        photoUrl: s.photoUrl
      }));

      const CHUNK_SIZE = 20;
      const totalStudents = formattedData.length;

      setPdfProgress(`Initializing...`);
      // Create a new blank PDF
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < totalStudents; i += CHUNK_SIZE) {
        const chunk = formattedData.slice(i, i + CHUNK_SIZE);
        setPdfProgress(`Rendering ${Math.min(i + CHUNK_SIZE, totalStudents)} of ${totalStudents} transcripts...`);

        // Render this chunk to a Blob using React-PDF
        const chunkBlob = await pdf(<TranscriptDocument studentsData={chunk} />).toBlob();
        const chunkArrayBuffer = await chunkBlob.arrayBuffer();

        // Load the chunk into pdf-lib
        const chunkDoc = await PDFDocument.load(chunkArrayBuffer);
        const copiedPages = await mergedPdf.copyPages(chunkDoc, chunkDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));

        // Yield to the event loop so the browser doesn't freeze and React can update the progress UI
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setPdfProgress(`Merging and finalizing PDF...`);
      const finalPdfBytes = await mergedPdf.save();
      const finalBlob = new Blob([finalPdfBytes as BlobPart], { type: 'application/pdf' });

      await saveBlobAndShareUrl(`Bulk_Transcripts_${branch}_${batch}.pdf`, finalBlob, 'application/pdf');
    } catch (err) {
      console.error(err);
      alert("Failed to generate bulk transcripts PDF");
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress("");
    }
  };

  // --- EXPORT logic for CONSOLIDATED REPORT ---
  const exportConsolidatedPDF = async () => {
    if (!consolidatedData) return;
    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF('portrait', 'pt', 'a4');
      const pageW = doc.internal.pageSize.width;
      const pageH = doc.internal.pageSize.height;
      const LEFT_PAD = 30;

      // ── Header ──
      let currentY = await addPdfHeader(doc, 'SECTION-WISE CONSOLIDATED RESULT REPORT', branch, batch,
        `Semester: ${formatSemester(semester || 'I', program)}${academicYear ? `  |  Academic Year: ${academicYear}` : ''}${section ? `  |  Section: ${section}` : ''}`);
      currentY += 24;

      // ── 1. Section-wise Summary ──
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Section-wise Summary', LEFT_PAD, currentY);
      currentY += 10;

      const secHead = [['S.No', 'Section', 'Registered', 'Absent', 'Appeared', 'Passed', 'Failed', 'Pass %']];
      const secBody = consolidatedData.sectionSummary.map((s: any, i: number) => [
        i + 1, s.section, s.registered, s.absent, s.appeared, s.passed, s.failed, `${s.passPercentage}%`
      ]);

      // Add totals row
      const totals = consolidatedData.sectionSummary.reduce((acc: any, s: any) => ({
        registered: acc.registered + s.registered,
        absent: acc.absent + s.absent,
        appeared: acc.appeared + s.appeared,
        passed: acc.passed + s.passed,
        failed: acc.failed + s.failed,
      }), { registered: 0, absent: 0, appeared: 0, passed: 0, failed: 0 });
      const totalPct = totals.appeared > 0 ? ((totals.passed / totals.appeared) * 100).toFixed(2) : '0';
      secBody.push(['', 'TOTAL', totals.registered, totals.absent, totals.appeared, totals.passed, totals.failed, `${totalPct}%`]);

      autoTable(doc, {
        startY: currentY, head: secHead, body: secBody, theme: 'grid',
        styles: { fontSize: 9, cellPadding: 4, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3, halign: 'center' },
        headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
        didParseCell: (data) => {
          if (data.section === 'body' && data.row.index === secBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 30;

      // ── 2. Faculty Performance ──
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Faculty Performance', LEFT_PAD, currentY);
      currentY += 10;

      const subjHead = [['S.No', 'Subject Name', 'Faculty Name', 'Registered', 'Absent', 'Appeared', 'Passed', 'Failed', 'Pass %']];
      const subjBody = consolidatedData.subjectWise.map((s: any, i: number) => [
        i + 1, s.subjectName, s.facultyName || '-', s.registered, s.absent, s.appeared, s.passed, s.failed, `${s.passPercentage}%`
      ]);

      autoTable(doc, {
        startY: currentY, head: subjHead, body: subjBody, theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3 },
        headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 30 },
          1: { halign: 'left', cellWidth: 140 },
          2: { halign: 'left', cellWidth: 100 },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center' },
          6: { halign: 'center' },
          7: { halign: 'center' },
          8: { halign: 'center' },
        },
      });
      currentY = (doc as any).lastAutoTable.finalY + 30;

      // ── 3. Failed Status Breakdown ──
      const fb = consolidatedData.failedBreakdown;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Failed Status Breakdown', LEFT_PAD, currentY);
      currentY += 10;

      const fbHead = [['Category', 'Count']];
      const fbBody = [
        ['Single Subject Failed', fb.singleSubject],
        ['Double Subjects Failed', fb.doubleSubjects],
        ['Three Subjects Failed', fb.threeSubjects],
        ['Four Subjects Failed', fb.fourSubjects],
        ['Five or More Subjects Failed', fb.fiveOrMore],
      ];

      autoTable(doc, {
        startY: currentY, head: fbHead, body: fbBody, theme: 'grid',
        styles: { fontSize: 9, cellPadding: 4, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3 },
        headStyles: { fillColor: [255, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: { 0: { halign: 'left' }, 1: { halign: 'center' } },
      });

      // ── Signature placeholders on last page ──
      const lastTableY = (doc as any).lastAutoTable.finalY;
      const signatureY = Math.max(lastTableY + 70, pageH - 100);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Incharge of Examination', LEFT_PAD + 20, signatureY);
      doc.text('Principal', pageW - LEFT_PAD - 60, signatureY);

      doc.setLineWidth(0.5);
      doc.line(LEFT_PAD, signatureY - 12, LEFT_PAD + 120, signatureY - 12);
      doc.line(pageW - LEFT_PAD - 120, signatureY - 12, pageW - LEFT_PAD, signatureY - 12);

      await saveJsPdfAndShare(doc, `Consolidated_Report_${branch || 'ALL'}_${semester || 'ALL'}_${batch || 'ALL'}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate consolidated PDF');
    } finally { setIsGeneratingPdf(false); }
  };

  // --- EXCEL EXPORT: Consolidated (exact match to PDF) ---
  const exportConsolidatedExcel = async () => {
    if (!consolidatedData) return;
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Section-wise Summary (same as PDF page 1 table 1)
    const secWs = workbook.addWorksheet('Section Summary');
    const secHeader = ['S.No', 'Section', 'Registered', 'Absent', 'Appeared', 'Passed', 'Failed', 'Pass %'];
    secWs.addRow(secHeader);
    
    const secRows = consolidatedData.sectionSummary.map((s: any, i: number) => [
      i + 1, s.section, s.registered, s.absent, s.appeared, s.passed, s.failed, `${s.passPercentage}%`
    ]);
    const totals = consolidatedData.sectionSummary.reduce((acc: any, s: any) => ({
      registered: acc.registered + s.registered, absent: acc.absent + s.absent,
      appeared: acc.appeared + s.appeared, passed: acc.passed + s.passed, failed: acc.failed + s.failed,
    }), { registered: 0, absent: 0, appeared: 0, passed: 0, failed: 0 });
    const totalPct = totals.appeared > 0 ? ((totals.passed / totals.appeared) * 100).toFixed(2) : '0';
    secRows.push(['', 'TOTAL', totals.registered, totals.absent, totals.appeared, totals.passed, totals.failed, `${totalPct}%`]);
    secRows.forEach((row: any[]) => secWs.addRow(row));

    // Sheet 2: Faculty Performance
    const subjWs = workbook.addWorksheet('Faculty Performance');
    const subjHeader = ['S.No', 'Subject Name', 'Faculty Name', 'Registered', 'Absent', 'Appeared', 'Passed', 'Failed', 'Pass %'];
    subjWs.addRow(subjHeader);
    
    consolidatedData.subjectWise.map((s: any, i: number) => [
      i + 1, s.subjectName, s.facultyName || '-', s.registered, s.absent, s.appeared, s.passed, s.failed, `${s.passPercentage}%`
    ]).forEach((row: any[]) => subjWs.addRow(row));
    
    subjWs.columns = [
      { width: 5 }, { width: 35 }, { width: 22 }, { width: 10 }, { width: 8 }, { width: 10 }, { width: 8 }, { width: 8 }, { width: 8 }
    ];

    // Sheet 3: Failed Status Breakdown
    const failWs = workbook.addWorksheet('Failed Breakdown');
    const fb = consolidatedData.failedBreakdown;
    const fbHeader = ['Category', 'Count'];
    failWs.addRow(fbHeader);
    const fbRows = [
      ['Single Subject Failed', fb.singleSubject],
      ['Double Subjects Failed', fb.doubleSubjects],
      ['Three Subjects Failed', fb.threeSubjects],
      ['Four Subjects Failed', fb.fourSubjects],
      ['Five or More Subjects Failed', fb.fiveOrMore],
    ];
    fbRows.forEach((row: any[]) => failWs.addRow(row));

    await saveXlsxAndShare(workbook, `Consolidated_Report_${branch || 'ALL'}_${semester || 'ALL'}_${batch || 'ALL'}.xlsx`);
  };


  // Custom Selectors
  const ReportTypeSelector = () => (
    <div className="space-y-2 w-full lg:col-span-2 xl:col-span-1">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider text-primary">Report Type</label>
      <select
        value={activeReport}
        onChange={(e) => setActiveReport(e.target.value)}
        className="w-full px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
      >
        <option value="backlogs">Backlogs Report</option>
        <option value="cumulative">Cumulative Result Report</option>
        <option value="toppers">Semester & Year-wise Toppers List</option>
        <option value="transcripts">Bulk Batch Transcripts</option>
        <option value="consolidated">Section-wise Consolidated Report</option>
        <option value="internal-marks">Internal Marks Report</option>
      </select>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => window.history.back()} className="mt-1 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900 border border-slate-200">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Academic Reports</h1>
            <p className="text-slate-500 mt-1">Generate and analyze student performance data across various metrics.</p>
          </div>
        </div>
      </div>

      <div className="w-full">

        {/* --- BACKLOGS REPORT TAB --- */}
        {activeReport === "backlogs" && (
          <div className="mt-0 outline-none space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
              <ProgramSelector value={program} onChange={setProgram} />
              <BranchSelector value={branch} onChange={setBranch} />
              <div className="space-y-2 w-full">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Semester</label>
                <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                  <option value="">All Semesters</option>
                  {availableSemesters.map(sem => (<option key={sem} value={sem}>{formatSemester(sem, program)}</option>))}
                </select>
              </div>
              <BatchSelector value={batch} onChange={setBatch} program={program} />
              <SectionSelector value={section} onChange={setSection} batch={batch} branch={branch} />
              <ReportTypeSelector />

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:col-span-full xl:col-span-full justify-end mt-2">
                <button onClick={exportBacklogsExcel} disabled={!backlogs?.length} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-medium bg-white border border-slate-200 hover:bg-slate-50 hover:text-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                  <Download className="w-4 h-4" /> Excel
                </button>
                <button onClick={exportBacklogsPDF} disabled={isGeneratingPdf} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-medium bg-primary text-white shadow-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                  {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} PDF
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/40 relative overflow-hidden">
              {loadersBacklogs ? (
                <div className="p-16 flex flex-col items-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
              ) : !backlogs || backlogs.length === 0 ? (
                <div className="p-16 flex flex-col items-center"><FileWarning className="w-10 h-10 text-slate-400 mb-4" /><p>No backlogs found</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-slate-50 text-sm font-medium text-slate-500">
                        <th className="p-4 pl-6">Student</th><th className="p-4">Branch/Sem</th><th className="p-4">Status</th><th className="p-4">Failed Subject</th><th className="p-4">Attempts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {backlogs.map((record: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-4 pl-6"><div className="font-medium text-slate-900">{record.student?.name || record.name}</div><div className="text-xs text-slate-500">{record.student?.rollNumber || record.rollNumber}</div></td>
                          <td className="p-4"><div className="text-sm">{record.student?.branch || record.branch}</div><div className="text-xs text-slate-500">{record.semester ? formatSemester(record.semester, program) : "Multiple Semesters"}</div></td>
                          <td className="p-4">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${record.student?.status === "DETAINED" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                              {record.student?.status || "Active"}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-1 flex-wrap">
                              {record.subjects ? record.subjects.map((sub: any, idx: number) => (<span key={idx} className="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded">{sub.subjectCode}</span>)) : (<div><span className="text-sm text-destructive">{record.subjectName}</span><br /><span className="text-xs">{record.subjectCode}</span></div>)}
                            </div>
                          </td>
                          <td className="p-4">{record.backlogCount || record.attemptNo || 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- CUMULATIVE RESULT TAB --- */}
        {activeReport === "cumulative" && (
          <div className="mt-0 outline-none space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
              <ProgramSelector value={program} onChange={setProgram} />
              <BranchSelector value={branch} onChange={setBranch} />
              <BatchSelector value={batch} onChange={setBatch} program={program} />
              <SectionSelector value={section} onChange={setSection} batch={batch} branch={branch} />
              <div className="space-y-2 w-full">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Target Year</label>
                <select value={cumulativeYear} onChange={(e) => setCumulativeYear(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                  <option value="All">All Years</option>
                  <option value="1st">I year(semI & sem II)</option>
                  <option value="2nd">II year ( I sem & II sem)</option>
                  <option value="3rd">3rd Year (V, VI Sem)</option>
                  <option value="4th">4th Year (VII, VIII Sem)</option>
                </select>
              </div>
              <ReportTypeSelector />

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:col-span-full xl:col-span-full justify-end mt-2">
                <button onClick={exportCumulativePDF} disabled={isGeneratingPdf || !cumulativeData?.summary} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-medium bg-primary text-white shadow-sm hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                  {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} PDF Report
                </button>
                <button onClick={exportCumulativeExcel} disabled={!cumulativeData?.summary} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-medium bg-white border border-slate-200 hover:bg-slate-50 hover:text-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                  <Download className="w-4 h-4" /> Excel
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/40 relative overflow-hidden p-6">
              {loadersCumulative ? (
                <div className="p-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : !cumulativeData || !cumulativeData.summary ? (
                <div className="p-16 text-center text-slate-500">Select filters to view cumulative report.</div>
              ) : (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold mb-4">Semester Wise Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {Object.entries(cumulativeData.summary).map(([sem, stats]: [string, any]) => {
                        if (stats.registered === 0) return null;
                        const pct = ((stats.passed / stats.registered) * 100).toFixed(1);
                        return (
                          <div key={sem} className="bg-slate-50 border rounded-xl p-4">
                            <div className="font-bold text-slate-900 mb-2 border-b pb-2">{formatSemester(sem, program)}</div>
                            <div className="text-sm flex justify-between"><span>Reg:</span> <b>{stats.registered}</b></div>
                            <div className="text-sm flex justify-between text-green-600"><span>Pass:</span> <b>{stats.passed}</b></div>
                            <div className="text-sm flex justify-between text-red-500"><span>Fail:</span> <b>{stats.failed}</b></div>
                            <div className="mt-2 text-center text-xs font-bold bg-white py-1 rounded border">Pass: {pct}%</div>
                          </div>
                        )
                      })}
                    </div>
                    {cumulativeData.summary && Object.keys(cumulativeData.summary).length > 0 && (
                      <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                        <span className="font-medium text-emerald-800">Overall passed students up to current:</span>
                        <span className="text-xl font-bold text-emerald-600">{cumulativeData.passed.length} Students</span>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-8">
                    <div>
                      <div className="flex flex-col md:flex-row items-baseline gap-4 mb-4">
                        <h2 className="text-lg font-bold text-green-600 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" /> Passed Students ({cumulativeData.passed.length})
                        </h2>
                        {cumulativeData.passed.length > 0 && (
                          <span className="text-sm font-medium text-slate-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                            Average / Mean GPA: {
                              (cumulativeData.passed.reduce((acc: number, s: any) => acc + (parseFloat(s.cgpa) || 0), 0) / cumulativeData.passed.length).toFixed(2)
                            }
                          </span>
                        )}
                      </div>
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl max-h-[500px] overflow-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-emerald-100/90 sticky top-0 z-10 backdrop-blur-sm">
                            <tr className="text-emerald-800">
                              <th className="p-3">Roll No</th>
                              <th className="p-3">Name</th>
                              <th className="p-3">Branch</th>
                              {(() => {
                                let targetSems: string[] = [];
                                if (cumulativeYear === '1st') targetSems = ["I", "II"];
                                else if (cumulativeYear === '2nd') targetSems = ["III", "IV"];
                                else if (cumulativeYear === '3rd') targetSems = ["V", "VI"];
                                else if (cumulativeYear === '4th') targetSems = ["VII", "VIII"];
                                else targetSems = availableSemesters;
                                return targetSems.map(sem => <th key={sem} className="p-3">{formatSemester(sem, program)} SGPA</th>);
                              })()}
                              <th className="p-3">CGPA</th>
                              <th className="p-3">%</th>
                              <th className="p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-emerald-100">
                            {cumulativeData.passed.map((s: any, i: number) => {
                              let targetSems: string[] = [];
                              if (cumulativeYear === '1st') targetSems = ["I", "II"];
                              else if (cumulativeYear === '2nd') targetSems = ["III", "IV"];
                              else if (cumulativeYear === '3rd') targetSems = ["V", "VI"];
                              else if (cumulativeYear === '4th') targetSems = ["VII", "VIII"];
                              else targetSems = availableSemesters;
                              return (
                                <tr key={i}>
                                  <td className="p-3 font-medium whitespace-nowrap">{s.rollNumber}</td>
                                  <td className="p-3 min-w-[150px]">{s.name}</td>
                                  <td className="p-3">{s.branch}</td>
                                  {targetSems.map(sem => <td key={sem} className="p-3 font-mono">{s.sgpas?.[sem] || "-"}</td>)}
                                  <td className="p-3 font-bold">{s.cgpa || "-"}</td>
                                  <td className="p-3">{s.percentage ? `${s.percentage}%` : "-"}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${s.status === "DETAINED" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{s.status || "Active"}</span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold mb-4 text-red-500 flex items-center gap-2"><XCircle className="w-5 h-5" /> Failed Students ({cumulativeData.failed.length})</h2>
                      <div className="bg-red-50/50 border border-red-100 rounded-xl max-h-[500px] overflow-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-red-100/50 sticky top-0"><tr className="text-red-800"><th className="p-3">Roll No</th><th className="p-3">Name</th><th className="p-3">Branch</th><th className="p-3">Status</th></tr></thead>
                          <tbody className="divide-y divide-red-100">
                            {cumulativeData.failed.map((s: any, i: number) => (
                              <tr key={i}>
                                <td className="p-3 font-medium">{s.rollNumber}</td><td className="p-3">{s.name}</td><td className="p-3">{s.branch}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-1 text-xs rounded-full ${s.status === "DETAINED" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{s.status || "Active"}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TOPPERS LIST TAB --- */}
        {activeReport === "toppers" && (
          <div className="mt-0 outline-none space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
              <ProgramSelector value={program} onChange={setProgram} />
              <BranchSelector value={branch} onChange={setBranch} />
              <BatchSelector value={batch} onChange={setBatch} program={program} />
              <SectionSelector value={section} onChange={setSection} batch={batch} branch={branch} />
              <div className="space-y-2 w-full">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Type</label>
                <select value={toppersType} onChange={(e) => setToppersType(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                  <option value="Semester">Semester</option>
                  <option value="Year">Yearly</option>
                </select>
              </div>

              {toppersType === "Semester" ? (
                <div className="space-y-2 w-full">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Semester</label>
                  <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    {availableSemesters.map(sem => (<option key={sem} value={sem}>{formatSemester(sem, program)}</option>))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2 w-full">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Year</label>
                  <select value={cumulativeYear} onChange={(e) => setCumulativeYear(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    <option value="1st">1st Year (I, II Sem)</option>
                    <option value="2nd">2nd Year (III, IV Sem)</option>
                    <option value="3rd">3rd Year (V, VI Sem)</option>
                    <option value="4th">4th Year (VII, VIII Sem)</option>
                  </select>
                </div>
              )}

              <div className="space-y-2 w-full">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Top N</label>
                <input type="number" min="1" max="50" value={toppersTopN} onChange={(e) => setToppersTopN(parseInt(e.target.value) || 5)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>
              <ReportTypeSelector />

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:col-span-full xl:col-span-full justify-end mt-2">
                <button onClick={exportToppersPDF} disabled={isGeneratingPdf || !toppersData?.length} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-medium bg-amber-500 text-white shadow-sm hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                  {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />} PDF
                </button>
                <button onClick={exportToppersExcel} disabled={!toppersData?.length} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-medium bg-white border border-slate-200 hover:bg-slate-50 hover:text-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                  <Download className="w-4 h-4" /> Excel
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/40 relative overflow-hidden p-6">
              {loadersToppers ? (
                <div className="p-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : !toppersData || toppersData.length === 0 ? (
                <div className="p-16 text-center text-slate-500">No toppers data found for the selected criteria. Ensure students have cleared the selected timeframe with no backlogs in regular/reval attempts.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-amber-50 text-amber-900 border-b border-amber-200">
                        <th className="p-4 text-center w-20">Rank</th>
                        <th className="p-4">Roll Number</th>
                        <th className="p-4">Student Name</th>
                        <th className="p-4">Branch</th>
                        <th className="p-4 text-right">GPA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {toppersData.map((s: any, i: number) => (
                        <tr key={i} className={s.rank === 1 ? 'bg-amber-50/30 font-medium' : 'hover:bg-slate-50'}>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${s.rank === 1 ? 'bg-yellow-400 text-yellow-900 font-bold' : s.rank === 2 ? 'bg-slate-300 text-slate-800 font-bold' : s.rank === 3 ? 'bg-orange-300 text-orange-900 font-bold' : 'bg-slate-100 text-slate-600'}`}>
                              {s.rank}
                            </span>
                          </td>
                          <td className="p-4">{s.rollNumber}</td>
                          <td className="p-4">{s.name}</td>
                          <td className="p-4">{s.branch}</td>
                          <td className="p-4 text-right font-bold text-slate-900">{s.gpa.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- BULK TRANSCRIPTS TAB --- */}
        {activeReport === "transcripts" && (
          <div className="mt-0 outline-none space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
              <ProgramSelector value={program} onChange={setProgram} />
              <BranchSelector value={branch} onChange={setBranch} />
              <BatchSelector value={batch} onChange={setBatch} program={program} />
              <SectionSelector value={section} onChange={setSection} batch={batch} branch={branch} />
              <ReportTypeSelector />

              <div className="flex flex-col sm:flex-row justify-end pt-4 sm:col-span-full xl:col-span-full w-full">
                <button
                  onClick={exportBulkTranscripts}
                  disabled={isGeneratingPdf || !branch || !batch}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-primary/20"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {pdfProgress ? pdfProgress : "Generating PDF..."}
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Export Batch Transcripts
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/40 relative overflow-hidden p-16 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Automated Batch Transcripts</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Select a Branch and Batch to automatically generate a multi-page PDF document containing the full academic transcript for every student matching the criteria, formatted perfectly to the official Autonomous template.
              </p>
            </div>
          </div>
        )}

        {/* --- CONSOLIDATED REPORT TAB --- */}
        {activeReport === "consolidated" && (
          <div className="mt-0 outline-none space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
              <ProgramSelector value={program} onChange={setProgram} />
              <BranchSelector value={branch} onChange={setBranch} />
              <div className="space-y-2 w-full">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Semester</label>
                <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                  <option value="">Select Semester</option>
                  {availableSemesters.map(sem => (<option key={sem} value={sem}>{formatSemester(sem, program)}</option>))}
                </select>
              </div>
              <BatchSelector value={batch} onChange={setBatch} program={program} />
              <SectionSelector value={section} onChange={setSection} batch={batch} branch={branch} />
              <ReportTypeSelector />

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:col-span-full xl:col-span-full justify-end mt-2">
                <button onClick={exportConsolidatedPDF} disabled={isGeneratingPdf || !consolidatedData?.sectionSummary?.length}
                  className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-medium bg-primary text-white shadow-sm hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                  {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} PDF
                </button>
                <button onClick={exportConsolidatedExcel} disabled={!consolidatedData?.sectionSummary?.length}
                  className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-medium bg-white border border-slate-200 hover:bg-slate-50 hover:text-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                  <Download className="w-4 h-4" /> Excel
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/40 relative overflow-hidden p-6">
              {!branch || !semester ? (
                <div className="p-16 text-center text-slate-500">Select a <b>Branch</b> and <b>Semester</b> to generate the report.</div>
              ) : loadersConsolidated ? (
                <div className="p-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : !consolidatedData || !consolidatedData.sectionSummary?.length ? (
                <div className="p-16 text-center text-slate-500">No data found for the selected filters.</div>
              ) : (
                <div className="space-y-10">
                  {/* Section-wise Summary */}
                  <div>
                    <h2 className="text-lg font-bold mb-4 text-slate-900">Section-wise Summary</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700">
                            <th className="p-3 text-center border">S.No</th>
                            <th className="p-3 text-center border">Section</th>
                            <th className="p-3 text-center border">Registered</th>
                            <th className="p-3 text-center border">Absent</th>
                            <th className="p-3 text-center border">Appeared</th>
                            <th className="p-3 text-center border">Passed</th>
                            <th className="p-3 text-center border">Failed</th>
                            <th className="p-3 text-center border">Pass %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {consolidatedData.sectionSummary.map((s: any, i: number) => (
                            <tr key={s.section} className="hover:bg-slate-50">
                              <td className="p-3 text-center border">{i + 1}</td>
                              <td className="p-3 text-center border font-medium">{s.section}</td>
                              <td className="p-3 text-center border">{s.registered}</td>
                              <td className="p-3 text-center border">{s.absent}</td>
                              <td className="p-3 text-center border">{s.appeared}</td>
                              <td className="p-3 text-center border text-green-600 font-medium">{s.passed}</td>
                              <td className="p-3 text-center border text-red-500 font-medium">{s.failed}</td>
                              <td className="p-3 text-center border font-bold">{s.passPercentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Subject-wise Faculty Report */}
                  <div>
                    <h2 className="text-lg font-bold mb-4 text-slate-900">Faculty Performance</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-blue-50 text-slate-700">
                            <th className="p-3 text-center border">S.No</th>
                            <th className="p-3 text-left border">Subject Name</th>
                            <th className="p-3 text-left border">Faculty</th>
                            <th className="p-3 text-center border">Registered</th>
                            <th className="p-3 text-center border">Absent</th>
                            <th className="p-3 text-center border">Appeared</th>
                            <th className="p-3 text-center border">Passed</th>
                            <th className="p-3 text-center border">Failed</th>
                            <th className="p-3 text-center border">Pass %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {consolidatedData.subjectWise.map((s: any, i: number) => (
                            <tr key={s.subjectCode} className="hover:bg-slate-50">
                              <td className="p-3 text-center border">{i + 1}</td>
                              <td className="p-3 border">
                                <div className="font-medium">{s.subjectName}</div>
                                <div className="text-xs text-slate-400">{s.subjectCode}</div>
                              </td>
                              <td className="p-3 border">{s.facultyName || '-'}</td>
                              <td className="p-3 text-center border">{s.registered}</td>
                              <td className="p-3 text-center border">{s.absent}</td>
                              <td className="p-3 text-center border">{s.appeared}</td>
                              <td className="p-3 text-center border text-green-600">{s.passed}</td>
                              <td className="p-3 text-center border text-red-500">{s.failed}</td>
                              <td className="p-3 text-center border font-bold">{s.passPercentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Failed Status Breakdown */}
                  <div>
                    <h2 className="text-lg font-bold mb-4 text-red-600">Failed Status Breakdown</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {[
                        { label: 'Single Subject', count: consolidatedData.failedBreakdown.singleSubject },
                        { label: 'Two Subjects', count: consolidatedData.failedBreakdown.doubleSubjects },
                        { label: 'Three Subjects', count: consolidatedData.failedBreakdown.threeSubjects },
                        { label: 'Four Subjects', count: consolidatedData.failedBreakdown.fourSubjects },
                        { label: 'Five+ Subjects', count: consolidatedData.failedBreakdown.fiveOrMore },
                      ].map(item => (
                        <div key={item.label} className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-red-600">{item.count}</div>
                          <div className="text-xs text-red-500 mt-1">{item.label} Failed</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- INTERNAL MARKS REPORT TAB --- */}
        {activeReport === "internal-marks" && (
          <div className="mt-0 outline-none space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
              <ProgramSelector value={program} onChange={setProgram} />
              <BranchSelector value={branch} onChange={setBranch} />
              <BatchSelector value={batch} onChange={setBatch} program={program} />

              <div className="space-y-2 w-full">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Semester</label>
                <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                  <option value="">Select Semester</option>
                  {program === "MCA"
                    ? ["I", "II", "III", "IV"].map(s => <option key={s} value={s}>{formatSemester(s, program)}</option>)
                    : ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map(s => <option key={s} value={s}>{formatSemester(s, program)}</option>)
                  }
                </select>
              </div>

              <SectionSelector value={section} onChange={setSection} batch={batch} branch={branch} />

              <div className="space-y-2 w-full">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Subject</label>
                <select value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                  <option value="">Select Subject</option>
                  {uniqueSubjects.map((s: any) => (
                    <option key={s.subjectCode} value={s.subjectCode}>{s.subjectCode} - {s.subjectName || "Subject"}</option>
                  ))}
                </select>
              </div>

              <ReportTypeSelector />

              <div className="space-y-2 w-full">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Type</label>
                <select value={internalReportType} onChange={(e) => setInternalReportType(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                  <option value="WITH_QUIZ">With Quiz (Default)</option>
                  <option value="WITHOUT_QUIZ">Without Quiz</option>
                  <option value="PROJECT">Project Marks</option>
                  <option value="LAB">Lab Marks</option>
                  <option value="WITHOUT_QUIZ_MID1">Without Quiz (Mid-1 Only)</option>
                  <option value="WITHOUT_QUIZ_MID2">Without Quiz (Mid-2 Only)</option>
                  <option value="WITHOUT_QUIZ_OVERALL">Without Quiz (Overall)</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:col-span-full xl:col-span-full justify-end mt-2">
                <button
                  onClick={!branch ? exportBulkInternalExcel : exportInternalExcel}
                  disabled={isGeneratingPdf || !canFetchInternal || (!!branch && (!internalMarksData || internalMarksData.length === 0))}
                  className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-medium bg-white border border-slate-200 hover:bg-slate-50 hover:text-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  {isGeneratingPdf && pdfProgress?.includes("Excel") ? <><Loader2 className="w-4 h-4 animate-spin" /> {pdfProgress}</> : <><Download className="w-4 h-4" /> { !branch ? 'Bulk Excel' : 'Excel' }</>}
                </button>
                <button
                  onClick={previewInternalPdf}
                  disabled={!branch || !canFetchInternal || !internalMarksData || internalMarksData.length === 0}
                  className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-medium bg-white border border-slate-200 hover:bg-slate-50 hover:text-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  <FileText className="w-4 h-4" /> View
                </button>
                <button
                  onClick={!branch ? exportBulkInternalPdf : exportInternalPdf}
                  disabled={isGeneratingPdf || !canFetchInternal || (!!branch && (!internalMarksData || internalMarksData.length === 0))}
                  className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-medium bg-primary text-white shadow-sm hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  {isGeneratingPdf ? <><Loader2 className="w-4 h-4 animate-spin" /> {pdfProgress || "PDF"}</> : <><FileText className="w-4 h-4" /> {!branch ? "Bulk PDF" : "PDF"}</>}
                </button>
              </div>
            </div>

            {loadersInternalMarks || isFetchingInternalMarks ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-16 flex justify-center shadow-sm">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </div>
            ) : !branch && canFetchInternal ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-16 flex flex-col justify-center items-center shadow-sm text-slate-500">
                <FileText className="w-12 h-12 mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-600">Bulk Internal Marks Generation</h3>
                <p className="text-sm mt-1 max-w-sm text-center">Click <b>Bulk PDF</b> or <b>Bulk Excel</b> to generate internal marks for all {uniqueSubjects.length} subjects.</p>
              </div>
            ) : internalMarksData && internalMarksData.length > 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-primary" /> {internalReportType === 'PROJECT' ? 'Project Evaluation (Assessment 30, Report 15, Seminar 15)' : internalReportType === 'LAB' ? 'Lab Evaluation (Day to Day 15, Record 5, Internal 10, Viva 10)' : 'Final Internal Marks (Best 80% + Least 20%)'}
                  </span>
                  <span className="text-sm text-slate-500">
                    {internalMarksData.length} Students
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-100 text-sm font-semibold text-slate-600 border-b border-slate-200">
                        <th className="p-4 w-12 text-center" rowSpan={2}>S.No</th>
                        <th className="p-4 w-32" rowSpan={2}>Roll No</th>
                        <th className="p-4 min-w-[280px]" rowSpan={2}>Student Name</th>

                        {internalReportType === 'PROJECT' ? (
                          <>
                            <th className="p-2 border-l border-slate-200 text-center bg-slate-50" rowSpan={2}>Assessment</th>
                            <th className="p-2 text-center bg-slate-50" rowSpan={2}>Report</th>
                            <th className="p-2 text-center bg-slate-50" rowSpan={2}>Seminar</th>
                            <th className="p-2 border-l border-slate-200 text-center bg-emerald-50/50" rowSpan={2}>Total</th>
                          </>
                        ) : internalReportType === 'LAB' ? (
                          <>
                            <th className="p-2 border-l border-slate-200 text-center bg-slate-50" rowSpan={2}>Day to Day</th>
                            <th className="p-2 text-center bg-slate-50" rowSpan={2}>Record</th>
                            <th className="p-2 text-center bg-slate-50" rowSpan={2}>Internal Lab Test</th>
                            <th className="p-2 text-center bg-slate-50" rowSpan={2}>Viva</th>
                            <th className="p-2 border-l border-slate-200 text-center bg-emerald-50/50" rowSpan={2}>Total</th>
                          </>
                        ) : (
                          <>
                            {(internalReportType === 'WITH_QUIZ' || internalReportType === 'WITHOUT_QUIZ' || internalReportType === 'WITHOUT_QUIZ_MID1' || internalReportType === 'WITHOUT_QUIZ_OVERALL') && (
                              <th className="p-2 border-l border-slate-200 text-center bg-slate-50" colSpan={internalReportType === 'WITH_QUIZ' ? 4 : 3}>MID 1</th>
                            )}
                            {(internalReportType === 'WITH_QUIZ' || internalReportType === 'WITHOUT_QUIZ' || internalReportType === 'WITHOUT_QUIZ_MID2' || internalReportType === 'WITHOUT_QUIZ_OVERALL') && (
                              <th className="p-2 border-l border-slate-200 text-center bg-slate-50" colSpan={internalReportType === 'WITH_QUIZ' ? 4 : 3}>MID 2</th>
                            )}
                            {(internalReportType === 'WITH_QUIZ' || internalReportType === 'WITHOUT_QUIZ_OVERALL') && (
                              <>
                                <th className="p-2 border-l border-slate-200 text-center bg-indigo-50/50" colSpan={2}>Best / Least</th>
                                <th className="p-2 border-l border-slate-200 text-center bg-emerald-50/50" colSpan={3}>
                                  {filteredInternalMarks.some((r: any) => r.isDesignThinking) ? 'Design Thinking Support' : 'Final Internal'}
                                </th>
                              </>
                            )}
                          </>
                        )}
                      </tr>
                      <tr className="bg-slate-100 text-xs font-semibold text-slate-500 border-b border-slate-200">
                        {(internalReportType === 'WITH_QUIZ' || internalReportType === 'WITHOUT_QUIZ' || internalReportType === 'WITHOUT_QUIZ_MID1' || internalReportType === 'WITHOUT_QUIZ_OVERALL') && (
                          <>
                            <th className="p-2 border-l border-slate-200 text-center w-16">Desc</th>
                            <th className="p-2 text-center w-16">Assgn</th>
                            {internalReportType === 'WITH_QUIZ' && <th className="p-2 text-center w-16">Quiz</th>}
                            <th className="p-2 text-center w-16 text-slate-700">Total</th>
                          </>
                        )}
                        {(internalReportType === 'WITH_QUIZ' || internalReportType === 'WITHOUT_QUIZ' || internalReportType === 'WITHOUT_QUIZ_MID2' || internalReportType === 'WITHOUT_QUIZ_OVERALL') && (
                          <>
                            <th className="p-2 border-l border-slate-200 text-center w-16">Desc</th>
                            <th className="p-2 text-center w-16">Assgn</th>
                            {internalReportType === 'WITH_QUIZ' && <th className="p-2 text-center w-16">Quiz</th>}
                            <th className="p-2 text-center w-16 text-slate-700">Total</th>
                          </>
                        )}
                        {(internalReportType === 'WITH_QUIZ' || internalReportType === 'WITHOUT_QUIZ_OVERALL') && (
                          <>
                            <th className="p-2 border-l border-slate-200 text-center w-16 bg-indigo-50/50">Best</th>
                            <th className="p-2 text-center w-16 bg-indigo-50/50">Least</th>
                            {filteredInternalMarks.some((r: any) => r.isDesignThinking) ? (
                              <>
                                <th className="p-2 border-l border-slate-200 text-center w-20 bg-emerald-50/50">Scale(22.5)</th>
                                <th className="p-2 text-center w-20 bg-emerald-50/50">Day(7.5)</th>
                                <th className="p-2 text-center w-24 bg-emerald-500/10 text-emerald-700 font-bold">Total(30)</th>
                              </>
                            ) : (
                              <>
                                <th className="p-2 border-l border-slate-200 text-center w-16 bg-emerald-50/50">80%</th>
                                <th className="p-2 text-center w-16 bg-emerald-50/50">20%</th>
                                <th className="p-2 text-center w-20 bg-emerald-500/10 text-emerald-700 font-bold">Final</th>
                              </>
                            )}
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {filteredInternalMarks.map((row: any, idx: number) => (
                        <tr key={row.rollNumber} className="hover:bg-slate-50/50 transition-colors text-sm">
                          <td className="p-4 text-center text-slate-400 w-12">{idx + 1}</td>
                          <td className="p-4 font-medium text-slate-700 w-32">{row.rollNumber}</td>
                          <td className="p-4 text-slate-600 truncate max-w-[280px]">{row.name}</td>

                          {internalReportType === 'PROJECT' ? (
                            <>
                              <td className="p-2 border-l border-slate-100 text-center text-slate-600">{row.project?.assessment ?? '—'}</td>
                              <td className="p-2 text-center text-slate-600">{row.project?.report ?? '—'}</td>
                              <td className="p-2 text-center text-slate-600">{row.project?.seminar ?? '—'}</td>
                              <td className="p-2 border-l border-slate-100 text-center font-bold text-emerald-700 bg-emerald-50">{row.calc?.finalInternal ?? '—'}</td>
                            </>
                          ) : internalReportType === 'LAB' ? (
                            <>
                              <td className="p-2 border-l border-slate-100 text-center text-slate-600">{row.lab?.dayToDay ?? '—'}</td>
                              <td className="p-2 text-center text-slate-600">{row.lab?.record ?? '—'}</td>
                              <td className="p-2 text-center text-slate-600">{row.lab?.internal ?? '—'}</td>
                              <td className="p-2 text-center text-slate-600">{row.lab?.viva ?? '—'}</td>
                              <td className="p-2 border-l border-slate-100 text-center font-bold text-emerald-700 bg-emerald-50">{row.calc?.finalInternal ?? '—'}</td>
                            </>
                          ) : (
                            <>
                              {(internalReportType === 'WITH_QUIZ' || internalReportType === 'WITHOUT_QUIZ' || internalReportType === 'WITHOUT_QUIZ_MID1' || internalReportType === 'WITHOUT_QUIZ_OVERALL') && (
                                <>
                                  <td className="p-2 border-l border-slate-100 text-center text-slate-500">{row.mid1?.desc ?? '—'}</td>
                                  <td className="p-2 text-center text-slate-500">{row.mid1?.assgn ?? '—'}</td>
                                  {internalReportType === 'WITH_QUIZ' && <td className="p-2 text-center text-slate-500">{row.mid1?.quiz ?? '—'}</td>}
                                  <td className="p-2 text-center font-medium text-slate-700 bg-slate-50">{internalReportType === 'WITH_QUIZ' ? (row.mid1?.total ?? '—') : (row.noQuiz.m1Total ?? '—')}</td>
                                </>
                              )}

                              {(internalReportType === 'WITH_QUIZ' || internalReportType === 'WITHOUT_QUIZ' || internalReportType === 'WITHOUT_QUIZ_MID2' || internalReportType === 'WITHOUT_QUIZ_OVERALL') && (
                                <>
                                  <td className="p-2 border-l border-slate-100 text-center text-slate-500">{row.mid2?.desc ?? '—'}</td>
                                  <td className="p-2 text-center text-slate-500">{row.mid2?.assgn ?? '—'}</td>
                                  {internalReportType === 'WITH_QUIZ' && <td className="p-2 text-center text-slate-500">{row.mid2?.quiz ?? '—'}</td>}
                                  <td className="p-2 text-center font-medium text-slate-700 bg-slate-50">{internalReportType === 'WITH_QUIZ' ? (row.mid2?.total ?? '—') : (row.noQuiz.m2Total ?? '—')}</td>
                                </>
                              )}

                              {(internalReportType === 'WITH_QUIZ' || internalReportType === 'WITHOUT_QUIZ_OVERALL') && (
                                <>
                                  <td className="p-2 border-l border-slate-100 text-center text-indigo-600 bg-indigo-50/30 font-medium">{internalReportType === 'WITH_QUIZ' ? (row.calc?.best ?? '—') : (row.noQuiz.best ?? '—')}</td>
                                  <td className="p-2 text-center text-indigo-400 bg-indigo-50/30">{internalReportType === 'WITH_QUIZ' ? (row.calc?.least ?? '—') : (row.noQuiz.least ?? '—')}</td>
                                  <td className="p-2 border-l border-slate-100 text-center text-emerald-600 bg-emerald-50/30">{internalReportType === 'WITH_QUIZ' ? (row.calc?.eightyPercent ?? '—') : (row.noQuiz.eightyPercent ?? '—')}</td>
                                  <td className="p-2 text-center text-emerald-500 bg-emerald-50/30">{internalReportType === 'WITH_QUIZ' ? (row.calc?.twentyPercent ?? '—') : (row.noQuiz.twentyPercent ?? '—')}</td>
                                  <td className="p-2 text-center font-bold text-emerald-700 bg-emerald-50 text-base">{internalReportType === 'WITH_QUIZ' ? (row.calc?.finalInternal ?? '—') : (row.noQuiz.finalInternal ?? '—')}</td>
                                </>
                              )}
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : canFetchInternal ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-16 flex flex-col justify-center items-center shadow-sm text-slate-500">
                <AlertCircle className="w-8 h-8 mb-3 text-slate-300" />
                <p>No marks data found for this selection.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50/50 rounded-3xl border border-slate-100 border-dashed">
                <Calculator className="w-12 h-12 mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-600">Select filters to View Report</h3>
                <p className="text-sm mt-1 max-w-sm text-center">Choose Branch, Semester, Subject, and Batch to generate the internal marks report.</p>
              </div>
            )}
          </div>
        )}

      </div>

      <Dialog open={!!previewPdfUrl} onOpenChange={(open: boolean) => !open && setPreviewPdfUrl(null)}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-slate-50 shrink-0">
            <DialogTitle className="text-xl font-bold font-display text-slate-800">Internal Marks Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-slate-200">
            {previewPdfUrl && (
              <iframe src={`${previewPdfUrl}#toolbar=0`} className="w-full h-full border-0" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

