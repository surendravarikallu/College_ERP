"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePdfResults = parsePdfResults;
const fs_1 = __importDefault(require("fs"));
const form_data_1 = __importDefault(require("form-data"));
// @ts-ignore
const node_fetch_1 = __importDefault(require("node-fetch"));
/**
 * Sends a PDF file to the Python parser service (FastAPI) running on localhost:8000.
 * In the ERP, the parser is proxied through Express on the same port, but
 * internally it still communicates with the Python process on port 8000.
 */
async function parsePdfResults(filePath) {
    const fileStream = fs_1.default.createReadStream(filePath);
    const form = new form_data_1.default();
    form.append('file', fileStream);
    try {
        const response = await (0, node_fetch_1.default)('http://localhost:8000/parse', {
            method: 'POST',
            body: form
        });
        if (!response.ok) {
            throw new Error(`Parser service responded with status: ${response.status}`);
        }
        const data = (await response.json());
        return {
            results: data.results?.map((r) => ({
                ...r,
                InternalMarks: r.InternalMarks !== null ? parseInt(r.InternalMarks) : null
            })) || [],
            regulation: data.regulation || "Unknown"
        };
    }
    catch (error) {
        console.error("[ExamCell] Error communicating with PDF parser:", error.message);
        return { results: [], regulation: "Unknown" };
    }
    finally {
        fileStream.destroy();
    }
}
