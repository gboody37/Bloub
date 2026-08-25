import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  processPageTextContent,
  sortLinesInReadingOrder,
  type ProcessedTextLine,
} from '../../src/lib/pdf/arabic-bidi.ts';

describe('Challenger - Arabic BiDi Geometric Clustering & Reading Order Rigor', () => {
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


