/**
 * Arabic BiDi & Unicode Presentation-Form Normalizer
 * 
 * Provides:
 * 1. Comprehensive Unicode Presentation Forms-A and Forms-B mapping to canonical Arabic.
 * 2. Lam-Alef ligature decomposition and Tashkeel/Harakat preservation.
 * 3. Arabic script and BiDi detection heuristics.
 * 4. Visual-to-logical stream reordering preserving embedded LTR runs (numbers, Latin words).
 * 5. PDF.js textContent baseline grouping, bounding box math, and line generation.
 */

export interface ProcessedTextItem {
  str: string;
  originalStr: string;
  dir: 'rtl' | 'ltr';
  isArabic: boolean;
  transform: number[];
  width: number;
  height: number;
  left: number;
  top: number;
  fontSize: number;
}

export interface ProcessedTextLine {
  items: ProcessedTextItem[];
  fullText: string;
  dir: 'rtl' | 'ltr';
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Mapping table for Arabic Presentation Forms-B (\uFE70..\uFEFF)
 * and Presentation Forms-A (\uFB50..\uFDFF) to Canonical Arabic Unicode (\u0600..\u06FF).
 */
export const ARABIC_PRESENTATION_MAP: Record<number, string> = {
  // Presentation Forms-B: Diacritics / Tashkeel glyphs
  0xFE70: '\u064B', // Fathatan isolated
  0xFE71: '\u064B', // Tatweel with Fathatan
  0xFE72: '\u064C', // Dammatan isolated
  0xFE73: '\u064C', // Dammatan on tail
  0xFE74: '\u064D', // Kasratan isolated
  0xFE76: '\u064E', // Fatha isolated
  0xFE77: '\u064E', // Fatha medial
  0xFE78: '\u064F', // Damma isolated
  0xFE79: '\u064F', // Damma medial
  0xFE7A: '\u0650', // Kasra isolated
  0xFE7B: '\u0650', // Kasra medial
  0xFE7C: '\u0651', // Shaddah isolated
  0xFE7D: '\u0651', // Shaddah medial
  0xFE7E: '\u0652', // Sukun isolated
  0xFE7F: '\u0652', // Sukun medial

  // Presentation Forms-B: Hamza & Base Letters (Isolated, Final, Initial, Medial)
  0xFE80: '\u0621', // Hamza isolated
  0xFE81: '\u0622', // Alef with Madda isolated
  0xFE82: '\u0622', // Alef with Madda final
  0xFE83: '\u0623', // Alef with Hamza Above isolated
  0xFE84: '\u0623', // Alef with Hamza Above final
  0xFE85: '\u0624', // Waw with Hamza Above isolated
  0xFE86: '\u0624', // Waw with Hamza Above final
  0xFE87: '\u0625', // Alef with Hamza Below isolated
  0xFE88: '\u0625', // Alef with Hamza Below final
  0xFE89: '\u0626', // Yeh with Hamza Above isolated
  0xFE8A: '\u0626', // Yeh with Hamza Above final
  0xFE8B: '\u0626', // Yeh with Hamza Above initial
  0xFE8C: '\u0626', // Yeh with Hamza Above medial
  0xFE8D: '\u0627', // Alef isolated
  0xFE8E: '\u0627', // Alef final
  0xFE8F: '\u0628', // Beh isolated
  0xFE90: '\u0628', // Beh final
  0xFE91: '\u0628', // Beh initial
  0xFE92: '\u0628', // Beh medial
  0xFE93: '\u0629', // Teh Marbuta isolated
  0xFE94: '\u0629', // Teh Marbuta final
  0xFE95: '\u062A', // Teh isolated
  0xFE96: '\u062A', // Teh final
  0xFE97: '\u062A', // Teh initial
  0xFE98: '\u062A', // Teh medial
  0xFE99: '\u062B', // Theh isolated
  0xFE9A: '\u062B', // Theh final
  0xFE9B: '\u062B', // Theh initial
  0xFE9C: '\u062B', // Theh medial
  0xFE9D: '\u062C', // Jeem isolated
  0xFE9E: '\u062C', // Jeem final
  0xFE9F: '\u062C', // Jeem initial
  0xFEA0: '\u062C', // Jeem medial
  0xFEA1: '\u062D', // Hah isolated
  0xFEA2: '\u062D', // Hah final
  0xFEA3: '\u062D', // Hah initial
  0xFEA4: '\u062D', // Hah medial
  0xFEA5: '\u062E', // Khee isolated
  0xFEA6: '\u062E', // Khee final
  0xFEA7: '\u062E', // Khee initial
  0xFEA8: '\u062E', // Khee medial
  0xFEA9: '\u062F', // Dal isolated
  0xFEAA: '\u062F', // Dal final
  0xFEAB: '\u0630', // Thal isolated
  0xFEAC: '\u0630', // Thal final
  0xFEAD: '\u0631', // Reh isolated
  0xFEAE: '\u0631', // Reh final
  0xFEAF: '\u0632', // Zain isolated
  0xFEB0: '\u0632', // Zain final
  0xFEB1: '\u0633', // Seen isolated
  0xFEB2: '\u0633', // Seen final
  0xFEB3: '\u0633', // Seen initial
  0xFEB4: '\u0633', // Seen medial
  0xFEB5: '\u0634', // Sheen isolated
  0xFEB6: '\u0634', // Sheen final
  0xFEB7: '\u0634', // Sheen initial
  0xFEB8: '\u0634', // Sheen medial
  0xFEB9: '\u0635', // Sad isolated
  0xFEBA: '\u0635', // Sad final
  0xFEBB: '\u0635', // Sad initial
  0xFEBC: '\u0635', // Sad medial
  0xFEBD: '\u0636', // Dad isolated
  0xFEBE: '\u0636', // Dad final
  0xFEBF: '\u0636', // Dad initial
  0xFEC0: '\u0636', // Dad medial
  0xFEC1: '\u0637', // Tah isolated
  0xFEC2: '\u0637', // Tah final
  0xFEC3: '\u0637', // Tah initial
  0xFEC4: '\u0637', // Tah medial
  0xFEC5: '\u0638', // Zah isolated
  0xFEC6: '\u0638', // Zah final
  0xFEC7: '\u0638', // Zah initial
  0xFEC8: '\u0638', // Zah medial
  0xFEC9: '\u0639', // Ain isolated
  0xFECA: '\u0639', // Ain final
  0xFECB: '\u0639', // Ain initial
  0xFECC: '\u0639', // Ain medial
  0xFECD: '\u063A', // Ghain isolated
  0xFECE: '\u063A', // Ghain final
  0xFECF: '\u063A', // Ghain initial
  0xFED0: '\u063A', // Ghain medial
  0xFED1: '\u0641', // Feh isolated
  0xFED2: '\u0641', // Feh final
  0xFED3: '\u0641', // Feh initial
  0xFED4: '\u0641', // Feh medial
  0xFED5: '\u0642', // Qaf isolated
  0xFED6: '\u0642', // Qaf final
  0xFED7: '\u0642', // Qaf initial
  0xFED8: '\u0642', // Qaf medial
  0xFED9: '\u0643', // Kaf isolated
  0xFEDA: '\u0643', // Kaf final
  0xFEDB: '\u0643', // Kaf initial
  0xFEDC: '\u0643', // Kaf medial
  0xFEDD: '\u0644', // Lam isolated
  0xFEDE: '\u0644', // Lam final
  0xFEDF: '\u0644', // Lam initial
  0xFEE0: '\u0644', // Lam medial
  0xFEE1: '\u0645', // Meem isolated
  0xFEE2: '\u0645', // Meem final
  0xFEE3: '\u0645', // Meem initial
  0xFEE4: '\u0645', // Meem medial
  0xFEE5: '\u0646', // Noon isolated
  0xFEE6: '\u0646', // Noon final
  0xFEE7: '\u0646', // Noon initial
  0xFEE8: '\u0646', // Noon medial
  0xFEE9: '\u0647', // Heh isolated
  0xFEEA: '\u0647', // Heh final
  0xFEEB: '\u0647', // Heh initial
  0xFEEC: '\u0647', // Heh medial
  0xFEED: '\u0648', // Waw isolated
  0xFEEE: '\u0648', // Waw final
  0xFEEF: '\u0649', // Alef Maksura isolated
  0xFEF0: '\u0649', // Alef Maksura final
  0xFEF1: '\u064A', // Yeh isolated
  0xFEF2: '\u064A', // Yeh final
  0xFEF3: '\u064A', // Yeh initial
  0xFEF4: '\u064A', // Yeh medial

  // Presentation Forms-B: Lam-Alef Ligatures
  0xFEF5: '\u0644\u0622', // Lam + Alef with Madda isolated
  0xFEF6: '\u0644\u0622', // Lam + Alef with Madda final
  0xFEF7: '\u0644\u0623', // Lam + Alef with Hamza Above isolated
  0xFEF8: '\u0644\u0623', // Lam + Alef with Hamza Above final
  0xFEF9: '\u0644\u0625', // Lam + Alef with Hamza Below isolated
  0xFEFA: '\u0644\u0625', // Lam + Alef with Hamza Below final
  0xFEFB: '\u0644\u0627', // Lam + Alef isolated
  0xFEFC: '\u0644\u0627', // Lam + Alef final

  // Presentation Forms-A: Extended Letters (Persian, Urdu, Kurdish, etc.)
  0xFB56: '\u067E', 0xFB57: '\u067E', 0xFB58: '\u067E', 0xFB59: '\u067E', // Peh (پ)
  0xFB5A: '\u0679', 0xFB5B: '\u0679', 0xFB5C: '\u0679', 0xFB5D: '\u0679', // Tteh (ٹ)
  0xFB66: '\u0686', 0xFB67: '\u0686', 0xFB68: '\u0686', 0xFB69: '\u0686', // Tcheh (چ)
  0xFB6A: '\u06A4', 0xFB6B: '\u06A4', 0xFB6C: '\u06A4', 0xFB6D: '\u06A4', // Veh (ڤ)
  0xFB7A: '\u0686', 0xFB7B: '\u0686', 0xFB7C: '\u0686', 0xFB7D: '\u0686', // Tcheh (چ)
  0xFB8A: '\u0688', 0xFB8B: '\u0688', // Ddal (ڈ)
  0xFB8C: '\u0691', 0xFB8D: '\u0691', // Rreh (ڑ)
  0xFB8E: '\u0698', 0xFB8F: '\u0698', // Jeh (ژ)
  0xFB92: '\u06AF', 0xFB93: '\u06AF', 0xFB94: '\u06AF', 0xFB95: '\u06AF', // Gaf (گ)
  0xFB9E: '\u06A9', 0xFB9F: '\u06A9', 0xFBA0: '\u06A9', 0xFBA1: '\u06A9', 0xFBA2: '\u06A9', 0xFBA3: '\u06A9', // Keheh (ک)
  0xFBA6: '\u06C1', 0xFBA7: '\u06C1', 0xFBA8: '\u06C1', 0xFBA9: '\u06C1', // Heh Goal (ہ)
  0xFBAA: '\u06C2', 0xFBAB: '\u06C2', 0xFBAC: '\u06C2', 0xFBAD: '\u06C2', // Heh Goal with Hamza (ۂ)
  0xFBAE: '\u06C3', 0xFBAF: '\u06C3', // Teh Marbuta Goal (ۃ)
  0xFBB0: '\u06D2', 0xFBB1: '\u06D2', // Yeh Barree (ے)
  0xFBB2: '\u06D3', 0xFBB3: '\u06D3', // Yeh Barree with Hamza (ۓ)
  0xFBD3: '\u06AD', 0xFBD4: '\u06AD', 0xFBD5: '\u06AD', 0xFBD6: '\u06AD', // Ng (ڭ)

  // Presentation Forms-A: Common Ligatures & Words
  0xFDF0: '\u0635\u0644\u0649', // Salla
  0xFDF1: '\u0642\u0644\u0649', // Qala
  0xFDF2: '\u0627\u0644\u0644\u0647', // Allah
  0xFDF3: '\u0627\u0643\u0628\u0631', // Akbar
  0xFDF4: '\u0645\u062d\u0645\u062f', // Muhammad
  0xFDF5: '\u0635\u0644\u0639\u0645', // Salam
  0xFDF6: '\u0631\u0633\u0648\u0644', // Rasoul
  0xFDF7: '\u0639\u0644\u064a\u0647', // Alayhe
  0xFDF8: '\u0648\u0633\u0644\u0645', // Wasallam
  0xFDF9: '\u0635\u0644\u0649 \u0627\u0644\u0644\u0647 \u0639\u0644\u064a\u0647 \u0648\u0633\u0644\u0645',
  0xFDFA: '\u0635\u0644\u0649 \u0627\u0644\u0644\u0647 \u0639\u0644\u064a\u0647 \u0648\u0633\u0644\u0645',
  0xFDFB: '\u062c\u0644 \u062c\u0644\u0627\u0644\u0647', // Jalla Jalalouhou
  0xFDFC: '\u0631\u064a\u0627\u0644', // Rial Sign
  0xFDFD: '\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062d\u0645\u0646 \u0627\u0644\u0631\u062d\u064a\u0645', // Bismillah
};

/**
 * Normalizes all Unicode Arabic Presentation Forms (Forms-A \uFB50..\uFDFF and Forms-B \uFE70..\uFEFF)
 * to standard canonical Arabic characters (\u0600..\u06FF) while strictly preserving diacritics / Tashkeel.
 */
export function normalizeArabicPresentationForms(text: string): string {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const mapped = ARABIC_PRESENTATION_MAP[code];
    if (mapped !== undefined) {
      result += mapped;
    } else {
      result += text[i];
    }
  }
  // Also run compatibility normalization to catch any rare 2/3-letter ligatures in Presentation Forms-A
  return result.normalize('NFKC');
}

