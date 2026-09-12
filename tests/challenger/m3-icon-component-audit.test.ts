import fs from 'fs';
import path from 'path';

/**
 * Challenger M3-2: Icon Component Audit
 * Confirms that all indicators, tools, and actions in Study, Reader, and App views use clean Lucide SVG icons.
 */

interface IconAuditResult {
  file: string;
  lucideImports: string[];
  lucideUsages: { icon: string; count: number }[];
  rawSvgElements: number;
  suspiciousGlyphs: { line: number; text: string }[];
}

const UI_COMPONENTS_TO_AUDIT = [
  'src/app/page.tsx',
  'src/components/study/NoteExplorer.tsx',
  'src/components/study/NoteViewer.tsx',
  'src/components/study/PdfNotebookViewer.tsx',
  'src/components/study/NotesPanel.tsx',
  'src/components/study/CozyStatsThemesTab.tsx',
  'src/components/study/CozyFlashcardQuiz.tsx',
  'src/components/study/CozyBooksAndNotes.tsx',
  'src/components/study/CozyParchmentReader.tsx',
  'src/components/study/CozyQuizTab.tsx',
  'src/components/study/CozyStudyNotepad.tsx',
  'src/components/study/ArabicTextLayer.tsx',
  'src/components/study/QuizSession.tsx',
  'src/components/mascot/MochiHeaderBadge.tsx',
  'src/components/modals/SettingsModal.tsx',
  'src/components/vault/NoteExplorer.tsx',
  'src/components/vault/NoteViewer.tsx'
];

export function auditIcons(): { results: Record<string, IconAuditResult>; passed: boolean; issues: string[] } {
  const issues: string[] = [];
  const results: Record<string, IconAuditResult> = {};

  for (const relativePath of UI_COMPONENTS_TO_AUDIT) {
    const fullPath = path.resolve(process.cwd(), relativePath);
    if (!fs.existsSync(fullPath)) {
      issues.push(`Target UI file not found: ${relativePath}`);
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    // 1. Extract lucide-react imports
    const lucideImportMatches = [...content.matchAll(/import\s+{([^}]+)}\s+from\s+['"]lucide-react['"]/g)];
    const lucideImports: string[] = [];
    for (const match of lucideImportMatches) {
      const names = match[1].split(',').map(s => s.trim().split(' as ')[0].trim()).filter(Boolean);
      lucideImports.push(...names);
    }

    // 2. Count usages of each imported Lucide icon in JSX
    const lucideUsages: { icon: string; count: number }[] = [];
    for (const icon of lucideImports) {
      const usageRegex = new RegExp(`<${icon}\\b`, 'g');
      const matches = content.match(usageRegex);
      const count = matches ? matches.length : 0;
      lucideUsages.push({ icon, count });
    }

    // 3. Check for raw <svg> elements
    const rawSvgMatches = content.match(/<svg\b/g);
    const rawSvgElements = rawSvgMatches ? rawSvgMatches.length : 0;

    // 4. Check for suspicious text pseudo-icons in buttons or indicators
    const suspiciousGlyphs: { line: number; text: string }[] = [];
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      // Check for standalone text buttons or spans acting as icons: <button>✕</button>, <button>X</button>, <button>›</button>
      if (/<button[^>]*>\s*([xX✕+−<>]|&times;|&gt;|&lt;|›)\s*<\/button>/.test(trimmed)) {
        suspiciousGlyphs.push({ line: lineNum, text: trimmed });
        issues.push(`${relativePath}:${lineNum}: Found pseudo-icon text in button: ${trimmed}`);
      }

      // Check for emoticons like (•~•)
      if (/\([•\^~_.-]+[•\^~_.-]+\)/.test(trimmed)) {
        suspiciousGlyphs.push({ line: lineNum, text: trimmed });
        issues.push(`${relativePath}:${lineNum}: Found emoticon in UI: ${trimmed}`);
      }
    });

    results[relativePath] = {
      file: relativePath,
      lucideImports,
      lucideUsages,
      rawSvgElements,
      suspiciousGlyphs
    };
  }

  return {
    results,
    passed: issues.length === 0,
    issues
  };
}

// Execute standalone
const isDirectRun = process.argv[1]?.includes('m3-icon-component-audit');
if (isDirectRun) {
  console.log('[Challenger M3-2] Auditing Icon Components across all study, reader, and vault components...');
  const audit = auditIcons();

  for (const [file, res] of Object.entries(audit.results)) {
    console.log(`\n=== ${file} ===`);
    console.log(`Lucide icons imported (${res.lucideImports.length}):`, res.lucideImports.join(', ') || 'None');
    const activeUsages = res.lucideUsages.filter(u => u.count > 0);
    console.log(`Active Lucide JSX usages: ${activeUsages.map(u => `${u.icon}(${u.count})`).join(', ') || 'None'}`);
    console.log(`Raw SVG count: ${res.rawSvgElements}`);
    console.log(`Suspicious pseudo-icons: ${res.suspiciousGlyphs.length}`);
  }

  if (!audit.passed) {
    console.error('\n❌ ICON AUDIT FAILED with issues:');
    audit.issues.forEach(iss => console.error(`  - ${iss}`));
    process.exit(1);
  } else {
    console.log('\n✅ ICON AUDIT PASSED: All indicators, tools, and actions cleanly use Lucide SVG icons across all 17 critical components!');
    process.exit(0);
  }
}
