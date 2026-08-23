/**
 * ============================================================================
 * SPATIAL SPRING PHYSICS ENGINE & MOTION PRESETS
 * ============================================================================
 * 
 * Provides type-safe 5-tier spring physics configurations, motion variants,
 * and DOM verification attributes for the Fluid / Playful Spatial UI system.
 * Fully compatible with Framer Motion v13, React 19, and Next.js 16 App Router.
 * 
 * Authoritative Interface Contract: d:\AI\جبنة\PROJECT.md § Interface Contracts
 */

import type { Transition, Variants } from 'framer-motion';

/**
 * 5-Tier Spatial Spring Preset Identifier
 */
export type SpatialSpringPreset = 
  | 'bouncy'       // Taps, buttons, checkmarks, habit pills, fab, micro-interactions
  | 'snappy'       // Modals, bottom sheets, drawers, nav dock indicator
  | 'gentle'       // View transitions, stage layout, ambient kinematics
  | 'elastic'      // Mascot celebration, streak unlock, celebratory reactions
  | 'spatialDrag'; // Drag-to-dismiss, swiping gestures, pan physics

export type SpatialSpringType = SpatialSpringPreset;

/**
 * Strict Spring Transition Parameters Interface
 */
export interface SpringTransitionConfig {
  type: 'spring';
  stiffness: number;
  damping: number;
  mass: number;
  restDelta?: number;
  restSpeed?: number;
  velocity?: number;
}

/**
 * 5-Tier Spatial Spring Physics Engine Presets
 * Inspired by Bloub, Grok mobile, Arc, and Headspace.
 * Authoritative Interface Contract from PROJECT.md:67-73.
 */
export const SPATIAL_SPRINGS: Record<SpatialSpringPreset, Transition> = {
  /**
   * Ultra-tactile bouncy spring: response ~120ms, settling ~350ms, ~10% overshoot.
   * Applied to: Checkmarks, habit streak counters, FAB bounce, tag pills.
   */
  bouncy: {
    type: 'spring' as const,
    stiffness: 450,
    damping: 22,
    mass: 0.8,
  },

  /**
   * Snappy decisive spring: response ~160ms, settling ~260ms, critically damped.
   * Applied to: Bottom sheets, modal dialogs, category cards, nav dock active pill.
   */
  snappy: {
    type: 'spring' as const,
    stiffness: 350,
    damping: 28,
    mass: 0.9,
  },

  /**
   * Soft organic spring: response ~280ms, settling ~460ms, gentle deceleration.
   * Applied to: Mascot hero stage transitions, workspace view switching, ambient shifts.
   */
  gentle: {
    type: 'spring' as const,
    stiffness: 220,
    damping: 26,
    mass: 1.0,
  },

  /**
   * Playful elastic spring: response ~180ms, settling ~620ms, ~25-30% overshoot.
   * Applied to: Mascot click reaction, confetti burst, 100% daily goal celebration.
   */
  elastic: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 14,
    mass: 0.7,
  },

  /**
   * Heavier drag physics: prevents erratic over-dragging with solid physical resistance.
   * Applied to: Bottom sheet pull-to-dismiss, swipe-to-delete gestures.
   */
  spatialDrag: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 34,
    mass: 1.1,
  },
} as const;

/**
 * Framer Motion Animation Variant Presets for Spatial Containers
 */
export const SPATIAL_VARIANTS: Record<string, Variants> = {
  // Modal / Bottom Sheet Drawer
  sheet: {
    initial: { opacity: 0, y: 60, scale: 0.96 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      transition: SPATIAL_SPRINGS.snappy 
    },
    exit: { 
      opacity: 0, 
      y: 40, 
      scale: 0.96, 
      transition: { duration: 0.18, ease: 'easeOut' } 
    },
  },

  // Center Popup Dialog / Settings / Quiz Modal
  modal: {
    initial: { opacity: 0, scale: 0.92, y: 16 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      transition: SPATIAL_SPRINGS.snappy 
    },
    exit: { 
      opacity: 0, 
      scale: 0.94, 
      y: 10, 
      transition: { duration: 0.15, ease: 'easeOut' } 
    },
  },

  // Modal / Drawer Backdrop Blur Overlay
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  },

  // Task & Category Card Pop-in / Pop-out
  cardItem: {
    initial: { opacity: 0, scale: 0.92, y: 12 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      transition: SPATIAL_SPRINGS.bouncy 
    },
    exit: { 
      opacity: 0, 
      scale: 0.88, 
      filter: 'blur(6px)', 
      transition: { duration: 0.16 } 
    },
  },

  // Mascot Stage Ambient Floating & Breathing
  mascotFloat: {
    animate: {
      y: [0, -6, 0],
      transition: {
        duration: 3.8,
        repeat: Infinity,
        repeatType: 'reverse' as const,
        ease: 'easeInOut',
      },
    },
  },

  // Dynamic Ambient Aura Pulse
  mascotHalo: {
    animate: {
      scale: [1, 1.08, 1],
      opacity: [0.35, 0.5, 0.35],
      transition: {
        duration: 4.2,
        repeat: Infinity,
        repeatType: 'reverse' as const,
        ease: 'easeInOut',
      },
    },
  },

  // Mascot Celebratory Scale Pulse
  mascotCelebrate: {
    animate: {
      scale: [1, 1.18, 0.95, 1.04, 1],
      transition: SPATIAL_SPRINGS.elastic,
    },
  },

  // Active Bottom Nav Pill Transition
  tabIndicator: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1, transition: SPATIAL_SPRINGS.snappy },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
  },

  // Floating Nav Dock Active Pill Slider
  dockPill: {
    initial: { scale: 0.85, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: SPATIAL_SPRINGS.snappy },
    exit: { scale: 0.85, opacity: 0, transition: { duration: 0.15 } },
  },

  // Bouncy Checkmark Punch
  checkmarkBounce: {
    initial: { scale: 0.6, rotate: -15 },
    animate: { 
      scale: 1, 
      rotate: 0, 
      transition: SPATIAL_SPRINGS.bouncy 
    },
    exit: { scale: 0.6, opacity: 0, transition: { duration: 0.12 } },
  },

  // Checkbox Pop
  checkboxPop: {
    initial: { scale: 0.7, rotate: -20 },
    animate: { scale: 1, rotate: 0, transition: SPATIAL_SPRINGS.bouncy },
    exit: { scale: 0.5, transition: { duration: 0.12 } },
  },

  // Habit Streak Flame Pulse
  habitPulse: {
    initial: { scale: 1 },
    animate: { scale: [1, 1.25, 1], transition: SPATIAL_SPRINGS.bouncy },
  },

  // Staggered Container for Lists
  staggerContainer: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.04,
        delayChildren: 0.02,
      },
    },
  },

  // Dialog Backdrop Overlay
  dialogBackdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  },
};

