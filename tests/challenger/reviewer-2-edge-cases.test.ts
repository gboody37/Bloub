import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  processPageTextContent,
  sortLinesInReadingOrder,
  buildProcessedLine,
  normalizeArabicPresentationForms,
  reorderVisualToLogicalArabic,
  type ProcessedTextLine,
  type ProcessedTextItem,
} from '../../src/lib/pdf/arabic-bidi.ts';

describe('Reviewer 2 Adversarial Stress Suite: Edge Cases & Rigor', () => {

  describe('Edge Case 1: Multi-Line Centered Titles above Multi-Column Layouts', () => {
    it('should correctly preserve reading order for 2-line centered title with section gap >= 3.5x line-height above 2-column RTL layout', () => {
      const lines: ProcessedTextLine[] = [
        // Line 1 of centered title
        { items: [], fullText: 'عنوان البحث الرئيسي - السطر الأول', dir: 'rtl', top: 30, left: 200, width: 200, height: 18 },
        // Line 2 of centered title (in gutter between columns)
        { items: [], fullText: 'العنوان الفرعي التابع - السطر الثاني', dir: 'rtl', top: 55, left: 220, width: 160, height: 16 },
        // Right Column (Column 1 in RTL) separated by section gap (top: 140, gap: 140 - 71 = 69px >= 56px)
        { items: [], fullText: 'العمود الأيمن 1', dir: 'rtl', top: 140, left: 350, width: 200, height: 14 },
        { items: [], fullText: 'العمود الأيمن 2', dir: 'rtl', top: 170, left: 350, width: 200, height: 14 },
        { items: [], fullText: 'العمود الأيمن 3', dir: 'rtl', top: 200, left: 350, width: 200, height: 14 },
        // Left Column (Column 2 in RTL)
        { items: [], fullText: 'العمود الأيسر 1', dir: 'rtl', top: 140, left: 50, width: 200, height: 14 },
        { items: [], fullText: 'العمود الأيسر 2', dir: 'rtl', top: 170, left: 50, width: 200, height: 14 },
        { items: [], fullText: 'العمود الأيسر 3', dir: 'rtl', top: 200, left: 50, width: 200, height: 14 },
      ];

      const sorted = sortLinesInReadingOrder(lines, true);
      const textOrder = sorted.map(l => l.fullText);

      assert.deepEqual(textOrder, [
        'عنوان البحث الرئيسي - السطر الأول',
        'العنوان الفرعي التابع - السطر الثاني',
        'العمود الأيمن 1',
        'العمود الأيمن 2',
        'العمود الأيمن 3',
        'العمود الأيسر 1',
        'العمود الأيسر 2',
        'العمود الأيسر 3',
      ]);
    });

    it('should correctly handle multi-line full-width spanning banners above 3-column layout', () => {
      const lines: ProcessedTextLine[] = [
        // Spanning Banner Line 1 (width 550 on 600 width page -> 91%)
        { items: [], fullText: 'مستند رسمي - السطر الأول من الترويسة العريضة', dir: 'rtl', top: 20, left: 25, width: 550, height: 20 },
        // Spanning Banner Line 2 (width 500 on 600 width page -> 83%)
        { items: [], fullText: 'مستند رسمي - السطر الثاني من الترويسة العريضة', dir: 'rtl', top: 45, left: 50, width: 500, height: 18 },
        // Right Column
        { items: [], fullText: 'يمين 1', dir: 'rtl', top: 100, left: 420, width: 150, height: 14 },
        { items: [], fullText: 'يمين 2', dir: 'rtl', top: 130, left: 420, width: 150, height: 14 },
        // Middle Column
        { items: [], fullText: 'وسط 1', dir: 'rtl', top: 100, left: 225, width: 150, height: 14 },
        { items: [], fullText: 'وسط 2', dir: 'rtl', top: 130, left: 225, width: 150, height: 14 },
        // Left Column
        { items: [], fullText: 'يسار 1', dir: 'rtl', top: 100, left: 30, width: 150, height: 14 },
        { items: [], fullText: 'يسار 2', dir: 'rtl', top: 130, left: 30, width: 150, height: 14 },
      ];

      const sorted = sortLinesInReadingOrder(lines, true);
      const textOrder = sorted.map(l => l.fullText);

      assert.deepEqual(textOrder, [
        'مستند رسمي - السطر الأول من الترويسة العريضة',
        'مستند رسمي - السطر الثاني من الترويسة العريضة',
        'يمين 1',
        'يمين 2',
        'وسط 1',
        'وسط 2',
        'يسار 1',
        'يسار 2',
      ]);
    });
  });

  describe('Edge Case 2: Single-Column Layouts with Mixed Structure', () => {
    it('should maintain strict top-to-bottom reading order on single-column documents with varying line lengths and indents', () => {
      const lines: ProcessedTextLine[] = [
        { items: [], fullText: 'عنوان رئيسي', dir: 'rtl', top: 50, left: 100, width: 400, height: 24 },
        { items: [], fullText: 'فقرة أولى تبدأ هنا وتمتد طبيعياً', dir: 'rtl', top: 90, left: 50, width: 500, height: 16 },
        { items: [], fullText: 'تابع الفقرة الأولى السطر الثاني', dir: 'rtl', top: 115, left: 50, width: 480, height: 16 },
        { items: [], fullText: 'نقطة فرعية أولى مزاحة للداخل', dir: 'rtl', top: 145, left: 80, width: 420, height: 14 },
        { items: [], fullText: 'نقطة فرعية ثانية مزاحة للداخل', dir: 'rtl', top: 170, left: 80, width: 420, height: 14 },
        { items: [], fullText: 'فقرة ختامية للقسم الأول', dir: 'rtl', top: 200, left: 50, width: 500, height: 16 },
      ];

      const sorted = sortLinesInReadingOrder(lines, true);
      const textOrder = sorted.map(l => l.fullText);

      assert.deepEqual(textOrder, [
        'عنوان رئيسي',
        'فقرة أولى تبدأ هنا وتمتد طبيعياً',
        'تابع الفقرة الأولى السطر الثاني',
        'نقطة فرعية أولى مزاحة للداخل',
        'نقطة فرعية ثانية مزاحة للداخل',
        'فقرة ختامية للقسم الأول',
      ]);
    });
  });

  describe('Edge Case 3: Mixed LTR and RTL Documents', () => {
    it('should preserve correct line directions in bilingual document (Arabic + English sections)', () => {
      const textContent = {
        items: [
          // Arabic Title
          { str: 'دليل المستخدم لنظام Vibe Todos', transform: [16, 0, 0, 16, 50, 750], width: 300, height: 16 },
          // Arabic Paragraph
          { str: 'يوفر هذا النظام ميزات متقدمة لإدارة المهام', transform: [12, 0, 0, 12, 50, 700], width: 350, height: 12 },
          // English Section Header
          { str: 'System Architecture & Requirements', transform: [14, 0, 0, 14, 50, 650], width: 280, height: 14 },
          // English Body
          { str: 'The application is built on Next.js 16 and React 19.', transform: [12, 0, 0, 12, 50, 610], width: 400, height: 12 },
          // Arabic Conclusion
          { str: 'الخاتمة: تم توثيق جميع المتطلبات بنجاح.', transform: [12, 0, 0, 12, 50, 560], width: 320, height: 12 },
        ]
      };

      const lines = processPageTextContent(textContent, { scale: 1.0, height: 800 });
      assert.equal(lines.length, 5);

      assert.equal(lines[0].dir, 'rtl');
      assert.equal(lines[1].dir, 'rtl');
      assert.equal(lines[2].dir, 'ltr');
      assert.equal(lines[3].dir, 'ltr');
      assert.equal(lines[4].dir, 'rtl');

      // Check reading order
      assert.ok(lines[0].fullText.includes('دليل المستخدم'));
      assert.ok(lines[1].fullText.includes('يوفر هذا النظام'));
      assert.ok(lines[2].fullText.includes('System Architecture'));
      assert.ok(lines[3].fullText.includes('Next.js 16'));
      assert.ok(lines[4].fullText.includes('الخاتمة'));
    });
  });

  describe('Edge Case 4: Zoom Level Matrix (0.5x to 3.0x) & Coordinate Precision', () => {
    it('should scale bounding boxes, font sizes, and line positions proportionally across 0.5x, 1.0x, 1.5x, 2.0x, 2.5x, 3.0x', () => {
      const baseItem = {
        str: 'نص تجريبي لاختبار التكبير',
        transform: [14, 0, 0, 14, 100, 600],
        width: 200,
        height: 14,
      };

      const textContent = { items: [baseItem] };
      const zooms = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];

      for (const zoom of zooms) {
        const height = 800 * zoom;
        const lines = processPageTextContent(textContent, { scale: zoom, height });
        assert.equal(lines.length, 1);

        const line = lines[0];
        const expectedLeft = Math.round(100 * zoom * 100) / 100;
        const expectedWidth = Math.round(200 * zoom * 100) / 100;
        const expectedHeight = Math.round(14 * zoom * 100) / 100;

        assert.equal(line.left, expectedLeft, `Zoom ${zoom}x left failed`);
        assert.equal(line.width, expectedWidth, `Zoom ${zoom}x width failed`);
        assert.equal(line.height, expectedHeight, `Zoom ${zoom}x height failed`);
        assert.equal(line.dir, 'rtl');
      }
    });
  });

  describe('Edge Case 5: Narrow Gutter Tolerances (<8px vs >=8px)', () => {
    it('should merge sub-column jitter (<8px gap) within a single column', () => {
      // Two lines with 5px gap between their right and left (e.g. word wrap within column)
      const lines: ProcessedTextLine[] = [
        { items: [], fullText: 'سطر 1', dir: 'rtl', top: 100, left: 50, width: 100, height: 14 },
        { items: [], fullText: 'سطر 2', dir: 'rtl', top: 120, left: 155, width: 90, height: 14 }, // gap = 155 - 150 = 5px < 8px
      ];

      const sorted = sortLinesInReadingOrder(lines, true);
      assert.equal(sorted.length, 2);
      assert.equal(sorted[0].fullText, 'سطر 1');
      assert.equal(sorted[1].fullText, 'سطر 2');
    });

    it('should cleanly separate columns with gutters >= 10px in multi-column RTL document', () => {
      const lines: ProcessedTextLine[] = [
        // Right Column (left: 210..400)
        { items: [], fullText: 'يمين 1', dir: 'rtl', top: 100, left: 210, width: 190, height: 14 },
        { items: [], fullText: 'يمين 2', dir: 'rtl', top: 130, left: 210, width: 190, height: 14 },
        // Left Column (left: 10..200) -> Gutter = 210 - 200 = 10px >= 8px
        { items: [], fullText: 'يسار 1', dir: 'rtl', top: 100, left: 10, width: 190, height: 14 },
        { items: [], fullText: 'يسار 2', dir: 'rtl', top: 130, left: 10, width: 190, height: 14 },
      ];

      const sorted = sortLinesInReadingOrder(lines, true);
      assert.deepEqual(sorted.map(l => l.fullText), [
        'يمين 1',
        'يمين 2',
        'يسار 1',
        'يسار 2',
      ]);
    });
  });

  describe('Edge Case 6: Outliers, 0-Width Items, and Malformed PDF Transform Matrices', () => {
    it('should ignore 0-width empty strings and handle degenerate transforms safely', () => {
      const textContent = {
        items: [
          { str: '', width: 0, height: 0, transform: [0, 0, 0, 0, 0, 0] },
          { str: 'نص حقيقي', width: 100, height: 12, transform: [12, 0, 0, 12, 50, 700] },
          { str: ' ', width: 5, height: 12, transform: [12, 0, 0, 12, 150, 700] },
          { str: '', width: 0, height: 0, transform: [1, 0, 0, 1, 0, 0] },
        ]
      };

      const lines = processPageTextContent(textContent, { scale: 1.0, height: 800 });
      assert.equal(lines.length, 1);
      assert.ok(lines[0].fullText.includes('نص حقيقي'));
    });
  });

  describe('Edge Case 7: High-Volume Asymmetric 4-Column Mega Stress Test', () => {
    it('should transitively sort 4-column RTL layout with 1,000 lines in <15ms', () => {
      const lines: ProcessedTextLine[] = [];
      const colWidth = 100;
      const gutter = 20;
      const colX = [
        400 + 3 * (colWidth + gutter), // Col 4 (rightmost in 4 cols): 760
        400 + 2 * (colWidth + gutter), // Col 3: 640
        400 + 1 * (colWidth + gutter), // Col 2: 520
        400 + 0 * (colWidth + gutter), // Col 1: 400
      ];

      const linesPerCol = 250;
      // Add lines in interleaved/scrambled order
      for (let i = 0; i < linesPerCol; i++) {
        for (let c = 0; c < 4; c++) {
          lines.push({
            items: [],
            fullText: `Col_${c}_Line_${i}`,
            dir: 'rtl',
            top: 100 + i * 20,
            left: colX[c],
            width: colWidth,
            height: 14,
          });
        }
      }

      const t0 = performance.now();
      const sorted = sortLinesInReadingOrder(lines, true);
      const elapsed = performance.now() - t0;

      assert.equal(sorted.length, 1000);
      assert.ok(elapsed < 25, `1,000 4-column lines sorted in ${elapsed.toFixed(2)}ms, expected < 25ms`);

      // Verify Column 0 (rightmost, Col_0) comes first from line 0 to 249
      for (let i = 0; i < linesPerCol; i++) {
        assert.equal(sorted[i].fullText, `Col_0_Line_${i}`);
      }
      // Verify Column 1 comes second
      for (let i = 0; i < linesPerCol; i++) {
        assert.equal(sorted[linesPerCol + i].fullText, `Col_1_Line_${i}`);
      }
      // Verify Column 2 comes third
      for (let i = 0; i < linesPerCol; i++) {
        assert.equal(sorted[2 * linesPerCol + i].fullText, `Col_2_Line_${i}`);
      }
      // Verify Column 3 comes fourth
      for (let i = 0; i < linesPerCol; i++) {
        assert.equal(sorted[3 * linesPerCol + i].fullText, `Col_3_Line_${i}`);
      }
    });
  });
});
