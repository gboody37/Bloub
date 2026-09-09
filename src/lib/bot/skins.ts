import { PROFILE_SAMPLES, PROFILES } from './profiles'
import {
  hullOfCircles,
  profileFromPolygon,
  regularPolygonProfile,
  superellipseProfile,
  unionOfCirclesProfile,
  roundedPolygon
} from './shape'

export type ShapeId =
  | 'cercle'
  | 'galet'
  | 'squircle'
  | 'capsule'
  | 'triangle'
  | 'hexagone'
  | 'nuage'
  | 'goutte'
  | 'oeuf'
  | 'soleil'
  | 'fromage'
  | 'livre'

export interface BotShape {
  id: ShapeId
  radii: number[]
}

function normalize(radii: number[], max = 1): number[] {
  const peak = Math.max(...radii)
  if (peak <= 0) return radii
  const k = max / peak
  return radii.map((r) => r * k)
}

const ANGLES = Array.from({ length: PROFILE_SAMPLES }, (_, i) => (i / PROFILE_SAMPLES) * Math.PI * 2)

const pebble = normalize(
  ANGLES.map((a) => 1 + 0.22 * Math.cos(2 * a + 0.4) + 0.12 * Math.cos(3 * a + 1.8)),
  1.08
)

const cloud = normalize(
  unionOfCirclesProfile([
    { x: -0.44, y: 0.2, r: 0.54 },
    { x: 0.46, y: 0.2, r: 0.5 },
    { x: 0.02, y: 0.3, r: 0.6 },
    { x: -0.24, y: -0.3, r: 0.48 },
    { x: 0.3, y: -0.24, r: 0.44 }
  ]),
  1.02
)

const droplet = normalize(
  profileFromPolygon(hullOfCircles(0, 0.28, 0.66, 0, -0.96, 0.05), 0, 0),
  1.04
)

const capsule = profileFromPolygon(hullOfCircles(-0.42, 0, 0.62, 0.42, 0, 0.62), 0, 0)

const sun = normalize(
  ANGLES.map((a) => 1 + 0.14 * Math.cos(10 * a)),
  1.15
)

const cheese = normalize(
  profileFromPolygon(
    roundedPolygon(
      [
        { x: -0.9, y: 0.75 },
        { x: 0.9, y: 0.75 },
        { x: 0.85, y: -0.2 },
        { x: -0.85, y: -0.7 }
      ],
      0.18
    ),
    0,
    0
  ),
  1.12
)

const book = normalize(
  profileFromPolygon(
    roundedPolygon(
      [
        { x: -0.95, y: -0.75 },
        { x: 0, y: -0.55 },
        { x: 0.95, y: -0.75 },
        { x: 0.95, y: 0.75 },
        { x: 0, y: 0.55 },
        { x: -0.95, y: 0.75 }
      ],
      0.15
    ),
    0,
    0
  ),
  1.15
)

export const SHAPES: BotShape[] = [
  { id: 'cercle', radii: new Array(PROFILE_SAMPLES).fill(1) },
  { id: 'galet', radii: pebble },
  { id: 'squircle', radii: normalize(superellipseProfile(5.0), 1.18) },
  { id: 'capsule', radii: capsule },
  { id: 'triangle', radii: regularPolygonProfile(3, 1.15, 0.18, -90) },
  { id: 'hexagone', radii: regularPolygonProfile(6, 1.06, 0.08, 0) },
  { id: 'nuage', radii: cloud },
  { id: 'goutte', radii: droplet },
  { id: 'oeuf', radii: normalize([...PROFILES.egg], 1.05) },
  { id: 'soleil', radii: sun },
  { id: 'fromage', radii: cheese },
  { id: 'livre', radii: book }
]

// Map indexee par `string` et non par `ShapeId` : les appelants interrogent avec
// une valeur relue du localStorage ou d'une prop, donc non validee.
export const SHAPE_BY_ID = new Map<string, BotShape>(SHAPES.map((s) => [s.id, s]))
export const DEFAULT_SHAPE = 'cercle'

export type ColorId =
  | 'encre'
  | 'creme'
  | 'brun'
  | 'rouge'
  | 'orange'
  | 'ambre'
  | 'vert'
  | 'turquoise'
  | 'bleu'
  | 'violet'
  | 'rose'
  | 'gris'

export interface BotColor {
  id: ColorId
  hex: string
}

/** Palette du personnalisateur d'origine. */
export const COLORS: BotColor[] = [
  { id: 'encre', hex: '#0a0a0c' },
  { id: 'brun', hex: '#8b5e3c' },
  { id: 'rouge', hex: '#e8483f' },
  { id: 'orange', hex: '#f08a24' },
  { id: 'ambre', hex: '#f0b429' },
  { id: 'vert', hex: '#3ecf8e' },
  { id: 'turquoise', hex: '#2fbfa0' },
  { id: 'bleu', hex: '#3b93f0' },
  { id: 'violet', hex: '#8b5cf6' },
  { id: 'rose', hex: '#e152b0' },
  { id: 'gris', hex: '#a3a3a3' },
  { id: 'creme', hex: '#f1efe9' }
]

export const COLOR_BY_ID = new Map<string, BotColor>(COLORS.map((c) => [c.id, c]))
export const DEFAULT_COLOR = 'encre'

/** Melange deux couleurs hex. Sert a la brume de profondeur des particules. */
export function mixHex(from: string, to: string, t: number): string {
  const parse = (h: string) => {
    const v = parseInt(h.slice(1), 16)
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
  }
  const a = parse(from)
  const b = parse(to)
  const c = a.map((x, i) => Math.round(x + (b[i]! - x) * t))
  return `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`
}
