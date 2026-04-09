"use strict";
/**
 * Exam Cell Configuration
 * Uses ERP's environment variables with exam-cell-specific defaults.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = exports.SESSION_SECRET = void 0;
function getSecret(name, fallback) {
    const value = process.env[name];
    if (!value) {
        if (process.env.NODE_ENV === "production") {
            throw new Error(`CRITICAL: Environment variable ${name} is missing in production!`);
        }
        else {
            console.warn(`[ExamCell] WARNING: ${name} is missing. Using insecure fallback.`);
            return fallback;
        }
    }
    return value;
}
exports.SESSION_SECRET = getSecret("SESSION_SECRET", "super-secret-key-123");
exports.env = {
    PROMOTION_MAX_BACKLOG: process.env.PROMOTION_MAX_BACKLOG ?? '0',
    PROMOTION_MIN_CREDITS: process.env.PROMOTION_MIN_CREDITS ?? '0',
};
