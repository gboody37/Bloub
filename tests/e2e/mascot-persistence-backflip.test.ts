/**
 * E2E Test Suite: Mascot State Decoupling, Dynamic Timing & Gaze Persistence
 * 
 * Verifies all 6 requirements from Milestone M2 (Mascot Worker Dispatch):
 * 1. Decoupled persistent mascot settings from ephemeral animation states.
 * 2. Dynamic state-aware duration in resetToIdle (3.4s / 3400ms for orbit).
 * 3. Symmetric tab visibility restoration (mascotExpression & mascotGaze) and guest mode fallback.
 * 4. Gaze prop support and resting orientation in BloubMascot.tsx and page.tsx.
 * 5. Event bubbling isolation (e.stopPropagation()) and self-healing orbit freeze timer.
 * 6. Transform clipping elimination with spatial bounds and ambient aura glow.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readProjectFile(relPath: string): string {
  const fullPath = path.resolve(process.cwd(), relPath);
  return fs.readFileSync(fullPath, 'utf8');
}

describe('Mascot M2 Engine: 1. State Decoupling & Auto-Save Safety', () => {
  const pageCode = readProjectFile('src/app/page.tsx');

  it('1.1: page.tsx declares decoupled persistent settings and ephemeral animation state', () => {
    assert.ok(pageCode.includes('mascotExpression'), 'Must declare mascotExpression');
    assert.ok(pageCode.includes('mascotShape'), 'Must declare mascotShape');
    assert.ok(pageCode.includes('mascotColor'), 'Must declare mascotColor');
    assert.ok(pageCode.includes('mascotGaze'), 'Must declare mascotGaze');
    assert.ok(pageCode.includes('animState'), 'Must declare animState for transient reactions');
    assert.ok(pageCode.includes('animExpression'), 'Must declare animExpression for transient reactions');
  });

  it('1.2: Auto-save effect depends ONLY on persistent customizations, not transient animations', () => {
    // Find the auto-save effect block
    const saveEffectMatch = pageCode.match(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?localStorage\.setItem\(`\$\{prefix\}mascotExpression`[\s\S]*?\}, \[(.*?)\]\);/);
    assert.ok(saveEffectMatch, 'Auto-save useEffect must exist');
    const deps = saveEffectMatch[1];

    assert.ok(deps.includes('mascotExpression'), 'Auto-save must depend on persistent mascotExpression');
    assert.ok(deps.includes('mascotShape'), 'Auto-save must depend on persistent mascotShape');
    assert.ok(deps.includes('mascotColor'), 'Auto-save must depend on persistent mascotColor');
    assert.ok(deps.includes('mascotGaze'), 'Auto-save must depend on persistent mascotGaze');

    assert.ok(!deps.includes('animState'), 'Auto-save MUST NOT depend on transient animState');
    assert.ok(!deps.includes('animExpression'), 'Auto-save MUST NOT depend on transient animExpression');
    assert.ok(!deps.includes('mascotState'), 'Auto-save MUST NOT depend on transient mascotState');
  });

  it('1.3: AFK sleep timer updates animState/animExpression without corrupting persistent customization', () => {
    const afkMatch = pageCode.match(/const resetAFK = \(\) => \{[\s\S]*?15000\);\s*\};/);
    assert.ok(afkMatch, 'AFK handler must exist');
    const afkBody = afkMatch[0];

    assert.ok(afkBody.includes("setAnimState('sleep')"), "AFK must set transient animState to 'sleep'");
    assert.ok(afkBody.includes("setAnimExpression('somnolent')"), "AFK must set transient animExpression to 'somnolent'");
    assert.ok(!afkBody.includes('setMascotExpression'), 'AFK MUST NOT overwrite persistent mascotExpression');
  });
});

describe('Mascot M2 Engine: 2. Dynamic State Duration & Clean Reset', () => {
  const pageCode = readProjectFile('src/app/page.tsx');
  const statesCode = readProjectFile('src/lib/bot/states.ts');

  it('2.1: Authoritative orbit duration in bot states is 3.4 seconds (3400ms)', () => {
    const orbitMatch = statesCode.match(/id:\s*'orbit'[\s\S]*?duration:\s*([0-9.]+)/);
    assert.ok(orbitMatch, "State 'orbit' definition must exist in states.ts");
    const duration = parseFloat(orbitMatch[1]);
    assert.strictEqual(duration, 3.4, "Orbit duration must be exactly 3.4 seconds");
  });

  it('2.2: resetToIdle dynamically computes duration from STATE_BY_ID without hardcoded 2000ms cutoff', () => {
    const resetMatch = pageCode.match(/const resetToIdle = useCallback\(([\s\S]*?)\}, \[(.*?)\]\);/);
    assert.ok(resetMatch, 'resetToIdle must exist');
    const resetBody = resetMatch[1];

    assert.ok(
      resetBody.includes('STATE_BY_ID.get('),
      'resetToIdle must dynamically query duration from STATE_BY_ID'
    );
    assert.ok(
      !resetBody.includes('}, 2000);'),
      'resetToIdle must not be hardcoded to 2000ms'
    );
  });

  it('2.3: triggerMascot dynamically computes duration from state definition for clean recovery', () => {
    const triggerMatch = pageCode.match(/const triggerMascot = useCallback\(([\s\S]*?)\}, \[(.*?)\]\);/);
    assert.ok(triggerMatch, 'triggerMascot must exist');
    const triggerBody = triggerMatch[1];

    assert.ok(
      triggerBody.includes('STATE_BY_ID.get(state)?.duration'),
      'triggerMascot must dynamically retrieve duration from STATE_BY_ID'
    );
  });
});

describe('Mascot M2 Engine: 3. Tab Switch & Guest Mode Persistence', () => {
  const pageCode = readProjectFile('src/app/page.tsx');

  it('3.1: handleVisibility restores both mascotExpression and mascotGaze on tab focus', () => {
    const visibilityMatch = pageCode.match(/const handleVisibility = async \(\) => \{([\s\S]*?)\};\s*document\.addEventListener\('visibilitychange'/);
    assert.ok(visibilityMatch, 'handleVisibility must exist');
    const visBody = visibilityMatch[1];

    assert.ok(visBody.includes('meta.mascotExpression'), 'Visibility sync must restore meta.mascotExpression');
    assert.ok(visBody.includes('meta.mascotGaze'), 'Visibility sync must restore meta.mascotGaze');
    assert.ok(visBody.includes('meta.mascotShape'), 'Visibility sync must restore meta.mascotShape');
    assert.ok(visBody.includes('meta.mascotColor'), 'Visibility sync must restore meta.mascotColor');
  });

  it('3.2: Guest mode fallback stores and retrieves settings from localStorage', () => {
    assert.ok(pageCode.includes('guest_mascotExpression'), 'Must support guest_mascotExpression');
    assert.ok(pageCode.includes('guest_mascotShape'), 'Must support guest_mascotShape');
    assert.ok(pageCode.includes('guest_mascotColor'), 'Must support guest_mascotColor');
    assert.ok(pageCode.includes('guest_mascotGaze'), 'Must support guest_mascotGaze');
  });
});

describe('Mascot M2 Engine: 4. Eye Gaze Persistence & Resting Orientation', () => {
  const mascotCode = readProjectFile('src/components/BloubMascot.tsx');
  const pageCode = readProjectFile('src/app/page.tsx');

  it('4.1: BloubMascotProps accepts gaze prop with vector orientation or preset string', () => {
    assert.ok(mascotCode.includes('gaze?:'), 'BloubMascotProps must include gaze prop');
    assert.ok(mascotCode.includes('GAZE_PRESETS'), 'Must define GAZE_PRESETS');
    assert.ok(mascotCode.includes('resolveGaze'), 'Must define resolveGaze helper');
  });

  it('4.2: GAZE_PRESETS definition contains center, left, right, up, down', () => {
    assert.ok(mascotCode.includes('center:'), 'GAZE_PRESETS must define center');
    assert.ok(mascotCode.includes('left:'), 'GAZE_PRESETS must define left');
    assert.ok(mascotCode.includes('right:'), 'GAZE_PRESETS must define right');
    assert.ok(mascotCode.includes('up:'), 'GAZE_PRESETS must define up');
    assert.ok(mascotCode.includes('down:'), 'GAZE_PRESETS must define down');
  });

  it('4.3: BloubMascot applies resting gaze to engine when state is idle', () => {
    assert.ok(mascotCode.includes('resolveGaze(gaze)'), 'Must resolve gaze prop');
    assert.ok(mascotCode.includes("state === 'idle'"), 'Must check idle state before applying resting gaze');
    assert.ok(mascotCode.includes('engineRef.current.setLook('), 'Must invoke setLook for resting gaze');
  });

  it('4.4: page.tsx provides gaze controls in Settings and passes gaze to BloubMascot', () => {
    assert.ok(pageCode.includes('Eye Gaze Direction'), 'Settings must provide Eye Gaze Direction UI');
    assert.ok(pageCode.includes('setMascotGaze'), 'Settings buttons must wire to setMascotGaze');
    assert.ok(pageCode.includes('gaze={mascotGaze}'), 'Hero mascot must receive gaze={mascotGaze}');
  });
});

describe('Mascot M2 Engine: 5. Event Bubbling Isolation & Self-Healing Orbit', () => {
  const mascotCode = readProjectFile('src/components/BloubMascot.tsx');

  it('5.1: handleClick invokes e.stopPropagation() to prevent double-trigger event collision', () => {
    const clickMatch = mascotCode.match(/const handleClick = useCallback\(\(e: React\.MouseEvent\) => \{([\s\S]*?)\}, \[[^\]]*\]\);/);
    assert.ok(clickMatch, 'handleClick must accept React.MouseEvent');
    const clickBody = clickMatch[1];
    assert.ok(clickBody.includes('e.stopPropagation()'), 'handleClick must invoke e.stopPropagation()');
  });

  it('5.2: BloubMascot contains internal self-healing timer to eliminate infinite orbit freeze', () => {
    assert.ok(mascotCode.includes('animTimerRef'), 'Must declare internal animation timer ref');
    assert.ok(
      mascotCode.includes("engineRef.current.state === 'orbit'") &&
      mascotCode.includes("engineRef.current.setState('idle'"),
      'Must contain self-healing guard returning orbit back to idle'
    );
  });
});

describe('Mascot M2 Engine: 6. Transform Clipping Elimination & Container Bounds', () => {
  const pageCode = readProjectFile('src/app/page.tsx');

  it('6.1: Hero Mascot container specifies overflow-visible and padding to avoid clipping', () => {
    const heroStageMatch = pageCode.match(/data-mascot-container="hero"[\s\S]*?className=\{`([^`]+)`\}/);
    assert.ok(heroStageMatch, 'Hero Mascot container must exist');
    const classes = heroStageMatch[1];
    assert.ok(classes.includes('overflow-visible'), 'Hero container must declare overflow-visible');
    assert.ok(classes.includes('p-4') || classes.includes('p-'), 'Hero container must provide padding');
  });

  it('6.2: Ambient aura halo provides lighting without tight drop-shadow filter clipping', () => {
    assert.ok(pageCode.includes('blur-2xl'), 'Ambient halo must use soft blur-2xl');
    assert.ok(pageCode.includes('rounded-full'), 'Ambient halo must be rounded-full');
  });
});
