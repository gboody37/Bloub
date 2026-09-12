/**
 * Robust extraction utility for PDF page notes and annotations.
 * Handles YAML frontmatter, raw JSON, escaped quotes, and objects.
 */

export interface ExtractedPdfData {
  notes: Record<number | string, { text: string; lang: 'en' | 'ar' }>;
  annotations: Record<number | string, any[]>;
}

export function extractPdfNotesAndAnnotations(input: any): ExtractedPdfData {
  if (!input) return { notes: {}, annotations: {} };

  // 1. If already an object with notes or annotations
  if (typeof input === 'object' && input !== null) {
    if (input.notes || input.annotations) {
      return {
        notes: input.notes || {},
        annotations: input.annotations || {}
      };
    }
  }

  const str = typeof input === 'string' ? input.trim() : '';
  if (!str) return { notes: {}, annotations: {} };

  // 2. Check if it's a markdown file with YAML frontmatter
  if (str.startsWith('---')) {
    const fmMatch = str.match(/^---[ \t]*\r?\n([\s\S]*?)(?:\r?\n)?[ \t]*---[ \t]*(?:\r?\n)?/);
    if (fmMatch) {
      const fmBlock = fmMatch[1];
      // Match pdf_notes: ... up to next top-level YAML key or end
      const pdfNotesMatch = fmBlock.match(/pdf_notes:\s*(['"]?)([\s\S]*?)\1(?:\r?\n[a-zA-Z0-9_-]+:|$)/);
      if (pdfNotesMatch) {
        let rawVal = pdfNotesMatch[2].trim();
        // If single quoted YAML, unescape '' -> '
        if (pdfNotesMatch[1] === "'") {
          rawVal = rawVal.replace(/''/g, "'");
        } else if (pdfNotesMatch[1] === '"') {
          rawVal = rawVal.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        try {
          const parsed = JSON.parse(rawVal);
          return {
            notes: parsed.notes || {},
            annotations: parsed.annotations || {}
          };
        } catch (e) {
          console.warn('[extractPdfNotesAndAnnotations] JSON parse error on frontmatter pdf_notes:', e);
        }
      }
    }
  }

  // 3. Check if str is directly a JSON string
  try {
    let parsed = JSON.parse(str);
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch {}
    }
    if (parsed && typeof parsed === 'object') {
      return {
        notes: parsed.notes || (!parsed.annotations ? parsed : {}),
        annotations: parsed.annotations || {}
      };
    }
  } catch (e) {}

  return { notes: {}, annotations: {} };
}
