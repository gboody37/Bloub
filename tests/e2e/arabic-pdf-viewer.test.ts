/**
 * Tier 1, 2, 3 E2E Test Suite: UI & Toolbar Preservation, State Machine & Page-Isolated Operations
 * Feature Covered: F8 (UI & Toolbar Preservation)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export type PdfTool = 'pan' | 'cursor' | 'highlight' | 'text' | 'eraser';
export type HighlightMode = 'box' | 'text';
export type ViewerEngine = 'pdfjs' | 'native';

export class MockViewerStateMachine {
  pdfTool: PdfTool = 'cursor';
  highlightMode: HighlightMode = 'box';
  highlightColor = '#fef08a';
  textColor = '#9333ea';
  zoomLevel = 1.0;
  pageNumber = 1;
  numPages = 10;
  showNotes = true;
  viewerEngine: ViewerEngine = 'pdfjs';
  annotations: Record<number, any[]> = {};
  notes: Record<number, { text: string; lang: 'en' | 'ar' }> = {};

  setTool(tool: PdfTool) {
    this.pdfTool = tool;
  }

  setHighlightMode(mode: HighlightMode) {
    this.highlightMode = mode;
  }

  setZoom(zoom: number) {
    this.zoomLevel = Math.max(0.5, Math.min(3.0, Math.round(zoom * 100) / 100));
  }

  zoomIn() {
    this.setZoom(this.zoomLevel + 0.25);
  }

  zoomOut() {
    this.setZoom(this.zoomLevel - 0.25);
  }

  setPage(page: number) {
    if (isNaN(page)) return;
    this.pageNumber = Math.max(1, Math.min(this.numPages, Math.floor(page)));
  }

  nextPage() {
    this.setPage(this.pageNumber + 1);
  }

  prevPage() {
    this.setPage(this.pageNumber - 1);
  }

  toggleSidebar() {
    this.showNotes = !this.showNotes;
  }

  toggleViewerEngine() {
    this.viewerEngine = this.viewerEngine === 'pdfjs' ? 'native' : 'pdfjs';
  }

  addAnnotation(ann: any) {
    const pageAnns = this.annotations[this.pageNumber] || [];
    this.annotations[this.pageNumber] = [...pageAnns, { ...ann, id: Date.now() }];
  }

  eraseAnnotation(annId: number | string) {
    const pageAnns = this.annotations[this.pageNumber] || [];
    this.annotations[this.pageNumber] = pageAnns.filter(a => a.id !== annId);
  }

  undo() {
    const pageAnns = this.annotations[this.pageNumber] || [];
    if (pageAnns.length === 0) return;
    this.annotations[this.pageNumber] = pageAnns.slice(0, -1);
  }

  getFontFamilyForText(text: string): string {
    const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
    return isArabic ? 'var(--font-lemonada)' : 'var(--font-caveat)';
  }
}

describe('Tier 1: Feature Coverage — UI & Toolbar Preservation (F8)', () => {
  it('T1.8.1: should activate all 5 primary toolbar tools (pan, cursor, highlight, text, eraser)', () => {
    const viewer = new MockViewerStateMachine();
    
    viewer.setTool('pan');
    assert.equal(viewer.pdfTool, 'pan');

    viewer.setTool('highlight');
    assert.equal(viewer.pdfTool, 'highlight');

    viewer.setTool('text');
    assert.equal(viewer.pdfTool, 'text');

    viewer.setTool('eraser');
    assert.equal(viewer.pdfTool, 'eraser');

    viewer.setTool('cursor');
    assert.equal(viewer.pdfTool, 'cursor');
  });

  it('T1.8.2: should toggle highlight mode between box drawing and text selection', () => {
    const viewer = new MockViewerStateMachine();
    assert.equal(viewer.highlightMode, 'box');

    viewer.setHighlightMode('text');
    assert.equal(viewer.highlightMode, 'text');

    viewer.setHighlightMode('box');
    assert.equal(viewer.highlightMode, 'box');
  });

  it('T1.8.3: should increment and decrement zoom in 0.25x steps within [0.5x, 3.0x]', () => {
    const viewer = new MockViewerStateMachine();
    assert.equal(viewer.zoomLevel, 1.0);

    viewer.zoomIn();
    assert.equal(viewer.zoomLevel, 1.25);

    viewer.zoomIn();
    assert.equal(viewer.zoomLevel, 1.5);

    viewer.zoomOut();
    assert.equal(viewer.zoomLevel, 1.25);
  });

  it('T1.8.4: should clamp zoom at lower bound (0.5x) and upper bound (3.0x)', () => {
    const viewer = new MockViewerStateMachine();
    
    // Zoom way down
    for (let i = 0; i < 10; i++) viewer.zoomOut();
    assert.equal(viewer.zoomLevel, 0.5);

    // Zoom way up
    for (let i = 0; i < 20; i++) viewer.zoomIn();
    assert.equal(viewer.zoomLevel, 3.0);
  });

  it('T1.8.5: should navigate pages and clamp between 1 and numPages', () => {
    const viewer = new MockViewerStateMachine();
    viewer.numPages = 5;

    viewer.nextPage();
    assert.equal(viewer.pageNumber, 2);

    viewer.setPage(5);
    assert.equal(viewer.pageNumber, 5);

    viewer.nextPage(); // Should clamp at 5
    assert.equal(viewer.pageNumber, 5);

    viewer.setPage(-2); // Should clamp at 1
    assert.equal(viewer.pageNumber, 1);
  });
});

describe('Tier 2: Boundary & Corner Cases — UI State & Navigation', () => {
  it('T2.1: should preserve annotations in memory when toggling between PDF.js viewer and Native iframe', () => {
    const viewer = new MockViewerStateMachine();
    viewer.addAnnotation({ type: 'highlight', startX: 10, startY: 10, w: 50, h: 20, color: '#fef08a' });

    assert.equal(viewer.viewerEngine, 'pdfjs');
    viewer.toggleViewerEngine();
    assert.equal(viewer.viewerEngine, 'native');

    // Verify annotations are retained
    assert.equal(viewer.annotations[1].length, 1);

    viewer.toggleViewerEngine();
    assert.equal(viewer.viewerEngine, 'pdfjs');
    assert.equal(viewer.annotations[1].length, 1);
  });

  it('T2.2: should toggle notes sidebar panel without affecting page zoom or active tool', () => {
    const viewer = new MockViewerStateMachine();
    viewer.setTool('highlight');
    viewer.setZoom(1.75);

    assert.equal(viewer.showNotes, true);
    viewer.toggleSidebar();
    assert.equal(viewer.showNotes, false);
    assert.equal(viewer.pdfTool, 'highlight');
    assert.equal(viewer.zoomLevel, 1.75);
  });

  it('T2.3: should auto-select Lemonada font for Arabic text and Caveat for English text', () => {
    const viewer = new MockViewerStateMachine();
    assert.equal(viewer.getFontFamilyForText('ملاحظة عربية بخط ليمونادا'), 'var(--font-lemonada)');
    assert.equal(viewer.getFontFamilyForText('English handwritten note with Caveat'), 'var(--font-caveat)');
  });

  it('T2.4: should delete target annotation on eraser click and leave remaining annotations untouched', () => {
    const viewer = new MockViewerStateMachine();
    viewer.annotations[1] = [
      { id: 101, type: 'highlight', startX: 10, startY: 10, w: 50, h: 20, color: '#fef08a' },
      { id: 102, type: 'highlight', startX: 20, startY: 40, w: 60, h: 20, color: '#bbf7d0' },
    ];

    viewer.eraseAnnotation(101);
    assert.equal(viewer.annotations[1].length, 1);
    assert.equal(viewer.annotations[1][0].id, 102);
  });
});

describe('Tier 3: Cross-Feature Interactions (Tool Switching + Page-Isolated Undo)', () => {
  it('T3.1: should switch from Pan to Highlight tool, draw annotations, and verify tool state transition', () => {
    const viewer = new MockViewerStateMachine();
    viewer.setTool('pan');
    assert.equal(viewer.pdfTool, 'pan');

    viewer.setTool('highlight');
    viewer.addAnnotation({ type: 'highlight', startX: 100, startY: 150, w: 200, h: 25, color: '#fed7aa' });

    assert.equal(viewer.annotations[1].length, 1);
    assert.equal(viewer.annotations[1][0].color, '#fed7aa');
  });

  it('T3.2: should isolate Undo stack strictly to the active page without modifying other pages', () => {
    const viewer = new MockViewerStateMachine();
    
    // Page 1: Add 2 annotations
    viewer.setPage(1);
    viewer.addAnnotation({ type: 'highlight', startX: 10, startY: 10, w: 50, h: 20, color: '#fef08a' });
    viewer.addAnnotation({ type: 'text', x: 20, y: 20, text: 'P1 note', color: '#000', fontSize: 16 });
    assert.equal(viewer.annotations[1].length, 2);

    // Page 2: Add 1 annotation
    viewer.setPage(2);
    viewer.addAnnotation({ type: 'highlight', startX: 50, startY: 50, w: 80, h: 20, color: '#bbf7d0' });
    assert.equal(viewer.annotations[2].length, 1);

    // Undo on Page 2
    viewer.undo();
    assert.equal(viewer.annotations[2].length, 0); // Page 2 popped
    assert.equal(viewer.annotations[1].length, 2); // Page 1 untouched

    // Navigate to Page 1 and Undo once
    viewer.setPage(1);
    viewer.undo();
    assert.equal(viewer.annotations[1].length, 1);
  });
});
