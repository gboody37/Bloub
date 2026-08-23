/**
 * Master Runner for Milestone 1 Challenger Test Suite
 * 
 * Runs all automated assertions for UI segregation, state transitions, and adversarial edge cases.
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const testFiles = [
  'tests/challenger/ui-segregation.test.ts',
  'tests/challenger/state-transitions.test.ts',
  'tests/challenger/adversarial-edge-cases.test.ts',
  'tests/challenger/m1-stress-challenge.test.ts',
  'tests/challenger/m1-challenger1-physics-rigor.test.ts',
  'tests/challenger/m1-challenger-2-css-boundaries.test.ts'
];

console.log('\n========================================================================');
console.log('  ⚔️ MILESTONE 1 CHALLENGER 2: EMPIRICAL VERIFICATION HARNESS');
console.log('========================================================================');

const child = spawn(
  process.execPath,
  ['--experimental-strip-types', '--test', ...testFiles],
  {
    stdio: 'inherit',
    cwd: resolve('.')
  }
);

child.on('exit', (code) => {
  if (code === 0) {
    console.log('\n========================================================================');
    console.log('  🎉 ALL CHALLENGER TESTS PASSED (100% EMPIRICAL CONFIRMATION)');
    console.log('========================================================================\n');
  } else {
    console.error(`\n❌ CHALLENGER SUITE FAILED with exit code: ${code}\n`);
  }
  process.exit(code ?? 1);
});