/**
 * Checks if a string contains any Arabic characters, presentation forms, or Arabic-Indic digits.
 */
export function isArabicText(text: string): boolean {
  if (!text) return false;
  // Arabic core, supplement, extended, presentation forms A & B, Arabic-Indic digits
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
}

/**
 * Helper to identify if a character is a Tashkeel / Harakat combining mark.
 */
export function isTashkeelChar(charCode: number): boolean {
  return (charCode >= 0x064B && charCode <= 0x0652) ||
         charCode === 0x0670 ||
         charCode === 0x0651; // Shaddah
}

/**
 * Helper to determine whether a raw string or token was laid out in visual order (reversed).
 *
 * Characteristics of visual-order Arabic streams:
 * 1. Starts with a Final form glyph (e.g. \uFE90, \uFE94, \uFEA0) or Teh Marbuta (\uFE93, \u0629).
 * 2. Ends with an Initial form glyph (e.g. \uFE91, \uFE97, \uFE9F, \uFEDB, \uFEDF, \uFEE3, \uFEE7, \uFEF3).
 * 3. Starts with Teh Marbuta (\u0629) followed by Arabic consonants.
 */
function isVisualOrderRun(rawStr: string): boolean {
  if (!rawStr || rawStr.length <= 1) return false;

  // Check raw presentation forms before normalization
  const firstCode = rawStr.charCodeAt(0);
  const lastCode = rawStr.charCodeAt(rawStr.length - 1);

  // Teh Marbuta isolated/final at the beginning of a word
  if (firstCode === 0xFE93 || firstCode === 0xFE94 || firstCode === 0x0629) {
    // If the word has more Arabic characters after Teh Marbuta, it's visual order
    if (/[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(rawStr.slice(1))) {
      return true;
    }
  }

  // Initial forms at the END of the word
  const initialFormCodes = new Set([
    0xFE8B, 0xFE91, 0xFE97, 0xFE9B, 0xFE9F, 0xFEA3, 0xFEA7,
    0xFEB3, 0xFEB7, 0xFEBB, 0xFEBF, 0xFEC3, 0xFEC7, 0xFECB,
    0xFECF, 0xFED3, 0xFED7, 0xFEDB, 0xFEDF, 0xFEE3, 0xFEE7,
    0xFEEB, 0xFEF3
  ]);

  if (initialFormCodes.has(lastCode)) {
    return true;
  }

  // Final forms at the START of the word
  const finalFormCodes = new Set([
    0xFE82, 0xFE84, 0xFE86, 0xFE88, 0xFE8A, 0xFE8E, 0xFE90,
    0xFE94, 0xFE96, 0xFE9A, 0xFE9E, 0xFEA2, 0xFEA6, 0xFEAA,
    0xFEAC, 0xFEAE, 0xFEB0, 0xFEB2, 0xFEB6, 0xFEBA, 0xFEBE,
    0xFEC2, 0xFEC6, 0xFECA, 0xFECE, 0xFED2, 0xFED6, 0xFEDA,
    0xFEDE, 0xFEE2, 0xFEE6, 0xFEEA, 0xFEEE, 0xFEF0, 0xFEF2,
    0xFEF6, 0xFEF8, 0xFEFA, 0xFEFC
  ]);

  if (finalFormCodes.has(firstCode) && rawStr.length >= 2) {
    return true;
  }

  return false;
}

/**
 * Reverses a string of Arabic characters while preserving combining Tashkeel / Harakat graphemes.
 * Each base character and its following diacritics form a single unit that moves together.
 */
export function reverseArabicGraphemes(text: string): string {
  if (!text || text.length <= 1) return text;

  // Split into grapheme clusters (base character + any following combining diacritics)
  const graphemes: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = ch.charCodeAt(0);
    if (isTashkeelChar(code) && graphemes.length > 0) {
      // Attach combining mark to preceding base grapheme
      graphemes[graphemes.length - 1] += ch;
    } else {
      graphemes.push(ch);
    }
  }

  return graphemes.reverse().join('');
}

