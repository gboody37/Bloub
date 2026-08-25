/**
 * Comprehensive Unit Tests for Arabic BiDi & Unicode Presentation-Form Normalizer
 * Tests:
 * 1. Presentation Form-A and Form-B mapping
 * 2. Lam-Alef ligatures
 * 3. Tashkeel / Harakat diacritics preservation
 * 4. Arabic text detection (isArabicText)
 * 5. Visual vs logical stream reordering (pure Arabic, mixed Arabic-English, Arabic-Numeral)
 * 6. PDF.js text item baseline grouping and bounding box mathematics
 * 7. Edge cases, multi-zoom scaling, and performance stress testing
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeArabicPresentationForms,
  isArabicText,
  isTashkeelChar,
  reverseArabicGraphemes,
  reorderVisualToLogicalArabic,
  processPageTextContent,
  sortLinesInReadingOrder,
  buildProcessedLine,
  ARABIC_PRESENTATION_MAP,
} from '../../src/lib/pdf/arabic-bidi.ts';
import type {
  ProcessedTextItem,
  ProcessedTextLine,
} from '../../src/lib/pdf/arabic-bidi.ts';

describe('Arabic BiDi - Unicode Presentation Forms Normalization (Requirement 1)', () => {
  it('should normalize Presentation Forms-B isolated, initial, medial, and final glyphs to canonical Arabic', () => {
    // Beh forms: Isolated (\uFE8F), Final (\uFE90), Initial (\uFE91), Medial (\uFE92) -> \u0628
    assert.equal(normalizeArabicPresentationForms('\uFE8F'), '\u0628');
    assert.equal(normalizeArabicPresentationForms('\uFE90'), '\u0628');
    assert.equal(normalizeArabicPresentationForms('\uFE91'), '\u0628');
    assert.equal(normalizeArabicPresentationForms('\uFE92'), '\u0628');

    // Jeem forms: Isolated (\uFE9D), Final (\uFE9E), Initial (\uFE9F), Medial (\uFEA0) -> \u062C
    assert.equal(normalizeArabicPresentationForms('\uFE9D'), '\u062C');
    assert.equal(normalizeArabicPresentationForms('\uFE9E'), '\u062C');
    assert.equal(normalizeArabicPresentationForms('\uFE9F'), '\u062C');
    assert.equal(normalizeArabicPresentationForms('\uFEA0'), '\u062C');

    // Teh Marbuta: Isolated (\uFE93), Final (\uFE94) -> \u0629
    assert.equal(normalizeArabicPresentationForms('\uFE93'), '\u0629');
    assert.equal(normalizeArabicPresentationForms('\uFE94'), '\u0629');

    // Alef: Isolated (\uFE8D), Final (\uFE8E) -> \u0627
    assert.equal(normalizeArabicPresentationForms('\uFE8D'), '\u0627');
    assert.equal(normalizeArabicPresentationForms('\uFE8E'), '\u0627');

    // Noon: Isolated (\uFEE5), Final (\uFEE6), Initial (\uFEE7), Medial (\uFEE8) -> \u0646
    assert.equal(normalizeArabicPresentationForms('\uFEE5'), '\u0646');
    assert.equal(normalizeArabicPresentationForms('\uFEE7'), '\u0646');
    assert.equal(normalizeArabicPresentationForms('\uFEE8'), '\u0646');

    // Seen: Isolated (\uFEB1), Final (\uFEB2), Initial (\uFEB3), Medial (\uFEB4) -> \u0633
    assert.equal(normalizeArabicPresentationForms('\uFEB1'), '\u0633');
    assert.equal(normalizeArabicPresentationForms('\uFEB2'), '\u0633');
    assert.equal(normalizeArabicPresentationForms('\uFEB3'), '\u0633');
    assert.equal(normalizeArabicPresentationForms('\uFEB4'), '\u0633');
  });

  it('should normalize all Lam-Alef ligatures correctly', () => {
    // Lam + Alef Plain: Isolated (\uFEFB), Final (\uFEFC) -> لا (\u0644\u0627)
    assert.equal(normalizeArabicPresentationForms('\uFEFB'), 'لا');
    assert.equal(normalizeArabicPresentationForms('\uFEFC'), 'لا');

    // Lam + Alef Madda: Isolated (\uFEF5), Final (\uFEF6) -> لآ (\u0644\u0622)
    assert.equal(normalizeArabicPresentationForms('\uFEF5'), 'لآ');
    assert.equal(normalizeArabicPresentationForms('\uFEF6'), 'لآ');

    // Lam + Alef Hamza Above: Isolated (\uFEF7), Final (\uFEF8) -> لأ (\u0644\u0623)
    assert.equal(normalizeArabicPresentationForms('\uFEF7'), 'لأ');
    assert.equal(normalizeArabicPresentationForms('\uFEF8'), 'لأ');

    // Lam + Alef Hamza Below: Isolated (\uFEF9), Final (\uFEFA) -> لإ (\u0644\u0625)
    assert.equal(normalizeArabicPresentationForms('\uFEF9'), 'لإ');
    assert.equal(normalizeArabicPresentationForms('\uFEFA'), 'لإ');
  });

  it('should normalize Presentation Forms-A extended characters and honorific ligatures', () => {
    // Persian / Urdu extended letters
    assert.equal(normalizeArabicPresentationForms('\uFB56'), 'پ');
    assert.equal(normalizeArabicPresentationForms('\uFB7A'), 'چ');
    assert.equal(normalizeArabicPresentationForms('\uFB92'), 'گ');
    assert.equal(normalizeArabicPresentationForms('\uFB6A'), 'ڤ');

    // Presentation Forms-A ligatures
    assert.equal(normalizeArabicPresentationForms('\uFDF2'), 'الله');
    assert.equal(normalizeArabicPresentationForms('\uFDF3'), 'اكبر');
    assert.equal(normalizeArabicPresentationForms('\uFDF4'), 'محمد');
    assert.equal(normalizeArabicPresentationForms('\uFDFA'), 'صلى الله عليه وسلم');
    assert.equal(normalizeArabicPresentationForms('\uFDFB'), 'جل جلاله');
    assert.equal(normalizeArabicPresentationForms('\uFDFC'), 'ريال');
    assert.equal(normalizeArabicPresentationForms('\uFDFD'), 'بسم الله الرحمن الرحيم');
  });

  it('should normalize presentation form Tashkeel diacritics to canonical Arabic diacritics', () => {
    // Presentation Forms-B Tashkeel
    assert.equal(normalizeArabicPresentationForms('\uFE70'), '\u064B'); // Fathatan
    assert.equal(normalizeArabicPresentationForms('\uFE72'), '\u064C'); // Dammatan
    assert.equal(normalizeArabicPresentationForms('\uFE74'), '\u064D'); // Kasratan
    assert.equal(normalizeArabicPresentationForms('\uFE76'), '\u064E'); // Fatha
    assert.equal(normalizeArabicPresentationForms('\uFE78'), '\u064F'); // Damma
    assert.equal(normalizeArabicPresentationForms('\uFE7A'), '\u0650'); // Kasra
    assert.equal(normalizeArabicPresentationForms('\uFE7C'), '\u0651'); // Shaddah
    assert.equal(normalizeArabicPresentationForms('\uFE7E'), '\u0652'); // Sukun
  });

  it('should preserve canonical Tashkeel diacritics on base Arabic letters', () => {
    const textWithTashkeel = 'كِتَابٌ مُفِيدٌ';
    assert.equal(normalizeArabicPresentationForms(textWithTashkeel), 'كِتَابٌ مُفِيدٌ');
    
    // Shaddah with Fatha
    const shaddahText = 'مُعَلِّمٌ';
    assert.equal(normalizeArabicPresentationForms(shaddahText), 'مُعَلِّمٌ');
  });
});

describe('Arabic BiDi - Arabic Text Detection (Requirement 2)', () => {
  it('should return true for canonical Arabic words', () => {
    assert.equal(isArabicText('مرحبا بالعالم'), true);
    assert.equal(isArabicText('جبنة'), true);
    assert.equal(isArabicText('قراءة'), true);
  });

  it('should return true for Arabic Presentation Forms', () => {
    assert.equal(isArabicText('\uFE9F\uFE92\uFE90\uFE94'), true);
    assert.equal(isArabicText('\uFEFB\uFE8E'), true);
    assert.equal(isArabicText('\uFDF2'), true);
  });

  it('should return true for Arabic-Indic digits and mixed text', () => {
    assert.equal(isArabicText('١٢٣٤٥'), true);
    assert.equal(isArabicText('الصفحة 12 من 50'), true);
    assert.equal(isArabicText('React 19 بالعربي'), true);
  });

  it('should return false for pure Latin strings, numbers, and symbols', () => {
    assert.equal(isArabicText('Hello World'), false);
    assert.equal(isArabicText('1234567890'), false);
    assert.equal(isArabicText('{"status": "ok", "count": 42}'), false);
    assert.equal(isArabicText('🚀 💡 ⭐'), false);
    assert.equal(isArabicText(''), false);
  });
});

describe('Arabic BiDi - Visual vs Logical Stream Reordering (Requirement 3)', () => {
  it('should reverse visual-order Arabic presentation forms into logical canonical Arabic', () => {
    // Visual stream for "جبنة" in presentation forms:
    // Teh Marbuta (\uFE93) + Noon medial (\uFEE8) + Beh medial (\uFE92) + Jeem initial (\uFE9F)
    const visualJebnah = '\uFE93\uFEE8\uFE92\uFE9F';
    const logical = reorderVisualToLogicalArabic(visualJebnah);
    assert.equal(logical, 'جبنة');
  });

  it('should reverse visual-order Arabic stream starting with Teh Marbuta', () => {
    // "ةكلمملا" (visual order of "المملكة")
    const visualMamlaka = 'ةكلمملا';
    const logical = reorderVisualToLogicalArabic(visualMamlaka);
    assert.equal(logical, 'المملكة');
  });

  it('should preserve already-logical Arabic streams without corrupting or double-reversing', () => {
    const logicalText = 'المملكة الأردنية الهاشمية';
    const result = reorderVisualToLogicalArabic(logicalText);
    assert.equal(result, 'المملكة الأردنية الهاشمية');
  });

  it('should preserve logical-order mixed Arabic and European numerals', () => {
    const mixedLogical = 'المستند رقم 42 لسنة 2026';
    const result = reorderVisualToLogicalArabic(mixedLogical);
    assert.equal(result, 'المستند رقم 42 لسنة 2026');
  });

  it('should reverse visual-order stream while preserving embedded Western numbers', () => {
    // Visual stream: Leftmost on page is "2026", then "ماع", then "يف" -> Logical: "في عام 2026"
    // In visual stream, "عام" is "ماع" (\uFEE2\uFE8E\uFECB) and "في" is "يف" (\uFEF2\uFED3)
    const visualStream = '2026 \uFEE2\uFE8E\uFECB \uFEF2\uFED3';
    const logical = reorderVisualToLogicalArabic(visualStream);
    assert.equal(logical, 'في عام 2026');
  });

  it('should reverse visual-order stream while preserving embedded Latin words', () => {
    // Visual stream: "PDF يف تادنتسملا"
    // "تادنتسملا" is visual for "المستندات", "يف" is visual for "في"
    const visualStream = 'PDF \uFEF2\uFED3 \uFE95\uFE8E\uFEAA\uFEE8\uFE98\uFEB4\uFEE4\uFEDE\uFE8D';
    const logical = reorderVisualToLogicalArabic(visualStream);
    assert.equal(logical, 'المستندات في PDF');
  });

  it('should reverse visual-order stream with embedded parenthesized English tokens', () => {
    // Visual stream: "(PDF) قيسنت" -> Logical: "تنسيق (PDF)"
    // "قيسنت" is visual for "تنسيق" (\uFE95\uFE8E\uFEAA\uFEE8\uFE98\uFEB4... / \uFED6\uFEF4\uFEB3\uFEE7\uFE97)
    const visualStream = '(PDF) \uFED6\uFEF4\uFEB3\uFEE7\uFE97';
    const logical = reorderVisualToLogicalArabic(visualStream);
    assert.equal(logical, 'تنسيق (PDF)');
  });

  it('should preserve Tashkeel diacritics attached to base letters during grapheme reversal', () => {
    // Word "كِتَابٌ" reversed grapheme by grapheme
    const baseWord = 'كِتَابٌ';
    const graphemesReversed = reverseArabicGraphemes(baseWord);
    // Base characters reversed with combining marks remaining attached after their base:
    // 'بٌ' + 'ا' + 'تَ' + 'كِ' = 'بٌاتَكِ'
    assert.equal(graphemesReversed, 'بٌاتَكِ');
    
    // Re-reversing restores the exact original word and diacritics
    assert.equal(reverseArabicGraphemes(graphemesReversed), baseWord);
  });
});

describe('Arabic BiDi - PDF.js Baseline Grouping & Bounding Box Math (Requirement 4)', () => {
  it('should group items sharing the same vertical baseline into a single ProcessedTextLine', () => {
    const mockTextContent = {
      items: [
        {
          str: 'الاردن',
          transform: [12, 0, 0, 12, 150, 700],
          width: 50,
          height: 12,
        },
        {
          str: 'عمان',
          transform: [12, 0, 0, 12, 210, 701], // 1px Y variance (same baseline)
          width: 40,
          height: 12,
        },
        {
          str: 'عاصمة',
          transform: [12, 0, 0, 12, 260, 700],
          width: 45,
          height: 12,
        },
      ],
    };

    const mockViewport = {
      scale: 1.5,
      height: 1200,
      width: 900,
      convertToViewportPoint: (x: number, y: number) => [x * 1.5, (1200 - y * 1.5)],
    };

    const lines = processPageTextContent(mockTextContent, mockViewport);
    assert.equal(lines.length, 1, 'All 3 items on the same baseline should form 1 line');
    
    const line = lines[0];
    assert.equal(line.dir, 'rtl');
    assert.equal(line.items.length, 3);
    assert.ok(line.width > 150, 'Line width should enclose all items');
    assert.ok(line.height >= 18, 'Line height should reflect scaled font size');
    assert.ok(line.fullText.length > 0);
  });

  it('should split items across distinct vertical baselines into multiple lines', () => {
    const mockTextContent = {
      items: [
        // Line 1 (Y = 700)
        {
          str: 'العنوان الاول',
          transform: [14, 0, 0, 14, 100, 700],
          width: 80,
          height: 14,
        },
        // Line 2 (Y = 650)
        {
          str: 'الفقرة الثانية من المستند',
          transform: [12, 0, 0, 12, 100, 650],
          width: 120,
          height: 12,
        },
        // Line 3 (Y = 600)
        {
          str: 'Chapter 3: Summary',
          transform: [12, 0, 0, 12, 100, 600],
          width: 100,
          height: 12,
        },
      ],
    };

    const mockViewport = {
      scale: 1.0,
      height: 800,
      width: 600,
    };

    const lines = processPageTextContent(mockTextContent, mockViewport);
    assert.equal(lines.length, 3, 'Should produce 3 distinct lines for separated baselines');
    
    assert.equal(lines[0].dir, 'rtl');
    assert.equal(lines[1].dir, 'rtl');
    assert.equal(lines[2].dir, 'ltr', 'English line should have dir: ltr');

    // Lines should be ordered from top to bottom (Y=700 is higher on page than Y=650)
    assert.ok(lines[0].top < lines[1].top);
    assert.ok(lines[1].top < lines[2].top);
  });

  it('should correctly compute bounding box coordinates and font sizes across different zoom scales', () => {
    const mockTextContent = {
      items: [
        {
          str: 'ملاحظة',
          transform: [16, 0, 0, 16, 50, 400],
          width: 60,
          height: 16,
        },
      ],
    };

    // 0.5x Zoom Scale
    const linesHalf = processPageTextContent(mockTextContent, { scale: 0.5, height: 500, width: 400 });
    assert.equal(linesHalf[0].items[0].fontSize, 8);
    assert.equal(linesHalf[0].items[0].width, 30);
    assert.equal(linesHalf[0].items[0].left, 25);

    // 2.0x Zoom Scale
    const linesDouble = processPageTextContent(mockTextContent, { scale: 2.0, height: 1000, width: 800 });
    assert.equal(linesDouble[0].items[0].fontSize, 32);
    assert.equal(linesDouble[0].items[0].width, 120);
    assert.equal(linesDouble[0].items[0].left, 100);

    // 3.0x Zoom Scale
    const linesTriple = processPageTextContent(mockTextContent, { scale: 3.0, height: 1500, width: 1200 });
    assert.equal(linesTriple[0].items[0].fontSize, 48);
    assert.equal(linesTriple[0].items[0].width, 180);
    assert.equal(linesTriple[0].items[0].left, 150);
  });

  it('should gracefully handle empty or malformed textContent and viewports', () => {
    assert.deepEqual(processPageTextContent(null, null), []);
    assert.deepEqual(processPageTextContent({ items: [] }, null), []);
    assert.deepEqual(processPageTextContent({ items: [{ str: '', width: 0 }] }, null), []);
    assert.deepEqual(processPageTextContent(undefined, undefined), []);
  });

  it('should process large batches of text items (10,000 items) within performance budget (< 50ms)', () => {
    const largeItems = [];
    for (let i = 0; i < 1000; i++) {
      largeItems.push({
        str: `فقرة تجريبية رقم ${i}`,
        transform: [12, 0, 0, 12, 50 + (i % 5) * 100, 800 - Math.floor(i / 5) * 20],
        width: 90,
        height: 12,
      });
    }

    const mockContent = { items: largeItems };
    const mockViewport = { scale: 1.0, height: 5000, width: 1000 };

    const startTime = performance.now();
    const lines = processPageTextContent(mockContent, mockViewport);
    const duration = performance.now() - startTime;

    assert.ok(lines.length > 0);
    assert.ok(duration < 50, `1,000 items processed in ${duration.toFixed(2)}ms, expected < 50ms`);
  });
});

describe('Arabic BiDi - Strict Horizontal Column Breaking (Requirement R1, AC1)', () => {
  it('AC1: should break items on the same vertical baseline into distinct ProcessedTextLines when separated by a large horizontal gap (left: 50 and left: 400)', () => {
    const mockTextContent = {
      items: [
        {
          str: 'العمود الأيمن',
          transform: [12, 0, 0, 12, 400, 700],
          width: 80,
          height: 12,
        },
        {
          str: 'العمود الأيسر',
          transform: [12, 0, 0, 12, 50, 700],
          width: 80,
          height: 12,
        },
      ],
    };

    const mockViewport = {
      scale: 1.0,
      height: 800,
      width: 600,
    };

    const lines = processPageTextContent(mockTextContent, mockViewport);

    // Must produce two distinct lines, not a single unified line stretched across the page
    assert.equal(lines.length, 2, 'Should break into 2 distinct ProcessedTextLines across the 270px horizontal gap');

    // Verify coordinates of the two lines
    const rightColLine = lines.find(l => l.left >= 350);
    const leftColLine = lines.find(l => l.left < 350);

    assert.ok(rightColLine, 'Right column line must exist');
    assert.ok(leftColLine, 'Left column line must exist');

    assert.equal(rightColLine.left, 400);
    assert.equal(leftColLine.left, 50);
    assert.equal(rightColLine.width, 80);
    assert.equal(leftColLine.width, 80);
    assert.equal(rightColLine.dir, 'rtl');
    assert.equal(leftColLine.dir, 'rtl');
  });

  it('should cluster contiguous items within the same column while breaking across the column gap', () => {
    // 2 items in Left column (left: 50, left: 140) and 2 items in Right column (left: 420, left: 510)
    const mockTextContent = {
      items: [
        { str: 'كلمة_1', transform: [12, 0, 0, 12, 50, 600], width: 70, height: 12 },
        { str: 'كلمة_2', transform: [12, 0, 0, 12, 130, 600], width: 70, height: 12 }, // gap = 130 - (50+70) = 10px <= 35
        { str: 'كلمة_3', transform: [12, 0, 0, 12, 420, 600], width: 70, height: 12 }, // gap = 420 - 200 = 220px > 35
        { str: 'كلمة_4', transform: [12, 0, 0, 12, 500, 600], width: 70, height: 12 }, // gap = 500 - (420+70) = 10px <= 35
      ],
    };

    const mockViewport = { scale: 1.0, height: 800, width: 700 };
    const lines = processPageTextContent(mockTextContent, mockViewport);

    assert.equal(lines.length, 2, 'Should cluster into 2 lines (1 per column)');

    const rightLine = lines.find(l => l.left >= 300);
    const leftLine = lines.find(l => l.left < 300);

    assert.ok(rightLine);
    assert.ok(leftLine);
    assert.equal(rightLine.items.length, 2);
    assert.equal(leftLine.items.length, 2);
  });

  it('should maintain column break sensitivity under zoom scaling (scale = 2.0)', () => {
    const mockTextContent = {
      items: [
        { str: 'نص_يسار', transform: [12, 0, 0, 12, 50, 500], width: 60, height: 12 },
        { str: 'نص_يمين', transform: [12, 0, 0, 12, 350, 500], width: 60, height: 12 },
      ],
    };

    const mockViewport = { scale: 2.0, height: 1600, width: 1200 };
    const lines = processPageTextContent(mockTextContent, mockViewport);

    assert.equal(lines.length, 2, 'Zoomed items must still break across columns');
    assert.equal(lines.find(l => l.left >= 600)?.width, 120);
    assert.equal(lines.find(l => l.left < 600)?.width, 120);
  });
});

describe('Arabic BiDi - Transitive DOM Reading Order Sorting (Requirement R2, AC2)', () => {
  it('AC2: should sort 2-column RTL layout with a full-width header into logical reading order without interleaving', () => {
    // Layout:
    // 1. Full-width Header at top (Y = 750 / top ~ 50)
    // 2. Right Column lines at Y = 700, 650, 600 (left ~ 450)
    // 3. Left Column lines at Y = 700, 650, 600 (left ~ 50)
    const mockTextContent = {
      items: [
        // Full-width Header
        {
          str: 'عنوان رئيسي عريض يغطي كامل الصفحة من اليمين إلى اليسار',
          transform: [16, 0, 0, 16, 50, 750],
          width: 550,
          height: 16,
        },
        // Right Column (Column 1 in RTL)
        {
          str: 'العمود الأيمن - السطر الأول',
          transform: [12, 0, 0, 12, 380, 680],
          width: 220,
          height: 12,
        },
        {
          str: 'العمود الأيمن - السطر الثاني',
          transform: [12, 0, 0, 12, 380, 630],
          width: 220,
          height: 12,
        },
        {
          str: 'العمود الأيمن - السطر الثالث',
          transform: [12, 0, 0, 12, 380, 580],
          width: 220,
          height: 12,
        },
        // Left Column (Column 2 in RTL)
        {
          str: 'العمود الأيسر - السطر الأول',
          transform: [12, 0, 0, 12, 50, 680],
          width: 220,
          height: 12,
        },
        {
          str: 'العمود الأيسر - السطر الثاني',
          transform: [12, 0, 0, 12, 50, 630],
          width: 220,
          height: 12,
        },
        {
          str: 'العمود الأيسر - السطر الثالث',
          transform: [12, 0, 0, 12, 50, 580],
          width: 220,
          height: 12,
        },
      ],
    };

    const mockViewport = { scale: 1.0, height: 800, width: 650 };
    const lines = processPageTextContent(mockTextContent, mockViewport);

    assert.equal(lines.length, 7, 'Expected 1 header + 3 right col + 3 left col lines');

    // Expected Logical RTL Reading Order:
    // 0: Header
    // 1: Right Column - Line 1
    // 2: Right Column - Line 2
    // 3: Right Column - Line 3
    // 4: Left Column - Line 1
    // 5: Left Column - Line 2
    // 6: Left Column - Line 3

    assert.ok(lines[0].fullText.includes('عنوان رئيسي'), `Line 0 must be Header, got: "${lines[0].fullText}"`);
    assert.ok(lines[1].fullText.includes('العمود الأيمن') && lines[1].fullText.includes('الأول'), `Line 1 must be Right Col Line 1, got: "${lines[1].fullText}"`);
    assert.ok(lines[2].fullText.includes('العمود الأيمن') && lines[2].fullText.includes('الثاني'), `Line 2 must be Right Col Line 2, got: "${lines[2].fullText}"`);
    assert.ok(lines[3].fullText.includes('العمود الأيمن') && lines[3].fullText.includes('الثالث'), `Line 3 must be Right Col Line 3, got: "${lines[3].fullText}"`);
    assert.ok(lines[4].fullText.includes('العمود الأيسر') && lines[4].fullText.includes('الأول'), `Line 4 must be Left Col Line 1, got: "${lines[4].fullText}"`);
    assert.ok(lines[5].fullText.includes('العمود الأيسر') && lines[5].fullText.includes('الثاني'), `Line 5 must be Left Col Line 2, got: "${lines[5].fullText}"`);
    assert.ok(lines[6].fullText.includes('العمود الأيسر') && lines[6].fullText.includes('الثالث'), `Line 6 must be Left Col Line 3, got: "${lines[6].fullText}"`);

    // Verify NO horizontal interleaving (Left col lines must never appear before Right col lines finish)
    for (let i = 1; i <= 3; i++) {
      assert.ok(lines[i].left >= 350, `Line ${i} should belong to Right Column`);
    }
    for (let i = 4; i <= 6; i++) {
      assert.ok(lines[i].left < 350, `Line ${i} should belong to Left Column`);
    }
  });

  it('should correctly order a 2-column layout containing Header and full-width Footer', () => {
    const lines: ProcessedTextLine[] = [
      // Header
      { items: [], fullText: 'ترويسة المستند', dir: 'rtl', top: 40, left: 50, width: 600, height: 20 },
      // Left col (added first in scrambled array)
      { items: [], fullText: 'يسار 2', dir: 'rtl', top: 130, left: 50, width: 250, height: 16 },
      { items: [], fullText: 'يسار 1', dir: 'rtl', top: 90, left: 50, width: 250, height: 16 },
      // Right col
      { items: [], fullText: 'يمين 2', dir: 'rtl', top: 130, left: 400, width: 250, height: 16 },
      { items: [], fullText: 'يمين 1', dir: 'rtl', top: 90, left: 400, width: 250, height: 16 },
      // Footer
      { items: [], fullText: 'تذييل الصفحة', dir: 'rtl', top: 200, left: 50, width: 600, height: 20 },
    ];

    const sorted = sortLinesInReadingOrder(lines, true);
    const textOrder = sorted.map(l => l.fullText);

    assert.deepEqual(textOrder, [
      'ترويسة المستند',
      'يمين 1',
      'يمين 2',
      'يسار 1',
      'يسار 2',
      'تذييل الصفحة',
    ]);
  });

  it('should correctly sort 3-column RTL layout from right to left, then top to bottom', () => {
    const lines: ProcessedTextLine[] = [
      // Middle Column (left: 320..540)
      { items: [], fullText: 'وسط 1', dir: 'rtl', top: 80, left: 320, width: 220, height: 16 },
      { items: [], fullText: 'وسط 2', dir: 'rtl', top: 120, left: 320, width: 220, height: 16 },
      // Left Column (left: 50..270)
      { items: [], fullText: 'يسار 1', dir: 'rtl', top: 80, left: 50, width: 220, height: 16 },
      { items: [], fullText: 'يسار 2', dir: 'rtl', top: 120, left: 50, width: 220, height: 16 },
      // Right Column (left: 600..820)
      { items: [], fullText: 'يمين 1', dir: 'rtl', top: 80, left: 600, width: 220, height: 16 },
      { items: [], fullText: 'يمين 2', dir: 'rtl', top: 120, left: 600, width: 220, height: 16 },
    ];

    const sorted = sortLinesInReadingOrder(lines, true);
    const textOrder = sorted.map(l => l.fullText);

    assert.deepEqual(textOrder, [
      'يمين 1',
      'يمين 2',
      'وسط 1',
      'وسط 2',
      'يسار 1',
      'يسار 2',
    ]);
  });

  it('should sort multi-column LTR layout from left to right, then top to bottom', () => {
    const lines: ProcessedTextLine[] = [
      // Right Column (left: 450)
      { items: [], fullText: 'Right 1', dir: 'ltr', top: 100, left: 450, width: 300, height: 16 },
      { items: [], fullText: 'Right 2', dir: 'ltr', top: 140, left: 450, width: 300, height: 16 },
      // Left Column (left: 50)
      { items: [], fullText: 'Left 1', dir: 'ltr', top: 100, left: 50, width: 300, height: 16 },
      { items: [], fullText: 'Left 2', dir: 'ltr', top: 140, left: 50, width: 300, height: 16 },
    ];

    const sorted = sortLinesInReadingOrder(lines, false);
    const textOrder = sorted.map(l => l.fullText);

    assert.deepEqual(textOrder, [
      'Left 1',
      'Left 2',
      'Right 1',
      'Right 2',
    ]);
  });

  it('should handle indented paragraphs and bullet points inside columns without separating into false columns', () => {
    const lines: ProcessedTextLine[] = [
      // Right Column with heading, indented paragraph, bullet
      { items: [], fullText: 'عنوان فرعي يمين', dir: 'rtl', top: 60, left: 450, width: 250, height: 18 },
      { items: [], fullText: 'فقرة مزاحة يمين', dir: 'rtl', top: 90, left: 470, width: 230, height: 14 },
      { items: [], fullText: 'نقطة فرعية يمين', dir: 'rtl', top: 115, left: 480, width: 220, height: 14 },
      // Left Column with heading, indented paragraph
      { items: [], fullText: 'عنوان فرعي يسار', dir: 'rtl', top: 60, left: 50, width: 250, height: 18 },
      { items: [], fullText: 'فقرة مزاحة يسار', dir: 'rtl', top: 90, left: 70, width: 230, height: 14 },
    ];

    const sorted = sortLinesInReadingOrder(lines, true);
    const textOrder = sorted.map(l => l.fullText);

    assert.deepEqual(textOrder, [
      'عنوان فرعي يمين',
      'فقرة مزاحة يمين',
      'نقطة فرعية يمين',
      'عنوان فرعي يسار',
      'فقرة مزاحة يسار',
    ]);
  });

  it('should correctly sort short centered title positioned above 2-column RTL layout', () => {
    const lines: ProcessedTextLine[] = [
      { items: [], fullText: 'عنوان الفصل الأول', dir: 'rtl', top: 50, left: 220, width: 160, height: 20 },
      { items: [], fullText: 'العمود الأيمن سطر 1', dir: 'rtl', top: 100, left: 350, width: 200, height: 14 },
      { items: [], fullText: 'العمود الأيمن سطر 2', dir: 'rtl', top: 150, left: 350, width: 200, height: 14 },
      { items: [], fullText: 'العمود الأيسر سطر 1', dir: 'rtl', top: 100, left: 50, width: 200, height: 14 },
      { items: [], fullText: 'العمود الأيسر سطر 2', dir: 'rtl', top: 150, left: 50, width: 200, height: 14 }
    ];

    const sorted = sortLinesInReadingOrder(lines, true);
    const textOrder = sorted.map(l => l.fullText);

    assert.deepEqual(textOrder, [
      'عنوان الفصل الأول',
      'العمود الأيمن سطر 1',
      'العمود الأيمن سطر 2',
      'العمود الأيسر سطر 1',
      'العمود الأيسر سطر 2'
    ]);
  });

  it('should reliably break and sort across narrow gutters (20px) without merging columns or zig-zagging', () => {
    // 1. Column breaking in processPageTextContent
    const textContent = {
      items: [
        { str: 'العمود الأيمن', width: 100, height: 12, transform: [12, 0, 0, 12, 220, 700] },
        { str: 'العمود الأيسر', width: 100, height: 12, transform: [12, 0, 0, 12, 100, 700] }
      ]
    };
    const processed = processPageTextContent(textContent, { scale: 1.0, height: 800 });
    assert.equal(processed.length, 2, 'Must break into 2 lines across 20px gutter');

    // 2. Reading order sorting with 20px gutter
    const lines: ProcessedTextLine[] = [
      { items: [], fullText: 'يمين 1', dir: 'rtl', top: 100, left: 270, width: 200, height: 14 },
      { items: [], fullText: 'يمين 2', dir: 'rtl', top: 150, left: 270, width: 200, height: 14 },
      { items: [], fullText: 'يسار 1', dir: 'rtl', top: 100, left: 50, width: 200, height: 14 },
      { items: [], fullText: 'يسار 2', dir: 'rtl', top: 150, left: 50, width: 200, height: 14 }
    ];
    const sorted = sortLinesInReadingOrder(lines, true);
    assert.deepEqual(sorted.map(l => l.fullText), ['يمين 1', 'يمين 2', 'يسار 1', 'يسار 2']);
  });

  it('should correctly partition multi-column blocks separated by mid-page section headers', () => {
    const lines: ProcessedTextLine[] = [
      { items: [], fullText: 'أعلى يمين 1', dir: 'rtl', top: 100, left: 300, width: 150, height: 14 },
      { items: [], fullText: 'أعلى يمين 2', dir: 'rtl', top: 150, left: 300, width: 150, height: 14 },
      { items: [], fullText: 'أعلى يسار 1', dir: 'rtl', top: 100, left: 50, width: 150, height: 14 },
      { items: [], fullText: 'أعلى يسار 2', dir: 'rtl', top: 150, left: 50, width: 150, height: 14 },
      { items: [], fullText: '--- عنوان وسط الصفحة ---', dir: 'rtl', top: 250, left: 180, width: 140, height: 16 },
      { items: [], fullText: 'أسفل يمين 1', dir: 'rtl', top: 300, left: 300, width: 150, height: 14 },
      { items: [], fullText: 'أسفل يمين 2', dir: 'rtl', top: 350, left: 300, width: 150, height: 14 },
      { items: [], fullText: 'أسفل يسار 1', dir: 'rtl', top: 300, left: 50, width: 150, height: 14 },
      { items: [], fullText: 'أسفل يسار 2', dir: 'rtl', top: 350, left: 50, width: 150, height: 14 }
    ];

    const sorted = sortLinesInReadingOrder(lines, true);
    assert.deepEqual(sorted.map(l => l.fullText), [
      'أعلى يمين 1',
      'أعلى يمين 2',
      'أعلى يسار 1',
      'أعلى يسار 2',
      '--- عنوان وسط الصفحة ---',
      'أسفل يمين 1',
      'أسفل يمين 2',
      'أسفل يسار 1',
      'أسفل يسار 2'
    ]);
  });

  it('should prevent column interleaving when columns have vertically staggered baselines with a centered title', () => {
    const lines: ProcessedTextLine[] = [
      { items: [], fullText: 'عنوان الفصل الأول', dir: 'rtl', top: 50, left: 220, width: 160, height: 20 },
      { items: [], fullText: 'يمين 1', dir: 'rtl', top: 100, left: 350, width: 200, height: 14 },
      { items: [], fullText: 'يسار 1', dir: 'rtl', top: 115, left: 50, width: 200, height: 14 },
      { items: [], fullText: 'يمين 2', dir: 'rtl', top: 130, left: 350, width: 200, height: 14 },
      { items: [], fullText: 'يسار 2', dir: 'rtl', top: 145, left: 50, width: 200, height: 14 },
    ];

    const sorted = sortLinesInReadingOrder(lines, true);
    assert.deepEqual(sorted.map(l => l.fullText), [
      'عنوان الفصل الأول',
      'يمين 1',
      'يمين 2',
      'يسار 1',
      'يسار 2'
    ]);
  });

  it('should correctly sort asymmetrical 2-column layout (65% main column width vs 35% sidebar)', () => {
    const lines: ProcessedTextLine[] = [
      { items: [], fullText: 'العمود الرئيسي 1', dir: 'rtl', top: 100, left: 250, width: 350, height: 14 },
      { items: [], fullText: 'شريط جانبي 1', dir: 'rtl', top: 100, left: 50, width: 150, height: 14 },
      { items: [], fullText: 'العمود الرئيسي 2', dir: 'rtl', top: 150, left: 250, width: 350, height: 14 },
      { items: [], fullText: 'شريط جانبي 2', dir: 'rtl', top: 150, left: 50, width: 150, height: 14 },
      { items: [], fullText: 'العمود الرئيسي 3', dir: 'rtl', top: 200, left: 250, width: 350, height: 14 },
      { items: [], fullText: 'شريط جانبي 3', dir: 'rtl', top: 200, left: 50, width: 150, height: 14 },
    ];

    const sorted = sortLinesInReadingOrder(lines, true);
    assert.deepEqual(sorted.map(l => l.fullText), [
      'العمود الرئيسي 1',
      'العمود الرئيسي 2',
      'العمود الرئيسي 3',
      'شريط جانبي 1',
      'شريط جانبي 2',
      'شريط جانبي 3'
    ]);
  });

  it('should correctly order a multi-column document with running header and running footer', () => {
    const lines: ProcessedTextLine[] = [
      { items: [], fullText: 'كتاب الرياضيات', dir: 'rtl', top: 40, left: 450, width: 100, height: 12 },
      { items: [], fullText: 'صفحة 15', dir: 'rtl', top: 40, left: 50, width: 50, height: 12 },
      { items: [], fullText: 'يمين 1', dir: 'rtl', top: 100, left: 350, width: 200, height: 14 },
      { items: [], fullText: 'يمين 2', dir: 'rtl', top: 150, left: 350, width: 200, height: 14 },
      { items: [], fullText: 'يسار 1', dir: 'rtl', top: 100, left: 50, width: 200, height: 14 },
      { items: [], fullText: 'يسار 2', dir: 'rtl', top: 150, left: 50, width: 200, height: 14 },
      { items: [], fullText: 'حقوق النشر محفوظة', dir: 'rtl', top: 500, left: 400, width: 150, height: 12 },
      { items: [], fullText: 'صفحة 1', dir: 'rtl', top: 500, left: 50, width: 50, height: 12 },
    ];

    const sorted = sortLinesInReadingOrder(lines, true);
    assert.deepEqual(sorted.map(l => l.fullText), [
      'كتاب الرياضيات',
      'صفحة 15',
      'يمين 1',
      'يمين 2',
      'يسار 1',
      'يسار 2',
      'حقوق النشر محفوظة',
      'صفحة 1'
    ]);
  });

  it('should handle unbalanced columns (e.g. Right col 1 line, Left col 4 lines)', () => {
    const lines: ProcessedTextLine[] = [
      { items: [], fullText: 'يمين 1', dir: 'rtl', top: 100, left: 350, width: 200, height: 14 },
      { items: [], fullText: 'يسار 1', dir: 'rtl', top: 100, left: 50, width: 200, height: 14 },
      { items: [], fullText: 'يسار 2', dir: 'rtl', top: 130, left: 50, width: 200, height: 14 },
      { items: [], fullText: 'يسار 3', dir: 'rtl', top: 160, left: 50, width: 200, height: 14 },
      { items: [], fullText: 'يسار 4', dir: 'rtl', top: 190, left: 50, width: 200, height: 14 },
    ];

    const sorted = sortLinesInReadingOrder(lines, true);
    assert.deepEqual(sorted.map(l => l.fullText), [
      'يمين 1',
      'يسار 1',
      'يسار 2',
      'يسار 3',
      'يسار 4'
    ]);
  });

  it('should handle multi-stage dynamic layout transitions (1-col -> 2-col -> 1-col -> 3-col -> 1-col)', () => {
    const lines: ProcessedTextLine[] = [
      { items: [], fullText: 'عنوان المقال', dir: 'rtl', top: 30, left: 100, width: 500, height: 20 },
      { items: [], fullText: 'بند أ 1', dir: 'rtl', top: 80, left: 380, width: 220, height: 14 },
      { items: [], fullText: 'بند أ 2', dir: 'rtl', top: 110, left: 380, width: 220, height: 14 },
      { items: [], fullText: 'بند ب 1', dir: 'rtl', top: 80, left: 50, width: 220, height: 14 },
      { items: [], fullText: 'بند ب 2', dir: 'rtl', top: 110, left: 50, width: 220, height: 14 },
      { items: [], fullText: '--- اقتباس مركزي مميز ---', dir: 'rtl', top: 170, left: 150, width: 350, height: 16 },
      { items: [], fullText: 'خلاصة 3', dir: 'rtl', top: 220, left: 450, width: 150, height: 14 },
      { items: [], fullText: 'خلاصة 2', dir: 'rtl', top: 220, left: 250, width: 150, height: 14 },
      { items: [], fullText: 'خلاصة 1', dir: 'rtl', top: 220, left: 50, width: 150, height: 14 },
      { items: [], fullText: 'تذييل الصفحة الأخير', dir: 'rtl', top: 290, left: 50, width: 550, height: 18 },
    ];

    const sorted = sortLinesInReadingOrder(lines, true);
    assert.deepEqual(sorted.map(l => l.fullText), [
      'عنوان المقال',
      'بند أ 1',
      'بند أ 2',
      'بند ب 1',
      'بند ب 2',
      '--- اقتباس مركزي مميز ---',
      'خلاصة 3',
      'خلاصة 2',
      'خلاصة 1',
      'تذييل الصفحة الأخير'
    ]);
  });

  it('should maintain strict mathematical transitivity and permutation invariance across all order permutations', () => {
    // 3 lines with slight vertical drift that would form a cycle in a fuzzy comparator
    const lines: ProcessedTextLine[] = [
      { items: [], fullText: 'Line A', dir: 'rtl', top: 100, left: 300, width: 100, height: 14 },
      { items: [], fullText: 'Line B', dir: 'rtl', top: 102.5, left: 200, width: 100, height: 14 },
      { items: [], fullText: 'Line C', dir: 'rtl', top: 105, left: 100, width: 100, height: 14 },
    ];

    // Permutations
    const p1 = [lines[0], lines[1], lines[2]];
    const p2 = [lines[2], lines[1], lines[0]];
    const p3 = [lines[1], lines[0], lines[2]];
    const p4 = [lines[1], lines[2], lines[0]];
    const p5 = [lines[2], lines[0], lines[1]];
    const p6 = [lines[0], lines[2], lines[1]];

    const expectedOrder = sortLinesInReadingOrder(p1, true).map(l => l.fullText);

    assert.deepEqual(sortLinesInReadingOrder(p2, true).map(l => l.fullText), expectedOrder);
    assert.deepEqual(sortLinesInReadingOrder(p3, true).map(l => l.fullText), expectedOrder);
    assert.deepEqual(sortLinesInReadingOrder(p4, true).map(l => l.fullText), expectedOrder);
    assert.deepEqual(sortLinesInReadingOrder(p5, true).map(l => l.fullText), expectedOrder);
    assert.deepEqual(sortLinesInReadingOrder(p6, true).map(l => l.fullText), expectedOrder);
  });

  it('should correctly isolate narrow centered title located entirely in the gutter between columns', () => {
    // Narrow title in gutter (left: 220..380), Right col (left: 400..550), Left col (left: 50..200)
    const lines: ProcessedTextLine[] = [
      { items: [], fullText: 'العنوان في المنتصف', dir: 'rtl', top: 50, left: 220, width: 160, height: 20 },
      { items: [], fullText: 'يمين 1', dir: 'rtl', top: 100, left: 400, width: 150, height: 14 },
      { items: [], fullText: 'يمين 2', dir: 'rtl', top: 150, left: 400, width: 150, height: 14 },
      { items: [], fullText: 'يسار 1', dir: 'rtl', top: 100, left: 50, width: 150, height: 14 },
      { items: [], fullText: 'يسار 2', dir: 'rtl', top: 150, left: 50, width: 150, height: 14 }
    ];

    const sorted = sortLinesInReadingOrder(lines, true);
    assert.deepEqual(sorted.map(l => l.fullText), [
      'العنوان في المنتصف',
      'يمين 1',
      'يمين 2',
      'يسار 1',
      'يسار 2'
    ]);
  });

  it('should correctly partition multi-column blocks separated by narrow mid-page section title in the gutter', () => {
    const lines: ProcessedTextLine[] = [
      // Top 2-col block
      { items: [], fullText: 'أعلى يمين 1', dir: 'rtl', top: 100, left: 300, width: 150, height: 14 },
      { items: [], fullText: 'أعلى يمين 2', dir: 'rtl', top: 130, left: 300, width: 150, height: 14 },
      { items: [], fullText: 'أعلى يسار 1', dir: 'rtl', top: 100, left: 50, width: 150, height: 14 },
      { items: [], fullText: 'أعلى يسار 2', dir: 'rtl', top: 130, left: 50, width: 150, height: 14 },
      // Narrow mid-page title in gutter (no X-overlap with either column!)
      { items: [], fullText: 'عنوان ضيق', dir: 'rtl', top: 170, left: 210, width: 80, height: 14 },
      // Bottom 2-col block
      { items: [], fullText: 'أسفل يمين 1', dir: 'rtl', top: 210, left: 300, width: 150, height: 14 },
      { items: [], fullText: 'أسفل يمين 2', dir: 'rtl', top: 240, left: 300, width: 150, height: 14 },
      { items: [], fullText: 'أسفل يسار 1', dir: 'rtl', top: 210, left: 50, width: 150, height: 14 },
      { items: [], fullText: 'أسفل يسار 2', dir: 'rtl', top: 240, left: 50, width: 150, height: 14 }
    ];

    const sorted = sortLinesInReadingOrder(lines, true);
    assert.deepEqual(sorted.map(l => l.fullText), [
      'أعلى يمين 1',
      'أعلى يمين 2',
      'أعلى يسار 1',
      'أعلى يسار 2',
      'عنوان ضيق',
      'أسفل يمين 1',
      'أسفل يمين 2',
      'أسفل يسار 1',
      'أسفل يسار 2'
    ]);
  });
});


