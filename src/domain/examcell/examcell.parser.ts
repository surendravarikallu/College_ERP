import fs from 'fs';
import FormData from 'form-data';
// @ts-ignore
import fetch from 'node-fetch';

/**
 * Sends a PDF file to the Python parser service (FastAPI) running on localhost:8000.
 * In the ERP, the parser is proxied through Express on the same port, but
 * internally it still communicates with the Python process on port 8000.
 */
export async function parsePdfResults(filePath: string): Promise<{ results: any[], regulation: string }> {
  const fileStream = fs.createReadStream(filePath);
  const form = new FormData();
  form.append('file', fileStream);

  try {
    const response = await fetch('http://localhost:8000/parse', {
      method: 'POST',
      body: form
    });

    if (!response.ok) {
      throw new Error(`Parser service responded with status: ${response.status}`);
    }

    const data = (await response.json()) as any;
    return {
      results: data.results?.map((r: any) => ({
        ...r,
        InternalMarks: r.InternalMarks !== null ? parseInt(r.InternalMarks) : null
      })) || [],
      regulation: data.regulation || "Unknown"
    };
  } catch (error: any) {
    console.error("[ExamCell] Error communicating with PDF parser:", error.message);
    return { results: [], regulation: "Unknown" };
  } finally {
    fileStream.destroy();
  }
}
