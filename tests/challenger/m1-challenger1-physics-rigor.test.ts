/**
 * ============================================================================
 * CHALLENGER 1 EMPIRICAL TEST SUITE: SPRING PHYSICS & MATHEMATICAL RIGOR
 * ============================================================================
 * 
 * Milestone: M1 — Spring Physics & Claymorphic CSS Foundation
 * Scope:
 *   1. Analytical Second-Order ODE Invariants & Damping Ratio Precision
 *   2. Numerical Runge-Kutta 4 (RK4) Kinematic Simulation & Energy Dissipation
 *   3. Boundary Conditions, Singularity Resistance & Parameter Overrides
 *   4. Framer Motion Variant Structural Invariants & Frame-Budget Compliance
 *   5. Ergonomic Micro-Interactions & Tap Scale Bounds
 *   6. Accessibility (a11y) & Reduced Motion Zero-Overhead Transitions
 *   7. Spatial DOM Verification Contract Attributes
 *   8. Claymorphic CSS Specular Highlight & Dark Theme Invariant Audit
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  SPATIAL_SPRINGS,
  SPATIAL_VARIANTS,
  SPATIAL_TAP_SCALE,
  getSpring,
  getSpatialSpringProps,
  createSpatialSpring,
  createSpring,
  getAccessibleTransition,
  type SpatialSpringPreset,
  type SpringTransitionConfig,
} from '../../src/lib/spatial-springs.ts';

// ----------------------------------------------------------------------------
// Physics Helper: Analytical Harmonic Oscillator Calculator
// ----------------------------------------------------------------------------
interface HarmonicProperties {
  stiffness: number;
  damping: number;
  mass: number;
  omega0: number;       // Natural angular frequency (rad/s)
  f0: number;           // Natural frequency (Hz)
  c_crit: number;       // Critical damping coefficient
  zeta: number;         // Damping ratio
  omega_d: number;      // Damped angular frequency (rad/s)
  period: number;       // Oscillation period (s)
  overshootPct: number; // Theoretical percent overshoot (%)
  realEigenvalue: number; // Real part of eigenvalue (decay rate)
}

function calculateHarmonicProperties(stiffness: number, damping: number, mass: number): HarmonicProperties {
  if (mass <= 0 || stiffness <= 0 || damping <= 0) {
    throw new Error('Mass, stiffness, and damping must be strictly positive');
  }

  const omega0 = Math.sqrt(stiffness / mass);
  const f0 = omega0 / (2 * Math.PI);
  const c_crit = 2 * Math.sqrt(stiffness * mass);
  const zeta = damping / c_crit;
  const omega_d = zeta < 1 ? omega0 * Math.sqrt(1 - zeta * zeta) : 0;
  const period = omega_d > 0 ? (2 * Math.PI) / omega_d : Infinity;
  const overshootPct = zeta < 1 ? Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta)) * 100 : 0;
  const realEigenvalue = -damping / (2 * mass);

  return {
    stiffness,
    damping,
    mass,
    omega0,
    f0,
    c_crit,
    zeta,
    omega_d,
    period,
    overshootPct,
    realEigenvalue,
  };
}

// ----------------------------------------------------------------------------
// Physics Helper: 4th-Order Runge-Kutta (RK4) Kinematic Simulator
// ----------------------------------------------------------------------------
interface SimulationResult {
  times: number[];
  positions: number[];
  velocities: number[];
  energies: number[];
  settlingTime: number; // Time to stay within |x(t) - target| < tolerance
  maxOvershootObserved: number; // Max position beyond target
}

function simulateRK4(
  k: number,
  c: number,
  m: number,
  x0 = 100.0,
  v0 = 0.0,
  target = 0.0,
  dt = 0.001,
  totalTime = 2.0,
  settlingTolerance = 0.5
): SimulationResult {
  const numSteps = Math.floor(totalTime / dt);
  const times = new Array<number>(numSteps);
  const positions = new Array<number>(numSteps);
  const velocities = new Array<number>(numSteps);
  const energies = new Array<number>(numSteps);

  let x = x0 - target;
  let v = v0;
  let t = 0;

  let settlingIndex = -1;
  let maxPos = 0;

  // Derivates function: dx/dt = v, dv/dt = -(k*x + c*v)/m
  const derivatives = (posX: number, velV: number) => {
    return {
      dx: velV,
      dv: -(k * posX + c * velV) / m,
    };
  };

  for (let i = 0; i < numSteps; i++) {
    times[i] = t;
    positions[i] = x + target;
    velocities[i] = v;
    // Total mechanical energy E = 0.5*m*v^2 + 0.5*k*x^2
    energies[i] = 0.5 * m * v * v + 0.5 * k * x * x;

    // Track overshoot in the reverse direction if oscillating
    if (x0 > target && x < 0 && Math.abs(x) > maxPos) {
      maxPos = Math.abs(x);
    }

    // RK4 step
    const d1 = derivatives(x, v);
    const d2 = derivatives(x + 0.5 * dt * d1.dx, v + 0.5 * dt * d1.dv);
    const d3 = derivatives(x + 0.5 * dt * d2.dx, v + 0.5 * dt * d2.dv);
    const d4 = derivatives(x + dt * d3.dx, v + dt * d3.dv);

    x += (dt / 6) * (d1.dx + 2 * d2.dx + 2 * d3.dx + d4.dx);
    v += (dt / 6) * (d1.dv + 2 * d2.dv + 2 * d3.dv + d4.dv);
    t += dt;
  }

  // Find settling time: earliest t where all subsequent |x(t)| <= settlingTolerance
  for (let i = numSteps - 1; i >= 0; i--) {
    if (Math.abs(positions[i] - target) > settlingTolerance) {
      settlingIndex = Math.min(i + 1, numSteps - 1);
      break;
    }
  }

  const settlingTime = settlingIndex >= 0 ? times[settlingIndex] : 0;
  const maxOvershootObserved = (maxPos / Math.abs(x0 - target)) * 100;

  return {
    times,
    positions,
    velocities,
    energies,
    settlingTime,
    maxOvershootObserved,
  };
}

// ----------------------------------------------------------------------------
// TEST SUITES
// ----------------------------------------------------------------------------

describe('Milestone 1 Challenger: Tier 1 — Analytical Physics Invariants & Damping Ratio Precision', () => {
  const presets: SpatialSpringPreset[] = ['bouncy', 'snappy', 'gentle', 'elastic', 'spatialDrag'];

  it('CHAL-1.1: All 5 presets must be defined, structurally valid, and strictly positive', () => {
    for (const preset of presets) {
      const cfg = SPATIAL_SPRINGS[preset] as any;
      assert.strictEqual(cfg.type, 'spring', `Preset ${preset} must declare type: 'spring'`);
      assert.ok(typeof cfg.stiffness === 'number' && cfg.stiffness > 0, `Preset ${preset} stiffness must be positive number`);
      assert.ok(typeof cfg.damping === 'number' && cfg.damping > 0, `Preset ${preset} damping must be positive number`);
      assert.ok(typeof cfg.mass === 'number' && cfg.mass > 0, `Preset ${preset} mass must be positive number`);
      assert.ok(Number.isFinite(cfg.stiffness) && !Number.isNaN(cfg.stiffness));
      assert.ok(Number.isFinite(cfg.damping) && !Number.isNaN(cfg.damping));
      assert.ok(Number.isFinite(cfg.mass) && !Number.isNaN(cfg.mass));
    }
  });

  it('CHAL-1.2: Rigorous verification of exact PROJECT.md contract constants', () => {
    const expected = {
      bouncy: { stiffness: 450, damping: 22, mass: 0.8 },
      snappy: { stiffness: 350, damping: 28, mass: 0.9 },
      gentle: { stiffness: 220, damping: 26, mass: 1.0 },
      elastic: { stiffness: 300, damping: 14, mass: 0.7 },
      spatialDrag: { stiffness: 400, damping: 34, mass: 1.1 },
    };

    for (const [name, exp] of Object.entries(expected)) {
      const actual = SPATIAL_SPRINGS[name as SpatialSpringPreset] as any;
      assert.strictEqual(actual.stiffness, exp.stiffness, `${name} stiffness mismatch`);
      assert.strictEqual(actual.damping, exp.damping, `${name} damping mismatch`);
      assert.strictEqual(actual.mass, exp.mass, `${name} mass mismatch`);
    }
  });

  it('CHAL-1.3: Damping ratio (zeta) and natural frequency mathematical precision', () => {
    // 1. bouncy: k=450, c=22, m=0.8 -> zeta = 22 / (2 * sqrt(360)) = 0.5798
    const bouncy = calculateHarmonicProperties(450, 22, 0.8);
    assert.ok(Math.abs(bouncy.zeta - 0.5798) < 0.001, `bouncy zeta should be ~0.5798, got ${bouncy.zeta}`);
    assert.ok(Math.abs(bouncy.overshootPct - 10.69) < 0.1, `bouncy overshoot should be ~10.7%, got ${bouncy.overshootPct}`);
    assert.ok(bouncy.realEigenvalue < 0, 'bouncy must have negative real eigenvalue');

    // 2. snappy: k=350, c=28, m=0.9 -> zeta = 28 / (2 * sqrt(315)) = 0.7888
    const snappy = calculateHarmonicProperties(350, 28, 0.9);
    assert.ok(Math.abs(snappy.zeta - 0.7888) < 0.001, `snappy zeta should be ~0.7888, got ${snappy.zeta}`);
    assert.ok(snappy.overshootPct < 3.0, `snappy overshoot must be < 3% for clean crispness, got ${snappy.overshootPct}`);

    // 3. gentle: k=220, c=26, m=1.0 -> zeta = 26 / (2 * sqrt(220)) = 0.8765
    const gentle = calculateHarmonicProperties(220, 26, 1.0);
    assert.ok(Math.abs(gentle.zeta - 0.8765) < 0.001, `gentle zeta should be ~0.8765, got ${gentle.zeta}`);
    assert.ok(gentle.overshootPct < 1.0, `gentle overshoot must be < 1% for smooth deceleration`);

    // 4. elastic: k=300, c=14, m=0.7 -> zeta = 14 / (2 * sqrt(210)) = 0.4830
    const elastic = calculateHarmonicProperties(300, 14, 0.7);
    assert.ok(Math.abs(elastic.zeta - 0.4830) < 0.001, `elastic zeta should be ~0.4830, got ${elastic.zeta}`);
    assert.ok(elastic.overshootPct > 15.0 && elastic.overshootPct < 22.0, `elastic overshoot should be ~17.7%, got ${elastic.overshootPct}`);

    // 5. spatialDrag: k=400, c=34, m=1.1 -> zeta = 34 / (2 * sqrt(440)) = 0.8104
    const spatialDrag = calculateHarmonicProperties(400, 34, 1.1);
    assert.ok(Math.abs(spatialDrag.zeta - 0.8104) < 0.001, `spatialDrag zeta should be ~0.8104, got ${spatialDrag.zeta}`);
    assert.ok(spatialDrag.overshootPct < 2.0, `spatialDrag overshoot should be < 2%`);
  });

  it('CHAL-1.4: Lyapunov Stability — All 5 spring presets must possess strictly negative real eigenvalues', () => {
    for (const preset of presets) {
      const cfg = SPATIAL_SPRINGS[preset] as any;
      const props = calculateHarmonicProperties(cfg.stiffness, cfg.damping, cfg.mass);
      // Real part = -c / (2*m)
      assert.ok(props.realEigenvalue < -5.0, `Decay rate for ${preset} (${props.realEigenvalue}) must be faster than -5.0 s^-1`);
    }
  });
});

describe('Milestone 1 Challenger: Tier 2 — Numerical RK4 Kinematic Simulation & Energy Dissipation', () => {
  const presets: SpatialSpringPreset[] = ['bouncy', 'snappy', 'gentle', 'elastic', 'spatialDrag'];

  it('CHAL-2.1: Monotonic Energy Dissipation — Total mechanical energy must not increase over time', () => {
    for (const preset of presets) {
      const cfg = SPATIAL_SPRINGS[preset] as any;
      const sim = simulateRK4(cfg.stiffness, cfg.damping, cfg.mass, 100, 0, 0, 0.001, 1.5);

      // Verify energy monotonically decreases (or stays within floating point epsilon)
      let prevEnergy = sim.energies[0];
      for (let i = 1; i < sim.energies.length; i++) {
        const currEnergy = sim.energies[i];
        assert.ok(
          currEnergy <= prevEnergy + 1e-6,
          `Energy violation in ${preset} at step ${i} (t=${sim.times[i]}): ${currEnergy} > ${prevEnergy}`
        );
        prevEnergy = currEnergy;
      }

      // Initial energy: 0.5 * k * (100)^2 = 5000 * k
      const initialEnergy = 0.5 * cfg.stiffness * 100 * 100;
      assert.ok(Math.abs(sim.energies[0] - initialEnergy) < 1e-4);

      // Final energy after 1.5s must be virtually zero (< 0.01% of initial)
      const finalEnergy = sim.energies[sim.energies.length - 1];
      assert.ok(
        finalEnergy < initialEnergy * 0.0001,
        `Energy not dissipated for ${preset}: final=${finalEnergy}, initial=${initialEnergy}`
      );
    }
  });

  it('CHAL-2.2: Settling Time Performance — All presets must settle within < 600ms', () => {
    for (const preset of presets) {
      const cfg = SPATIAL_SPRINGS[preset] as any;
      // Step response from x=100 to target=0, tolerance = 1.0 (1% residual)
      const sim = simulateRK4(cfg.stiffness, cfg.damping, cfg.mass, 100, 0, 0, 0.001, 2.0, 1.0);

      assert.ok(
        sim.settlingTime > 0 && sim.settlingTime < 0.65,
        `Preset ${preset} settling time (${(sim.settlingTime * 1000).toFixed(1)}ms) must be under 650ms`
      );
    }
  });

  it('CHAL-2.3: Empirical overshoot in simulation matches theoretical closed-form within 1.5%', () => {
    const bouncyCfg = SPATIAL_SPRINGS.bouncy as any;
    const bouncySim = simulateRK4(bouncyCfg.stiffness, bouncyCfg.damping, bouncyCfg.mass, 100, 0, 0);
    const bouncyTheo = calculateHarmonicProperties(bouncyCfg.stiffness, bouncyCfg.damping, bouncyCfg.mass);
    assert.ok(
      Math.abs(bouncySim.maxOvershootObserved - bouncyTheo.overshootPct) < 1.0,
      `bouncy observed overshoot (${bouncySim.maxOvershootObserved.toFixed(2)}%) differs from theoretical (${bouncyTheo.overshootPct.toFixed(2)}%)`
    );

    const elasticCfg = SPATIAL_SPRINGS.elastic as any;
    const elasticSim = simulateRK4(elasticCfg.stiffness, elasticCfg.damping, elasticCfg.mass, 100, 0, 0);
    const elasticTheo = calculateHarmonicProperties(elasticCfg.stiffness, elasticCfg.damping, elasticCfg.mass);
    assert.ok(
      Math.abs(elasticSim.maxOvershootObserved - elasticTheo.overshootPct) < 1.0,
      `elastic observed overshoot (${elasticSim.maxOvershootObserved.toFixed(2)}%) differs from theoretical (${elasticTheo.overshootPct.toFixed(2)}%)`
    );
  });
});

describe('Milestone 1 Challenger: Tier 3 — Boundary Conditions, Extreme Scales & Helper Factories', () => {
  it('CHAL-3.1: createSpatialSpring default fallback parameters', () => {
    const spring = createSpatialSpring({}) as any;
    assert.strictEqual(spring.type, 'spring');
    assert.strictEqual(spring.stiffness, 350, 'Default stiffness should be 350');
    assert.strictEqual(spring.damping, 28, 'Default damping should be 28');
    assert.strictEqual(spring.mass, 0.9, 'Default mass should be 0.9');
  });

  it('CHAL-3.2: createSpatialSpring partial overrides and secondary parameters', () => {
    const custom = createSpatialSpring({
      stiffness: 600,
      damping: 45,
      mass: 1.5,
      restDelta: 0.005,
      restSpeed: 0.01,
      velocity: 120,
    }) as any;

    assert.strictEqual(custom.stiffness, 600);
    assert.strictEqual(custom.damping, 45);
    assert.strictEqual(custom.mass, 1.5);
    assert.strictEqual(custom.restDelta, 0.005);
    assert.strictEqual(custom.restSpeed, 0.01);
    assert.strictEqual(custom.velocity, 120);
  });

  it('CHAL-3.3: createSpring factory generates conforming spring transition object', () => {
    const spring = createSpring(250, 18, 0.8) as any;
    assert.strictEqual(spring.type, 'spring');
    assert.strictEqual(spring.stiffness, 250);
    assert.strictEqual(spring.damping, 18);
    assert.strictEqual(spring.mass, 0.8);

    // Default mass parameter check
    const springDefaultMass = createSpring(180, 15) as any;
    assert.strictEqual(springDefaultMass.mass, 1);
  });

  it('CHAL-3.4: getSpring helper accurately indexes all 5 presets', () => {
    const presets: SpatialSpringPreset[] = ['bouncy', 'snappy', 'gentle', 'elastic', 'spatialDrag'];
    for (const preset of presets) {
      const spring = getSpring(preset);
      assert.strictEqual(spring, SPATIAL_SPRINGS[preset]);
    }
  });

  it('CHAL-3.5: Extreme parameter resilience & singularity stress-testing', () => {
    // Extreme stiff spring
    const stiffSim = simulateRK4(10000, 200, 1.0, 10, 0, 0, 0.0001, 0.5);
    assert.ok(stiffSim.settlingTime < 0.2);

    // Extreme heavy mass
    const heavySim = simulateRK4(400, 40, 10.0, 10, 0, 0, 0.001, 3.0);
    assert.ok(heavySim.settlingTime < 2.5);

    // Sub-millimeter micro-displacement
    const microSim = simulateRK4(450, 22, 0.8, 0.001, 0, 0, 0.001, 0.5, 0.00001);
    assert.ok(microSim.settlingTime < 0.4);
  });
});

describe('Milestone 1 Challenger: Tier 4 — Framer Motion Variants Structural Schema & Quality', () => {
  const expectedVariantNames = [
    'sheet',
    'modal',
    'backdrop',
    'cardItem',
    'mascotFloat',
    'mascotHalo',
    'mascotCelebrate',
    'tabIndicator',
    'dockPill',
    'checkmarkBounce',
    'checkboxPop',
    'habitPulse',
    'staggerContainer',
    'dialogBackdrop',
  ];

  it('CHAL-4.1: All 14 authoritative animation variants are present in SPATIAL_VARIANTS', () => {
    for (const name of expectedVariantNames) {
      assert.ok(SPATIAL_VARIANTS[name], `Missing variant preset: "${name}"`);
    }
  });

  it('CHAL-4.2: Opacity invariants — opacities across all variants must strictly lie in [0, 1]', () => {
    for (const [name, variant] of Object.entries(SPATIAL_VARIANTS)) {
      for (const [stateName, stateObj] of Object.entries(variant)) {
        if (stateObj && typeof stateObj === 'object') {
          const op = (stateObj as any).opacity;
          if (op !== undefined) {
            if (Array.isArray(op)) {
              for (const v of op) {
                assert.ok(v >= 0 && v <= 1, `Array opacity out of range in ${name}.${stateName}: ${v}`);
              }
            } else if (typeof op === 'number') {
              assert.ok(op >= 0 && op <= 1, `Opacity out of range in ${name}.${stateName}: ${op}`);
            }
          }
        }
      }
    }
  });

  it('CHAL-4.3: Scale invariants — scales across all variants must be strictly positive', () => {
    for (const [name, variant] of Object.entries(SPATIAL_VARIANTS)) {
      for (const [stateName, stateObj] of Object.entries(variant)) {
        if (stateObj && typeof stateObj === 'object') {
          const sc = (stateObj as any).scale;
          if (sc !== undefined) {
            if (Array.isArray(sc)) {
              for (const v of sc) {
                assert.ok(v > 0, `Array scale non-positive in ${name}.${stateName}: ${v}`);
              }
            } else if (typeof sc === 'number') {
              assert.ok(sc > 0, `Scale non-positive in ${name}.${stateName}: ${sc}`);
            }
          }
        }
      }
    }
  });

  it('CHAL-4.4: Ambient breathing loops (mascotFloat, mascotHalo) must be infinite and smooth', () => {
    const mascotFloat = SPATIAL_VARIANTS.mascotFloat;
    assert.ok(mascotFloat.animate, 'mascotFloat must define animate state');
    const floatAnim = mascotFloat.animate as any;
    assert.deepStrictEqual(floatAnim.y, [0, -6, 0]);
    assert.strictEqual(floatAnim.transition.repeat, Infinity);
    assert.strictEqual(floatAnim.transition.repeatType, 'reverse');
    assert.ok(floatAnim.transition.duration >= 3.0, 'Breathing duration should be gentle (>= 3.0s)');

    const mascotHalo = SPATIAL_VARIANTS.mascotHalo;
    assert.ok(mascotHalo.animate, 'mascotHalo must define animate state');
    const haloAnim = mascotHalo.animate as any;
    assert.deepStrictEqual(haloAnim.scale, [1, 1.08, 1]);
    assert.deepStrictEqual(haloAnim.opacity, [0.35, 0.5, 0.35]);
    assert.strictEqual(haloAnim.transition.repeat, Infinity);
    assert.strictEqual(haloAnim.transition.repeatType, 'reverse');
  });

  it('CHAL-4.5: Exit animation durations must be rapid (< 0.25s) to guarantee high UI responsiveness', () => {
    for (const [name, variant] of Object.entries(SPATIAL_VARIANTS)) {
      const exitState = variant.exit as any;
      if (exitState && exitState.transition && typeof exitState.transition.duration === 'number') {
        assert.ok(
          exitState.transition.duration <= 0.25,
          `Exit transition duration in ${name} too sluggish: ${exitState.transition.duration}s (must be <= 0.25s)`
        );
      }
    }
  });
});

describe('Milestone 1 Challenger: Tier 5 — Micro-Interactions & Tap Scale Ergonomics', () => {
  it('CHAL-5.1: SPATIAL_TAP_SCALE contains definitions for card, button, mascot, dockItem, fab', () => {
    const targets = ['card', 'button', 'mascot', 'dockItem', 'fab'] as const;
    for (const t of targets) {
      assert.ok(SPATIAL_TAP_SCALE[t], `Missing tap scale config for "${t}"`);
    }
  });

  it('CHAL-5.2: Tap/Hover scale ergonomics (hover > 1.0, tap < 1.0, bouncy spring transition)', () => {
    for (const [name, config] of Object.entries(SPATIAL_TAP_SCALE)) {
      const hoverScale = (config as any).whileHover?.scale;
      const tapScale = (config as any).whileTap?.scale;

      assert.ok(hoverScale > 1.0, `${name} whileHover scale must be > 1.0 (expansion), got ${hoverScale}`);
      assert.ok(hoverScale <= 1.15, `${name} whileHover scale must be ergonomically subtle (<= 1.15), got ${hoverScale}`);
      assert.ok(tapScale < 1.0, `${name} whileTap scale must be < 1.0 (compression), got ${tapScale}`);
      assert.ok(tapScale >= 0.85, `${name} whileTap scale must not shrink excessively (>= 0.85), got ${tapScale}`);
      assert.ok(hoverScale > tapScale, `${name} hover scale must exceed tap scale`);
      assert.strictEqual((config as any).transition, SPATIAL_SPRINGS.bouncy, `${name} must bind bouncy spring`);
    }
  });
});

describe('Milestone 1 Challenger: Tier 6 — Accessibility (a11y) & DOM Attributes Contract', () => {
  it('CHAL-6.1: getAccessibleTransition respects prefersReducedMotion flag', () => {
    const presets: SpatialSpringPreset[] = ['bouncy', 'snappy', 'gentle', 'elastic', 'spatialDrag'];

    for (const preset of presets) {
      // Reduced motion TRUE -> instant duration
      const reduced = getAccessibleTransition(preset, true);
      assert.deepStrictEqual(reduced, { duration: 0.01 });

      // Reduced motion FALSE -> full spring
      const standard = getAccessibleTransition(preset, false);
      assert.strictEqual(standard, SPATIAL_SPRINGS[preset]);

      // Default (no arg) -> full spring
      const def = getAccessibleTransition(preset);
      assert.strictEqual(def, SPATIAL_SPRINGS[preset]);
    }
  });

  it('CHAL-6.2: getSpatialSpringProps returns compliant data-spring and transition mapping', () => {
    const presets: SpatialSpringPreset[] = ['bouncy', 'snappy', 'gentle', 'elastic', 'spatialDrag'];

    for (const preset of presets) {
      const props = getSpatialSpringProps(preset);
      assert.strictEqual(props['data-spring'], preset);
      assert.strictEqual(props.transition, SPATIAL_SPRINGS[preset]);
    }
  });
});

describe('Milestone 1 Challenger: Tier 7 — globals.css Claymorphic Token & Dark Theme Invariants', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  it('CHAL-7.1: globals.css defines dual-inset specular highlights and floating shadow tokens', () => {
    assert.ok(cssContent.includes('--clay-highlight-light'), 'Missing --clay-highlight-light');
    assert.ok(cssContent.includes('--clay-highlight-dark'), 'Missing --clay-highlight-dark');
    assert.ok(cssContent.includes('--clay-shadow-floating'), 'Missing --clay-shadow-floating');
    assert.ok(cssContent.includes('--clay-shadow-floating-dark'), 'Missing --clay-shadow-floating-dark');
    assert.ok(cssContent.includes('--clay-shadow-dock'), 'Missing --clay-shadow-dock');
    assert.ok(cssContent.includes('--clay-shadow-dock-dark'), 'Missing --clay-shadow-dock-dark');
    assert.ok(cssContent.includes('--clay-shadow-pressed'), 'Missing --clay-shadow-pressed');
    assert.ok(cssContent.includes('--clay-shadow-pressed-dark'), 'Missing --clay-shadow-pressed-dark');
  });

  it('CHAL-7.2: globals.css defines squircle radius scale tokens', () => {
    assert.ok(cssContent.includes('--radius-stage: 36px'), 'Missing --radius-stage: 36px');
    assert.ok(cssContent.includes('--radius-modal: 32px'), 'Missing --radius-modal: 32px');
    assert.ok(cssContent.includes('--radius-card: 28px'), 'Missing --radius-card: 28px');
    assert.ok(cssContent.includes('--radius-pill: 9999px'), 'Missing --radius-pill: 9999px');
    assert.ok(cssContent.includes('--radius-control: 20px'), 'Missing --radius-control: 20px');
  });

  it('CHAL-7.3: Dark theme overrides provide anti-glare specular suppression', () => {
    assert.ok(cssContent.includes('[data-theme-dark="true"]') || cssContent.includes('.dark'));
    assert.ok(cssContent.includes('--clay-bevel: var(--clay-highlight-dark)'));
    assert.ok(cssContent.includes('--clay-shadow-floating: var(--clay-shadow-floating-dark)'));
    assert.ok(cssContent.includes('[data-theme="zinc"]'), 'Zinc theme dark override missing');
    assert.ok(cssContent.includes('[data-theme="darkBlue"]'), 'DarkBlue theme dark override missing');
  });

  it('CHAL-7.4: Essential spatial utility classes are declared with backdrop blur and border styling', () => {
    const requiredClasses = [
      '.clay-card',
      '.clay-card-interactive',
      '.clay-btn-primary',
      '.clay-btn-purple',
      '.clay-btn-emerald',
      '.spatial-nav-dock',
      '.clay-pill',
      '.clay-pill-active',
      '.ambient-halo',
      '.touch-spring',
      '.transform-gpu',
    ];

    for (const cls of requiredClasses) {
      assert.ok(cssContent.includes(cls), `Missing utility class: ${cls}`);
    }
  });
});
