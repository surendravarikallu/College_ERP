import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a semester code (Roman numerals I–VIII) to a human-readable label.
 * e.g. "I" → "1st Year Semester 1", "III" → "2nd Year Semester 1", etc.
 */
const SEMESTER_LABELS: Record<string, string> = {
  "I": "I Year I Semester",
  "II": "I Year II Semester",
  "III": "II Year I Semester",
  "IV": "II Year II Semester",
  "V": "III Year I Semester",
  "VI": "III Year II Semester",
  "VII": "IV Year I Semester",
  "VIII": "IV Year II Semester",
};

const MCA_SEMESTER_LABELS: Record<string, string> = {
  "I": "Sem 1",
  "II": "Sem 2",
  "III": "Sem 3",
  "IV": "Sem 4",
};

export function formatSemester(sem: string | undefined | null, program?: string): string {
  if (!sem) return "Unknown";
  // Normalise — accept both "I" and "Sem I" or "Semester I"
  const cleaned = sem.trim().toUpperCase().replace(/^(SEM(ESTER)?\s*)/i, "");

  if (program === "MCA") {
    return MCA_SEMESTER_LABELS[cleaned] ?? sem;
  }
  return SEMESTER_LABELS[cleaned] ?? sem;
}