/**
 * Robust heuristic detection of visual-order streams vs logical-order streams.
 * Reverses visual-order Arabic character sequences to logical sequence while keeping
 * embedded LTR runs (numbers, Latin words) in their native left-to-right order.
 */
export function reorderVisualToLogicalArabic(text: string): string {
  if (!text || !isArabicText(text)) {
    return text;
  }

  // Tokenize the line into:
  // 1. Arabic character words (including presentation forms and Tashkeel)
  // 2. Whitespace runs
  // 3. Non-Arabic runs (Latin words, digits, punctuation)
  const tokenRegex = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)|(\s+)|([^\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)/g;
  
  const tokens: Array<{ text: string; isArabic: boolean; isWhitespace: boolean; isVisual: boolean }> = [];
  let match: RegExpExecArray | null;
  let visualOrderVote = 0;
  let arabicTokenCount = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    const tokenStr = match[0];
    const isWhitespace = /^\s+$/.test(tokenStr);
    const isArabic = !isWhitespace && isArabicText(tokenStr);
    let isVisual = false;

    if (isArabic) {
      arabicTokenCount++;
      isVisual = isVisualOrderRun(tokenStr);
      if (isVisual) {
        visualOrderVote++;
      }
    }

    tokens.push({ text: tokenStr, isArabic, isWhitespace, isVisual });
  }

  // If any Arabic tokens exhibit visual order characteristics (or if line is visual)
  const isLineVisualOrder = visualOrderVote > 0 || (arabicTokenCount > 0 && visualOrderVote >= arabicTokenCount / 2);

  if (isLineVisualOrder) {
    // Process tokens in reverse order (since the entire line was laid out left-to-right visually)
    const reversedTokens: string[] = [];

    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];
      if (token.isArabic) {
        // Reverse Arabic characters within the word and normalize presentation forms
        const normalized = normalizeArabicPresentationForms(token.text);
        const reversedWord = reverseArabicGraphemes(normalized);
        reversedTokens.push(reversedWord);
      } else {
        // LTR run (English word, number, whitespace, etc.) keeps its internal character order
        reversedTokens.push(token.text);
      }
    }

    return reversedTokens.join('');
  }

  // Line is already in logical order: simply normalize presentation forms
  return normalizeArabicPresentationForms(text);
}

