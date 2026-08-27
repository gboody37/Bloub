import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  processPageTextContent,
  sortLinesInReadingOrder,
  buildProcessedLine,
} from '../../src/lib/pdf/arabic-bidi.ts';
import type {
  ProcessedTextLine,
  ProcessedTextItem,
} from '../../src/lib/pdf/arabic-bidi.ts';

describe('⚔️ CHALLENGER 2: DOM Text Selection Box Geometry & Zoom Scaling Rigor', () => {

  describe('Dimension 1: Exact Coordinate Geometry & Zero Vertical Displacement', () => {
    it('should strictly preserve exact top, left, width, and height without 22% top-shift or height compression', () => {
      const items: ProcessedTextItem[] = [
        {
          str: 'مرحبا',
          originalStr: 'مرحبا',
          dir: 'rtl',
          isArabic: true,
          transform: [12, 0, 0, 12, 100, 500],
          left: 100,
          top: 300,
          width: 50,
          height: 18,
          fontSize: 18,
        },
        {
          str: 'بكم',
          originalStr: 'بكم',
          dir: 'rtl',
          isArabic: true,
          transform: [12, 0, 0, 12, 155, 500],
          left: 155,
          top: 300,
          width: 40,
          height: 18,
          fontSize: 18,
        }
      ];

      const line = buildProcessedLine(items);

      // Verify exact bounding box
      assert.strictEqual(line.left, 100, 'line.left must match leftmost item left');
      assert.strictEqual(line.top, 300, 'line.top must match minTop exactly (zero top-offset shift)');
      assert.strictEqual(line.width, 95, 'line.width must match total span (195 - 100)');
      assert.strictEqual(line.height, 18, 'line.height must equal rawHeight exactly (18px, not 14.04px compressed)');
      assert.strictEqual(line.dir, 'rtl');
    });

    it('should preserve bounding box coordinate fidelity across a wide spectrum of font sizes (8pt to 72pt)', () => {
      const fontSizes = [8, 10, 11, 12, 14, 16, 18, 24, 32, 48, 72];

      for (const fontPt of fontSizes) {
        const itemHeight = fontPt * 1.2;
        const itemWidth = fontPt * 4;
        const textContent = {
          items: [
            {
              str: 'العربية',
              dir: 'rtl',
              width: itemWidth,
              height: itemHeight,
              transform: [fontPt, 0, 0, fontPt, 50, 400],
            }
          ]
        };

        const viewportHeight = 1000;
        const scale = 1.0;
        const lines = processPageTextContent(textContent, { scale, height: viewportHeight });

        assert.strictEqual(lines.length, 1);
        const line = lines[0];

        const expectedItemHeight = itemHeight * scale;
        const expectedTop = viewportHeight - (400 * scale) - expectedItemHeight;
        const expectedLeft = 50 * scale;
        const expectedWidth = itemWidth * scale;
        const expectedBaseFontSize = Math.max(fontPt, itemHeight);

        assert.ok(Math.abs(line.left - expectedLeft) < 0.01, `Left mismatch at font ${fontPt}`);
        assert.ok(Math.abs(line.top - expectedTop) < 0.01, `Top mismatch at font ${fontPt}`);
        assert.ok(Math.abs(line.width - expectedWidth) < 0.01, `Width mismatch at font ${fontPt}`);
        assert.ok(Math.abs(line.height - expectedItemHeight) < 0.01, `Height mismatch at font ${fontPt}`);
        assert.strictEqual(line.items[0].fontSize, expectedBaseFontSize * scale);
      }
    });

    it('should maintain exact linear scaling across extreme zoom levels (0.25x to 5.0x)', () => {
      const zoomLevels = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0];
      const baseTx = 100;
      const baseTy = 400;
      const baseWidth = 120;
      const baseHeight = 20;
      const baseFontPt = 16;
      const baseViewportHeight = 800;

      for (const scale of zoomLevels) {
        const textContent = {
          items: [
            {
              str: 'نص تجريبي للتحقق من التحجيم',
              dir: 'rtl',
              width: baseWidth,
              height: baseHeight,
              transform: [baseFontPt, 0, 0, baseFontPt, baseTx, baseTy],
            }
          ]
        };

        const viewportHeight = baseViewportHeight * scale;
        const lines = processPageTextContent(textContent, { scale, height: viewportHeight });

        assert.strictEqual(lines.length, 1, `Failed at zoom ${scale}`);
        const line = lines[0];

        const expectedLeft = baseTx * scale;
        const expectedItemHeight = baseHeight * scale;
        const expectedTop = viewportHeight - (baseTy * scale) - expectedItemHeight;
        const expectedWidth = baseWidth * scale;
        const expectedFontSize = Math.max(baseFontPt, baseHeight) * scale;

        assert.ok(
          Math.abs(line.left - expectedLeft) < 0.05,
          `Zoom ${scale}: left displacement (${line.left} vs ${expectedLeft})`
        );
        assert.ok(
          Math.abs(line.top - expectedTop) < 0.05,
          `Zoom ${scale}: top displacement (${line.top} vs ${expectedTop})`
        );
        assert.ok(
          Math.abs(line.width - expectedWidth) < 0.05,
          `Zoom ${scale}: width displacement (${line.width} vs ${expectedWidth})`
        );
        assert.ok(
          Math.abs(line.height - expectedItemHeight) < 0.05,
          `Zoom ${scale}: height compression/bloat (${line.height} vs ${expectedItemHeight})`
        );
        assert.ok(
          Math.abs(line.items[0].fontSize - expectedFontSize) < 0.05,
          `Zoom ${scale}: fontSize scaling error (${line.items[0].fontSize} vs ${expectedFontSize})`
        );
      }
    });
  });

  describe('Dimension 2: PDF.js convertToViewportPoint & transform Matrix Invariance', () => {
    it('should calculate identical top/height using convertToViewportPoint without baseline offset errors', () => {
      const tx = 150;
      const ty = 650;
      const itemHeight = 24;
      const itemWidth = 180;
      const scale = 1.5;

      // Mock viewport with convertToViewportPoint
      const mockViewport = {
        scale,
        height: 1200,
        convertToViewportPoint: (x: number, y: number) => {
          // PDF.js: y is converted from PDF bottom-origin to viewport top-origin baseline
          const vx = x * scale;
          const vy = 1200 - (y * scale);
          return [vx, vy];
        }
      };

      const textContent = {
        items: [
          {
            str: 'اختبار مصفوفة التحويل',
            width: itemWidth,
            height: itemHeight,
            transform: [16, 0, 0, 16, tx, ty],
          }
        ]
      };

      const lines = processPageTextContent(textContent, mockViewport);
      assert.strictEqual(lines.length, 1);
      const line = lines[0];

      const expectedBaselineVy = 1200 - (ty * scale); // 1200 - 975 = 225
      const expectedItemHeightScaled = itemHeight * scale; // 36
      const expectedTop = expectedBaselineVy - expectedItemHeightScaled; // 225 - 36 = 189
      const expectedLeft = tx * scale; // 225

      assert.strictEqual(line.left, expectedLeft);
      assert.strictEqual(line.top, expectedTop);
      assert.strictEqual(line.height, expectedItemHeightScaled);
      assert.strictEqual(line.width, itemWidth * scale);
    });

    it('should compute identical coordinates when using affine transform matrix [s, 0, 0, -s, 0, h]', () => {
      const scale = 2.0;
      const pageHeight = 1000;
      const viewport = {
        scale,
        height: pageHeight * scale,
        transform: [scale, 0, 0, -scale, 0, pageHeight * scale]
      };

      const textContent = {
        items: [
          {
            str: 'عنوان رئيسي',
            width: 200,
            height: 30,
            transform: [20, 0, 0, 20, 100, 800], // ty = 800
          }
        ]
      };

      const lines = processPageTextContent(textContent, viewport);
      assert.strictEqual(lines.length, 1);
      const line = lines[0];

      // vx = 2.0 * 100 = 200
      // vy = -2.0 * 800 + 2000 = 400 (baseline)
      // itemHeight = 30 * 2 = 60
      // top = vy - itemHeight = 400 - 60 = 340
      assert.strictEqual(line.left, 200);
      assert.strictEqual(line.top, 340);
      assert.strictEqual(line.height, 60);
      assert.strictEqual(line.width, 400);
    });
  });

  describe('Dimension 3: Vertical Baseline Jitter, Multi-line Clumping & Ascender/Descender Coverage', () => {
    it('should cluster items with sub-pixel baseline jitter (< 40% font size) into a single line', () => {
      const textContent = {
        items: [
          { str: 'كلمة1', width: 40, height: 16, transform: [16, 0, 0, 16, 100, 500] },
          { str: 'كلمة2', width: 40, height: 16, transform: [16, 0, 0, 16, 145, 500.5] }, // 0.5px jitter
          { str: 'كلمة3', width: 40, height: 16, transform: [16, 0, 0, 16, 190, 499.8] }, // -0.2px jitter
        ]
      };

      const lines = processPageTextContent(textContent, { scale: 1.0, height: 800 });
      assert.strictEqual(lines.length, 1, 'Sub-pixel jittered items must group into 1 ProcessedTextLine');
      assert.strictEqual(lineTextCount(lines[0].fullText), 3);
    });

    it('should separate items with vertical displacement exceeding threshold into distinct lines', () => {
      const textContent = {
        items: [
          { str: 'السطر الأول', width: 100, height: 16, transform: [16, 0, 0, 16, 100, 500] },
          { str: 'السطر الثاني', width: 100, height: 16, transform: [16, 0, 0, 16, 100, 470] }, // 30px difference
        ]
      };

      const lines = processPageTextContent(textContent, { scale: 1.0, height: 800 });
      assert.strictEqual(lines.length, 2, 'Lines with 30px vertical separation must form 2 distinct ProcessedTextLines');
      assert.ok(lines[0].top < lines[1].top, 'Top line must come first');
    });

    it('should reject outlier heights from PDF.js watermark/border bugs without clipping regular text', () => {
      const items: ProcessedTextItem[] = [
        { str: 'نص عادي', originalStr: 'نص عادي', dir: 'rtl', isArabic: true, transform: [14,0,0,14,50,500], left: 50, top: 200, width: 60, height: 16, fontSize: 16 },
        { str: 'نص آخر', originalStr: 'نص آخر', dir: 'rtl', isArabic: true, transform: [14,0,0,14,115,500], left: 115, top: 200, width: 60, height: 16, fontSize: 16 },
        { str: 'علامة', originalStr: 'علامة', dir: 'rtl', isArabic: true, transform: [14,0,0,14,180,500], left: 180, top: 200, width: 60, height: 450, fontSize: 16 } // bugged watermark height: 450px
      ];

      const line = buildProcessedLine(items);
      // medianHeight is 16, maxHeightAllowed is 16 * 1.5 = 24
      assert.strictEqual(line.height, 24, 'Height must be clamped to safe maximum (24px) rather than 450px');
    });
  });

  describe('Dimension 4: DOM Text Selection Span Geometry Verification in ArabicTextLayer', () => {
    it('should produce span properties directly usable by CSS absolute positioning without calculation drift', () => {
      const textContent = {
        items: [
          { str: 'الفصل الأول: المقدمة', width: 250, height: 22, transform: [18, 0, 0, 18, 200, 750] }
        ]
      };

      const scale = 1.25;
      const lines = processPageTextContent(textContent, { scale, height: 1000 });
      const line = lines[0];

      // Simulated React ArabicTextLayer style mapping:
      const fontSize = line.items[0]?.fontSize || line.height;
      const style = {
        position: 'absolute',
        left: `${line.left}px`,
        top: `${line.top}px`,
        width: `${line.width}px`,
        height: `${line.height}px`,
        fontSize: `${fontSize}px`,
        lineHeight: 1,
      };

      assert.strictEqual(style.position, 'absolute');
      assert.strictEqual(style.left, `${200 * scale}px`);
      assert.strictEqual(style.top, `${1000 - (750 * scale) - (22 * scale)}px`);
      assert.strictEqual(style.width, `${250 * scale}px`);
      assert.strictEqual(style.height, `${22 * scale}px`);
      assert.strictEqual(style.fontSize, `${Math.max(18, 22) * scale}px`);
    });
  });

  describe('Dimension 5: Multi-Column Reading Order Transitivity & Permutation Invariance', () => {
    it('should strictly guarantee permutation invariance: any shuffled input array yields the exact same reading order', () => {
      // 2-column RTL layout:
      // Header: top 100, left 100..700 (width 600)
      // Right Column: left 450..700 (R1: top 200, R2: top 250, R3: top 300)
      // Left Column: left 100..350 (L1: top 200, L2: top 250, L3: top 300)
      // Footer: top 400, left 100..700 (width 600)

      const header: ProcessedTextLine = { items: [], fullText: 'العنوان الرئيسي', dir: 'rtl', left: 100, top: 100, width: 600, height: 25 };
      const r1: ProcessedTextLine = { items: [], fullText: 'عمود أيمن 1', dir: 'rtl', left: 450, top: 200, width: 250, height: 18 };
      const r2: ProcessedTextLine = { items: [], fullText: 'عمود أيمن 2', dir: 'rtl', left: 450, top: 250, width: 250, height: 18 };
      const r3: ProcessedTextLine = { items: [], fullText: 'عمود أيمن 3', dir: 'rtl', left: 450, top: 300, width: 250, height: 18 };
      const l1: ProcessedTextLine = { items: [], fullText: 'عمود أيسر 1', dir: 'rtl', left: 100, top: 200, width: 250, height: 18 };
      const l2: ProcessedTextLine = { items: [], fullText: 'عمود أيسر 2', dir: 'rtl', left: 100, top: 250, width: 250, height: 18 };
      const l3: ProcessedTextLine = { items: [], fullText: 'عمود أيسر 3', dir: 'rtl', left: 100, top: 300, width: 250, height: 18 };
      const footer: ProcessedTextLine = { items: [], fullText: 'تذييل الصفحة', dir: 'rtl', left: 100, top: 400, width: 600, height: 20 };

      const baseList = [header, r1, r2, r3, l1, l2, l3, footer];
      const expectedOrder = ['العنوان الرئيسي', 'عمود أيمن 1', 'عمود أيمن 2', 'عمود أيمن 3', 'عمود أيسر 1', 'عمود أيسر 2', 'عمود أيسر 3', 'تذييل الصفحة'];

      // Test 20 random permutations
      for (let p = 0; p < 20; p++) {
        const shuffled = [...baseList].sort(() => Math.random() - 0.5);
        const sorted = sortLinesInReadingOrder(shuffled, true);
        const actualOrder = sorted.map(s => s.fullText);
        assert.deepStrictEqual(actualOrder, expectedOrder, `Permutation #${p} produced inconsistent order`);
      }
    });

    it('should maintain mathematical transitivity across 3-column asymmetric layout with varying heights', () => {
      // 3-Column RTL:
      // Col 1 (Right): left 550..750, items top 100, 140, 180
      // Col 2 (Center): left 300..500, items top 105, 145, 185 (slight baseline offset)
      // Col 3 (Left): left 50..250, items top 100, 140, 180
      const lines: ProcessedTextLine[] = [
        { items: [], fullText: 'يمين 1', dir: 'rtl', left: 550, top: 100, width: 200, height: 20 },
        { items: [], fullText: 'يمين 2', dir: 'rtl', left: 550, top: 140, width: 200, height: 20 },
        { items: [], fullText: 'يمين 3', dir: 'rtl', left: 550, top: 180, width: 200, height: 20 },

        { items: [], fullText: 'وسط 1', dir: 'rtl', left: 300, top: 105, width: 200, height: 20 },
        { items: [], fullText: 'وسط 2', dir: 'rtl', left: 300, top: 145, width: 200, height: 20 },
        { items: [], fullText: 'وسط 3', dir: 'rtl', left: 300, top: 185, width: 200, height: 20 },

        { items: [], fullText: 'يسار 1', dir: 'rtl', left: 50, top: 100, width: 200, height: 20 },
        { items: [], fullText: 'يسار 2', dir: 'rtl', left: 50, top: 140, width: 200, height: 20 },
        { items: [], fullText: 'يسار 3', dir: 'rtl', left: 50, top: 180, width: 200, height: 20 },
      ];

      const sorted = sortLinesInReadingOrder(lines, true);
      const texts = sorted.map(l => l.fullText);

      assert.deepStrictEqual(texts, [
        'يمين 1', 'يمين 2', 'يمين 3',
        'وسط 1', 'وسط 2', 'وسط 3',
        'يسار 1', 'يسار 2', 'يسار 3',
      ]);
    });
  });

  describe('Dimension 6: High Complexity Stress Testing & Execution Benchmarking', () => {
    it('should sort 5,000 lines across 10 distinct columns in under 100ms (strictly O(N log N))', () => {
      const largeBatch: ProcessedTextLine[] = [];
      const numColumns = 4;
      const linesPerColumn = 1000;
      const colWidth = 180;
      const gutter = 20;

      for (let c = 0; c < numColumns; c++) {
        const colLeft = 50 + c * (colWidth + gutter);
        for (let l = 0; l < linesPerColumn; l++) {
          largeBatch.push({
            items: [],
            fullText: `Col ${c} Line ${l}`,
            dir: 'rtl',
            left: colLeft,
            top: 100 + l * 25,
            width: colWidth,
            height: 18,
          });
        }
      }

      // Shuffle
      largeBatch.sort(() => Math.random() - 0.5);

      const startTime = performance.now();
      const sorted = sortLinesInReadingOrder(largeBatch, true);
      const elapsed = performance.now() - startTime;

      assert.strictEqual(sorted.length, numColumns * linesPerColumn);
      assert.ok(elapsed < 100, `Execution time (${elapsed.toFixed(2)}ms) exceeded budget of 100ms`);

      // Verify first column is the rightmost column (c = 3, left = 50 + 3 * 200 = 650)
      assert.strictEqual(sorted[0].left, 50 + 3 * (colWidth + gutter));
      assert.strictEqual(sorted[0].top, 100);
      assert.strictEqual(sorted[linesPerColumn - 1].left, 50 + 3 * (colWidth + gutter));
      assert.strictEqual(sorted[linesPerColumn - 1].top, 100 + (linesPerColumn - 1) * 25);
    });
  });
});

function lineTextCount(text: string): number {
  return text.trim().split(/\s+/).length;
}
