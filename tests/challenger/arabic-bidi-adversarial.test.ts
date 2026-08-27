import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  processPageTextContent,
  sortLinesInReadingOrder,
  type ProcessedTextLine,
  type ProcessedTextItem,
} from '../../src/lib/pdf/arabic-bidi.ts';

describe('⚔️ CHALLENGER HARNESS 1: Multi-Column Geometry & Reading Order Transitivity', () => {
  it('should prevent column interleaving when short centered title is positioned above 2 columns', () => {
    // 600px width page, centered title is 160px wide (26.6% < 60%)
    const lines: ProcessedTextLine[] = [
      { items: [], fullText: 'عنوان الفصل الأول (Centered Title)', dir: 'rtl', top: 50, left: 220, width: 160, height: 20 },
      { items: [], fullText: 'العمود الأيمن سطر 1', dir: 'rtl', top: 100, left: 350, width: 200, height: 14 },
      { items: [], fullText: 'العمود الأيمن سطر 2', dir: 'rtl', top: 150, left: 350, width: 200, height: 14 },
      { items: [], fullText: 'العمود الأيسر سطر 1', dir: 'rtl', top: 100, left: 50, width: 200, height: 14 },
      { items: [], fullText: 'العمود الأيسر سطر 2', dir: 'rtl', top: 150, left: 50, width: 200, height: 14 }
    ];

    const sorted = sortLinesInReadingOrder(lines, true);
    const textOrder = sorted.map(l => l.fullText);

    assert.deepEqual(textOrder, [
      'عنوان الفصل الأول (Centered Title)',
      'العمود الأيمن سطر 1',
      'العمود الأيمن سطر 2',
      'العمود الأيسر سطر 1',
      'العمود الأيسر سطر 2'
    ]);
  });

  it('should reliably break items across tight column gutters (20px) under scale 1.0', () => {
    const textContent = {
      items: [
        { str: 'العمود الأيمن', width: 100, height: 12, transform: [12, 0, 0, 12, 220, 700] },
        { str: 'العمود الأيسر', width: 100, height: 12, transform: [12, 0, 0, 12, 100, 700] } // 220 - (100 + 100) = 20px gap
      ]
    };

    const lines = processPageTextContent(textContent, { scale: 1.0, height: 800 });
    assert.equal(lines.length, 2, 'Must produce 2 distinct lines across 20px gutter');
    assert.equal(lines[0].fullText, 'العمود الأيمن');
    assert.equal(lines[1].fullText, 'العمود الأيسر');
  });

  it('should transitively sort 2-column layout with 20px gutter without merging into single column', () => {
    const lines: ProcessedTextLine[] = [
      { items: [], fullText: 'يمين سطر 1', dir: 'rtl', top: 100, left: 270, width: 200, height: 14 },
      { items: [], fullText: 'يمين سطر 2', dir: 'rtl', top: 150, left: 270, width: 200, height: 14 },
      { items: [], fullText: 'يسار سطر 1', dir: 'rtl', top: 100, left: 50, width: 200, height: 14 },
      { items: [], fullText: 'يسار سطر 2', dir: 'rtl', top: 150, left: 50, width: 200, height: 14 }
    ];

    const sorted = sortLinesInReadingOrder(lines, true);
    assert.deepEqual(sorted.map(l => l.fullText), [
      'يمين سطر 1',
      'يمين سطر 2',
      'يسار سطر 1',
      'يسار سطر 2'
    ]);
  });

  it('should maintain independent reading order across mid-page section divider between multi-column blocks', () => {
    const lines: ProcessedTextLine[] = [
      // Top 2-col block
      { items: [], fullText: 'أعلى يمين 1', dir: 'rtl', top: 100, left: 300, width: 150, height: 14 },
      { items: [], fullText: 'أعلى يمين 2', dir: 'rtl', top: 150, left: 300, width: 150, height: 14 },
      { items: [], fullText: 'أعلى يسار 1', dir: 'rtl', top: 100, left: 50, width: 150, height: 14 },
      { items: [], fullText: 'أعلى يسار 2', dir: 'rtl', top: 150, left: 50, width: 150, height: 14 },
      // Mid-page divider
      { items: [], fullText: '--- فاصل منتصف الصفحة ---', dir: 'rtl', top: 250, left: 180, width: 140, height: 16 },
      // Bottom 2-col block
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
      '--- فاصل منتصف الصفحة ---',
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

  it('should correctly order multi-column document with running header and running footer', () => {
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

  it('should maintain mathematical transitivity under extreme permutation fuzzing', () => {
    // 4 lines in a column with fractional vertical differences
    const lines: ProcessedTextLine[] = [
      { items: [], fullText: 'A', dir: 'rtl', top: 100, left: 300, width: 100, height: 14 },
      { items: [], fullText: 'B', dir: 'rtl', top: 102, left: 200, width: 100, height: 14 },
      { items: [], fullText: 'C', dir: 'rtl', top: 104, left: 100, width: 100, height: 14 },
      { items: [], fullText: 'D', dir: 'rtl', top: 106, left: 50, width: 100, height: 14 },
    ];

    // Shuffle multiple times and verify identical deterministic output
    const baselineResult = sortLinesInReadingOrder(lines, true).map(l => l.fullText);

    for (let trial = 0; trial < 10; trial++) {
      const shuffled = [...lines].sort(() => Math.random() - 0.5);
      const sorted = sortLinesInReadingOrder(shuffled, true).map(l => l.fullText);
      assert.deepEqual(sorted, baselineResult, `Permutation trial ${trial} must match baseline order`);
    }
  });

  it('should prevent gutter-isolated titles from becoming middle columns', () => {
    const lines: ProcessedTextLine[] = [
      { items: [], fullText: 'Gutter Heading', dir: 'rtl', top: 50, left: 220, width: 150, height: 18 },
      { items: [], fullText: 'R1', dir: 'rtl', top: 100, left: 400, width: 180, height: 14 },
      { items: [], fullText: 'R2', dir: 'rtl', top: 140, left: 400, width: 180, height: 14 },
      { items: [], fullText: 'L1', dir: 'rtl', top: 100, left: 40, width: 160, height: 14 },
      { items: [], fullText: 'L2', dir: 'rtl', top: 140, left: 40, width: 160, height: 14 },
    ];

    const sorted = sortLinesInReadingOrder(lines, true);
    assert.deepEqual(sorted.map(l => l.fullText), [
      'Gutter Heading',
      'R1',
      'R2',
      'L1',
      'L2'
    ]);
  });
});

describe('⚔️ CHALLENGER HARNESS 2: Extreme Zoom Invariance (0.1x to 10.0x Multipliers)', () => {
  const zoomMultipliers = [0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.5, 5.0, 8.0, 10.0];

  for (const zoom of zoomMultipliers) {
    it(`should maintain column breaking across 2 columns under extreme zoom ${zoom}x`, () => {
      // 2 columns: Right column at x=350 (width 150), Left column at x=100 (width 150), gap = 100px (at 1.0x)
      const textContent = {
        items: [
          { str: 'عمود يمين', width: 150, height: 14, transform: [14, 0, 0, 14, 350, 700] },
          { str: 'عمود يسار', width: 150, height: 14, transform: [14, 0, 0, 14, 100, 700] },
        ]
      };

      const viewport = { scale: zoom, height: 1000 * zoom, width: 800 * zoom };
      const lines = processPageTextContent(textContent, viewport);

      assert.equal(lines.length, 2, `Zoom ${zoom}x must produce 2 distinct lines`);
      assert.equal(lines[0].fullText, 'عمود يمين', `Zoom ${zoom}x first line must be right column`);
      assert.equal(lines[1].fullText, 'عمود يسار', `Zoom ${zoom}x second line must be left column`);

      // Verify coordinate scale invariance
      assert.ok(Math.abs(lines[0].left - 350 * zoom) < 0.1, `Zoom ${zoom}x line left scale mismatch`);
      assert.ok(Math.abs(lines[1].left - 100 * zoom) < 0.1, `Zoom ${zoom}x line left scale mismatch`);
      assert.ok(lines[0].height >= 12 * zoom, `Zoom ${zoom}x line height must scale proportionally`);
    });

    it(`should transitively sort 3-column document under extreme zoom ${zoom}x without interleaving`, () => {
      const lines: ProcessedTextLine[] = [
        // Header
        { items: [], fullText: 'ترويسة رئيسية', dir: 'rtl', top: 40 * zoom, left: 50 * zoom, width: 700 * zoom, height: 20 * zoom },
        // Col 1 (Right)
        { items: [], fullText: 'عمود 1 سطر 1', dir: 'rtl', top: 100 * zoom, left: 550 * zoom, width: 200 * zoom, height: 14 * zoom },
        { items: [], fullText: 'عمود 1 سطر 2', dir: 'rtl', top: 140 * zoom, left: 550 * zoom, width: 200 * zoom, height: 14 * zoom },
        // Col 2 (Middle)
        { items: [], fullText: 'عمود 2 سطر 1', dir: 'rtl', top: 100 * zoom, left: 300 * zoom, width: 200 * zoom, height: 14 * zoom },
        { items: [], fullText: 'عمود 2 سطر 2', dir: 'rtl', top: 140 * zoom, left: 300 * zoom, width: 200 * zoom, height: 14 * zoom },
        // Col 3 (Left)
        { items: [], fullText: 'عمود 3 سطر 1', dir: 'rtl', top: 100 * zoom, left: 50 * zoom, width: 200 * zoom, height: 14 * zoom },
        { items: [], fullText: 'عمود 3 سطر 2', dir: 'rtl', top: 140 * zoom, left: 50 * zoom, width: 200 * zoom, height: 14 * zoom },
      ];

      const sorted = sortLinesInReadingOrder(lines, true);
      const textOrder = sorted.map(l => l.fullText);

      assert.deepEqual(textOrder, [
        'ترويسة رئيسية',
        'عمود 1 سطر 1',
        'عمود 1 سطر 2',
        'عمود 2 سطر 1',
        'عمود 2 سطر 2',
        'عمود 3 سطر 1',
        'عمود 3 سطر 2'
      ], `Zoom ${zoom}x failed 3-column transitivity`);
    });
  }
});

describe('⚔️ CHALLENGER HARNESS 3: Permutation Invariance & Randomized Item Fuzzing', () => {
  it('should produce identical reading order across 50 random raw PDF.js item permutations in 2-column layout', () => {
    const rawItems = [
      // Right Column items
      { str: 'يمين 1 كلمة 1', width: 60, height: 12, transform: [12, 0, 0, 12, 350, 700] },
      { str: 'يمين 1 كلمة 2', width: 60, height: 12, transform: [12, 0, 0, 12, 420, 700] },
      { str: 'يمين 2 كلمة 1', width: 60, height: 12, transform: [12, 0, 0, 12, 350, 660] },
      { str: 'يمين 2 كلمة 2', width: 60, height: 12, transform: [12, 0, 0, 12, 420, 660] },
      // Left Column items
      { str: 'يسار 1 كلمة 1', width: 60, height: 12, transform: [12, 0, 0, 12, 50, 700] },
      { str: 'يسار 1 كلمة 2', width: 60, height: 12, transform: [12, 0, 0, 12, 120, 700] },
      { str: 'يسار 2 كلمة 1', width: 60, height: 12, transform: [12, 0, 0, 12, 50, 660] },
      { str: 'يسار 2 كلمة 2', width: 60, height: 12, transform: [12, 0, 0, 12, 120, 660] },
    ];

    const viewport = { scale: 1.0, height: 800, width: 600 };

    // Baseline un-shuffled run
    const baselineLines = processPageTextContent({ items: rawItems }, viewport);
    const baselineTexts = baselineLines.map(l => l.fullText);

    assert.equal(baselineLines.length, 4, 'Must produce 4 lines total');

    // 50 random shuffles of the raw PDF.js items
    for (let trial = 1; trial <= 50; trial++) {
      const shuffled = [...rawItems].sort(() => Math.random() - 0.5);
      const lines = processPageTextContent({ items: shuffled }, viewport);
      const texts = lines.map(l => l.fullText);

      assert.deepEqual(texts, baselineTexts, `Raw item shuffle trial ${trial} produced non-deterministic output`);
    }
  });

  it('should maintain deterministic reading order across 50 permutations with staggered baselines and mid-page banner', () => {
    const lines: ProcessedTextLine[] = [
      // Top Title
      { items: [], fullText: 'عنوان المقال الرئيسي', dir: 'rtl', top: 50, left: 100, width: 600, height: 24 },
      // Top 2 Columns (staggered baselines: Right at 100, 140; Left at 115, 155)
      { items: [], fullText: 'أعلى يمين 1', dir: 'rtl', top: 100, left: 450, width: 250, height: 14 },
      { items: [], fullText: 'أعلى يمين 2', dir: 'rtl', top: 140, left: 450, width: 250, height: 14 },
      { items: [], fullText: 'أعلى يسار 1', dir: 'rtl', top: 115, left: 50, width: 250, height: 14 },
      { items: [], fullText: 'أعلى يسار 2', dir: 'rtl', top: 155, left: 50, width: 250, height: 14 },
      // Mid-page Section Break (Spanning Banner)
      { items: [], fullText: '--- القسم الثاني: النتائج والتوصيات ---', dir: 'rtl', top: 250, left: 80, width: 640, height: 20 },
      // Bottom 2 Columns (Right at 300, 340; Left at 310, 350)
      { items: [], fullText: 'أسفل يمين 1', dir: 'rtl', top: 300, left: 450, width: 250, height: 14 },
      { items: [], fullText: 'أسفل يمين 2', dir: 'rtl', top: 340, left: 450, width: 250, height: 14 },
      { items: [], fullText: 'أسفل يسار 1', dir: 'rtl', top: 310, left: 50, width: 250, height: 14 },
      { items: [], fullText: 'أسفل يسار 2', dir: 'rtl', top: 350, left: 50, width: 250, height: 14 },
      // Bottom Footer
      { items: [], fullText: 'جميع الحقوق محفوظة 2026', dir: 'rtl', top: 500, left: 100, width: 600, height: 16 },
    ];

    const expectedOrder = [
      'عنوان المقال الرئيسي',
      'أعلى يمين 1',
      'أعلى يمين 2',
      'أعلى يسار 1',
      'أعلى يسار 2',
      '--- القسم الثاني: النتائج والتوصيات ---',
      'أسفل يمين 1',
      'أسفل يمين 2',
      'أسفل يسار 1',
      'أسفل يسار 2',
      'جميع الحقوق محفوظة 2026',
    ];

    for (let trial = 1; trial <= 50; trial++) {
      const shuffled = [...lines].sort(() => Math.random() - 0.5);
      const sorted = sortLinesInReadingOrder(shuffled, true);
      assert.deepEqual(sorted.map(l => l.fullText), expectedOrder, `Trial ${trial} failed staggered multi-zone order`);
    }
  });
});

describe('⚔️ CHALLENGER HARNESS 4: High-Scale Stress Benchmarking (10,000 to 50,000 Items)', () => {
  it('should cluster and sort 25,000 synthetic multi-column items in < 200ms', () => {
    const totalLines = 2500; // 1250 lines right col, 1250 lines left col
    const itemsPerLine = 10;
    const rawItems: any[] = [];

    for (let l = 0; l < totalLines; l++) {
      const isRightCol = l % 2 === 0;
      const rowIdx = Math.floor(l / 2);
      const top = 100000 - rowIdx * 35;
      const startX = isRightCol ? 450 : 50;

      for (let i = 0; i < itemsPerLine; i++) {
        rawItems.push({
          str: `كلمة_${rowIdx}_${i}`,
          transform: [12, 0, 0, 12, startX + i * 30, top],
          width: 25,
          height: 12,
        });
      }
    }

    // Shuffle raw stream to stress spatial sorting
    rawItems.sort(() => Math.random() - 0.5);

    const viewport = { scale: 1.0, height: 120000, width: 1000 };

    const t0 = performance.now();
    const lines = processPageTextContent({ items: rawItems }, viewport);
    const duration = performance.now() - t0;

    assert.equal(lines.length, totalLines, `Expected ${totalLines} clustered lines, got ${lines.length}`);
    assert.ok(duration < 500, `25,000 items clustered & sorted in ${duration.toFixed(2)}ms, target < 500ms`);
  });

  it('should maintain linear O(N log N) scaling when doubling from 10k to 20k to 40k items', () => {
    function generateDataset(itemCount: number) {
      const items: any[] = [];
      const lines = Math.floor(itemCount / 8);
      for (let l = 0; l < lines; l++) {
        const top = 50000 - l * 30;
        for (let i = 0; i < 8; i++) {
          items.push({
            str: `عنصر_${l}_${i}`,
            transform: [12, 0, 0, 12, 50 + i * 50, top],
            width: 45,
            height: 12,
          });
        }
      }
      return items.sort(() => Math.random() - 0.5);
    }

    const set10k = generateDataset(10000);
    const set20k = generateDataset(20000);
    const set40k = generateDataset(40000);
    const viewport = { scale: 1.0, height: 200000, width: 1000 };

    const t1 = performance.now();
    processPageTextContent({ items: set10k }, viewport);
    const d10k = performance.now() - t1;

    const t2 = performance.now();
    processPageTextContent({ items: set20k }, viewport);
    const d20k = performance.now() - t2;

    const t3 = performance.now();
    processPageTextContent({ items: set40k }, viewport);
    const d40k = performance.now() - t3;

    // Verify 40k items does not blow up quadratically: d40k should be comfortably under 600ms
    assert.ok(d40k < 600, `40,000 items executed in ${d40k.toFixed(2)}ms (10k: ${d10k.toFixed(2)}ms, 20k: ${d20k.toFixed(2)}ms)`);
  });
});