/**
 * Transforms a raw PDF.js TextContent structure into geometrically sorted,
 * baseline-clustered, and BiDi-normalized ProcessedTextLine array.
 */
export function processPageTextContent(textContent: any, viewport: any): ProcessedTextLine[] {
  if (!textContent || !Array.isArray(textContent.items) || textContent.items.length === 0) {
    return [];
  }

  const scale = (viewport && typeof viewport.scale === 'number') ? viewport.scale : 1.0;
  const viewportHeight = (viewport && typeof viewport.height === 'number') ? viewport.height : 800;

  const rawItems: ProcessedTextItem[] = [];

  for (const item of textContent.items) {
    if (!item || typeof item.str !== 'string') continue;

    const originalStr = item.str;
    if (originalStr.length === 0 && item.width === 0) continue;

    const transform = Array.isArray(item.transform) ? item.transform : [1, 0, 0, 1, 0, 0];
    const tx = transform[4] || 0;
    const ty = transform[5] || 0;

    // Font size estimation from transform matrix
    const fontScaleX = Math.hypot(transform[0], transform[1]);
    const fontScaleY = Math.hypot(transform[2], transform[3]);
    const baseFontSize = Math.max(fontScaleX, fontScaleY) || 12;
    const fontSize = baseFontSize * scale;

    const itemWidth = (typeof item.width === 'number' ? item.width : 0) * scale;
    const itemHeight = (typeof item.height === 'number' && item.height > 0 ? item.height : baseFontSize) * scale;

    let left = 0;
    let top = 0;

    if (viewport && typeof viewport.convertToViewportPoint === 'function') {
      const [vx, vy] = viewport.convertToViewportPoint(tx, ty);
      left = vx;
      // In PDF.js convertToViewportPoint, vy is the baseline coordinate.
      // Top of the text bounding box is baseline minus height
      top = vy - itemHeight;
    } else if (viewport && Array.isArray(viewport.transform)) {
      const vt = viewport.transform;
      const vx = vt[0] * tx + vt[2] * ty + vt[4];
      const vy = vt[1] * tx + vt[3] * ty + vt[5];
      left = vx;
      top = vy - itemHeight;
    } else {
      // Standard PDF default: origin at bottom-left
      left = tx * scale;
      top = viewportHeight - (ty * scale) - itemHeight;
    }

    const isArabic = isArabicText(originalStr);
    const normalizedStr = reorderVisualToLogicalArabic(originalStr);
    const dir: 'rtl' | 'ltr' = isArabic ? 'rtl' : 'ltr';

    rawItems.push({
      str: normalizedStr,
      originalStr,
      dir,
      isArabic,
      transform,
      width: Math.max(itemWidth, 1),
      height: Math.max(itemHeight, 1),
      left,
      top,
      fontSize,
    });
  }

  if (rawItems.length === 0) {
    return [];
  }

  // 1. Sort items primarily by Y (top to bottom) and secondarily by X (right to left for Arabic)
  rawItems.sort((a, b) => {
    const yDiff = a.top - b.top;
    if (Math.abs(yDiff) > 4) {
      return yDiff;
    }
    return b.left - a.left;
  });

  // 2. Cluster items sharing vertical baseline (within tolerance) into continuous lines
  const lines: ProcessedTextLine[] = [];
  let currentLineItems: ProcessedTextItem[] = [];
  let currentLineTop = rawItems[0].top;
  let currentLineHeight = rawItems[0].height;

  for (const item of rawItems) {
    const yTolerance = Math.max(4, Math.min(item.height, currentLineHeight) * 0.4);

    if (currentLineItems.length === 0) {
      currentLineItems.push(item);
      currentLineTop = item.top;
      currentLineHeight = item.height;
    } else if (Math.abs(item.top - currentLineTop) <= yTolerance) {
      // Prevent merging items across large horizontal gaps (e.g. columns)
      const lastItem = currentLineItems[currentLineItems.length - 1];
        
      // Horizontal distance between the edges of the two items
      const hGap = Math.abs(lastItem.left - (item.left + item.width));
      const ltrGap = Math.abs(item.left - (lastItem.left + lastItem.width));
      const maxGap = Math.max(20, item.fontSize * 3.5);
        
      if (hGap > maxGap && ltrGap > maxGap) {
        // Break line due to large horizontal gap (it's a new column!)
        lines.push(buildProcessedLine(currentLineItems));
        currentLineItems = [item];
        currentLineTop = item.top;
        currentLineHeight = item.height;
      } else {
        currentLineItems.push(item);
        // Only increase line height if the item isn't ridiculously tall (prevents "TOO thick" selections)
        if (item.height < currentLineHeight * 2) {
          currentLineHeight = Math.max(currentLineHeight, item.height);
        }
      }
      } else {
        // Finalize current line
        lines.push(buildProcessedLine(currentLineItems));
        currentLineItems = [item];
        currentLineTop = item.top;
        currentLineHeight = item.height;
      }
    }

    if (currentLineItems.length > 0) {
    lines.push(buildProcessedLine(currentLineItems));
  }

  // 3. Final DOM Reading Order Sorting (Column Detection)
  // To prevent text selection from jumping horizontally between columns on every line,
  // we sort the finalized lines primarily into vertical columns (Right-to-Left),
  // and secondarily top-to-bottom within the column.
  lines.sort((a, b) => {
    // Check if lines overlap horizontally
    const overlap = Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left));
    
    if (overlap === 0) {
      // No horizontal overlap = they are in different columns.
      // For Arabic (RTL), the right-most column should come FIRST in the DOM.
      return b.left - a.left;
    }
    
    // They overlap horizontally (same column), sort top-to-bottom
    return a.top - b.top;
  });

  return lines;
}

