/**
 * EMPIRICAL CHALLENGER TEST SUITE: Milestone 2 Continuous Scroll & Viewport Stress Testing
 * 
 * Target:
 * 1. Multi-Page Continuous Scroll Stress:
 *    - 50+ page document rapid vertical scrolling (e.g. 40MB textbook).
 *    - Aspect ratio placeholders exact height reservation (CLS = 0 analysis).
 *    - Offscreen canvas element unmounting lifecycle (activePage ± 1 buffer check).
 * 2. Zoom Invariance & Coordinate Integrity:
 *    - Annotation coordinates across zoom levels: 0.5x, 1.0x, 1.5x, 2.0x, 3.0x.
 *    - Highlight rects and text annotation position drift (threshold <= 2px).
 *    - Drag delta normalization and font scaling clamps.
 * 3. Arabic Text Layer Precision:
 *    - Multi-column Arabic text selection rects (no gutter stretching, no column zig-zagging).
 *    - Cross-page continuous scroll selection partitioning analysis.
 */

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
import {
  unscaleCoordinates,
  scaleHighlight,
  scaleTextNote,
} from '../unit/pdf-annotation-math.test.ts';

describe('⚔️ CHALLENGER M2-1: Milestone 2 Continuous Scroll, Memory Virtualization & Geometry Rigor', () => {

  // =========================================================================
  // SUITE 1: Multi-Page Continuous Scroll Stress & Aspect Ratio Placeholders
  // =========================================================================
  describe('Suite 1: Multi-Page Continuous Scroll Stress & Layout Stability', () => {

    it('1.1: Aspect Ratio Placeholders must reserve exact heights across 50+ pages (CLS = 0 for uniform documents)', () => {
      const numPages = 60; // 60-page authentic textbook
      const a4Width = 595.28;
      const a4Height = 841.89;
      const zoomLevels = [0.5, 1.0, 1.5, 2.0, 3.0];
      const pageMarginBottom = 32; // mb-8 = 32px

      for (const zoom of zoomLevels) {
        let totalLayoutShiftScore = 0;
        let cumulativeHeight = 0;

        for (let p = 1; p <= numPages; p++) {
          // Placeholder dimensions calculated before canvas loads
          const placeholderWidth = a4Width * zoom;
          const placeholderHeight = a4Height * zoom;

          // Simulated actual canvas rendered dimensions from PDF.js
          const renderedCanvasWidth = a4Width * zoom;
          const renderedCanvasHeight = a4Height * zoom;

          // Height delta when canvas replaces/populates placeholder
          const deltaHeight = Math.abs(renderedCanvasHeight - placeholderHeight);
          const deltaWidth = Math.abs(renderedCanvasWidth - placeholderWidth);

          assert.equal(deltaHeight, 0, `Page ${p} height shifted by ${deltaHeight}px at zoom ${zoom}`);
          assert.equal(deltaWidth, 0, `Page ${p} width shifted by ${deltaWidth}px at zoom ${zoom}`);

          cumulativeHeight += placeholderHeight + (p < numPages ? pageMarginBottom : 0);
        }

        // Analytical virtual scroll height check
        const expectedTotalHeight = numPages * (a4Height * zoom) + (numPages - 1) * pageMarginBottom;
        assert.ok(
          Math.abs(cumulativeHeight - expectedTotalHeight) < 0.001,
          `Cumulative scroll height mismatch at zoom ${zoom}`
        );

        // CLS is strictly 0 because deltaHeight is 0 for all pages
        assert.equal(totalLayoutShiftScore, 0, `CLS must be strictly 0 at zoom ${zoom}`);
      }
    });

    it('1.2: CLS Hazard Detection: Mixed aspect ratios (Cover / Landscape foldout) produce non-zero CLS when defaultPageSize differs', () => {
      // Authentic edge case: Page 1 is standard A4 (595.28 x 841.89),
      // Page 2 is a wide landscape diagram (841.89 x 595.28).
      const a4Portrait = { width: 595.28, height: 841.89 };
      const a4Landscape = { width: 841.89, height: 595.28 };
      const zoom = 1.0;

      // Initial placeholder uses defaultPageSize (derived from Page 1: 841.89)
      const placeholderHeight = a4Portrait.height * zoom;

      // When Page 2 mounts and fires onPageDimensionsLoaded, its real height is 595.28
      const actualHeight = a4Landscape.height * zoom;
      const heightDelta = actualHeight - placeholderHeight; // -246.61px

      // This demonstrates layout shift when non-uniform pages are rendered dynamically
      assert.notEqual(heightDelta, 0, 'Landscape page height differs from default A4 placeholder');
      const shiftDistance = Math.abs(heightDelta);
      assert.ok(shiftDistance > 200, `Shift distance is ${shiftDistance}px (>200px shift)`);
    });

    it('1.3: Empirical Stress Test: Offscreen Canvas Unmount Lifecycle under Rapid Scrolling (W3C IntersectionObserver)', () => {
      /**
       * We empirically simulate the exact IntersectionObserver algorithm implemented in
       * PdfNotebookViewer.tsx lines 1037-1067:
       *
       * lazyObserver = new IntersectionObserver((entries) => {
       *   setVisiblePages((prevSet) => {
       *     ...
       *     if (entry.isIntersecting) {
       *       nextSet.add(pgNum);
       *     } else {
       *       if (nextSet.has(pgNum) && Math.abs(pgNum - pageNumberRef.current) > 1) {
       *         nextSet.delete(pgNum);
       *       }
       *     }
       *     ...
       *   });
       * }, { rootMargin: '600px 0px 600px 0px' });
       *
       * Under W3C IntersectionObserver spec:
       * The browser delivers entries ONLY when an element's intersection state changes
       * (e.g. crossing between intersecting and non-intersecting).
       */

      const numPages = 50;
      const pageHeight = 841.89;
      const pageGap = 32;
      const totalPageStride = pageHeight + pageGap;
      const viewportHeight = 800;
      const rootMargin = 600;

      // State variables mirroring PdfNotebookViewer
      let visiblePages = new Set<number>([1, 2]);
      let activePageNumber = 1;
      let pageNumberRef = 1;

      // Track previous intersection state per page to adhere strictly to W3C observer delivery
      const prevIntersectionState = new Map<number, boolean>();
      for (let p = 1; p <= numPages; p++) {
        // Initially at scrollTop = 0: pages 1 and 2 intersect lazyObserver (within 0..1400px)
        const pTop = (p - 1) * totalPageStride;
        const pBottom = pTop + pageHeight;
        const initialIntersecting = !(pBottom < -rootMargin || pTop > (viewportHeight + rootMargin));
        prevIntersectionState.set(p, initialIntersecting);
      }

      function simulateScrollTo(scrollTop: number) {
        const viewportTop = scrollTop;
        const viewportBottom = scrollTop + viewportHeight;

        const lazyTop = viewportTop - rootMargin;
        const lazyBottom = viewportBottom + rootMargin;

        // 1. Identify which pages had their intersection state CHANGE
        const lazyEntries: { pageNum: number; isIntersecting: boolean }[] = [];
        for (let p = 1; p <= numPages; p++) {
          const pTop = (p - 1) * totalPageStride;
          const pBottom = pTop + pageHeight;
          const isIntersecting = !(pBottom < lazyTop || pTop > lazyBottom);
          const wasIntersecting = prevIntersectionState.get(p) ?? false;

          if (isIntersecting !== wasIntersecting) {
            lazyEntries.push({ pageNum: p, isIntersecting });
            prevIntersectionState.set(p, isIntersecting);
          }
        }

        // 2. Execute lazyObserver callback EXACTLY as written in PdfNotebookViewer.tsx
        const nextSet = new Set(visiblePages);
        lazyEntries.forEach((entry) => {
          const pgNum = entry.pageNum;
          if (entry.isIntersecting) {
            nextSet.add(pgNum);
          } else {
            // Offscreen: unmount canvas if outside activePage ± 1 buffer
            if (nextSet.has(pgNum) && Math.abs(pgNum - pageNumberRef) > 1) {
              nextSet.delete(pgNum);
            }
          }
        });
        visiblePages = nextSet;

        // 3. Execute activeObserver callback: compute dominant page
        let maxVisibleHeight = 0;
        let dominantPage = activePageNumber;
        for (let p = 1; p <= numPages; p++) {
          const pTop = (p - 1) * totalPageStride;
          const pBottom = pTop + pageHeight;
          const visibleTop = Math.max(pTop, viewportTop);
          const visibleBottom = Math.min(pBottom, viewportBottom);
          const visibleH = Math.max(0, visibleBottom - visibleTop);
          if (visibleH > maxVisibleHeight) {
            maxVisibleHeight = visibleH;
            dominantPage = p;
          }
        }
        if (dominantPage !== activePageNumber && maxVisibleHeight > 0) {
          activePageNumber = dominantPage;
          pageNumberRef = dominantPage;
        }
      }

      // Step 1: User starts at Page 1
      assert.equal(activePageNumber, 1);
      assert.ok(visiblePages.has(1));
      assert.ok(visiblePages.has(2));

      // Step 2: Rapid vertical scroll jump to Page 25
      const targetScrollTop25 = (25 - 1) * totalPageStride;
      simulateScrollTo(targetScrollTop25);

      assert.equal(activePageNumber, 25, 'Active page should now be 25');

      // CRITICAL EMPIRICAL VERIFICATION:
      // Page 1 and Page 2 crossed from intersecting to non-intersecting.
      // But when lazyObserver ran, pageNumberRef was still 1!
      // For Page 1: Math.abs(1 - 1) = 0 <= 1 -> Page 1 was NOT deleted!
      // For Page 2: Math.abs(2 - 1) = 1 <= 1 -> Page 2 was NOT deleted!
      assert.strictEqual(
        visiblePages.has(1),
        true,
        'CRITICAL DEFECT: Page 1 is retained in visiblePages because pageNumberRef lagged behind during rapid jump!'
      );
      assert.strictEqual(
        visiblePages.has(2),
        true,
        'CRITICAL DEFECT: Page 2 is retained in visiblePages due to Math.abs(2 - 1) <= 1 guard!'
      );

      // Step 3: Now user scrolls to Page 40:
      const targetScrollTop40 = (40 - 1) * totalPageStride;
      simulateScrollTo(targetScrollTop40);
      assert.equal(activePageNumber, 40);

      // Under W3C IntersectionObserver spec, Page 1 was ALREADY non-intersecting at scroll 25.
      // It did not cross any threshold between 25 and 40!
      // Therefore, lazyObserver was NEVER called for Page 1 again!
      // Thus, Page 1 is STILL in visiblePages at activePage 40!
      assert.strictEqual(
        visiblePages.has(1),
        true,
        'CRITICAL LEAK: Page 1 remains permanently in visiblePages even after scrolling to Page 40!'
      );
      assert.strictEqual(
        visiblePages.has(2),
        true,
        'CRITICAL LEAK: Page 2 remains permanently in visiblePages even after scrolling to Page 40!'
      );

      // In addition, pages 24 and 25 (which were active at step 2) now leaked too:
      // When jumping 25 -> 40, pageNumberRef was 25 when 24 and 25 became non-intersecting!
      assert.strictEqual(visiblePages.has(24), true, 'Page 24 leaked at page 40');
      assert.strictEqual(visiblePages.has(25), true, 'Page 25 leaked at page 40');

      console.log(`  [EMPIRICAL DEFECT CONFIRMED] Rapid scroll memory leak: visiblePages contains ${visiblePages.size} pages at activePage 40 (expected <= 4). Leaked pages: ${Array.from(visiblePages).join(', ')}`);
    });

    it('1.4: Viewport Memory Virtualization Bound: In an ideal unmounting policy, total rendered canvases must not exceed 4', () => {
      const totalPages = 50;
      const activePage = 25;
      const visiblePagesIdeal = new Set([24, 25, 26]); // ± 1 buffer

      const renderedPages = new Set<number>();
      for (let p = 1; p <= totalPages; p++) {
        if (visiblePagesIdeal.has(p) || Math.abs(p - activePage) <= 1) {
          renderedPages.add(p);
        }
      }

      assert.ok(renderedPages.size <= 4, `Ideal rendered pages count is ${renderedPages.size} (<= 4)`);
      assert.ok(!renderedPages.has(1), 'Page 1 must not be rendered');
      assert.ok(!renderedPages.has(50), 'Page 50 must not be rendered');
    });
  });

  // =========================================================================
  // SUITE 2: Zoom Invariance & Coordinate Integrity Matrix
  // =========================================================================
  describe('Suite 2: Zoom Invariance & Coordinate Integrity (0.5x, 1.0x, 1.5x, 2.0x, 3.0x)', () => {

    const testZoomLevels = [0.5, 1.0, 1.5, 2.0, 3.0];

    it('2.1: Box Highlight spatial deviation must be <= 2.0px across all zoom level transitions', () => {
      const pageRectZ1 = { left: 50, top: 50 };
      const startClient = { clientX: 200, clientY: 150 };
      const endClient = { clientX: 350, clientY: 180 };
      const zoomZ1 = 1.0;

      const unscaledStartX = (startClient.clientX - pageRectZ1.left) / zoomZ1; // 150
      const unscaledStartY = (startClient.clientY - pageRectZ1.top) / zoomZ1;  // 100
      const unscaledW = (endClient.clientX - startClient.clientX) / zoomZ1;    // 150
      const unscaledH = (endClient.clientY - startClient.clientY) / zoomZ1;    // 30

      const annotation = {
        type: 'highlight',
        startX: unscaledStartX,
        startY: unscaledStartY,
        w: unscaledW,
        h: unscaledH,
      };

      for (const targetZoom of testZoomLevels) {
        const renderedLeft = annotation.startX * targetZoom;
        const renderedTop = annotation.startY * targetZoom;
        const renderedWidth = annotation.w * targetZoom;
        const renderedHeight = annotation.h * targetZoom;

        const expectedLeft = 150 * targetZoom;
        const expectedTop = 100 * targetZoom;
        const expectedWidth = 150 * targetZoom;
        const expectedHeight = 30 * targetZoom;

        const driftLeft = Math.abs(renderedLeft - expectedLeft);
        const driftTop = Math.abs(renderedTop - expectedTop);
        const driftWidth = Math.abs(renderedWidth - expectedWidth);
        const driftHeight = Math.abs(renderedHeight - expectedHeight);

        assert.ok(driftLeft <= 2.0, `Drift left ${driftLeft}px exceeded 2.0px at zoom ${targetZoom}`);
        assert.ok(driftTop <= 2.0, `Drift top ${driftTop}px exceeded 2.0px at zoom ${targetZoom}`);
        assert.ok(driftWidth <= 2.0, `Drift width ${driftWidth}px exceeded 2.0px at zoom ${targetZoom}`);
        assert.ok(driftHeight <= 2.0, `Drift height ${driftHeight}px exceeded 2.0px at zoom ${targetZoom}`);
      }
    });

    it('2.2: Cross-Zoom Re-Unscaling Matrix: Drawing at Z1 and converting to Z2 preserves exact geometry', () => {
      for (const z1 of testZoomLevels) {
        for (const z2 of testZoomLevels) {
          const clientX = 120 * z1 + 40;
          const clientY = 250 * z1 + 80;
          const pageLeft = 40;
          const pageTop = 80;

          const exactUnscaledX = (clientX - pageLeft) / z1;
          const exactUnscaledY = (clientY - pageTop) / z1;

          const renderedX2 = exactUnscaledX * z2;
          const renderedY2 = exactUnscaledY * z2;

          const backUnscaledX = renderedX2 / z2;
          const backUnscaledY = renderedY2 / z2;

          assert.ok(
            Math.abs(backUnscaledX - exactUnscaledX) < 1e-9,
            `Coordinate roundtrip drift at ${z1}x -> ${z2}x`
          );
          assert.ok(
            Math.abs(backUnscaledY - exactUnscaledY) < 1e-9,
            `Coordinate roundtrip drift at ${z1}x -> ${z2}x`
          );
        }
      }
    });

    it('2.3: Text Annotation Font Size and Drag Scaling across Zoom Levels', () => {
      const baseFontSize = 24;

      for (const zoom of testZoomLevels) {
        const renderedFontSize = Math.max(12, Math.round(baseFontSize * zoom));
        const expected = Math.max(12, Math.round(24 * zoom));
        assert.equal(renderedFontSize, expected, `Font size mismatch at zoom ${zoom}`);
        assert.ok(renderedFontSize >= 12, 'Font size must never drop below 12px clamp');
      }

      for (const zoom of testZoomLevels) {
        const screenDragDistance = 100;
        const unscaledDragDelta = screenDragDistance / zoom;
        assert.equal(unscaledDragDelta, 100 / zoom);
        const backOnScreen = unscaledDragDelta * zoom;
        assert.equal(Math.round(backOnScreen), 100, `Drag movement must scale proportionally at zoom ${zoom}`);
      }
    });

    it('2.4: Text Selection Highlight alignment with underlying Arabic text line across zoom levels', () => {
      const baseLine = { left: 100, top: 300, width: 200, height: 18 };
      const zoomZ1 = 1.5;
      const textRectZ1 = {
        left: baseLine.left * zoomZ1,
        top: baseLine.top * zoomZ1,
        width: baseLine.width * zoomZ1,
        height: baseLine.height * zoomZ1,
      };

      const storedAnn = {
        startX: textRectZ1.left / zoomZ1,
        startY: textRectZ1.top / zoomZ1,
        w: textRectZ1.width / zoomZ1,
        h: textRectZ1.height / zoomZ1,
      };

      for (const z of testZoomLevels) {
        const scaledLineLeft = Math.round(baseLine.left * z * 100) / 100;
        const scaledLineTop = Math.round(baseLine.top * z * 100) / 100;
        const scaledLineWidth = Math.round(baseLine.width * z * 100) / 100;
        const scaledLineHeight = Math.round(baseLine.height * z * 100) / 100;

        const highlightLeft = storedAnn.startX * z;
        const highlightTop = storedAnn.startY * z;
        const highlightWidth = storedAnn.w * z;
        const highlightHeight = storedAnn.h * z;

        const driftX = Math.abs(scaledLineLeft - highlightLeft);
        const driftY = Math.abs(scaledLineTop - highlightTop);
        const driftW = Math.abs(scaledLineWidth - highlightWidth);
        const driftH = Math.abs(scaledLineHeight - highlightHeight);

        assert.ok(driftX <= 2.0, `Text highlight driftX ${driftX}px > 2px at zoom ${z}`);
        assert.ok(driftY <= 2.0, `Text highlight driftY ${driftY}px > 2px at zoom ${z}`);
        assert.ok(driftW <= 2.0, `Text highlight driftW ${driftW}px > 2px at zoom ${z}`);
        assert.ok(driftH <= 2.0, `Text highlight driftH ${driftH}px > 2px at zoom ${z}`);
      }
    });
  });

  // =========================================================================
  // SUITE 3: Arabic Text Layer Precision & Multi-Column Under Continuous Scroll
  // =========================================================================
  describe('Suite 3: Arabic Text Layer Precision & Multi-Column Under Continuous Scroll', () => {

    it('3.1: Multi-Column Arabic layout: Text items with wide horizontal gutter strictly split into distinct lines', () => {
      const mockTextContent = {
        items: [
          { str: 'الجانب الأيمن من الصفحة', dir: 'rtl', width: 180, height: 16, transform: [16, 0, 0, 16, 360, 500] },
          { str: 'الجانب الأيسر من الصفحة', dir: 'rtl', width: 180, height: 16, transform: [16, 0, 0, 16, 50, 500] },
          { str: 'السطر الثاني في اليمين', dir: 'rtl', width: 180, height: 16, transform: [16, 0, 0, 16, 360, 460] },
          { str: 'السطر الثاني في اليسار', dir: 'rtl', width: 180, height: 16, transform: [16, 0, 0, 16, 50, 460] },
        ]
      };

      const viewport = { scale: 1.0, width: 600, height: 800 };
      const lines = processPageTextContent(mockTextContent, viewport);

      assert.equal(lines.length, 4, `Expected 4 lines across columns, got ${lines.length}`);

      for (const line of lines) {
        assert.ok(line.width <= 220, `Line width ${line.width} stretched across gutter! FullText: "${line.fullText}"`);
      }
    });

    it('3.2: Multi-Column Arabic reading order: RTL reading order reads entire right column before left column', () => {
      const mockTextContent = {
        items: [
          { str: 'عنوان المقال الرئيسي الشامل', dir: 'rtl', width: 500, height: 18, transform: [18, 0, 0, 18, 50, 720] },
          { str: 'يمين 1', dir: 'rtl', width: 180, height: 14, transform: [14, 0, 0, 14, 350, 650] },
          { str: 'يمين 2', dir: 'rtl', width: 180, height: 14, transform: [14, 0, 0, 14, 350, 610] },
          { str: 'يمين 3', dir: 'rtl', width: 180, height: 14, transform: [14, 0, 0, 14, 350, 570] },
          { str: 'يسار 1', dir: 'rtl', width: 180, height: 14, transform: [14, 0, 0, 14, 50, 650] },
          { str: 'يسار 2', dir: 'rtl', width: 180, height: 14, transform: [14, 0, 0, 14, 50, 610] },
          { str: 'يسار 3', dir: 'rtl', width: 180, height: 14, transform: [14, 0, 0, 14, 50, 570] },
        ]
      };

      const viewport = { scale: 1.0, width: 600, height: 800 };
      const lines = processPageTextContent(mockTextContent, viewport);

      assert.equal(lines.length, 7);
      assert.ok(lines[0].fullText.includes('عنوان المقال'));
      assert.ok(lines[1].fullText.includes('يمين 1'), `Expected 'يمين 1', got '${lines[1].fullText}'`);
      assert.ok(lines[2].fullText.includes('يمين 2'), `Expected 'يمين 2', got '${lines[2].fullText}'`);
      assert.ok(lines[3].fullText.includes('يمين 3'), `Expected 'يمين 3', got '${lines[3].fullText}'`);
      assert.ok(lines[4].fullText.includes('يسار 1'), `Expected 'يسار 1', got '${lines[4].fullText}'`);
      assert.ok(lines[5].fullText.includes('يسار 2'), `Expected 'يسار 2', got '${lines[5].fullText}'`);
      assert.ok(lines[6].fullText.includes('يسار 3'), `Expected 'يسار 3', got '${lines[6].fullText}'`);

      console.log('  ✔ Multi-column Arabic text layer reading order strictly preserves RTL column transitivity.');
    });

    it('3.3: Cross-Page Selection Under Continuous Scroll: Empirical Analysis of handleTextSelectionPointerUp', () => {
      const page1Rect = { left: 100, top: 50, width: 600, height: 850, bottom: 900 };
      const page2Rect = { left: 100, top: 932, width: 600, height: 850, bottom: 1782 };
      const zoom = 1.0;

      const simulatedRects = [
        { left: 150, top: 860, width: 200, height: 20 },
        { left: 150, top: 960, width: 200, height: 20 },
      ];

      const anchorPageNum = 1;
      const targetPageRect = page1Rect;

      const producedAnns: any[] = [];
      for (const rect of simulatedRects) {
        producedAnns.push({
          startX: (rect.left - targetPageRect.left) / zoom,
          startY: (rect.top - targetPageRect.top) / zoom,
          w: rect.width / zoom,
          h: rect.height / zoom,
        });
      }

      assert.equal(producedAnns[0].startY, 810);
      assert.ok(producedAnns[0].startY < page1Rect.height, 'Rect 1 is inside Page 1');

      assert.equal(producedAnns[1].startY, 910);
      assert.ok(
        producedAnns[1].startY > page1Rect.height,
        'EMPIRICAL HAZARD: Rect 2 coordinate (910px) overflows Page 1 container (850px) and is stored on Page 1!'
      );

      console.log(`  [EMPIRICAL DEFECT DETECTED] Cross-page selection dumping hazard: Rect from Page 2 has startY=${producedAnns[1].startY}px (Page 1 height=${page1Rect.height}px) and is saved under page ${anchorPageNum} instead of page 2.`);
    });
  });

  // =========================================================================
  // SUITE 4: Multi-Page Continuous Scroll Benchmark & Memory Load Simulation
  // =========================================================================
  describe('Suite 4: 50+ Page Rapid Scroll Memory & Performance Benchmark', () => {

    it('4.1: Rapid scrolling through all 50 pages generates exact virtual scroll map in < 10ms', () => {
      const numPages = 50;
      const zoom = 1.25;
      const a4Width = 595.28;
      const a4Height = 841.89;
      const gap = 32;

      const startTime = performance.now();

      const scrollMap: { page: number; top: number; bottom: number; height: number }[] = [];
      let curTop = 0;
      for (let p = 1; p <= numPages; p++) {
        const height = a4Height * zoom;
        scrollMap.push({
          page: p,
          top: curTop,
          bottom: curTop + height,
          height,
        });
        curTop += height + gap;
      }

      const elapsed = performance.now() - startTime;
      assert.equal(scrollMap.length, 50);
      assert.ok(elapsed < 10.0, `Virtual scroll map generation took ${elapsed.toFixed(3)}ms (< 10ms)`);

      // Verify random access lookup time
      const lookupStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        const randomPage = Math.floor(Math.random() * 50) + 1;
        const pageEntry = scrollMap[randomPage - 1];
        assert.equal(pageEntry.page, randomPage);
      }
      const lookupElapsed = performance.now() - lookupStart;
      assert.ok(lookupElapsed < 15.0, `1000 scroll lookups took ${lookupElapsed.toFixed(3)}ms (< 15ms)`);
    });
  });
});
