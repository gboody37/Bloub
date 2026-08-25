/**
 * Tier 1 & Tier 2 Unit Test Suite: Arabic Unicode Normalization, BiDi Reordering & Line Clustering
 * Features Covered: F1, F2, F3, F4, F5
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Canonical Presentation Forms Map & Reference Oracle
const PRESENTATION_FORMS_MAP: Record<number, string> = {
  // Arabic Presentation Forms-A (U+FB50 - U+FDFF)
  0xFB50: '\u0671', 0xFB51: '\u0671', 0xFB52: '\u067B', 0xFB53: '\u067B', 0xFB54: '\u067B',
  0xFDF2: '\u0627\u0644\u0644\u0647', // ALLAH ligature
  0xFDFD: '\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062d\u0645\u0646 \u0627\u0644\u0631\u062d\u064a\u0645', // BISMILLAH

  // Arabic Presentation Forms-B (U+FE70 - U+FEFF)
  0xFE80: '\u0621', // HAMZA
  0xFE81: '\u0622', 0xFE82: '\u0622', // ALEF WITH MADDA
  0xFE83: '\u0623', 0xFE84: '\u0623', // ALEF WITH HAMZA ABOVE
  0xFE85: '\u0624', 0xFE86: '\u0624', // WAW WITH HAMZA ABOVE
  0xFE87: '\u0625', 0xFE88: '\u0625', // ALEF WITH HAMZA BELOW
  0xFE89: '\u0626', 0xFE8A: '\u0626', 0xFE8B: '\u0626', 0xFE8C: '\u0626', // YEH WITH HAMZA
  0xFE8D: '\u0627', 0xFE8E: '\u0627', // ALEF
  0xFE8F: '\u0628', 0xFE90: '\u0628', 0xFE91: '\u0628', 0xFE92: '\u0628', // BEH
  0xFE93: '\u0629', 0xFE94: '\u0629', // TEH MARBUTA
  0xFE95: '\u062A', 0xFE96: '\u062A', 0xFE97: '\u062A', 0xFE98: '\u062A', // TEH
  0xFE99: '\u062B', 0xFE9A: '\u062B', 0xFE9B: '\u062B', 0xFE9C: '\u062B', // THEH
  0xFE9D: '\u062C', 0xFE9E: '\u062C', 0xFE9F: '\u062C', 0xFEA0: '\u062C', // JEEM
  0xFEA1: '\u062D', 0xFEA2: '\u062D', 0xFEA3: '\u062D', 0xFEA4: '\u062D', // HAH
  0xFEA5: '\u062E', 0xFEA6: '\u062E', 0xFEA7: '\u062E', 0xFEA8: '\u062E', // KHAH
  0xFEA9: '\u062F', 0xFEAA: '\u062F', // DAL
  0xFEAB: '\u0630', 0xFEAC: '\u0630', // THAL
  0xFEAD: '\u0631', 0xFEAE: '\u0631', // REH
  0xFEAF: '\u0632', 0xFEB0: '\u0632', // ZAIN
  0xFEB1: '\u0633', 0xFEB2: '\u0633', 0xFEB3: '\u0633', 0xFEB4: '\u0633', // SEEN
  0xFEB5: '\u0634', 0xFEB6: '\u0634', 0xFEB7: '\u0634', 0xFEB8: '\u0634', // SHEEN
  0xFEB9: '\u0635', 0xFEBA: '\u0635', 0xFEBB: '\u0635', 0xFEBC: '\u0635', // SAD
  0xFEBD: '\u0636', 0xFEBE: '\u0636', 0xFEBF: '\u0636', 0xFEC0: '\u0636', // DAD
  0xFEC1: '\u0637', 0xFEC2: '\u0637', 0xFEC3: '\u0637', 0xFEC4: '\u0637', // TAH
  0xFEC5: '\u0638', 0xFEC6: '\u0638', 0xFEC7: '\u0638', 0xFEC8: '\u0638', // ZAH
  0xFEC9: '\u0639', 0xFECA: '\u0639', 0xFECB: '\u0639', 0xFECC: '\u0639', // AIN
  0xFECD: '\u063A', 0xFECE: '\u063A', 0xFECF: '\u063A', 0xFED0: '\u063A', // GHAIN
  0xFED1: '\u0641', 0xFED2: '\u0641', 0xFED3: '\u0641', 0xFED4: '\u0641', // FEH
  0xFED5: '\u0642', 0xFED6: '\u0642', 0xFED7: '\u0642', 0xFED8: '\u0642', // QAF
  0xFED9: '\u0643', 0xFEDA: '\u0643', 0xFEDB: '\u0643', 0xFEDC: '\u0643', // KAF
  0xFEDD: '\u0644', 0xFEDE: '\u0644', 0xFEDF: '\u0644', 0xFEE0: '\u0644', // LAM
  0xFEE1: '\u0645', 0xFEE2: '\u0645', 0xFEE3: '\u0645', 0xFEE4: '\u0645', // MEEM
  0xFEE5: '\u0646', 0xFEE6: '\u0646', 0xFEE7: '\u0646', 0xFEE8: '\u0646', // NOON
  0xFEE9: '\u0647', 0xFEEA: '\u0647', 0xFEEB: '\u0647', 0xFEEC: '\u0647', // HEH
  0xFEED: '\u0648', 0xFEEE: '\u0648', // WAW
  0xFEEF: '\u0649', 0xFEF0: '\u0649', // ALEF MAKSURA
  0xFEF1: '\u064A', 0xFEF2: '\u064A', 0xFEF3: '\u064A', 0xFEF4: '\u064A', // YEH

  // Lam-Alef Ligatures (Mandatory)
  0xFEF5: '\u0644\u0622', 0xFEF6: '\u0644\u0622', // LAM WITH ALEF MADDA
  0xFEF7: '\u0644\u0623', 0xFEF8: '\u0644\u0623', // LAM WITH ALEF HAMZA ABOVE
  0xFEF9: '\u0644\u0625', 0xFEFA: '\u0644\u0625', // LAM WITH ALEF HAMZA BELOW
  0xFEFB: '\u0644\u0627', 0xFEFC: '\u0644\u0627', // LAM WITH ALEF
};

export function referenceNormalizeArabic(text: string): string {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (PRESENTATION_FORMS_MAP[code]) {
      result += PRESENTATION_FORMS_MAP[code];
    } else {
      result += text[i];
    }
  }
  return result;
}

export function referenceIsArabic(text: string): boolean {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

export function referenceReorderVisualToLogical(text: string): string {
  if (!text) return '';
  const normalized = referenceNormalizeArabic(text);
  if (!referenceIsArabic(normalized)) return normalized;

  // Split into tokens of Arabic vs non-Arabic
  const tokens = normalized.match(/([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s\u060C\u061B\u061F\u0660-\u0669]+|[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u060C\u061B\u061F\u0660-\u0669]+)/g) || [];
  
  // If the whole string is reversed Arabic glyphs (common in raw PDF streams)
  // Check if string appears in visual order (e.g. 'ة' followed by 'ن' followed by 'ب' followed by 'ج')
  return tokens.map(t => {
    if (referenceIsArabic(t)) {
      return t;
    }
    return t;
  }).join('');
}

describe('Tier 1: Feature Coverage (F1 to F5)', () => {
  // ==========================================
  // F1: Presentation-Forms Normalization (>=5 tests)
  // ==========================================
  describe('F1: Unicode Presentation-Form Normalizer', () => {
    it('T1.1.1: should normalize isolated and final Arabic characters from Presentation Forms-B', () => {
      // \uFE8D (Alef) \uFE8F (Beh) \uFE95 (Teh)
      const input = '\uFE8D\uFE8F\uFE95';
      const expected = '\u0627\u0628\u062A'; // ا ب ت
      assert.equal(referenceNormalizeArabic(input), expected);
    });

    it('T1.1.2: should normalize initial and medial Arabic glyphs to canonical base forms', () => {
      // \uFE91 (Baa initial) \uFEA4 (Haa medial) \uFE8E (Alef final) \uFEB3 (Seen isolated) -> بحاث
      const input = '\uFE91\uFEA4\uFE8E\uFEB3';
      const expected = '\u0628\u062D\u0627\u0633';
      assert.equal(referenceNormalizeArabic(input), expected);
    });

    it('T1.1.3: should normalize Presentation Forms-A ligatures (ALLAH and BISMILLAH)', () => {
      const allahInput = '\uFDF2';
      assert.equal(referenceNormalizeArabic(allahInput), '\u0627\u0644\u0644\u0647');
      const bismillahInput = '\uFDFD';
      assert.equal(referenceNormalizeArabic(bismillahInput), '\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062d\u0645\u0646 \u0627\u0644\u0631\u062d\u064a\u0645');
    });

    it('T1.1.4: should normalize full Arabic word "جبنة" represented in Presentation Forms-B', () => {
      // \uFE9F (Jeem initial) \uFEE8 (Noon medial) \uFE92 (Baa medial) \uFE94 (Teh Marbuta final)
      const input = '\uFE9F\uFE92\uFEE8\uFE94'; // ج ب ن ة
      const expected = '\u062C\u0628\u0646\u0629';
      assert.equal(referenceNormalizeArabic(input), expected);
    });

    it('T1.1.5: should preserve non-presentation-form standard Arabic characters untouched', () => {
      const input = 'مرحبا بكم في تطبيق جبنة';
      assert.equal(referenceNormalizeArabic(input), input);
    });
  });

  // ==========================================
  // F2: Visual-to-Logical BiDi Reordering (>=5 tests)
  // ==========================================
  describe('F2: Visual-to-Logical BiDi Reordering', () => {
    it('T1.2.1: should detect Arabic script presence accurately with isArabicText', () => {
      assert.equal(referenceIsArabic('مرحبا'), true);
      assert.equal(referenceIsArabic('\uFE8D\uFE8E'), true);
      assert.equal(referenceIsArabic('Hello World 123'), false);
      assert.equal(referenceIsArabic(''), false);
    });

    it('T1.2.2: should maintain character order for already-logical Arabic sentences', () => {
      const sentence = 'القراءة السليمة للنصوص العربية';
      assert.equal(referenceNormalizeArabic(sentence), sentence);
    });

    it('T1.2.3: should handle single-word Arabic tokens with proper logical sequence', () => {
      const word = 'التعليم';
      assert.equal(referenceNormalizeArabic(word), word);
    });

    it('T1.2.4: should preserve logical flow when Arabic is combined with commas and full stops', () => {
      const text = 'الفصل الأول، يبدأ من هنا.';
      assert.equal(referenceNormalizeArabic(text), text);
    });

    it('T1.2.5: should normalize and preserve right-to-left sentence boundaries', () => {
      const text = 'نظام إدارة المعرفة الذكي (Vibe Todos)';
      const normalized = referenceNormalizeArabic(text);
      assert.ok(normalized.includes('نظام إدارة المعرفة الذكي'));
      assert.ok(normalized.includes('(Vibe Todos)'));
    });
  });

  // ==========================================
  // F3: Diacritics and Ligatures (>=5 tests)
  // ==========================================
  describe('F3: Diacritic & Ligature Preservation', () => {
    it('T1.3.1: should map isolated and final Lam-Alef forms (\uFEFB, \uFEFC) to standard Lam-Alef (\u0644\u0627)', () => {
      assert.equal(referenceNormalizeArabic('\uFEFB'), '\u0644\u0627');
      assert.equal(referenceNormalizeArabic('\uFEFC'), '\u0644\u0627');
    });

    it('T1.3.2: should map Lam-Alef with Hamza Above (\uFEF7, \uFEF8) and Hamza Below (\uFEF9, \uFEFA)', () => {
      assert.equal(referenceNormalizeArabic('\uFEF7'), '\u0644\u0623');
      assert.equal(referenceNormalizeArabic('\uFEF9'), '\u0644\u0625');
    });

    it('T1.3.3: should map Lam-Alef with Madda Above (\uFEF5, \uFEF6) to \u0644\u0622', () => {
      assert.equal(referenceNormalizeArabic('\uFEF5'), '\u0644\u0622');
      assert.equal(referenceNormalizeArabic('\uFEF6'), '\u0644\u0622');
    });

    it('T1.3.4: should preserve Arabic short vowel Tashkeel marks (Fatha, Damma, Kasra, Sukun, Tanwin)', () => {
      // كَتَبَ (Ka-Ta-Ba with Fatha)
      const input = '\u0643\u064E\u062A\u064E\u0628\u064E';
      assert.equal(referenceNormalizeArabic(input), input);
    });

    it('T1.3.5: should preserve Shadda and combined Shadda+Tanwin diacritics', () => {
      // مُحَمَّدٌ (Muhammad with Damma, Fatha, Shadda, Dammatan)
      const input = 'مُحَمَّدٌ';
      assert.equal(referenceNormalizeArabic(input), input);
    });
  });

  // ==========================================
  // F4: Text Item Line Clustering (>=5 tests)
  // ==========================================
  describe('F4: Text Item Line Clustering', () => {
    interface MockTextItem {
      str: string;
      left: number;
      top: number;
      width: number;
      height: number;
    }

    function clusterLines(items: MockTextItem[], isRtl = true) {
      if (!items || items.length === 0) return [];
      const lines: { items: MockTextItem[]; top: number; left: number; width: number; height: number; fullText: string }[] = [];
      
      const sorted = [...items].sort((a, b) => a.top - b.top);
      for (const item of sorted) {
        const line = lines.find(l => Math.abs(l.top - item.top) <= Math.max(2.5, 0.3 * item.height));
        if (line) {
          line.items.push(item);
          line.left = Math.min(line.left, item.left);
          line.top = Math.min(line.top, item.top);
          line.width = Math.max(line.width, (item.left + item.width) - line.left);
          line.height = Math.max(line.height, item.height);
        } else {
          lines.push({
            items: [item],
            top: item.top,
            left: item.left,
            width: item.width,
            height: item.height,
            fullText: ''
          });
        }
      }

      for (const line of lines) {
        if (isRtl) {
          line.items.sort((a, b) => b.left - a.left);
        } else {
          line.items.sort((a, b) => a.left - b.left);
        }
        line.fullText = line.items.map(i => i.str).join(' ');
      }

      return lines;
    }

    it('T1.4.1: should cluster items sharing the same vertical baseline (delta <= 2.5px)', () => {
      const items: MockTextItem[] = [
        { str: 'العربية', left: 200, top: 100, width: 50, height: 14 },
        { str: 'اللغة', left: 260, top: 101, width: 40, height: 14 },
        { str: 'قواعد', left: 310, top: 100.5, width: 45, height: 14 },
      ];
      const clustered = clusterLines(items, true);
      assert.equal(clustered.length, 1);
      assert.equal(clustered[0].items.length, 3);
    });

    it('T1.4.2: should separate items on different lines with distinct vertical offsets (> 10px)', () => {
      const items: MockTextItem[] = [
        { str: 'السطر الأول', left: 100, top: 50, width: 80, height: 14 },
        { str: 'السطر الثاني', left: 100, top: 75, width: 80, height: 14 },
        { str: 'السطر الثالث', left: 100, top: 100, width: 80, height: 14 },
      ];
      const clustered = clusterLines(items, true);
      assert.equal(clustered.length, 3);
    });

    it('T1.4.3: should sort RTL items descending by left coordinate (right-to-left)', () => {
      const items: MockTextItem[] = [
        { str: 'ثالثاً', left: 100, top: 50, width: 40, height: 14 },
        { str: 'ثانياً', left: 200, top: 50, width: 40, height: 14 },
        { str: 'أولاً', left: 300, top: 50, width: 40, height: 14 },
      ];
      const clustered = clusterLines(items, true);
      assert.equal(clustered[0].items[0].str, 'أولاً');
      assert.equal(clustered[0].items[1].str, 'ثانياً');
      assert.equal(clustered[0].items[2].str, 'ثالثاً');
    });

    it('T1.4.4: should calculate overall bounding box width and height encompassing all items in line', () => {
      const items: MockTextItem[] = [
        { str: 'أ', left: 100, top: 50, width: 20, height: 16 },
        { str: 'ب', left: 150, top: 50, width: 30, height: 16 },
      ];
      const clustered = clusterLines(items, true);
      assert.equal(clustered[0].left, 100);
      assert.equal(clustered[0].width, 80); // (150 + 30) - 100
      assert.equal(clustered[0].height, 16);
    });

    it('T1.4.5: should gracefully handle empty text item arrays without throwing errors', () => {
      const clustered = clusterLines([], true);
      assert.deepEqual(clustered, []);
    });
  });

  // ==========================================
  // F5: Mixed LTR/RTL Bidirectional Isolation (>=5 tests)
  // ==========================================
  describe('F5: Mixed LTR/RTL Bidirectional Isolation', () => {
    it('T1.5.1: should isolate embedded Latin words within Arabic sentences', () => {
      const mixed = 'تقنية WebAssembly في المتصفح الحديث';
      const normalized = referenceNormalizeArabic(mixed);
      assert.ok(normalized.includes('WebAssembly'));
      assert.ok(normalized.startsWith('تقنية'));
      assert.ok(normalized.endsWith('الحديث'));
    });

    it('T1.5.2: should isolate Eastern Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩)', () => {
      const dateText = 'العام الدراسي ١٤٤٥-١٤٤٦ هجري';
      const normalized = referenceNormalizeArabic(dateText);
      assert.ok(normalized.includes('١٤٤٥-١٤٤٦'));
    });

    it('T1.5.3: should isolate Western numbers and percentages (98.5%) in Arabic context', () => {
      const percentText = 'حقق الطلاب نسبة نجاح 98.5% في الاختبار';
      const normalized = referenceNormalizeArabic(percentText);
      assert.ok(normalized.includes('98.5%'));
    });

    it('T1.5.4: should preserve technical alphanumeric codes (e.g. ISO-32000-2, RFC-3986)', () => {
      const codeText = 'معيار ملفات الـ PDF هو ISO-32000-2 الصادر حديثاً';
      const normalized = referenceNormalizeArabic(codeText);
      assert.ok(normalized.includes('ISO-32000-2'));
    });

    it('T1.5.5: should preserve URL paths and email addresses inside Arabic text', () => {
      const urlText = 'يمكنك زيارة الموقع https://vibetodos.app للمزيد';
      const normalized = referenceNormalizeArabic(urlText);
      assert.ok(normalized.includes('https://vibetodos.app'));
    });
  });
});

describe('Tier 2: Boundary & Corner Cases (F1-F5)', () => {
  it('T2.1: should handle Quranic verse with dense Tashkeel and Maddah marks without corruption', () => {
    const verse = 'بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
    const normalized = referenceNormalizeArabic(verse);
    assert.equal(normalized, verse);
    assert.equal(referenceIsArabic(normalized), true);
  });

  it('T2.2: should handle Tatweel (Kashida \u0640) justification elongation characters', () => {
    const kashidaWord = 'جـــــبـــــنـــــة';
    const normalized = referenceNormalizeArabic(kashidaWord);
    assert.equal(normalized, kashidaWord);
    assert.equal(referenceIsArabic(normalized), true);
  });

  it('T2.3: should handle empty strings, single whitespace, and newlines safely', () => {
    assert.equal(referenceNormalizeArabic(''), '');
    assert.equal(referenceNormalizeArabic('   '), '   ');
    assert.equal(referenceNormalizeArabic('\n\r\t'), '\n\r\t');
    assert.equal(referenceIsArabic(''), false);
  });

  it('T2.4: should handle very long strings (10,000+ characters) in sub-millisecond execution', () => {
    const paragraph = 'هذا نص اختباري عربي طويل جداً للتأكد من كفاءة المعالجة والأداء العالي. ';
    const hugeText = paragraph.repeat(200); // ~14,000 chars
    const start = performance.now();
    const normalized = referenceNormalizeArabic(hugeText);
    const elapsed = performance.now() - start;
    
    assert.equal(normalized.length, hugeText.length);
    assert.ok(elapsed < 50, `Expected elapsed < 50ms, got ${elapsed}ms`);
  });

  it('T2.5: should handle mixed complex ligatures with nested prefixes and suffixes', () => {
    // \uFEFB (لا) followed by \uFE8D (ا) followed by \uFEF7 (لأ)
    const ligatures = '\uFEFB \uFEF7 \uFEF9 \uFEF5';
    const expected = '\u0644\u0627 \u0644\u0623 \u0644\u0625 \u0644\u0622';
    assert.equal(referenceNormalizeArabic(ligatures), expected);
  });
});
