/**
 * Tier 1 & Tier 2 Unit Test Suite: Annotation Math, Coordinate Geometry & Zoom Scaling
 * Feature Covered: F9 (Annotation Overlay Sync & Scaling)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface UnscaledHighlight {
  id: number | string;
  type: 'highlight';
  startX: number;
  startY: number;
  w: number;
  h: number;
  color: string;
  text?: string;
}

export interface UnscaledTextNote {
  id: number | string;
  type: 'text';
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
}

export interface RenderedRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function unscaleCoordinates(
  clientX: number,
  clientY: number,
  containerLeft: number,
  containerTop: number,
  zoomLevel: number
): { x: number; y: number } {
  return {
    x: (clientX - containerLeft) / zoomLevel,
    y: (clientY - containerTop) / zoomLevel,
  };
}

export function scaleHighlight(ann: UnscaledHighlight, zoomLevel: number): RenderedRect {
  return {
    left: ann.startX * zoomLevel,
    top: ann.startY * zoomLevel,
    width: ann.w * zoomLevel,
    height: ann.h * zoomLevel,
  };
}

export function scaleTextNote(ann: UnscaledTextNote, zoomLevel: number): { left: number; top: number; fontSize: number } {
  return {
    left: ann.x * zoomLevel,
    top: ann.y * zoomLevel,
    fontSize: Math.round(ann.fontSize * zoomLevel),
  };
}

export function moveTextNote(
  initialX: number,
  initialY: number,
  deltaX: number,
  deltaY: number,
  zoomLevel: number
): { x: number; y: number } {
  return {
    x: initialX + deltaX / zoomLevel,
    y: initialY + deltaY / zoomLevel,
  };
}

export function clampNotesWidth(dragWidth: number, containerWidth: number): number {
  const minWidth = 200;
  const maxWidth = Math.max(200, containerWidth - 300);
  return Math.max(minWidth, Math.min(dragWidth, maxWidth));
}

describe('Tier 1: Feature Coverage — Annotation Math & Geometry (F9)', () => {
  it('T1.9.1: should accurately unscale pointer click coordinates relative to container and zoom', () => {
    const container = { left: 100, top: 200 };
    const click = { clientX: 350, clientY: 500 };
    const zoomLevel = 1.5;

    const unscaled = unscaleCoordinates(click.clientX, click.clientY, container.left, container.top, zoomLevel);
    // (350 - 100) / 1.5 = 250 / 1.5 = 166.6666...
    // (500 - 200) / 1.5 = 300 / 1.5 = 200.0
    assert.equal(Math.round(unscaled.x * 100) / 100, 166.67);
    assert.equal(unscaled.y, 200);
  });

  it('T1.9.2: should render highlight rectangles scaled linearly by zoom factor', () => {
    const ann: UnscaledHighlight = {
      id: 1,
      type: 'highlight',
      startX: 120,
      startY: 80,
      w: 240,
      h: 25,
      color: '#fef08a',
    };

    const rendered100 = scaleHighlight(ann, 1.0);
    assert.deepEqual(rendered100, { left: 120, top: 80, width: 240, height: 25 });

    const rendered200 = scaleHighlight(ann, 2.0);
    assert.deepEqual(rendered200, { left: 240, top: 160, width: 480, height: 50 });

    const rendered50 = scaleHighlight(ann, 0.5);
    assert.deepEqual(rendered50, { left: 60, top: 40, width: 120, height: 12.5 });
  });

  it('T1.9.3: should scale text note font size and position with integer rounding for font size', () => {
    const note: UnscaledTextNote = {
      id: 2,
      type: 'text',
      x: 150,
      y: 300,
      text: 'ملاحظة هامة',
      color: '#9333ea',
      fontSize: 16,
    };

    const rendered = scaleTextNote(note, 1.75);
    assert.equal(rendered.left, 262.5);
    assert.equal(rendered.top, 525);
    assert.equal(rendered.fontSize, 28); // Math.round(16 * 1.75) = 28
  });

  it('T1.9.4: should normalize drag movements by zoom factor to avoid sluggish/fast dragging', () => {
    const initial = { x: 100, y: 100 };
    const dragDelta = { dx: 60, dy: 30 };
    
    // At zoom 2.0x, dragging 60px on screen means moving 30 unscaled units
    const posAt200 = moveTextNote(initial.x, initial.y, dragDelta.dx, dragDelta.dy, 2.0);
    assert.equal(posAt200.x, 130);
    assert.equal(posAt200.y, 115);

    // At zoom 0.5x, dragging 60px on screen means moving 120 unscaled units
    const posAt50 = moveTextNote(initial.x, initial.y, dragDelta.dx, dragDelta.dy, 0.5);
    assert.equal(posAt50.x, 220);
    assert.equal(posAt50.y, 160);
  });

  it('T1.9.5: should clamp resizer width strictly between 200px and containerWidth - 300px', () => {
    const containerWidth = 1200; // max width = 900px
    
    assert.equal(clampNotesWidth(150, containerWidth), 200); // lower clamp
    assert.equal(clampNotesWidth(500, containerWidth), 500); // valid middle
    assert.equal(clampNotesWidth(1000, containerWidth), 900); // upper clamp
  });
});

describe('Tier 2: Boundary & Corner Cases — Zoom Scaling Matrix', () => {
  const testZoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 3.0];

  it('T2.1: should maintain spatial deviation <= 1.5px across all supported zoom levels (50% to 300%)', () => {
    const baseAnn: UnscaledHighlight = {
      id: 99,
      type: 'highlight',
      startX: 85.333,
      startY: 142.666,
      w: 310.5,
      h: 18.25,
      color: '#bbf7d0',
    };

    for (const zoom of testZoomLevels) {
      const rendered = scaleHighlight(baseAnn, zoom);
      const expectedLeft = baseAnn.startX * zoom;
      const expectedTop = baseAnn.startY * zoom;
      
      const deltaX = Math.abs(rendered.left - expectedLeft);
      const deltaY = Math.abs(rendered.top - expectedTop);
      assert.ok(deltaX <= 1.5, `Zoom ${zoom}: deltaX ${deltaX} exceeded threshold 1.5px`);
      assert.ok(deltaY <= 1.5, `Zoom ${zoom}: deltaY ${deltaY} exceeded threshold 1.5px`);
    }
  });

  it('T2.2: should handle boundary values: zero coordinate offsets and zero-width boxes gracefully', () => {
    const zeroAnn: UnscaledHighlight = {
      id: 100,
      type: 'highlight',
      startX: 0,
      startY: 0,
      w: 0,
      h: 0,
      color: '#fef08a',
    };
    const rendered = scaleHighlight(zeroAnn, 2.5);
    assert.deepEqual(rendered, { left: 0, top: 0, width: 0, height: 0 });
  });

  it('T2.3: should handle small container widths (<= 500px) by clamping resizer safely without negative limits', () => {
    const smallContainerWidth = 400; // container - 300 = 100, but min is 200, so maxWidth = max(200, 100) = 200
    assert.equal(clampNotesWidth(350, smallContainerWidth), 200);
    assert.equal(clampNotesWidth(50, smallContainerWidth), 200);
  });

  it('T2.4: should maintain exact scale-invariance on round-trip unscale and scale operations', () => {
    const originalClientX = 480;
    const originalClientY = 320;
    const container = { left: 80, top: 120 };
    const zoom = 2.0;

    // 1. Unscale to store
    const unscaled = unscaleCoordinates(originalClientX, originalClientY, container.left, container.top, zoom);
    // 2. Re-scale to render
    const reRenderedX = unscaled.x * zoom + container.left;
    const reRenderedY = unscaled.y * zoom + container.top;

    assert.equal(reRenderedX, originalClientX);
    assert.equal(reRenderedY, originalClientY);
  });

  it('T2.5: should round font sizes strictly to integer pixels within range 12px to 72px', () => {
    const minNote: UnscaledTextNote = { id: 1, type: 'text', x: 0, y: 0, text: 'A', color: '#000', fontSize: 12 };
    const maxNote: UnscaledTextNote = { id: 2, type: 'text', x: 0, y: 0, text: 'B', color: '#000', fontSize: 72 };

    const renderedMin = scaleTextNote(minNote, 0.5); // 6px
    const renderedMax = scaleTextNote(maxNote, 3.0); // 216px

    assert.equal(Number.isInteger(renderedMin.fontSize), true);
    assert.equal(Number.isInteger(renderedMax.fontSize), true);
    assert.equal(renderedMin.fontSize, 6);
    assert.equal(renderedMax.fontSize, 216);
  });
});