/**
 * Tap & Hover Micro-Interaction Configuration Presets
 */
export const SPATIAL_TAP_SCALE = {
  card: {
    whileHover: { scale: 1.015, y: -2 },
    whileTap: { scale: 0.985 },
    transition: SPATIAL_SPRINGS.bouncy,
  },
  button: {
    whileHover: { scale: 1.03 },
    whileTap: { scale: 0.95 },
    transition: SPATIAL_SPRINGS.bouncy,
  },
  mascot: {
    whileHover: { scale: 1.06 },
    whileTap: { scale: 0.94 },
    transition: SPATIAL_SPRINGS.bouncy,
  },
  dockItem: {
    whileHover: { scale: 1.08 },
    whileTap: { scale: 0.92 },
    transition: SPATIAL_SPRINGS.bouncy,
  },
  fab: {
    whileHover: { scale: 1.08 },
    whileTap: { scale: 0.92 },
    transition: SPATIAL_SPRINGS.bouncy,
  },
} as const;

/**
 * Spatial DOM Verification Attributes Definition
 */
export interface SpatialDOMAttributes {
  'data-spatial-container'?: 'hero' | 'lists' | 'tasks' | 'study' | 'modal' | 'nav' | 'stats';
  'data-spring'?: SpatialSpringPreset;
  'data-mascot-container'?: 'hero' | 'list-preview' | 'settings-preview' | 'stats-preview';
  'data-mascot-aura'?: 'hero-aura';
  'data-clay-element'?: 'card' | 'btn-primary' | 'btn-purple' | 'btn-emerald' | 'pill' | 'nav-dock' | 'fab' | 'input';
  'data-list-type'?: 'todo' | 'study';
  'data-view-id'?: 'all' | 'today' | 'stats' | 'study' | 'category';
}

/**
 * Helper to retrieve a typed spring transition preset
 */
export function getSpring(type: SpatialSpringPreset): Transition {
  return SPATIAL_SPRINGS[type];
}

/**
 * Returns typed spring transition and DOM verification attribute
 */
export function getSpatialSpringProps(preset: SpatialSpringPreset): {
  'data-spring': SpatialSpringPreset;
  transition: Transition;
} {
  return {
    'data-spring': preset,
    transition: SPATIAL_SPRINGS[preset],
  };
}

/**
 * Helper to build custom spring transition with typed defaults
 */
export function createSpatialSpring(overrides: Partial<SpringTransitionConfig>): Transition {
  return {
    type: 'spring' as const,
    stiffness: overrides.stiffness ?? 350,
    damping: overrides.damping ?? 28,
    mass: overrides.mass ?? 0.9,
    ...(overrides.restDelta !== undefined ? { restDelta: overrides.restDelta } : {}),
    ...(overrides.restSpeed !== undefined ? { restSpeed: overrides.restSpeed } : {}),
    ...(overrides.velocity !== undefined ? { velocity: overrides.velocity } : {}),
  };
}

/**
 * Factory for creating custom parameterized spring physics
 */
export function createSpring(stiffness: number, damping: number, mass = 1): Transition {
  return {
    type: 'spring',
    stiffness,
    damping,
    mass,
  };
}

/**
 * Returns accessible transition respecting prefers-reduced-motion
 */
export function getAccessibleTransition(
  preset: SpatialSpringPreset,
  prefersReducedMotion: boolean = false
): Transition {
  if (prefersReducedMotion) {
    return { duration: 0.01 };
  }
  return SPATIAL_SPRINGS[preset];
}