/**
 * Builds a single ProcessedTextLine from clustered text items on the same baseline.
 */
function buildProcessedLine(items: ProcessedTextItem[]): ProcessedTextLine {
  // Sort items on the line geometrically from left to right
  items.sort((a, b) => a.left - b.left);

  let minLeft = Infinity;
  let minTop = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;
  let hasArabic = false;

  const textParts: string[] = [];
  
  // Find median height to reject outliers
  const sortedHeights = items.map(i => i.height).sort((a, b) => a - b);
  const medianHeight = sortedHeights[Math.floor(sortedHeights.length / 2)] || 12;
  const maxHeightAllowed = medianHeight * 1.5;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    minLeft = Math.min(minLeft, item.left);
    minTop = Math.min(minTop, item.top);
    maxRight = Math.max(maxRight, item.left + item.width);
    
    // Clamp the height to prevent "TOO thick" selections from PDF.js watermark/border bugs
    const safeHeight = Math.min(item.height, maxHeightAllowed);
    maxBottom = Math.max(maxBottom, item.top + safeHeight);

    if (item.isArabic) {
      hasArabic = true;
    }

    textParts.push(item.str);
  }

  const rawJoined = textParts.join(' ').replace(/\s+/g, ' ').trim();
  const fullText = reorderVisualToLogicalArabic(rawJoined);
  const dir: 'rtl' | 'ltr' = hasArabic ? 'rtl' : 'ltr';

  return {
    items,
    fullText,
    dir,
    left: Math.round(minLeft * 100) / 100,
    top: Math.round(minTop * 100) / 100,
    width: Math.round((maxRight - minLeft) * 100) / 100,
    height: Math.round((maxBottom - minTop) * 100) / 100,
  };
}
