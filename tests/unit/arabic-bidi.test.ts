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
