/**
 * Master Verification Harness: Runs all Acceptance Criteria verification scripts.
 * 
 * Executable via:
 *   node --experimental-strip-types tests/verification/run-all-verifications.ts
 */

import { verifyAC1 } from './verify-ac1-list-types.ts';
import { verifyAC2 } from './verify-ac2-obsidian-sync.ts';
import { verifyAC3 } from './verify-ac3-ai-quizzing.ts';
import { verifyPdfAnnotationsPersistence } from './verify-pdf-annotations-persistence.ts';
import { verifyPdfLayoutIntegrity } from './verify-pdf-layout-integrity.ts';
import { verifyAdversarial } from './verify-adversarial-tests.ts';
import { verifyR2AdversarialSuite } from './verify-r2-adversarial-suite.ts';
import { verifyR3AdversarialSuite } from './verify-r3-adversarial-suite.ts';
import { verifyArabicColumnsAndTransitivity } from './verify-arabic-columns-and-transitivity.ts';
import { verifyZeroDataLoss } from './verify-zero-data-loss.ts';
import { verifyNotionBlockEditor } from './verify-notion-block-editor.ts';
import { runZeroDataLossStressSuite } from '../stress/zero-data-loss-stress.ts';

interface VerificationResult {
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

async function runAllVerifications(): Promise<void> {
  const banner = `
========================================================================
  🚀 VIBE TODOS AI & STUDY APPLICATION — MASTER VERIFICATION HARNESS  
========================================================================
Runtime: Node.js ${process.version} (Native Types Stripping)
Date: ${new Date().toISOString()}
`;
  console.log(banner);

  const suiteStartTime = Date.now();
  const results: VerificationResult[] = [];

  const runStep = async (id: string, name: string, fn: () => Promise<boolean>) => {
    const start = Date.now();
    try {
      await fn();
      results.push({
        id,
        name,
        passed: true,
        durationMs: Date.now() - start
      });
    } catch (err: any) {
      results.push({
        id,
        name,
        passed: false,
        durationMs: Date.now() - start,
        error: err.stack || err.message
      });
    }
  };

  await runStep('AC-1', 'List Types (ToDo vs Study) & Strict UI Segregation', verifyAC1);
  await runStep('AC-2', 'Local Obsidian Vault Note Ingestion & Markdown Parsing', verifyAC2);
  await runStep('AC-3', 'Settings LLM Key Storage & Dynamic AI Quiz Generation', verifyAC3);
  await runStep('R1-PDF-PERSISTENCE', 'PDF Note Annotations Parsing & Supabase Persistence', verifyPdfAnnotationsPersistence);
  await runStep('R2-PDF-LAYOUT', 'PDF Layout Full-Height Flex Constraints & Mascot Suppression', verifyPdfLayoutIntegrity);
  await runStep('ADV-STRESS-PARSER', 'Adversarial Parser & Serializer Stress Scenarios', verifyAdversarial);
  await runStep('R2-ADVERSARIAL-SUITE', 'Round 2 Lifecycle, Empty Autosave & Undo Invariants', verifyR2AdversarialSuite);
  await runStep('R3-ADVERSARIAL-SUITE', 'Round 3 In-Flight Race, Pending Text & Pointer Matrix', verifyR3AdversarialSuite);
  await runStep('ARABIC-COLUMNS-TRANSITIVITY', 'Arabic PDF Column Breaking & Transitive DOM Sorting', verifyArabicColumnsAndTransitivity);
  await runStep('ZERO-DATA-LOSS-M2', 'Offline WAL Engine, Replay & Atomic Beacon Flush Persistence', verifyZeroDataLoss);
  await runStep('R3-NOTION-BLOCK-EDITOR', 'Notion-Style Slash-Command Block Editor & Lossless AST', verifyNotionBlockEditor);
  await runStep('ZERO-DATA-LOSS-STRESS', 'High-Frequency Typing, Media Ingestion & Flapping Replay Stress Suite', runZeroDataLossStressSuite);

  const totalDuration = ((Date.now() - suiteStartTime) / 1000).toFixed(2);
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log('\n========================================================================');
  console.log('  📊 FINAL ACCEPTANCE VERIFICATION SUMMARY REPORT');
  console.log('========================================================================');

  for (const res of results) {
    const statusIcon = res.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${statusIcon} [${res.id}] ${res.name} (${res.durationMs}ms)`);
    if (!res.passed && res.error) {
      console.log(`         Error: ${res.error}`);
    }
  }

  console.log('------------------------------------------------------------------------');
  console.log(`  Total Criteria Tested: ${results.length}`);
  console.log(`  Passed: ${passedCount} / ${results.length}`);
  console.log(`  Failed: ${failedCount} / ${results.length}`);
  console.log(`  Duration: ${totalDuration}s`);
  console.log('========================================================================\n');

  if (failedCount > 0) {
    console.error(`❌ VERIFICATION SUITE FAILED: ${failedCount} criteria did not pass.`);
    process.exit(1);
  } else {
    console.log('🎉 ALL ACCEPTANCE CRITERIA 100% VERIFIED AND PASSING!');
    process.exit(0);
  }
}

runAllVerifications();
