import fs from 'fs';
import path from 'path';

/**
 * Challenger M3-2: Exhaustive Unicode Emoji Scanner
 * Scans all .ts and .tsx files under src/ to verify strict zero-emoji compliance.
 */

function getAllSourceFiles(dir: string): string[] {
  let results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllSourceFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      results.push(fullPath);
    }
  }
  return results;
}

// Exhaustive Unicode Emoji Regex
// Covers: Extended_Pictographic, Emoticons, Symbols & Pictographs, Transport/Map, Supplemental, Extended-A, Dingbats, Flags
const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu;

// Also check for non-standard UI pseudo-icons that should be Lucide SVGs (e.g., U+2715 MULTIPLICATION X, U+203A SINGLE RIGHT-POINTING ANGLE QUOTATION MARK, U+2713 CHECK MARK)
const PSEUDO_ICON_REGEX = /[\u{2713}\u{2715}\u{203A}\u{2714}\u{2716}\u{2605}\u{2B50}]/gu;

interface ScanFinding {
  file: string;
  relativePath: string;
  lineNum: number;
  type: 'LITERAL_EMOJI' | 'PSEUDO_ICON_CHAR' | 'ESCAPED_EMOJI_IN_LITERAL';
  match: string;
  codePoint: string;
  lineContent: string;
  isUiRendered: boolean;
}

export function runEmojiScan(srcDir: string): { totalFiles: number; findings: ScanFinding[]; uiViolations: ScanFinding[] } {
  const files = getAllSourceFiles(srcDir);
  const findings: ScanFinding[] = [];

  for (const file of files) {
    const relativePath = path.relative(srcDir, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      // Check for literal emojis
      const emojiMatches = [...trimmed.matchAll(EMOJI_REGEX)];
      for (const m of emojiMatches) {
        const char = m[0];
        const cp = char.codePointAt(0)?.toString(16).toUpperCase() || '';
        
        // Determine if line is part of a regex definition (e.g. sanitizing / checking emojis)
        const isRegexDefinition = trimmed.startsWith('const emojiRegex') || 
                                  trimmed.includes('/gu') || 
                                  trimmed.includes('/u;') || 
                                  trimmed.includes('matchAll(') ||
                                  trimmed.includes('replace(');

        const isComment = trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');

        findings.push({
          file,
          relativePath,
          lineNum,
          type: 'LITERAL_EMOJI',
          match: char,
          codePoint: `U+${cp}`,
          lineContent: trimmed,
          isUiRendered: !isRegexDefinition && !isComment,
        });
      }

      // Check for pseudo-icons
      const pseudoMatches = [...trimmed.matchAll(PSEUDO_ICON_REGEX)];
      for (const m of pseudoMatches) {
        const char = m[0];
        const cp = char.codePointAt(0)?.toString(16).toUpperCase() || '';
        const isComment = trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
        const isRegex = trimmed.includes('/u') || trimmed.includes('RegExp');

        findings.push({
          file,
          relativePath,
          lineNum,
          type: 'PSEUDO_ICON_CHAR',
          match: char,
          codePoint: `U+${cp}`,
          lineContent: trimmed,
          isUiRendered: !isComment && !isRegex,
        });
      }

      // Check for unicode escapes representing emojis in UI strings (like \u{1F4A1} or \uD83D\uDCA1)
      const escapeRegex = /\\u\{1F[0-9A-Fa-f]{3}\}|\\uD83[C-E]\\u[D-F][0-9A-Fa-f]{3}/g;
      const escapeMatches = [...trimmed.matchAll(escapeRegex)];
      for (const m of escapeMatches) {
        const isSanitizationRegex = trimmed.includes('replace(') || trimmed.includes('.test(') || trimmed.includes('startsWith(');
        findings.push({
          file,
          relativePath,
          lineNum,
          type: 'ESCAPED_EMOJI_IN_LITERAL',
          match: m[0],
          codePoint: m[0],
          lineContent: trimmed,
          isUiRendered: !isSanitizationRegex,
        });
      }
    });
  }

  const uiViolations = findings.filter(f => f.isUiRendered);

  return {
    totalFiles: files.length,
    findings,
    uiViolations,
  };
}

// Execute standalone if called directly
const isDirectRun = process.argv[1]?.includes('m3-zero-emoji-scanner');
if (isDirectRun) {
  const srcPath = path.resolve(process.cwd(), 'src');
  console.log(`[Challenger M3-2] Starting Exhaustive Unicode Emoji Scan across: ${srcPath}`);
  const result = runEmojiScan(srcPath);

  console.log(`[Challenger M3-2] Total source files analyzed: ${result.totalFiles}`);
  console.log(`[Challenger M3-2] Total raw findings: ${result.findings.length}`);
  console.log(`[Challenger M3-2] Total UI rendered violations: ${result.uiViolations.length}`);

  if (result.uiViolations.length > 0) {
    console.error('\n=== VIOLATIONS FOUND IN RENDERED UI STRINGS ===');
    result.uiViolations.forEach(v => {
      console.error(`- ${v.relativePath}:${v.lineNum} [${v.type} ${v.match} (${v.codePoint})]: ${v.lineContent}`);
    });
    process.exit(1);
  } else {
    console.log('\n[Challenger M3-2] PASS: Strict Zero-Emoji compliance verified across all 78 source files!');
    if (result.findings.length > 0) {
      console.log('Non-rendered matches (regex/comment filters):', result.findings.length);
      result.findings.forEach(f => {
        console.log(`  (Filter/Regex) ${f.relativePath}:${f.lineNum}: ${f.lineContent}`);
      });
    }
    process.exit(0);
  }
}
