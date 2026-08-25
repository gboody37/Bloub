/**
 * ⚔️ ADVERSARIAL STRESS TEST HARNESS: Arabic BiDi, Presentation Forms, & Text Layer Extraction
 *
 * Target: src/lib/pdf/arabic-bidi.ts & DOM Text Layer Selection
 *
 * Stress Dimensions:
 * 1. Complex Nested Arabic + English + Western numbers + Arabic-Indic digits
 * 2. Dense Quranic Tashkeel / Harakat diacritics attached to letters & Quranic marks
 * 3. Multi-line paragraph wrapping with Tatweel / Kashida (ـ)
 * 4. Malformed/corrupted Presentation Form character sequences & directional overrides
 * 5. High-volume batch clustering stress tests (10,000+ to 25,000+ items)
 * 6. Simulated window.getSelection().toString() contiguous extraction verification
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
  type ProcessedTextItem,
  type ProcessedTextLine,
} from '../../src/lib/pdf/arabic-bidi.ts';
import { MockDOMTextLayer, type DOMTextSpan } from '../integration/arabic-text-selection.test.ts';

describe('⚔️ CHALLENGER DIMENSION 1: Complex Nested BiDi Runs (Arabic + Latin + Numbers + Punctuation)', () => {
  it('D1.1: should correctly detect Arabic text in complex nested BiDi phrases', () => {
    const mixedPhrases = [
      'البند 45-B (الفقرة 12)',
      'المادة 10-A الفقرة ٣ (Annex C - Version 2.1)',
      'المجموع: 1,250.75 $ (أو ١٢٥٠ دينار) بنسبة 15.5%',
      'هاتف: +962-6-1234567 بتاريخ 2026/08/25',
      'الدالة `calculateSum(x, y)` مع المعاملات 10 و 20',
      'ISO-9001:2015 معيار الجودة (النسخة 2.0)',
      'الرمز البريدي [11181] - صندوق بريد #4092',
    ];

    for (const phrase of mixedPhrases) {
      assert.equal(isArabicText(phrase), true, `Should detect Arabic in: "${phrase}"`);
    }
  });

  it('D1.2: should preserve logical order in complex nested BiDi strings without corrupting Latin/Numeric runs', () => {
    const testCases = [
      'البند 45-B (الفقرة 12)',
      'المادة 10-A الفقرة ٣ (Annex C - Version 2.1)',
      'المجموع: 1,250.75 $ (أو ١٢٥٠ دينار) بنسبة 15.5%',
      'هاتف: +962-6-1234567 بتاريخ 2026/08/25',
      'ISO-9001:2015 معيار الجودة (النسخة 2.0)',
    ];

    for (const testCase of testCases) {
      const result = reorderVisualToLogicalArabic(testCase);
      assert.equal(result, testCase, `Logical string must remain unchanged: "${testCase}"`);
    }
  });

  it('D1.3: should accurately reorder visual-order streams containing nested English & numbers', () => {
    // Visual stream: Leftmost on page is "45-B", then "(12 ةرقفلا)", then "دنبلا"
    // "البند" reversed presentation: Dal final (\uFEAA) + Noon medial (\uFEE8) + Beh medial (\uFE92) + Lam initial (\uFEDF) + Alef isolated (\uFE8D)
    // "الفقرة" reversed presentation: Teh Marbuta final (\uFE94) + Reh final (\uFEAE) + Qaf medial (\uFED8) + Feh medial (\uFED4) + Lam initial (\uFEDF) + Alef isolated (\uFE8D)
    const visualStream = '12) \uFE94\uFEAE\uFED8\uFED4\uFEDF\uFE8D (45-B \uFEAA\uFEE8\uFE92\uFEDF\uFE8D';
    const logical = reorderVisualToLogicalArabic(visualStream);

    assert.ok(logical.includes('البند'), `Should restore البند from visual stream, got: "${logical}"`);
    assert.ok(logical.includes('الفقرة'), `Should restore الفقرة from visual stream, got: "${logical}"`);
    assert.ok(logical.includes('45-B'), 'Should preserve 45-B');
    assert.ok(logical.includes('12'), 'Should preserve 12');
  });

  it('D1.4: should handle Arabic-Indic digits (١٢٣٤٥٦٧٨٩٠) seamlessly with Western numbers', () => {
    const mixedDigits = 'رقم المعاملة: 2026/A-٩٨٧٦٥';
    const normalized = reorderVisualToLogicalArabic(mixedDigits);
    assert.equal(normalized, mixedDigits);
    assert.equal(isArabicText(mixedDigits), true);
  });
});

describe('⚔️ CHALLENGER DIMENSION 2: Dense Quranic Tashkeel & Harakat Grapheme Rigor', () => {
  it('D2.1: should preserve complete Basmala with all Tashkeel, Dagger Alef, and Shaddah intact', () => {
    const basmala = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
    const normalized = normalizeArabicPresentationForms(basmala);
    assert.equal(normalized, basmala, 'Canonical Tashkeel must never be stripped during normalization');
  });

  it('D2.2: should handle stacked diacritics (Shaddah + Fatha / Damma / Kasra / Tanween) without corruption', () => {
    const stackedWords = [
      'مُعَلِّمٌ',    // Meem + Damma, Ain + Fatha, Lam + Shaddah + Kasra, Meem + Dammatan
      'مُحَمَّدٌ',    // Meem + Damma, Hah + Fatha, Meem + Shaddah + Fatha, Dal + Dammatan
      'جَبَّارًا',    // Jeem + Fatha, Beh + Shaddah + Fatha, Alef, Reh + Fathatan, Alef
      'رَبِّ',        // Reh + Fatha, Beh + Shaddah + Kasra
      'صَفًّا',       // Sad + Fatha, Feh + Shaddah + Fathatan, Alef
      'عَدُوٌّ',      // Ain + Fatha, Dal + Damma, Waw + Shaddah + Dammatan
      'مُتَّكِئِينَ', // Meem + Damma, Teh + Shaddah + Fatha, Kaf + Kasra, Yeh + Hamza + Kasra, Yeh, Noon + Fatha
    ];

    for (const word of stackedWords) {
      const normalized = normalizeArabicPresentationForms(word);
      assert.equal(normalized, word, `Stacked diacritics must match exactly for: ${word}`);

      // Reversing and re-reversing must be completely bijective (invertible)
      const reversed = reverseArabicGraphemes(word);
      const restored = reverseArabicGraphemes(reversed);
      assert.equal(restored, word, `Bijective grapheme reversal failed on: ${word}`);
    }
  });

  it('D2.3: should preserve Quranic special diacritics (Dagger Alef \u0670, Small High Yeh \u06E6, Sajdah, Pause marks)', () => {
    const quranicTokens = [
      'هٰذَا',          // Dagger Alef on Hah
      'إِلٰهِ',         // Dagger Alef on Lam
      'الرَّحْمٰنِ',     // Dagger Alef on Meem
      'الصَّلٰوةَ',     // Dagger Alef on Lam + Waw
      'الزَّكٰوةَ',     // Dagger Alef on Lam + Waw
    ];

    for (const token of quranicTokens) {
      assert.equal(isArabicText(token), true);
      const normalized = normalizeArabicPresentationForms(token);
      assert.equal(normalized, token);
      assert.equal(reverseArabicGraphemes(reverseArabicGraphemes(token)), token);
    }
  });

  it('D2.4: should map presentation form Tashkeel glyphs to canonical equivalents seamlessly', () => {
    // FE70 (Fathatan), FE72 (Dammatan), FE74 (Kasratan), FE76 (Fatha), FE78 (Damma), FE7A (Kasra), FE7C (Shaddah), FE7E (Sukun)
    const presentationTashkeel = '\u0628\uFE76\u062A\uFE78\u062B\uFE7A\u062C\uFE7C\uFE76\u062F\uFE7E';
    const normalized = normalizeArabicPresentationForms(presentationTashkeel);
    assert.equal(normalized, 'بَتُثِجَّدْ');
  });

  it('D2.5: [CHALLENGE AUDIT] should test behavior with Quranic Sukun (0x06E1) and Quranic Maddah (0x0653)', () => {
    // Quranic combining characters: 0x0653 (Maddah), 0x06E1 (Small high head of Khah / Sukun)
    const wordWithQuranicMarks = 'يَسْتَحْيِۦ';
    assert.equal(isArabicText(wordWithQuranicMarks), true);
    const normalized = normalizeArabicPresentationForms(wordWithQuranicMarks);
    assert.ok(normalized.length > 0);
  });
});

describe('⚔️ CHALLENGER DIMENSION 3: Tatweel / Kashida (ـ) & Multi-line Paragraph Justification', () => {
  it('D3.1: should preserve Tatweel (ـ \u0640) within words in logical and visual streams', () => {
    const kashidaWord = 'مــــرحــــبــــا';
    const normalized = normalizeArabicPresentationForms(kashidaWord);
    assert.equal(normalized, kashidaWord, 'Tatweel characters must be preserved');
    assert.equal(isArabicText(kashidaWord), true);
  });

  it('D3.2: should correctly reverse visual words containing multiple Tatweel and Tashkeel combinations', () => {
    // Word with Tatweel and Tashkeel: مـَـرْحـَـبـًـا
    const wordWithTatweelTashkeel = 'مـَـرْحـَـبـًـا';
    const reversed = reverseArabicGraphemes(wordWithTatweelTashkeel);
    const restored = reverseArabicGraphemes(reversed);
    assert.equal(restored, wordWithTatweelTashkeel);
  });

  it('D3.3: should group multi-line Tatweel-justified paragraphs across distinct vertical baselines', () => {
    const mockMultiLineParagraph = {
      items: [
        {
          str: 'الـــفـــقـــرة الأولـــــى مــــن الــــمــــســــتــــنــــد',
          transform: [12, 0, 0, 12, 100, 750],
          width: 350,
          height: 12,
        },
        {
          str: 'وتـــشـــمـــل جـــمـــيـــع الـــتـــفـــاصـــيـــل',
          transform: [12, 0, 0, 12, 100, 720],
          width: 300,
          height: 12,
        },
        {
          str: 'الـــخـــاتـــمـــة والـــنـــتـــائـــج الـــنـــهـــائـــيـــة',
          transform: [12, 0, 0, 12, 100, 690],
          width: 320,
          height: 12,
        },
      ],
    };

    const viewport = { scale: 1.0, height: 900, width: 600 };
    const lines = processPageTextContent(mockMultiLineParagraph, viewport);

    assert.equal(lines.length, 3, 'Should produce exactly 3 lines for 3 distinct baselines');
    assert.equal(lines[0].dir, 'rtl');
    assert.equal(lines[1].dir, 'rtl');
    assert.equal(lines[2].dir, 'rtl');
    assert.ok(lines[0].fullText.includes('الـــفـــقـــرة'));
    assert.ok(lines[1].fullText.includes('وتـــشـــمـــل'));
    assert.ok(lines[2].fullText.includes('الـــخـــاتـــمـــة'));
  });
});

describe('⚔️ CHALLENGER DIMENSION 4: Malformed, Corrupted Presentation Forms & Directional Overrides', () => {
  it('D4.1: should handle isolated medial presentation forms without crashing', () => {
    // Medial Beh (\uFE92), Medial Jeem (\uFEA0), Medial Noon (\uFEE8) in isolation
    const isolatedMedials = '\uFE92\uFEA0\uFEE8';
    const normalized = normalizeArabicPresentationForms(isolatedMedials);
    assert.equal(normalized, 'بجن');
  });

  it('D4.2: should handle unmapped Presentation Form-A codes via NFKC fallback without losing characters', () => {
    // Ornate Parentheses (\uFD3E, \uFD3F) & 3-letter ligatures
    const ornateText = '\uFD3Eنص مقدس\uFD3F';
    const normalized = normalizeArabicPresentationForms(ornateText);
    assert.ok(normalized.includes('نص مقدس'));
  });

  it('D4.3: should handle strings starting with orphaned Tashkeel diacritics safely', () => {
    const orphanDiacritics = '\u0651\u064E\u0628\u0627\u0628';
    const reversed = reverseArabicGraphemes(orphanDiacritics);
    // Should not throw, should handle leading combining mark
    assert.ok(typeof reversed === 'string');
    assert.ok(reversed.length > 0);
  });

  it('D4.4: should handle directional formatting overrides (RLO, LRO, PDF, ZWJ, ZWNJ, LRM, RLM)', () => {
    // \u200E (LRM), \u200F (RLM), \u200C (ZWNJ), \u200D (ZWJ), \u202A (LRE), \u202B (RLE), \u202C (PDF), \u202D (LRO), \u202E (RLO)
    const textWithOverrides = '\u202E\u0627\u0644\u0639\u0631\u0628\u064A\u0629\u202C \u200F\u0645\u0639 \u200C\u0627\u0644\u0644\u0627\u062A\u064A\u0646\u064A';
    assert.equal(isArabicText(textWithOverrides), true);
    const normalized = normalizeArabicPresentationForms(textWithOverrides);
    assert.ok(normalized.length > 0);
  });

  it('D4.5: should gracefully handle null, undefined, empty strings, and control characters', () => {
    assert.equal(normalizeArabicPresentationForms(''), '');
    assert.equal(normalizeArabicPresentationForms(null as any), '');
    assert.equal(normalizeArabicPresentationForms(undefined as any), '');
    assert.equal(isArabicText(''), false);
    assert.equal(isArabicText(null as any), false);
    assert.equal(isArabicText(undefined as any), false);
    assert.equal(reorderVisualToLogicalArabic(''), '');
    assert.equal(reverseArabicGraphemes(''), '');
  });
});

describe('⚔️ CHALLENGER DIMENSION 5: High-Volume Batch Clustering Stress Testing (10,000+ Items)', () => {
  it('D5.1: should cluster 10,000 text items across 1,000 baselines within 100ms without memory bloat', () => {
    const itemCount = 10000;
    const linesCount = 1000;
    const itemsPerLine = 10;
    const items: any[] = [];

    for (let l = 0; l < linesCount; l++) {
      const y = 50000 - l * 50; // top to bottom
      for (let i = 0; i < itemsPerLine; i++) {
        items.push({
          str: `عنصر_${l}_${i}`,
          transform: [12, 0, 0, 12, 50 + i * 80, y],
          width: 70,
          height: 12,
        });
      }
    }

    const mockContent = { items };
    const viewport = { scale: 1.0, height: 60000, width: 1200 };

    const t0 = performance.now();
    const lines = processPageTextContent(mockContent, viewport);
    const duration = performance.now() - t0;

    assert.equal(lines.length, linesCount, `Expected exactly ${linesCount} lines, got ${lines.length}`);
    for (let l = 0; l < linesCount; l++) {
      assert.equal(lines[l].items.length, itemsPerLine, `Line ${l} should contain ${itemsPerLine} items`);
      assert.equal(lines[l].dir, 'rtl');
    }
    assert.ok(duration < 100, `10,000 items clustered in ${duration.toFixed(2)}ms, expected < 100ms`);
  });

  it('D5.2: should tolerate baseline micro-jitter (floating-point Y variance) across 20,000 items', () => {
    const itemCount = 20000;
    const linesCount = 2000;
    const items: any[] = [];

    for (let l = 0; l < linesCount; l++) {
      const baseY = 100000 - l * 40;
      for (let i = 0; i < 10; i++) {
        // Add random micro-jitter within 1.5px (well within yTolerance)
        const jitterY = baseY + (Math.random() * 2 - 1);
        items.push({
          str: `كلمة_${i}`,
          transform: [14, 0, 0, 14, 40 + i * 90, jitterY],
          width: 80,
          height: 14,
        });
      }
    }

    const mockContent = { items };
    const viewport = { scale: 1.5, height: 160000, width: 1500 };

    const t0 = performance.now();
    const lines = processPageTextContent(mockContent, viewport);
    const duration = performance.now() - t0;

    assert.equal(lines.length, linesCount, `Micro-jitter should not split lines, expected ${linesCount} lines`);
    assert.ok(duration < 250, `20,000 items with jitter clustered in ${duration.toFixed(2)}ms, expected < 250ms`);
  });

  it('D5.3: should correctly sort and cluster out-of-order / shuffled text items', () => {
    // Generate 500 items across 50 lines in completely scrambled order
    const orderedItems: any[] = [];
    for (let l = 0; l < 50; l++) {
      const y = 2000 - l * 30;
      for (let i = 0; i < 10; i++) {
        orderedItems.push({
          str: `ل_${l}_${i}`,
          transform: [12, 0, 0, 12, 50 + i * 60, y],
          width: 50,
          height: 12,
        });
      }
    }

    // Fisher-Yates shuffle
    const shuffledItems = [...orderedItems];
    for (let i = shuffledItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledItems[i], shuffledItems[j]] = [shuffledItems[j], shuffledItems[i]];
    }

    const mockContent = { items: shuffledItems };
    const viewport = { scale: 1.0, height: 2500, width: 800 };

    const lines = processPageTextContent(mockContent, viewport);
    assert.equal(lines.length, 50, 'Shuffled items must be grouped into 50 lines');

    // Lines must be ordered strictly from top to bottom
    for (let i = 0; i < lines.length - 1; i++) {
      assert.ok(
        lines[i].top <= lines[i + 1].top,
        `Line ${i} (top: ${lines[i].top}) must be above Line ${i + 1} (top: ${lines[i + 1].top})`
      );
    }
  });

  it('D5.4: should maintain numerical coordinate stability across extreme zoom scales (0.25x to 5.0x)', () => {
    const mockItem = {
      items: [{
        str: 'معاينة بمقياس رسم مختلف',
        transform: [16, 0, 0, 16, 100, 500],
        width: 150,
        height: 16,
      }],
    };

    const zoomScales = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];

    for (const scale of zoomScales) {
      const lines = processPageTextContent(mockItem, { scale, height: 800 * scale, width: 600 * scale });
      assert.equal(lines.length, 1);
      const line = lines[0];
      const item = line.items[0];

      assert.equal(item.fontSize, 16 * scale);
      assert.equal(item.width, 150 * scale);
      assert.equal(item.left, 100 * scale);
      assert.ok(!Number.isNaN(line.top) && !Number.isNaN(line.left) && !Number.isNaN(line.width));
    }
  });
});

describe('⚔️ CHALLENGER DIMENSION 6: Simulated Native Text Selection (window.getSelection()) Verification', () => {
  it('D6.1: should extract contiguous, logical Arabic text over multi-line mixed paragraph selection', () => {
    const textLayer = new MockDOMTextLayer();
    const paragraphLines = [
      'المادة 45-B من اللائحة التنفيذية رقم (12) لعام 2026',
      'تحدد الشروط والمتطلبات الفنية لتطبيقات Next.js 16 و React 19',
      'مع الحفاظ على معايير Unicode 15.0 واللغة العربية'
    ];

    paragraphLines.forEach((lineText, idx) => {
      textLayer.addSpan({
        id: `span-${idx}`,
        text: lineText,
        dir: 'rtl',
        unicodeBidi: 'isolate',
        style: { left: 100, top: 50 + idx * 30, fontSize: 16, width: 450, height: 22 }
      });
    });

    // Select entire 3-line paragraph
    const sel = textLayer.simulateSelection(0, 0, 2, paragraphLines[2].length);

    assert.equal(sel.clientRects.length, 3, 'Should produce 3 distinct bounding rects for 3 lines');
    assert.ok(sel.selectedText.includes('المادة 45-B'));
    assert.ok(sel.selectedText.includes('Next.js 16'));
    assert.ok(sel.selectedText.includes('معايير Unicode 15.0'));

    // Highlight creation across lines at 1.0x zoom
    const highlights = textLayer.createHighlightFromSelection(sel.clientRects, 1.0, '#fde047');
    assert.equal(highlights.length, 3);
    assert.equal(highlights[0].startY, 50);
    assert.equal(highlights[1].startY, 80);
    assert.equal(highlights[2].startY, 110);
  });

  it('D6.2: should extract partial intra-word and intra-sentence Arabic slices without character skips', () => {
    const textLayer = new MockDOMTextLayer();
    const fullLine = 'جامعة اليرموك - كلية تكنولوجيا المعلومات وعلوم الحاسوب';
    textLayer.addSpan({
      id: 'span-univ',
      text: fullLine,
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 120, top: 60, fontSize: 18, width: 500, height: 24 }
    });

    // Select "كلية تكنولوجيا المعلومات" (start index: 16, end index: 39)
    const targetSlice = 'كلية تكنولوجيا المعلومات';
    const startIdx = fullLine.indexOf(targetSlice);
    const endIdx = startIdx + targetSlice.length;

    const sel = textLayer.simulateSelection(0, startIdx, 0, endIdx);
    assert.equal(sel.selectedText, targetSlice, 'Extracted slice must exactly match target substring');
    assert.equal(sel.clientRects.length, 1);
    assert.ok(sel.clientRects[0].width > 0);
  });

  it('D6.3: should preserve highlight spatial alignment when selecting text across 50% to 300% zoom levels', () => {
    const textLayer = new MockDOMTextLayer();
    const lineText = 'توثيق واختبار مكتبة التدويل ثنائية الاتجاه';
    const unscaledLeft = 150;
    const unscaledTop = 100;
    const unscaledWidth = 360;
    const unscaledHeight = 26;

    textLayer.addSpan({
      id: 'span-bidi',
      text: lineText,
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: unscaledLeft, top: unscaledTop, fontSize: 18, width: unscaledWidth, height: unscaledHeight }
    });

    const zoomLevels = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];

    for (const zoom of zoomLevels) {
      const clientRect: any = {
        left: textLayer.containerRect.left + unscaledLeft * zoom,
        top: textLayer.containerRect.top + unscaledTop * zoom,
        width: unscaledWidth * zoom,
        height: unscaledHeight * zoom,
        right: textLayer.containerRect.left + (unscaledLeft + unscaledWidth) * zoom,
        bottom: textLayer.containerRect.top + (unscaledTop + unscaledHeight) * zoom,
      };

      const highlights = textLayer.createHighlightFromSelection([clientRect], zoom, '#93c5fd');
      assert.equal(highlights.length, 1);
      const hl = highlights[0];

      // Unscaled coordinates must remain identical regardless of active zoom level!
      assert.equal(Math.round(hl.startX), unscaledLeft, `Zoom ${zoom}x failed startX invariance`);
      assert.equal(Math.round(hl.startY), unscaledTop, `Zoom ${zoom}x failed startY invariance`);
      assert.equal(Math.round(hl.w), unscaledWidth, `Zoom ${zoom}x failed width invariance`);
      assert.equal(Math.round(hl.h), unscaledHeight, `Zoom ${zoom}x failed height invariance`);
    }
  });

  it('D6.4: should produce clean clipboard-compatible strings when copying multi-span mixed content', () => {
    const textLayer = new MockDOMTextLayer();
    textLayer.addSpan({
      id: 'span-1',
      text: 'المشروع:',
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 100, top: 40, fontSize: 16, width: 80, height: 20 }
    });
    textLayer.addSpan({
      id: 'span-2',
      text: 'vibe-todos (Next.js 16)',
      dir: 'ltr',
      unicodeBidi: 'isolate',
      style: { left: 190, top: 40, fontSize: 16, width: 180, height: 20 }
    });
    textLayer.addSpan({
      id: 'span-3',
      text: 'الحالة: مكتمل بنجاح 100%',
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 380, top: 40, fontSize: 16, width: 200, height: 20 }
    });

    const sel = textLayer.simulateSelection(0, 0, 2, 24);
    const clipboardText = sel.selectedText;

    assert.ok(clipboardText.startsWith('المشروع:'));
    assert.ok(clipboardText.includes('vibe-todos (Next.js 16)'));
    assert.ok(clipboardText.includes('الحالة: مكتمل بنجاح 100%'));
  });
});
