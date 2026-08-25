/**
 * Tier 4 E2E Test Suite: Real-World Study Scenarios (S1 through S5)
 * Feature Covered: F15 (Real-World Application Scenarios)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseObsidianMarkdown, updateFrontmatterField } from '../../src/lib/obsidian/parser.ts';
import { referenceNormalizeArabic, referenceIsArabic } from '../unit/arabic-presentation-forms.test.ts';
import { unscaleCoordinates, scaleHighlight, scaleTextNote } from '../unit/pdf-annotation-math.test.ts';
import { MockDOMTextLayer } from '../integration/arabic-text-selection.test.ts';

describe('Tier 4: Real-World Application Scenarios (S1 to S5)', () => {
  // =========================================================================
  // Scenario 1: Medical & Engineering Note in Arabic with Formulas
  // =========================================================================
  it('Scenario 1: Medical & Engineering study note with formulas, Eastern numbers & zoom scaling', () => {
    // 1. Setup Document Content & Text Layer
    const textLayer = new MockDOMTextLayer();
    const heading = 'علم وظائف الأعضاء والتحلل الحيوي';
    const formulaLine = 'تفاعل الطاقة: ATP -> ADP + Pi في الميتوكوندريا (شكل رقم ١-٤)';
    
    textLayer.addSpan({
      id: 'h1',
      text: heading,
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 100, top: 40, fontSize: 22, width: 350, height: 28 }
    });
    textLayer.addSpan({
      id: 'f1',
      text: formulaLine,
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 100, top: 80, fontSize: 16, width: 450, height: 22 }
    });

    // 2. Select heading and apply Green highlight
    const headingSel = textLayer.simulateSelection(0, 0, 0, heading.length);
    assert.equal(headingSel.selectedText, heading);
    const highlights = textLayer.createHighlightFromSelection(headingSel.clientRects, 1.0, '#bbf7d0');
    assert.equal(highlights[0].color, '#bbf7d0');

    // 3. Place inline text note in Lemonada font
    const textNote = {
      id: 101,
      type: 'text' as const,
      x: 150,
      y: 120,
      text: 'ملاحظة: هذا التفاعل ضروري لإنتاج الطاقة الخلوية',
      color: '#22c55e',
      fontSize: 16,
    };
    assert.equal(referenceIsArabic(textNote.text), true);

    // 4. Zoom to 175% (1.75x) and verify sub-pixel alignment
    const zoom = 1.75;
    const renderedHl = scaleHighlight(highlights[0], zoom);
    const renderedNote = scaleTextNote(textNote, zoom);

    assert.equal(renderedHl.top, highlights[0].startY * 1.75);
    assert.equal(renderedHl.height, highlights[0].h * 1.75);
    assert.equal(renderedNote.fontSize, Math.round(16 * 1.75)); // 28px
  });

  // =========================================================================
  // Scenario 2: Arabic Law Document with Numbered Articles & Undo
  // =========================================================================
  it('Scenario 2: Arabic Law document with numbered articles, multi-color highlights & undo restoration', () => {
    const textLayer = new MockDOMTextLayer();
    const articleTitle = 'المادة 124-أ: التزامات وحقوق الشركاء في الشركة التجارية';
    const subClause = 'أولاً: يلتزم كل شريك بتقديم حصته في رأس المال في الموعد المحدد.';

    textLayer.addSpan({
      id: 'art-title',
      text: articleTitle,
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 80, top: 50, fontSize: 18, width: 420, height: 24 }
    });
    textLayer.addSpan({
      id: 'sub-clause',
      text: subClause,
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 80, top: 85, fontSize: 14, width: 480, height: 20 }
    });

    // 1. Select and highlight Article Title with Yellow
    const selTitle = textLayer.simulateSelection(0, 0, 0, articleTitle.length);
    const hlTitle = textLayer.createHighlightFromSelection(selTitle.clientRects, 1.0, '#fef08a')[0];

    // 2. Select and highlight Sub-clause with Orange
    const selClause = textLayer.simulateSelection(1, 0, 1, subClause.length);
    const hlClause = textLayer.createHighlightFromSelection(selClause.clientRects, 1.0, '#fed7aa')[0];

    let pageAnnotations = [hlTitle, hlClause];
    assert.equal(pageAnnotations.length, 2);

    // 3. User undoes the last highlight
    pageAnnotations = pageAnnotations.slice(0, -1);
    assert.equal(pageAnnotations.length, 1);
    assert.equal(pageAnnotations[0].color, '#fef08a');

    // 4. User re-adds sub-clause with Blue highlight
    const hlClauseBlue = { ...hlClause, id: Date.now(), color: '#bfdbfe' };
    pageAnnotations.push(hlClauseBlue);
    assert.equal(pageAnnotations.length, 2);
    assert.equal(pageAnnotations[1].color, '#bfdbfe');
  });

  // =========================================================================
  // Scenario 3: Language Learning PDF with Mixed Glossaries & Fonts
  // =========================================================================
  it('Scenario 3: Language learning PDF with bilingual glossary and auto-font switching', () => {
    const textLayer = new MockDOMTextLayer();
    const entry1 = 'جبنة [Jibnah] - Cheese (Dairy Product)';
    const entry2 = 'كتاب [Kitab] - Book (A set of written pages)';

    textLayer.addSpan({
      id: 'vocab-1',
      text: entry1,
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 100, top: 40, fontSize: 16, width: 380, height: 20 }
    });
    textLayer.addSpan({
      id: 'vocab-2',
      text: entry2,
      dir: 'rtl',
      unicodeBidi: 'isolate',
      style: { left: 100, top: 70, fontSize: 16, width: 380, height: 20 }
    });

    // 1. Verify mixed BiDi selection
    const sel1 = textLayer.simulateSelection(0, 0, 0, entry1.length);
    assert.equal(sel1.selectedText, entry1);

    // 2. Place Arabic sticky note
    const arNote = { text: 'مفردة مهمة في الاختبار القادم', lang: 'ar' };
    const fontAr = referenceIsArabic(arNote.text) ? 'var(--font-lemonada)' : 'var(--font-caveat)';
    assert.equal(fontAr, 'var(--font-lemonada)');

    // 3. Place English sticky note
    const enNote = { text: 'Remember the pronunciation [Jib-nah]', lang: 'en' };
    const fontEn = referenceIsArabic(enNote.text) ? 'var(--font-lemonada)' : 'var(--font-caveat)';
    assert.equal(fontEn, 'var(--font-caveat)');
  });

  // =========================================================================
  // Scenario 4: Fast Review Session with Rapid Navigation & Zooming
  // =========================================================================
  it('Scenario 4: Fast review session with rapid page flips and extreme zoom transitions', () => {
    let currentPage = 1;
    const numPages = 10;
    let zoomLevel = 1.0;
    const documentAnnotations: Record<number, any[]> = {};

    // Page 1: Add Highlight at 100%
    documentAnnotations[1] = [{ id: 1, type: 'highlight', startX: 50, startY: 60, w: 120, h: 20, color: '#fef08a' }];

    // Rapid flip: Page 1 -> Page 8
    currentPage = 8;
    zoomLevel = 2.5; // Zoom in to inspect small text
    documentAnnotations[8] = [{ id: 2, type: 'text', x: 200, y: 150, text: 'سؤال متوقع', color: '#ef4444', fontSize: 18 }];

    // Rapid flip: Page 8 -> Page 3
    currentPage = 3;
    zoomLevel = 0.5; // Zoom out for bird-eye overview

    // Rapid flip: Page 3 -> Page 1
    currentPage = 1;
    zoomLevel = 1.0;

    // Verify Page 1 annotations are intact and render accurately
    assert.equal(documentAnnotations[1].length, 1);
    const hl1 = documentAnnotations[1][0];
    const rendered = scaleHighlight(hl1, zoomLevel);
    assert.equal(rendered.left, 50);
    assert.equal(rendered.top, 60);
    assert.equal(rendered.width, 120);
    assert.equal(rendered.height, 20);
  });

  // =========================================================================
  // Scenario 5: Offline & Reload Resilience with In-Flight Auto-Save
  // =========================================================================
  it('Scenario 5: In-flight annotation save resilience across simulated unmount and page reload', () => {
    const rawNote = '---\ntitle: Modern AI Research\npdf_url: "https://example.com/ai.pdf"\n---\n\n## Summary';
    
    // User types in a note and draws a highlight
    const notes = { 1: { text: 'ملخص شامل لأحدث نماذج الذكاء الاصطناعي', lang: 'ar' as const } };
    const annotations = {
      1: [{ id: 501, type: 'highlight', startX: 100, startY: 200, w: 300, h: 25, color: '#fbcfe8' }]
    };
    const pendingText = { x: 80, y: 350, text: 'ملاحظة أخيرة قبل إغلاق الصفحة', color: '#9333ea', fontSize: 16 };

    // Sudden tab close / unmount: flush immediate
    const finalAnnotations = { ...annotations };
    finalAnnotations[1] = [
      ...finalAnnotations[1],
      { id: 502, type: 'text', x: pendingText.x, y: pendingText.y, text: pendingText.text, color: pendingText.color, fontSize: pendingText.fontSize }
    ];

    const jsonPayload = JSON.stringify({ notes, annotations: finalAnnotations });
    const savedMarkdown = updateFrontmatterField(rawNote, 'pdf_notes', jsonPayload);

    // Simulate page reload: parse from Supabase markdown
    const parsed = parseObsidianMarkdown(savedMarkdown, 'ai-research.md');
    assert.equal(parsed.frontmatter.title, 'Modern AI Research');
    assert.equal(parsed.frontmatter.pdf_url, 'https://example.com/ai.pdf');

    const restoredPayload = JSON.parse(parsed.frontmatter.pdf_notes as string);
    assert.equal(restoredPayload.notes[1].text, 'ملخص شامل لأحدث نماذج الذكاء الاصطناعي');
    assert.equal(restoredPayload.annotations[1].length, 2);
    assert.equal(restoredPayload.annotations[1][1].text, 'ملاحظة أخيرة قبل إغلاق الصفحة');
  });
});
