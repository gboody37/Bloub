/**
 * Acceptance Criteria Verification Script: Arabic PDF Column Breaking & Transitive DOM Sorting
 * 
 * Verifies:
 * - AC1: Verification of Column Breaking (items with identical top but horizontal gap break into separate lines)
 * - AC2: Verification of DOM Order Transitivity (2-column layout with header sorted in logical RTL reading order without interleaving)
 */

import assert from 'node:assert/strict';
import {
  processPageTextContent,
  sortLinesInReadingOrder,
  type ProcessedTextLine,
} from '../../src/lib/pdf/arabic-bidi.ts';

export async function verifyArabicColumnsAndTransitivity(): Promise<boolean> {
  console.log('\n======================================================================');
  console.log('▶ RUNNING ARABIC PDF COLUMN BREAKING & DOM TRANSITIVITY VERIFICATION');
  console.log('======================================================================');

  // -------------------------------------------------------------------------
  // 1. Acceptance Criteria 1: Verification of Column Breaking
  // -------------------------------------------------------------------------
  console.log('\n[1/3] Testing AC1: Strict Horizontal Column Breaking...');

  const ac1MockTextContent = {
    items: [
      {
        str: 'العمود الأيمن (Right Column)',
        transform: [14, 0, 0, 14, 400, 700],
        width: 150,
        height: 14,
      },
      {
        str: 'العمود الأيسر (Left Column)',
        transform: [14, 0, 0, 14, 50, 700],
        width: 150,
        height: 14,
      },
    ],
  };

  const ac1Viewport = {
    scale: 1.0,
    height: 800,
    width: 600,
  };

  const ac1Lines = processPageTextContent(ac1MockTextContent, ac1Viewport);

  // Assertion: Exactly 2 distinct ProcessedTextLines must be produced
  assert.equal(
    ac1Lines.length,
    2,
    `AC1 FAILED: Expected 2 distinct ProcessedTextLines across column gap, got ${ac1Lines.length}`
  );

  const rightColLine = ac1Lines.find(l => l.left >= 300);
  const leftColLine = ac1Lines.find(l => l.left < 300);

  assert.ok(rightColLine, 'AC1 FAILED: Right column ProcessedTextLine not found');
  assert.ok(leftColLine, 'AC1 FAILED: Left column ProcessedTextLine not found');
  assert.equal(rightColLine.left, 400, 'AC1 FAILED: Right column line left coordinate mismatch');
  assert.equal(leftColLine.left, 50, 'AC1 FAILED: Left column line left coordinate mismatch');
  assert.equal(rightColLine.width, 150, 'AC1 FAILED: Right column line width mismatch');
  assert.equal(leftColLine.width, 150, 'AC1 FAILED: Left column line width mismatch');

  console.log('  ✔ AC1 Verified: Items with identical top (700) and gap (50 to 400) form 2 distinct ProcessedTextLines.');

  // -------------------------------------------------------------------------
  // 2. Acceptance Criteria 2: Verification of DOM Order Transitivity
  // -------------------------------------------------------------------------
  console.log('\n[2/3] Testing AC2: Transitive DOM Reading Order Sorting in 2-Column RTL Layout...');

  const ac2MockTextContent = {
    items: [
      // Full-width Header spanning page
      {
        str: 'المملكة الأردنية الهاشمية - وزارة التعليم العالي والبحث العلمي',
        transform: [16, 0, 0, 16, 50, 750],
        width: 600,
        height: 16,
      },
      // Right Column (Column 1 in RTL reading order)
      {
        str: 'العمود الأول - الفقرة الأولى: مقدمة في الذكاء الاصطناعي',
        transform: [12, 0, 0, 12, 400, 680],
        width: 250,
        height: 12,
      },
      {
        str: 'العمود الأول - الفقرة الثانية: هياكل البيانات والخوارزميات',
        transform: [12, 0, 0, 12, 400, 640],
        width: 250,
        height: 12,
      },
      {
        str: 'العمود الأول - الفقرة الثالثة: استنتاج النماذج الرياضية',
        transform: [12, 0, 0, 12, 400, 600],
        width: 250,
        height: 12,
      },
      // Left Column (Column 2 in RTL reading order)
      {
        str: 'العمود الثاني - الفقرة الأولى: التطبيقات العملية في السوق',
        transform: [12, 0, 0, 12, 50, 680],
        width: 250,
        height: 12,
      },
      {
        str: 'العمود الثاني - الفقرة الثانية: دراسة الحالات الهندسية',
        transform: [12, 0, 0, 12, 50, 640],
        width: 250,
        height: 12,
      },
      {
        str: 'العمود الثاني - الفقرة الثالثة: الخاتمة والتوصيات المستقبلية',
        transform: [12, 0, 0, 12, 50, 600],
        width: 250,
        height: 12,
      },
    ],
  };

  const ac2Viewport = {
    scale: 1.0,
    height: 800,
    width: 700,
  };

  const ac2Lines = processPageTextContent(ac2MockTextContent, ac2Viewport);

  assert.equal(
    ac2Lines.length,
    7,
    `AC2 FAILED: Expected 7 lines (1 header + 3 right col + 3 left col), got ${ac2Lines.length}`
  );

  // Line 0: Full-width Header
  assert.ok(
    ac2Lines[0].fullText.includes('المملكة الأردنية الهاشمية'),
    `AC2 FAILED: Line 0 must be full-width Header, got "${ac2Lines[0].fullText}"`
  );
  assert.equal(ac2Lines[0].left, 50);
  assert.equal(ac2Lines[0].width, 600);

  // Lines 1..3: Right column lines (top-to-bottom)
  assert.ok(
    ac2Lines[1].fullText.includes('العمود الأول') && ac2Lines[1].fullText.includes('الأولى'),
    `AC2 FAILED: Line 1 must be Right Column Line 1, got "${ac2Lines[1].fullText}"`
  );
  assert.ok(
    ac2Lines[2].fullText.includes('العمود الأول') && ac2Lines[2].fullText.includes('الثانية'),
    `AC2 FAILED: Line 2 must be Right Column Line 2, got "${ac2Lines[2].fullText}"`
  );
  assert.ok(
    ac2Lines[3].fullText.includes('العمود الأول') && ac2Lines[3].fullText.includes('الثالثة'),
    `AC2 FAILED: Line 3 must be Right Column Line 3, got "${ac2Lines[3].fullText}"`
  );

  // Lines 4..6: Left column lines (top-to-bottom)
  assert.ok(
    ac2Lines[4].fullText.includes('العمود الثاني') && ac2Lines[4].fullText.includes('الأولى'),
    `AC2 FAILED: Line 4 must be Left Column Line 1, got "${ac2Lines[4].fullText}"`
  );
  assert.ok(
    ac2Lines[5].fullText.includes('العمود الثاني') && ac2Lines[5].fullText.includes('الثانية'),
    `AC2 FAILED: Line 5 must be Left Column Line 2, got "${ac2Lines[5].fullText}"`
  );
  assert.ok(
    ac2Lines[6].fullText.includes('العمود الثاني') && ac2Lines[6].fullText.includes('الثالثة'),
    `AC2 FAILED: Line 6 must be Left Column Line 3, got "${ac2Lines[6].fullText}"`
  );

  // Assert NO horizontal interleaving occurred
  for (let i = 1; i <= 3; i++) {
    assert.ok(
      ac2Lines[i].left >= 350,
      `AC2 FAILED: Line ${i} is in left position (${ac2Lines[i].left}) before right column completed`
    );
  }
  for (let i = 4; i <= 6; i++) {
    assert.ok(
      ac2Lines[i].left < 350,
      `AC2 FAILED: Line ${i} is in right position (${ac2Lines[i].left}) after right column completed`
    );
  }

  console.log('  ✔ AC2 Verified: 2-column RTL layout sorted transitively: Header -> Right Col (1,2,3) -> Left Col (1,2,3) with zero horizontal interleaving.');

  // -------------------------------------------------------------------------
  // 3. Multi-Column Complex Edge Cases (3 Columns + Header + Footer)
  // -------------------------------------------------------------------------
  console.log('\n[3/3] Testing Complex Multi-Column & Footer Edge Cases...');

  const complexLines: ProcessedTextLine[] = [
    { items: [], fullText: 'العنوان العام', dir: 'rtl', top: 30, left: 50, width: 700, height: 20 },
    // Shuffled column lines
    { items: [], fullText: 'عمود يسار 2', dir: 'rtl', top: 120, left: 50, width: 200, height: 16 },
    { items: [], fullText: 'عمود يمين 1', dir: 'rtl', top: 80, left: 550, width: 200, height: 16 },
    { items: [], fullText: 'عمود وسط 2', dir: 'rtl', top: 120, left: 300, width: 200, height: 16 },
    { items: [], fullText: 'عمود يسار 1', dir: 'rtl', top: 80, left: 50, width: 200, height: 16 },
    { items: [], fullText: 'عمود يمين 2', dir: 'rtl', top: 120, left: 550, width: 200, height: 16 },
    { items: [], fullText: 'عمود وسط 1', dir: 'rtl', top: 80, left: 300, width: 200, height: 16 },
    // Footer
    { items: [], fullText: 'تذييل الوثيقة الرسمية', dir: 'rtl', top: 220, left: 50, width: 700, height: 20 },
  ];

  const sortedComplex = sortLinesInReadingOrder(complexLines, true);
  const complexOrder = sortedComplex.map(l => l.fullText);

  assert.deepEqual(complexOrder, [
    'العنوان العام',
    'عمود يمين 1',
    'عمود يمين 2',
    'عمود وسط 1',
    'عمود وسط 2',
    'عمود يسار 1',
    'عمود يسار 2',
    'تذييل الوثيقة الرسمية',
  ]);

  console.log('  ✔ Complex 3-column + Header + Footer layout verified with 100% order fidelity.');

  // -------------------------------------------------------------------------
  // 4. Adversarial Edge Cases (Centered Titles, Narrow Gutters, Mid-Page Breaks)
  // -------------------------------------------------------------------------
  console.log('\n[4/4] Testing Adversarial Layouts (Short Centered Titles, 20px Gutters, Mid-Page Headers)...');

  // (a) Short centered title above 2 columns
  const centeredTitleLines: ProcessedTextLine[] = [
    { items: [], fullText: 'عنوان الفصل الأول', dir: 'rtl', top: 50, left: 220, width: 160, height: 20 },
    { items: [], fullText: 'العمود الأيمن سطر 1', dir: 'rtl', top: 100, left: 350, width: 200, height: 14 },
    { items: [], fullText: 'العمود الأيمن سطر 2', dir: 'rtl', top: 150, left: 350, width: 200, height: 14 },
    { items: [], fullText: 'العمود الأيسر سطر 1', dir: 'rtl', top: 100, left: 50, width: 200, height: 14 },
    { items: [], fullText: 'العمود الأيسر سطر 2', dir: 'rtl', top: 150, left: 50, width: 200, height: 14 }
  ];
  const sortedCentered = sortLinesInReadingOrder(centeredTitleLines, true);
  assert.deepEqual(sortedCentered.map(l => l.fullText), [
    'عنوان الفصل الأول',
    'العمود الأيمن سطر 1',
    'العمود الأيمن سطر 2',
    'العمود الأيسر سطر 1',
    'العمود الأيسر سطر 2'
  ]);

  // (b) Narrow 20px gutter column break and sort
  const narrowText = {
    items: [
      { str: 'العمود الأيمن', width: 100, height: 12, transform: [12, 0, 0, 12, 220, 700] },
      { str: 'العمود الأيسر', width: 100, height: 12, transform: [12, 0, 0, 12, 100, 700] }
    ]
  };
  const processedNarrow = processPageTextContent(narrowText, { scale: 1.0, height: 800 });
  assert.equal(processedNarrow.length, 2, 'Must break 20px narrow gutter into 2 lines');

  // (c) Mid-page section header between 2-column blocks
  const midHeaderLines: ProcessedTextLine[] = [
    { items: [], fullText: 'أعلى يمين 1', dir: 'rtl', top: 100, left: 300, width: 150, height: 14 },
    { items: [], fullText: 'أعلى يمين 2', dir: 'rtl', top: 150, left: 300, width: 150, height: 14 },
    { items: [], fullText: 'أعلى يسار 1', dir: 'rtl', top: 100, left: 50, width: 150, height: 14 },
    { items: [], fullText: 'أعلى يسار 2', dir: 'rtl', top: 150, left: 50, width: 150, height: 14 },
    { items: [], fullText: '--- عنوان وسط الصفحة ---', dir: 'rtl', top: 250, left: 180, width: 140, height: 16 },
    { items: [], fullText: 'أسفل يمين 1', dir: 'rtl', top: 300, left: 300, width: 150, height: 14 },
    { items: [], fullText: 'أسفل يمين 2', dir: 'rtl', top: 350, left: 300, width: 150, height: 14 },
    { items: [], fullText: 'أسفل يسار 1', dir: 'rtl', top: 300, left: 50, width: 150, height: 14 },
    { items: [], fullText: 'أسفل يسار 2', dir: 'rtl', top: 350, left: 50, width: 150, height: 14 }
  ];
  const sortedMid = sortLinesInReadingOrder(midHeaderLines, true);
  assert.deepEqual(sortedMid.map(l => l.fullText), [
    'أعلى يمين 1',
    'أعلى يمين 2',
    'أعلى يسار 1',
    'أعلى يسار 2',
    '--- عنوان وسط الصفحة ---',
    'أسفل يمين 1',
    'أسفل يمين 2',
    'أسفل يسار 1',
    'أسفل يسار 2'
  ]);

  console.log('  ✔ Adversarial layouts (centered titles, 20px gutters, mid-page headers) verified with 100% fidelity.');

  // -------------------------------------------------------------------------
  // 5. Deep Adversarial Verifications (Staggered Baselines, Asymmetrical Widths, Running Headers/Footers)
  // -------------------------------------------------------------------------
  console.log('\n[5/5] Testing Deep Adversarial Scenarios (Staggered Baselines, 65/35% Asymmetrical Columns, Running Headers/Footers)...');

  // (a) Staggered baselines with centered title
  const staggeredLines: ProcessedTextLine[] = [
    { items: [], fullText: 'عنوان الفصل الأول', dir: 'rtl', top: 50, left: 220, width: 160, height: 20 },
    { items: [], fullText: 'يمين 1', dir: 'rtl', top: 100, left: 350, width: 200, height: 14 },
    { items: [], fullText: 'يسار 1', dir: 'rtl', top: 115, left: 50, width: 200, height: 14 },
    { items: [], fullText: 'يمين 2', dir: 'rtl', top: 130, left: 350, width: 200, height: 14 },
    { items: [], fullText: 'يسار 2', dir: 'rtl', top: 145, left: 50, width: 200, height: 14 },
  ];
  const sortedStaggered = sortLinesInReadingOrder(staggeredLines, true);
  assert.deepEqual(sortedStaggered.map(l => l.fullText), [
    'عنوان الفصل الأول',
    'يمين 1',
    'يمين 2',
    'يسار 1',
    'يسار 2'
  ]);

  // (b) Asymmetrical 65%/35% 2-column layout
  const asymmLines: ProcessedTextLine[] = [
    { items: [], fullText: 'العمود الرئيسي 1', dir: 'rtl', top: 100, left: 250, width: 350, height: 14 },
    { items: [], fullText: 'شريط جانبي 1', dir: 'rtl', top: 100, left: 50, width: 150, height: 14 },
    { items: [], fullText: 'العمود الرئيسي 2', dir: 'rtl', top: 150, left: 250, width: 350, height: 14 },
    { items: [], fullText: 'شريط جانبي 2', dir: 'rtl', top: 150, left: 50, width: 150, height: 14 },
    { items: [], fullText: 'العمود الرئيسي 3', dir: 'rtl', top: 200, left: 250, width: 350, height: 14 },
    { items: [], fullText: 'شريط جانبي 3', dir: 'rtl', top: 200, left: 50, width: 150, height: 14 },
  ];
  const sortedAsymm = sortLinesInReadingOrder(asymmLines, true);
  assert.deepEqual(sortedAsymm.map(l => l.fullText), [
    'العمود الرئيسي 1',
    'العمود الرئيسي 2',
    'العمود الرئيسي 3',
    'شريط جانبي 1',
    'شريط جانبي 2',
    'شريط جانبي 3'
  ]);

  // (c) Running Header + 2 Cols + Running Footer
  const runningHeaderFooterLines: ProcessedTextLine[] = [
    { items: [], fullText: 'كتاب الرياضيات', dir: 'rtl', top: 40, left: 450, width: 100, height: 12 },
    { items: [], fullText: 'صفحة 15', dir: 'rtl', top: 40, left: 50, width: 50, height: 12 },
    { items: [], fullText: 'يمين 1', dir: 'rtl', top: 100, left: 350, width: 200, height: 14 },
    { items: [], fullText: 'يمين 2', dir: 'rtl', top: 150, left: 350, width: 200, height: 14 },
    { items: [], fullText: 'يسار 1', dir: 'rtl', top: 100, left: 50, width: 200, height: 14 },
    { items: [], fullText: 'يسار 2', dir: 'rtl', top: 150, left: 50, width: 200, height: 14 },
    { items: [], fullText: 'حقوق النشر محفوظة', dir: 'rtl', top: 500, left: 400, width: 150, height: 12 },
    { items: [], fullText: 'صفحة 1', dir: 'rtl', top: 500, left: 50, width: 50, height: 12 },
  ];
  const sortedRHF = sortLinesInReadingOrder(runningHeaderFooterLines, true);
  assert.deepEqual(sortedRHF.map(l => l.fullText), [
    'كتاب الرياضيات',
    'صفحة 15',
    'يمين 1',
    'يمين 2',
    'يسار 1',
    'يسار 2',
    'حقوق النشر محفوظة',
    'صفحة 1'
  ]);

  console.log('  ✔ Deep adversarial scenarios (staggered baselines, asymmetrical widths, running headers/footers) verified with 100% fidelity.');

  // -------------------------------------------------------------------------
  // 6. Mathematical Transitivity & Gutter-Isolated Headings
  // -------------------------------------------------------------------------
  console.log('\n[6/6] Testing Mathematical Transitivity & Gutter-Isolated Titles...');

  // (a) Permutation Invariance
  const transLines: ProcessedTextLine[] = [
    { items: [], fullText: 'Line A', dir: 'rtl', top: 100, left: 300, width: 100, height: 14 },
    { items: [], fullText: 'Line B', dir: 'rtl', top: 102.5, left: 200, width: 100, height: 14 },
    { items: [], fullText: 'Line C', dir: 'rtl', top: 105, left: 100, width: 100, height: 14 },
  ];
  const expTrans = sortLinesInReadingOrder([transLines[0], transLines[1], transLines[2]], true).map(l => l.fullText);
  assert.deepEqual(sortLinesInReadingOrder([transLines[2], transLines[1], transLines[0]], true).map(l => l.fullText), expTrans);
  assert.deepEqual(sortLinesInReadingOrder([transLines[1], transLines[0], transLines[2]], true).map(l => l.fullText), expTrans);

  // (b) Gutter-isolated centered title
  const gutterTitleLines: ProcessedTextLine[] = [
    { items: [], fullText: 'العنوان في المنتصف', dir: 'rtl', top: 50, left: 220, width: 160, height: 20 },
    { items: [], fullText: 'يمين 1', dir: 'rtl', top: 100, left: 400, width: 150, height: 14 },
    { items: [], fullText: 'يمين 2', dir: 'rtl', top: 150, left: 400, width: 150, height: 14 },
    { items: [], fullText: 'يسار 1', dir: 'rtl', top: 100, left: 50, width: 150, height: 14 },
    { items: [], fullText: 'يسار 2', dir: 'rtl', top: 150, left: 50, width: 150, height: 14 }
  ];
  const sortedGutter = sortLinesInReadingOrder(gutterTitleLines, true);
  assert.deepEqual(sortedGutter.map(l => l.fullText), [
    'العنوان في المنتصف',
    'يمين 1',
    'يمين 2',
    'يسار 1',
    'يسار 2'
  ]);

  // (c) Narrow mid-page section title in gutter
  const gutterMidLines: ProcessedTextLine[] = [
    { items: [], fullText: 'أعلى يمين 1', dir: 'rtl', top: 100, left: 300, width: 150, height: 14 },
    { items: [], fullText: 'أعلى يمين 2', dir: 'rtl', top: 130, left: 300, width: 150, height: 14 },
    { items: [], fullText: 'أعلى يسار 1', dir: 'rtl', top: 100, left: 50, width: 150, height: 14 },
    { items: [], fullText: 'أعلى يسار 2', dir: 'rtl', top: 130, left: 50, width: 150, height: 14 },
    { items: [], fullText: 'عنوان ضيق', dir: 'rtl', top: 170, left: 210, width: 80, height: 14 },
    { items: [], fullText: 'أسفل يمين 1', dir: 'rtl', top: 210, left: 300, width: 150, height: 14 },
    { items: [], fullText: 'أسفل يمين 2', dir: 'rtl', top: 240, left: 300, width: 150, height: 14 },
    { items: [], fullText: 'أسفل يسار 1', dir: 'rtl', top: 210, left: 50, width: 150, height: 14 },
    { items: [], fullText: 'أسفل يسار 2', dir: 'rtl', top: 240, left: 50, width: 150, height: 14 }
  ];
  const sortedGutterMid = sortLinesInReadingOrder(gutterMidLines, true);
  assert.deepEqual(sortedGutterMid.map(l => l.fullText), [
    'أعلى يمين 1',
    'أعلى يمين 2',
    'أعلى يسار 1',
    'أعلى يسار 2',
    'عنوان ضيق',
    'أسفل يمين 1',
    'أسفل يمين 2',
    'أسفل يسار 1',
    'أسفل يسار 2'
  ]);

  console.log('  ✔ Mathematical transitivity and gutter-isolated headings verified with 100% fidelity.');

  console.log('\n✔ ARABIC COLUMNS & DOM TRANSITIVITY VERIFICATION PASSED: All Acceptance Criteria satisfied!\n');
  return true;
}

// Direct execution support
if (process.argv[1]?.endsWith('verify-arabic-columns-and-transitivity.ts')) {
  verifyArabicColumnsAndTransitivity()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

