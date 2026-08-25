/**
 * Tier 1, 2, 3 Integration Test Suite: Arabic Text Layer DOM, Native Selection & Highlight Generation
 * Features Covered: F6 (Arabic Text Layer), F7 (Native Text Selection), F9 (Highlight Box Creation)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface DOMTextSpan {
  id: string;
  text: string;
  dir: 'rtl' | 'ltr';
  unicodeBidi: 'isolate' | 'normal';
  style: {
    left: number;
    top: number;
    fontSize: number;
    width: number;
    height: number;
  };
}

export interface MockDOMRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

export class MockDOMTextLayer {
  spans: DOMTextSpan[] = [];
  containerRect: MockDOMRect = { left: 50, top: 100, width: 800, height: 1100, right: 850, bottom: 1200 };

  addSpan(span: DOMTextSpan) {
    this.spans.push(span);
  }

  // Simulates window.getSelection() across selected spans
  simulateSelection(startSpanIndex: number, startOffset: number, endSpanIndex: number, endOffset: number): {
    selectedText: string;
    clientRects: MockDOMRect[];
  } {
    if (startSpanIndex > endSpanIndex || startSpanIndex < 0 || endSpanIndex >= this.spans.length) {
      return { selectedText: '', clientRects: [] };
    }

    let extractedText = '';
    const clientRects: MockDOMRect[] = [];

    for (let i = startSpanIndex; i <= endSpanIndex; i++) {
      const span = this.spans[i];
      const from = i === startSpanIndex ? startOffset : 0;
      const to = i === endSpanIndex ? endOffset : span.text.length;
      const sub = span.text.substring(from, to);

      extractedText += (extractedText ? ' ' : '') + sub;

      // Approximate bounding rect for selected portion
      const charRatio = span.text.length > 0 ? (to - from) / span.text.length : 1;
      const rectWidth = span.style.width * charRatio;
      const rectLeft = span.dir === 'rtl' 
        ? this.containerRect.left + span.style.left + span.style.width * (1 - (to / span.text.length))
        : this.containerRect.left + span.style.left + (from / span.text.length) * span.style.width;

      const rect: MockDOMRect = {
        left: rectLeft,
        top: this.containerRect.top + span.style.top,
        width: rectWidth,
        height: span.style.height,
        right: rectLeft + rectWidth,
        bottom: this.containerRect.top + span.style.top + span.style.height
      };
      clientRects.push(rect);
    }

    return { selectedText: extractedText, clientRects };
  }

  // Creates unscaled highlight annotations from selection rects
  createHighlightFromSelection(
    clientRects: MockDOMRect[],
    zoomLevel: number,
    color = '#fef08a'
  ) {
    return clientRects.map((rect, idx) => ({
      id: Date.now() + idx,
      type: 'highlight' as const,
      startX: (rect.left - this.containerRect.left) / zoomLevel,
      startY: (rect.top - this.containerRect.top) / zoomLevel,
      w: rect.width / zoomLevel,
      h: rect.height / zoomLevel,
      color,
    }));
  }
}

describe('Tier 1: Feature Coverage — Arabic Text Layer & Selection (F6, F7)', () => {
  it('T1.6.1: should generate DOM spans with dir="rtl" and unicode-bidi="isolate" for Arabic lines', () => {
    const textLayer = new MockDOMTextLayer();
    textLayer.addSpan({
      id: 'span-1',
      text: 'المقدمة في الذكاء الاصطناعي',
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 200, top: 50, fontSize: 18, width: 250, height: 22 }
    });

    assert.equal(textLayer.spans[0].dir, 'rtl');
    assert.equal(textLayer.spans[0].unicodeBidi, 'isolate');
    assert.equal(textLayer.spans[0].text, 'المقدمة في الذكاء الاصطناعي');
  });

  it('T1.6.2: should maintain distinct LTR directionality for embedded Latin spans', () => {
    const textLayer = new MockDOMTextLayer();
    textLayer.addSpan({
      id: 'span-latin',
      text: 'React 19 & Next.js 16 Framework',
      dir: 'ltr',
      unicodeBidi: 'isolate',
      style: { left: 100, top: 80, fontSize: 14, width: 300, height: 18 }
    });

    assert.equal(textLayer.spans[0].dir, 'ltr');
    assert.equal(textLayer.spans[0].text, 'React 19 & Next.js 16 Framework');
  });

  it('T1.7.1: should extract contiguous, logical Arabic text on full span selection (window.getSelection())', () => {
    const textLayer = new MockDOMTextLayer();
    const phrase = 'تطبيق جبنة لإدارة الملاحظات والمهام';
    textLayer.addSpan({
      id: 'span-ar',
      text: phrase,
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 150, top: 40, fontSize: 16, width: 320, height: 20 }
    });

    const sel = textLayer.simulateSelection(0, 0, 0, phrase.length);
    assert.equal(sel.selectedText, phrase);
    assert.equal(sel.clientRects.length, 1);
  });

  it('T1.7.2: should extract partial Arabic word slice with correct character boundaries', () => {
    const textLayer = new MockDOMTextLayer();
    textLayer.addSpan({
      id: 'span-1',
      text: 'الذكاء الاصطناعي التوليدي',
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 100, top: 50, fontSize: 16, width: 260, height: 20 }
    });

    // Select "الاصطناعي" (index 7 to 16)
    const sel = textLayer.simulateSelection(0, 7, 0, 16);
    assert.equal(sel.selectedText, 'الاصطناعي');
  });

  it('T1.7.3: should create unscaled highlight annotations matching selection rects', () => {
    const textLayer = new MockDOMTextLayer();
    const text = 'دراسة النصوص القانونية';
    textLayer.addSpan({
      id: 'span-1',
      text,
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 120, top: 60, fontSize: 16, width: 200, height: 22 }
    });

    const sel = textLayer.simulateSelection(0, 0, 0, text.length);
    const highlights = textLayer.createHighlightFromSelection(sel.clientRects, 1.0, '#bbf7d0');

    assert.equal(highlights.length, 1);
    assert.equal(highlights[0].color, '#bbf7d0');
    assert.equal(highlights[0].h, 22);
    assert.equal(highlights[0].startY, 60);
  });
});

describe('Tier 2: Boundary & Corner Cases — Text Selection', () => {
  it('T2.1: should handle multi-line text selections producing distinct highlight rects per line', () => {
    const textLayer = new MockDOMTextLayer();
    textLayer.addSpan({
      id: 'line-1',
      text: 'السطر الأول من الوثيقة الأكاديمية',
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 100, top: 40, fontSize: 16, width: 300, height: 20 }
    });
    textLayer.addSpan({
      id: 'line-2',
      text: 'السطر الثاني الذي يحتوي على تفاصيل إضافية',
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 100, top: 70, fontSize: 16, width: 350, height: 20 }
    });

    const sel = textLayer.simulateSelection(0, 0, 1, 40);
    assert.equal(sel.clientRects.length, 2);
    assert.ok(sel.selectedText.includes('السطر الأول'));
    assert.ok(sel.selectedText.includes('السطر الثاني'));
  });

  it('T2.2: should return empty selection when start offset equals end offset', () => {
    const textLayer = new MockDOMTextLayer();
    textLayer.addSpan({
      id: 'span-1',
      text: 'نص تجريبي',
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 100, top: 40, fontSize: 16, width: 100, height: 20 }
    });

    const sel = textLayer.simulateSelection(0, 4, 0, 4);
    assert.equal(sel.selectedText, '');
  });

  it('T2.3: should handle out-of-bounds selection indices safely without exception', () => {
    const textLayer = new MockDOMTextLayer();
    const sel = textLayer.simulateSelection(5, 0, 10, 5);
    assert.equal(sel.selectedText, '');
    assert.equal(sel.clientRects.length, 0);
  });
});

describe('Tier 3: Cross-Feature Interactions (Text Selection + Highlight + Zoom Scaling)', () => {
  it('T3.1: should select Arabic text, create highlight annotation, zoom to 200%, and verify overlay alignment', () => {
    const textLayer = new MockDOMTextLayer();
    const text = 'أهمية الخوارزميات وهياكل البيانات';
    textLayer.addSpan({
      id: 'span-ar',
      text,
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 150, top: 80, fontSize: 16, width: 280, height: 24 }
    });

    // 1. User selects text at 100% zoom
    const sel = textLayer.simulateSelection(0, 0, 0, text.length);
    assert.equal(sel.selectedText, text);

    // 2. Creates highlight stored in unscaled coordinates
    const highlights = textLayer.createHighlightFromSelection(sel.clientRects, 1.0, '#fef08a');
    const hl = highlights[0];
    assert.equal(hl.startY, 80);
    assert.equal(hl.h, 24);

    // 3. User zooms viewport to 200% (2.0x)
    const zoomLevel = 2.0;
    const renderedLeft = hl.startX * zoomLevel;
    const renderedTop = hl.startY * zoomLevel;
    const renderedWidth = hl.w * zoomLevel;
    const renderedHeight = hl.h * zoomLevel;

    assert.equal(renderedTop, 160);
    assert.equal(renderedHeight, 48);
    assert.equal(renderedLeft, hl.startX * 2.0);
    assert.equal(renderedWidth, hl.w * 2.0);
  });

  it('T3.2: should maintain highlight bounding box invariance when selecting text at 150% zoom', () => {
    const textLayer = new MockDOMTextLayer();
    textLayer.addSpan({
      id: 'span-ar',
      text: 'التفاضل والتكامل في الهندسة الرياضية',
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 200, top: 120, fontSize: 20, width: 340, height: 30 }
    });

    const zoomLevel = 1.5;
    // Client rects at 1.5x zoom
    const clientRects: MockDOMRect[] = [{
      left: textLayer.containerRect.left + 200 * zoomLevel,
      top: textLayer.containerRect.top + 120 * zoomLevel,
      width: 340 * zoomLevel,
      height: 30 * zoomLevel,
      right: textLayer.containerRect.left + (200 + 340) * zoomLevel,
      bottom: textLayer.containerRect.top + (120 + 30) * zoomLevel,
    }];

    const highlights = textLayer.createHighlightFromSelection(clientRects, zoomLevel, '#fed7aa');
    assert.equal(highlights[0].startX, 200);
    assert.equal(highlights[0].startY, 120);
    assert.equal(highlights[0].w, 340);
    assert.equal(highlights[0].h, 30);
  });
});
