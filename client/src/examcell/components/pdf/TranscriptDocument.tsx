import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register fonts if necessary, otherwise use Helvetica
Font.register({
    family: 'Open Sans',
    fonts: [
        { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf' },
        { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf', fontWeight: 600 },
        { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-700.ttf', fontWeight: 700 }, // bold
    ]
});

const SemLabels: Record<string, string> = {
    "I": "I Year I Semester",
    "II": "I Year II Semester",
    "III": "II Year I Semester",
    "IV": "II Year II Semester",
    "V": "III Year I Semester",
    "VI": "III Year II Semester",
    "VII": "IV Year I Semester",
    "VIII": "IV Year II Semester",
};

const RomanSems = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

// Organize results by year and semester, selecting the BEST attempt for each subject logically
const organizeResults = (results: any[]) => {
    const sems: Record<string, any[]> = {};

    // Group by semester -> subjectKey -> attempts
    const grouped: Record<string, Record<string, any[]>> = {};
    results.forEach(r => {
        if (!r.semester) return;
        if (!grouped[r.semester]) grouped[r.semester] = {};
        const subjectKey = r.subject?.subjectCode || r.subjectId || r.subject?.subjectName || r.id;
        if (!grouped[r.semester][subjectKey]) grouped[r.semester][subjectKey] = [];
        grouped[r.semester][subjectKey].push(r);
    });

    Object.entries(grouped).forEach(([sem, subjectMap]) => {
        const finalResults: any[] = [];
        Object.entries(subjectMap).forEach(([key, attempts]) => {
            const sorted = [...attempts].sort((a, b) => (a.attemptNo || 0) - (b.attemptNo || 0));
            const realAttempts = sorted.filter(a => a.grade?.toUpperCase()?.trim() !== 'CHANGE');

            let chosen;
            if (realAttempts.length > 0) {
                const passAttempt = realAttempts.find(a => a.status === 'PASS');
                chosen = passAttempt ? passAttempt : realAttempts[realAttempts.length - 1];
            } else if (sorted.length > 0) {
                chosen = sorted[sorted.length - 1];
            }

            if (chosen) {
                chosen._orderHint = sorted[0].id || 0;
                finalResults.push(chosen);
            }
        });

        // Add a flag to the array object itself to detect if there's an active backlog in this semester
        const hasBacklogs = finalResults.some(r => r.status === 'BACKLOG');
        (finalResults as any).hasBacklog = hasBacklogs;

        finalResults.sort((a, b) => a._orderHint - b._orderHint);
        sems[sem] = finalResults;
    });

    return sems;
};

// Calculate exact CGPA up to a given semester using deduplicated best attempts
const calcCGPA = (organizedSems: Record<string, any[]>, upToSemIndex: number) => {
    const allowedSems = RomanSems.slice(0, upToSemIndex + 1);

    let totalCredits = 0;
    let totalPoints = 0;

    let hasAnyBacklogs = false;

    allowedSems.forEach(sem => {
        const semList = organizedSems[sem] || [];

        // If any semester UP TO this point has an active backlog, the CGPA is technically locked/invalid
        if ((semList as any).hasBacklog) {
            hasAnyBacklogs = true;
        }

        semList.forEach(r => {
            // Include credits of passed subjects or failed subjects depending on strict policy.
            // But the transcript normally counts credits of the *resolved attempt* if it has points.
            if (r.subject?.credits && r.gradePoints > 0) {
                totalCredits += r.subject.credits;
                totalPoints += (r.subject.credits * r.gradePoints);
            }
        });
    });

    if (hasAnyBacklogs) return "";
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
};

// Dynamic styles factory based on how many year-rows we're rendering
const createStyles = (yearCount: number) => {
    // Scale up when fewer semesters are shown
    const isCompact = yearCount >= 3;
    const baseFontSize = isCompact ? 5.5 : (yearCount === 1 ? 7.5 : 6.5);
    const semTitleSize = isCompact ? 6.5 : (yearCount === 1 ? 9 : 7.5);
    const headerHeight = isCompact ? 28 : (yearCount === 1 ? 36 : 32);
    const gpaFontSize = isCompact ? 5.5 : (yearCount === 1 ? 8 : 7);
    const padding = isCompact ? 8 : (yearCount === 1 ? 16 : 12);
    // When only 1 year is shown (1 or 2 sems), pump up the padding to stretch down the page.
    const rowPad = isCompact ? 0.5 : (yearCount === 1 ? 5 : 1.5);
    const yearRowMb = isCompact ? 2 : (yearCount === 1 ? 20 : 6);

    return {
        baseFontSize,
        semTitleSize,
        headerHeight,
        gpaFontSize,
        padding,
        rowPad,
        yearRowMb,
        styles: StyleSheet.create({
            page: {
                padding: padding,
                fontFamily: 'Open Sans',
                fontSize: baseFontSize,
                position: 'relative',
                height: '100%',
                backgroundColor: '#ffffff'
            },
            pageBorder: {
                position: 'absolute',
                top: 10,
                left: 10,
                right: 10,
                bottom: 10,
                borderWidth: 2,
                borderColor: '#000000',
            },
            headerOuter: {
                borderBottomWidth: 1,
                borderBottomColor: '#000',
                paddingBottom: 1,
                marginBottom: 1,
                alignItems: 'center',
            },
            headerImage: {
                width: '95%',
                height: 55,
                objectFit: 'contain' as any,
                objectPosition: 'center',
            },
            topInfoBlock: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingHorizontal: 8,
                paddingBottom: 2,
                paddingTop: 1,
                borderBottomWidth: 1,
                borderBottomColor: '#000',
                marginBottom: 2,
            },
            infoCol: {
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                width: '48%',
            },
            infoRow: {
                flexDirection: 'row',
                alignItems: 'flex-start',
            },
            infoLabel: {
                width: 75,
                fontWeight: 600
            },
            infoValue: {
                fontWeight: 700,
                flex: 1,
                textTransform: 'uppercase'
            },
            yearRow: {
                flexDirection: yearCount === 1 ? 'column' : 'row',
                justifyContent: 'space-between',
                marginBottom: yearRowMb,
                paddingHorizontal: 4,
            },
            semBlock: {
                width: yearCount === 1 ? '100%' : '49%',
                flex: undefined,
                marginBottom: yearCount === 1 ? 12 : 0,
            },
            semTitle: {
                textAlign: 'center',
                fontWeight: 700,
                marginBottom: 1,
                fontSize: semTitleSize,
            },
            table: {
                display: 'flex',
                flexDirection: 'column',
                borderStyle: 'solid',
                borderWidth: 1,
                borderColor: '#000',
            },
            tableHeader: {
                flexDirection: 'row',
                backgroundColor: '#fff',
                borderBottomWidth: 1,
                borderBottomColor: '#000',
                alignItems: 'stretch',
            },
            tableRow: {
                flexDirection: 'row',
                borderBottomWidth: 1,
                borderBottomColor: '#000',
                alignItems: 'stretch',
            },
            // Exact Widths summing to 100%
            colSno: { width: '5%', borderRightWidth: 1, borderColor: '#000', padding: rowPad, display: 'flex', justifyContent: 'center', alignItems: 'center' },
            colTitle: { width: '61%', borderRightWidth: 1, borderColor: '#000', padding: rowPad + 0.5, display: 'flex', justifyContent: 'center' },
            colMonth: { width: '13%', borderRightWidth: 1, borderColor: '#000', padding: rowPad, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: baseFontSize - 1 },
            colGrade: { width: '7%', borderRightWidth: 1, borderColor: '#000', padding: rowPad, display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' },
            colPts: { width: '7%', borderRightWidth: 1, borderColor: '#000', padding: rowPad, display: 'flex', justifyContent: 'center', alignItems: 'center' },
            colCr: { width: '7%', padding: rowPad, display: 'flex', justifyContent: 'center', alignItems: 'center' },

            colHeaderSno: { width: '5%', borderRightWidth: 1, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
            colHeaderTitle: { width: '61%', borderRightWidth: 1, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
            colHeaderMonth: { width: '13%', borderRightWidth: 1, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
            colHeaderGrade: { width: '7%', borderRightWidth: 1, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
            colHeaderPts: { width: '7%', borderRightWidth: 1, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
            colHeaderCr: { width: '7%', justifyContent: 'center', alignItems: 'center' },

            gpaBlock: {
                flexDirection: 'row',
                marginTop: 1,
                paddingLeft: 2
            },
            gpaValues: {
                fontWeight: 700,
            },
            gpaSection: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingRight: 4,
            },
            signatureBlock: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 'auto',
                paddingHorizontal: 24,
                paddingTop: 6,
                paddingBottom: 20
            },
            signatureText: {
                fontSize: 6.5,
                fontWeight: 'bold',
                textAlign: 'center'
            },
            // Photo styles
            photoContainer: {
                width: 60,
                height: 72,
                borderWidth: 1,
                borderColor: '#000',
                overflow: 'hidden',
                marginLeft: 'auto',
            },
            photoImage: {
                width: '100%',
                height: '100%',
                objectFit: 'cover' as any,
            },
            footerText: {
                position: 'absolute',
                bottom: 14,
                left: 14,
                fontSize: baseFontSize - 1,
                color: '#555',
            },
            pageNumber: {
                position: 'absolute',
                bottom: 14,
                right: 14,
                fontSize: baseFontSize - 1,
                color: '#555',
            },
        })
    };
};

interface TranscriptProps {
    studentsData: { student: any, results: any[], photoUrl?: string }[];
    selectedSemesters?: string[]; // e.g. ["I", "II"] or undefined = all
}

export const TranscriptDocument = ({ studentsData, selectedSemesters }: TranscriptProps) => {
    return (
        <Document>
            {studentsData.map(({ student, results, photoUrl }) => {
                const organized = organizeResults(results);

                const formatMonth = (str: string) => {
                    if (!str) return "";
                    const parts = str.split(' ');
                    if (parts.length >= 2) return `${parts[0].substring(0, 3).toUpperCase()} ${parts[1]}`;
                    return str.toUpperCase();
                };

                // Determine which year pairs to render
                const allYearPairs: [string, string][] = [["I", "II"], ["III", "IV"], ["V", "VI"], ["VII", "VIII"]];

                let yearPairs: [string, string][];
                if (selectedSemesters && selectedSemesters.length > 0) {
                    // Filter year pairs to only those containing at least one selected semester
                    yearPairs = allYearPairs.filter(([s1, s2]) =>
                        selectedSemesters.includes(s1) || selectedSemesters.includes(s2)
                    );
                } else {
                    yearPairs = allYearPairs;
                }

                // Count how many year rows will actually render (have data)
                const activeYearCount = yearPairs.filter(([s1, s2]) => {
                    const d1 = organized[s1];
                    const d2 = organized[s2];
                    const s1Selected = !selectedSemesters || selectedSemesters.length === 0 || selectedSemesters.includes(s1);
                    const s2Selected = !selectedSemesters || selectedSemesters.length === 0 || selectedSemesters.includes(s2);
                    return (s1Selected && d1 && d1.length > 0) || (s2Selected && d2 && d2.length > 0);
                }).length;

                const { styles, baseFontSize, headerHeight } = createStyles(Math.max(1, activeYearCount));

                // Do not pad single-year prints with excessive empty rows
                const minRows = activeYearCount === 1 ? 0 : 10;

                return (
                    <Page key={student.rollNumber} size="A4" style={styles.page}>
                        {/* Master Outer Border matching the template */}
                        <View style={styles.pageBorder} />

                        {/* Top College Header Image */}
                        <View style={{ paddingHorizontal: 4, paddingTop: 4 }}>
                            <View style={styles.headerOuter}>
                                <Image src="/college_header_compressed.jpg" style={styles.headerImage} />
                            </View>

                            {/* Info Block with Photo */}
                            <View style={styles.topInfoBlock}>
                                <View style={[styles.infoCol, { width: photoUrl ? '38%' : '48%' }]}>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Program :</Text>
                                        <Text style={styles.infoValue}>B.TECH</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Hall Ticket No :</Text>
                                        <Text style={styles.infoValue}>{student.rollNumber}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Name :</Text>
                                        <Text style={styles.infoValue}>{student.name}</Text>
                                    </View>
                                </View>

                                <View style={[styles.infoCol, { width: photoUrl ? '38%' : '48%' }]}>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Branch Code :</Text>
                                        <Text style={styles.infoValue}>{student.branch}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Batch :</Text>
                                        <Text style={styles.infoValue}>{student.batch}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Status :</Text>
                                        <Text style={styles.infoValue}>
                                            {student.status || 'ACTIVE'}
                                            {student.status === 'DETAINED' && student.statusSemester ? ` (${student.statusSemester})` : ''}
                                        </Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Regulation Name :</Text>
                                        <Text style={styles.infoValue}>{student.regulation || 'R20'}</Text>
                                    </View>
                                </View>

                                {/* Student Photo */}
                                {photoUrl && (
                                    <View style={styles.photoContainer}>
                                        <Image src={photoUrl} style={styles.photoImage} />
                                    </View>
                                )}
                            </View>

                            {/* Semester Tables Grid Mapping */}
                            {yearPairs.map((pair, yearIndex) => {
                                const sem1 = pair[0];
                                const sem2 = pair[1];

                                const sem1Selected = !selectedSemesters || selectedSemesters.length === 0 || selectedSemesters.includes(sem1);
                                const sem2Selected = !selectedSemesters || selectedSemesters.length === 0 || selectedSemesters.includes(sem2);

                                const sem1Data = sem1Selected ? organized[sem1] : undefined;
                                const sem2Data = sem2Selected ? organized[sem2] : undefined;

                                // Skip rendering the entire year row if both semesters are empty/unselected
                                if ((!sem1Data || sem1Data.length === 0) && (!sem2Data || sem2Data.length === 0)) {
                                    return null;
                                }

                                // Both tables in a year row must have the same height
                                // Pad to the max of both semesters' subject counts, with a minimum floor
                                const sem1Count = (sem1Data && sem1Data.length) || 0;
                                const sem2Count = (sem2Data && sem2Data.length) || 0;
                                const targetRows = Math.max(minRows, sem1Count, sem2Count);

                                return (
                                    <View key={yearIndex} style={styles.yearRow}>
                                        {[sem1, sem2].map((semVal, colIndex) => {
                                            const isSelected = colIndex === 0 ? sem1Selected : sem2Selected;
                                            const semResults = isSelected ? organized[semVal] : undefined;

                                            // Render empty invisible block to maintain flex layout if only one sem exists
                                            if (!semResults || semResults.length === 0) {
                                                return <View key={`${semVal}-empty`} style={styles.semBlock} />;
                                            }

                                            // Calculate SGPA
                                            let semCredits = 0;
                                            let semPoints = 0;
                                            semResults.forEach(r => {
                                                if (r.subject?.credits && r.gradePoints > 0) {
                                                    semCredits += r.subject.credits;
                                                    semPoints += (r.subject.credits * r.gradePoints);
                                                }
                                            });
                                            const hasSemBacklog = (semResults as any).hasBacklog;
                                            const sgpa = hasSemBacklog ? "" : (semCredits > 0 ? (semPoints / semCredits).toFixed(2) : "0.00");
                                            const cgpaIndex = RomanSems.indexOf(semVal);
                                            const cgpa = calcCGPA(organized, cgpaIndex);

                                            return (
                                                <View key={semVal} style={styles.semBlock} wrap={false}>
                                                    <Text style={styles.semTitle}>{SemLabels[semVal]}</Text>

                                                    <View style={styles.table}>
                                                        <View style={[styles.tableHeader, { height: headerHeight }]}>
                                                            <View style={styles.colHeaderSno}>
                                                                <Text style={{ transform: 'rotate(-90deg)', fontSize: baseFontSize - 1.5, width: 35, textAlign: 'center', fontWeight: 'bold' }}>S.No.</Text>
                                                            </View>
                                                            <View style={styles.colHeaderTitle}>
                                                                <Text style={{ fontSize: baseFontSize + 0.5, fontWeight: 'bold', textAlign: 'center' }}>COURSE TITLE</Text>
                                                            </View>
                                                            <View style={styles.colHeaderMonth}>
                                                                <Text style={{ fontSize: baseFontSize - 1, fontWeight: 'bold', textAlign: 'center' }}>Month</Text>
                                                                <Text style={{ fontSize: baseFontSize - 1, fontWeight: 'bold', textAlign: 'center' }}>&</Text>
                                                                <Text style={{ fontSize: baseFontSize - 1, fontWeight: 'bold', textAlign: 'center' }}>Year</Text>
                                                            </View>
                                                            <View style={styles.colHeaderGrade}>
                                                                <Text style={{ transform: 'rotate(-90deg)', fontSize: baseFontSize - 1.5, width: 35, textAlign: 'center', fontWeight: 'bold' }}>Grade</Text>
                                                            </View>
                                                            <View style={styles.colHeaderPts}>
                                                                <Text style={{ transform: 'rotate(-90deg)', fontSize: baseFontSize - 1.5, width: 35, textAlign: 'center', fontWeight: 'bold' }}>Grade Points</Text>
                                                            </View>
                                                            <View style={styles.colHeaderCr}>
                                                                <Text style={{ transform: 'rotate(-90deg)', fontSize: baseFontSize - 1.5, width: 35, textAlign: 'center', fontWeight: 'bold' }}>Credits</Text>
                                                            </View>
                                                        </View>

                                                        {semResults.map((r, i) => {
                                                            const isLast = (i === semResults.length - 1) && (semResults.length >= targetRows);
                                                            return (
                                                                <View key={r.id} style={[styles.tableRow, isLast ? { borderBottomWidth: 0 } : {}]}>
                                                                    <Text style={styles.colSno}>{i + 1}</Text>
                                                                    <Text style={styles.colTitle}>{r.subject?.subjectName || r.subjectId}</Text>
                                                                    <Text style={styles.colMonth}>{formatMonth(r.academicYear)}</Text>
                                                                    <View style={[styles.colGrade, { flexDirection: 'row' }]}>
                                                                        <Text>{r.grade === 'COMPLE' || r.grade === 'COMPLETED' ? 'CMP' : r.grade?.replace(' (REV)', '')}</Text>
                                                                        {r.grade?.includes('(REV)') && <Text style={{ fontSize: baseFontSize - 2, marginLeft: 1, marginTop: 0.5 }}>(REV)</Text>}
                                                                    </View>
                                                                    <Text style={styles.colPts}>{r.gradePoints}</Text>
                                                                    <Text style={styles.colCr}>{
                                                                        (r.status === 'PASS' || r.grade === 'COMPLE' || r.grade === 'COMPLETED' || r.gradePoints > 0)
                                                                            ? (r.subject?.credits ?? r.creditsEarned)
                                                                            : 0
                                                                    }</Text>
                                                                </View>
                                                            )
                                                        })}

                                                        {/* Pad table with empty rows to ensure uniform height */}
                                                        {Array.from({ length: Math.max(0, targetRows - semResults.length) }).map((_, i) => {
                                                            const isLast = (i === targetRows - semResults.length - 1);
                                                            return (
                                                                <View key={`empty-${i}`} style={[styles.tableRow, isLast ? { borderBottomWidth: 0 } : {}]}>
                                                                    <Text style={[styles.colSno, { color: 'transparent' }]}>-</Text>
                                                                    <Text style={[styles.colTitle, { color: 'transparent' }]}>-</Text>
                                                                    <Text style={[styles.colMonth, { color: 'transparent' }]}>-</Text>
                                                                    <Text style={[styles.colGrade, { color: 'transparent' }]}>-</Text>
                                                                    <Text style={[styles.colPts, { color: 'transparent' }]}>-</Text>
                                                                    <Text style={[styles.colCr, { color: 'transparent' }]}>-</Text>
                                                                </View>
                                                            );
                                                        })}
                                                    </View>

                                                    <View style={[styles.gpaBlock, styles.gpaSection]}>
                                                        <Text style={{ fontSize: baseFontSize + 1 }}>Credits : <Text style={styles.gpaValues}>{semCredits}</Text>   GPA Scored : <Text style={styles.gpaValues}>{sgpa || ""}</Text></Text>
                                                        <Text style={{ fontSize: baseFontSize + 1 }}>CGPA : <Text style={styles.gpaValues}>{cgpa || ""}</Text></Text>
                                                    </View>
                                                </View>
                                            )
                                        })}
                                    </View>
                                );
                            })}
                        </View>

                        {/* Signature Footer */}
                        <View style={styles.signatureBlock}>
                            <View>
                                <Text style={styles.signatureText}>CONTROLLER OF EXAMINATIONS</Text>
                            </View>
                            <View>
                                <Text style={styles.signatureText}>PRINCIPAL</Text>
                            </View>
                        </View>

                        {/* Generated Timestamp & Page Number */}
                        <Text style={styles.footerText} render={() => `Generated on: ${new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`} fixed />
                        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
                    </Page>
                );
            })}
        </Document>
    );
}
