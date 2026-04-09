/**
 * Exam Cell Configuration
 * Uses ERP's environment variables with exam-cell-specific defaults.
 */

function getSecret(name: string, fallback: string): string {
  const value = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`CRITICAL: Environment variable ${name} is missing in production!`);
    } else {
      console.warn(`[ExamCell] WARNING: ${name} is missing. Using insecure fallback.`);
      return fallback;
    }
  }
  return value;
}

export const SESSION_SECRET = process.env.JWT_SECRET || getSecret("SESSION_SECRET", "super-secret-key-123");

export const env = {
  PROMOTION_MAX_BACKLOG: process.env.PROMOTION_MAX_BACKLOG ?? '0',
  PROMOTION_MIN_CREDITS: process.env.PROMOTION_MIN_CREDITS ?? '0',
};
