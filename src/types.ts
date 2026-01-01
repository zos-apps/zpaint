/**
 * zPaint Types
 *
 * Core types for the raster graphics editor.
 */

// ============================================================================
// Color Types
// ============================================================================

export interface RGBA {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-1
}

export interface HSLA {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
  a: number; // 0-1
}

export type ColorMode = 'rgb' | 'hsl';

export interface ColorSwatch {
  id: string;
  color: RGBA;
  name?: string;
}

// ============================================================================
// Blend Modes
// ============================================================================

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'
  | 'source-over'
  | 'source-in'
  | 'source-out'
  | 'source-atop'
  | 'destination-over'
  | 'destination-in'
  | 'destination-out'
  | 'lighter';

export const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
  { value: 'hue', label: 'Hue' },
  { value: 'saturation', label: 'Saturation' },
  { value: 'color', label: 'Color' },
  { value: 'luminosity', label: 'Luminosity' },
];

// ============================================================================
// Layer Types
// ============================================================================

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0-1
  blendMode: BlendMode;
  canvas: HTMLCanvasElement;
  mask?: HTMLCanvasElement;
  maskEnabled: boolean;
  maskLinked: boolean;
}

export interface LayerState {
  layers: Layer[];
  activeLayerId: string | null;
  selectedLayerIds: string[];
}

// ============================================================================
// Selection Types
// ============================================================================

export type SelectionMode = 'new' | 'add' | 'subtract' | 'intersect';

export interface Selection {
  mask: ImageData;
  bounds: { x: number; y: number; width: number; height: number };
  active: boolean;
}

// ============================================================================
// Tool Types
// ============================================================================

export type ToolType =
  | 'brush'
  | 'eraser'
  | 'rectangle-select'
  | 'lasso-select'
  | 'magic-wand'
  | 'quick-select'
  | 'select-subject'
  | 'color-range'
  | 'refine-edge'
  | 'mask-brush'
  | 'fill'
  | 'gradient'
  | 'clone-stamp'
  | 'eyedropper'
  | 'move'
  | 'zoom'
  | 'hand'
  // Version 3 tools
  | 'healing-brush'
  | 'spot-healing'
  | 'content-aware-fill'
  | 'dodge'
  | 'burn'
  | 'liquify'
  // Version 4 tools
  | 'history-brush';

export interface BrushSettings {
  size: number;        // 1-500
  hardness: number;    // 0-100
  opacity: number;     // 0-100
  flow: number;        // 0-100
  spacing: number;     // 0-200 percent
  smoothing: number;   // 0-100
}

export interface EraserSettings {
  size: number;
  hardness: number;
  opacity: number;
  flow: number;
}

export interface SelectionSettings {
  mode: SelectionMode;
  feather: number;
  antiAlias: boolean;
}

export interface MagicWandSettings extends SelectionSettings {
  tolerance: number;   // 0-255
  contiguous: boolean;
}

export interface FillSettings {
  tolerance: number;
  contiguous: boolean;
  antiAlias: boolean;
  allLayers: boolean;
}

export interface GradientSettings {
  type: 'linear' | 'radial' | 'angular' | 'reflected' | 'diamond';
  colors: RGBA[];
  stops: number[];
  opacity: number;
  blendMode: BlendMode;
}

export interface CloneStampSettings {
  size: number;
  hardness: number;
  opacity: number;
  flow: number;
  aligned: boolean;
  allLayers: boolean;
}

// ============================================================================
// Version 2: Advanced Selection & Masking Settings
// ============================================================================

export interface QuickSelectSettings {
  size: number;
  hardness: number;
  sampleAllLayers: boolean;
  autoEnhance: boolean;
}

export interface RefineEdgeBrushSettings {
  size: number;
  hardness: number;
  mode: 'refine' | 'erase';
}

export interface ColorRangeSettings {
  fuzziness: number;      // 0-200
  range: 'shadows' | 'midtones' | 'highlights' | 'reds' | 'yellows' | 'greens' | 'cyans' | 'blues' | 'magentas' | 'sampled';
  localized: boolean;
  localizedRadius: number;
  invert: boolean;
}

// ============================================================================
// Version 3: Professional Retouching Settings
// ============================================================================

export interface HealingBrushSettings {
  size: number;
  hardness: number;
  spacing: number;
  mode: 'normal' | 'replace' | 'multiply' | 'screen' | 'darken' | 'lighten' | 'color' | 'luminosity';
  source: 'sampled' | 'pattern';
  aligned: boolean;
  sampleAllLayers: boolean;
}

export interface SpotHealingSettings {
  size: number;
  hardness: number;
  type: 'proximity-match' | 'create-texture' | 'content-aware';
  sampleAllLayers: boolean;
}

export interface ContentAwareFillSettings {
  adaptation: 'very-strict' | 'strict' | 'default' | 'loose' | 'very-loose';
  colorAdaptation: number;  // 0-10
  rotation: 'none' | 'low' | 'medium' | 'high' | 'full';
  scale: boolean;
  mirror: boolean;
  outputTo: 'current-layer' | 'new-layer';
}

export interface DodgeBurnSettings {
  size: number;
  hardness: number;
  exposure: number;        // 0-100
  range: 'shadows' | 'midtones' | 'highlights';
  protectTones: boolean;
}

export interface LiquifySettings {
  size: number;
  pressure: number;        // 0-100
  density: number;         // 0-100
  rate: number;            // 0-100
  tool: 'forward-warp' | 'reconstruct' | 'twirl-clockwise' | 'twirl-counter' | 'pucker' | 'bloat' | 'push-left' | 'freeze' | 'thaw';
}

// ============================================================================
// Version 3: Adjustment Layer Types
// ============================================================================

export type AdjustmentType =
  | 'brightness-contrast'
  | 'levels'
  | 'curves'
  | 'exposure'
  | 'vibrance'
  | 'hue-saturation'
  | 'color-balance'
  | 'black-white'
  | 'photo-filter'
  | 'channel-mixer'
  | 'color-lookup'
  | 'invert'
  | 'posterize'
  | 'threshold'
  | 'gradient-map'
  | 'selective-color';

export interface AdjustmentLayerData {
  type: AdjustmentType;
  settings: Record<string, unknown>;
}

// ============================================================================
// Version 3: Smart Object Types
// ============================================================================

export interface SmartObjectData {
  sourceType: 'embedded' | 'linked';
  sourcePath?: string;
  originalWidth: number;
  originalHeight: number;
  transform: {
    scaleX: number;
    scaleY: number;
    rotation: number;
    skewX: number;
    skewY: number;
  };
  filters: SmartFilter[];
}

export interface SmartFilter {
  id: string;
  type: FilterType;
  settings: Record<string, unknown>;
  blendMode: BlendMode;
  opacity: number;
  enabled: boolean;
}

// ============================================================================
// Version 4: Layer Effects Types
// ============================================================================

export interface LayerEffects {
  dropShadow?: DropShadowEffect;
  innerShadow?: InnerShadowEffect;
  outerGlow?: GlowEffect;
  innerGlow?: GlowEffect;
  bevelEmboss?: BevelEmbossEffect;
  satin?: SatinEffect;
  colorOverlay?: ColorOverlayEffect;
  gradientOverlay?: GradientOverlayEffect;
  patternOverlay?: PatternOverlayEffect;
  stroke?: StrokeEffect;
}

export interface DropShadowEffect {
  enabled: boolean;
  blendMode: BlendMode;
  color: RGBA;
  opacity: number;
  angle: number;
  distance: number;
  spread: number;
  size: number;
  contour: 'linear' | 'gaussian' | 'custom';
  antiAlias: boolean;
  noise: number;
  layerKnocksOut: boolean;
}

export interface InnerShadowEffect {
  enabled: boolean;
  blendMode: BlendMode;
  color: RGBA;
  opacity: number;
  angle: number;
  distance: number;
  choke: number;
  size: number;
  contour: 'linear' | 'gaussian' | 'custom';
  antiAlias: boolean;
  noise: number;
}

export interface GlowEffect {
  enabled: boolean;
  blendMode: BlendMode;
  opacity: number;
  noise: number;
  color: RGBA;
  technique: 'softer' | 'precise';
  source?: 'center' | 'edge';  // Only for inner glow
  choke: number;
  size: number;
  contour: 'linear' | 'gaussian' | 'custom';
  antiAlias: boolean;
  range: number;
  jitter: number;
}

export interface BevelEmbossEffect {
  enabled: boolean;
  style: 'outer-bevel' | 'inner-bevel' | 'emboss' | 'pillow-emboss' | 'stroke-emboss';
  technique: 'smooth' | 'chisel-hard' | 'chisel-soft';
  depth: number;
  direction: 'up' | 'down';
  size: number;
  soften: number;
  angle: number;
  altitude: number;
  highlightMode: BlendMode;
  highlightColor: RGBA;
  highlightOpacity: number;
  shadowMode: BlendMode;
  shadowColor: RGBA;
  shadowOpacity: number;
}

export interface SatinEffect {
  enabled: boolean;
  blendMode: BlendMode;
  color: RGBA;
  opacity: number;
  angle: number;
  distance: number;
  size: number;
  contour: 'linear' | 'gaussian' | 'custom';
  antiAlias: boolean;
  invert: boolean;
}

export interface ColorOverlayEffect {
  enabled: boolean;
  blendMode: BlendMode;
  color: RGBA;
  opacity: number;
}

export interface GradientOverlayEffect {
  enabled: boolean;
  blendMode: BlendMode;
  opacity: number;
  gradient: {
    colors: RGBA[];
    stops: number[];
  };
  style: 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond';
  alignWithLayer: boolean;
  angle: number;
  scale: number;
  reverse: boolean;
}

export interface PatternOverlayEffect {
  enabled: boolean;
  blendMode: BlendMode;
  opacity: number;
  patternId: string;
  scale: number;
  linkWithLayer: boolean;
}

export interface StrokeEffect {
  enabled: boolean;
  blendMode: BlendMode;
  size: number;
  position: 'outside' | 'inside' | 'center';
  fillType: 'color' | 'gradient' | 'pattern';
  color: RGBA;
  opacity: number;
}

// ============================================================================
// Version 4: Actions Types
// ============================================================================

export interface Action {
  id: string;
  name: string;
  steps: ActionStep[];
  shortcut?: string;
}

export interface ActionStep {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  parameters: Record<string, unknown>;
}

export interface ActionSet {
  id: string;
  name: string;
  actions: Action[];
}

export interface ToolState {
  activeTool: ToolType;
  brush: BrushSettings;
  eraser: EraserSettings;
  selection: SelectionSettings;
  magicWand: MagicWandSettings;
  fill: FillSettings;
  gradient: GradientSettings;
  cloneStamp: CloneStampSettings;
  foregroundColor: RGBA;
  backgroundColor: RGBA;
}

// ============================================================================
// Filter Types
// ============================================================================

export type FilterType =
  | 'gaussian-blur'
  | 'motion-blur'
  | 'sharpen'
  | 'brightness-contrast'
  | 'hue-saturation'
  | 'levels'
  | 'curves'
  | 'invert'
  | 'desaturate';

export interface BlurSettings {
  radius: number;
}

export interface MotionBlurSettings {
  radius: number;
  angle: number;
}

export interface SharpenSettings {
  amount: number;
  radius: number;
  threshold: number;
}

export interface BrightnessContrastSettings {
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
}

export interface HueSaturationSettings {
  hue: number;        // -180 to 180
  saturation: number; // -100 to 100
  lightness: number;  // -100 to 100
}

export interface LevelsSettings {
  inputBlack: number;  // 0-255
  inputWhite: number;  // 0-255
  gamma: number;       // 0.1-10
  outputBlack: number; // 0-255
  outputWhite: number; // 0-255
}

export interface CurvesPoint {
  x: number; // 0-255
  y: number; // 0-255
}

export interface CurvesSettings {
  rgb: CurvesPoint[];
  red: CurvesPoint[];
  green: CurvesPoint[];
  blue: CurvesPoint[];
}

// ============================================================================
// Document Types
// ============================================================================

export interface DocumentState {
  width: number;
  height: number;
  dpi: number;
  backgroundColor: RGBA;
  name: string;
  dirty: boolean;
}

// ============================================================================
// History Types
// ============================================================================

export interface HistoryEntry {
  id: string;
  name: string;
  timestamp: number;
  snapshot: {
    layers: LayerSnapshot[];
    activeLayerId: string | null;
  };
}

export interface LayerSnapshot {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  imageData: ImageData;
  maskData?: ImageData;
  maskEnabled: boolean;
  maskLinked: boolean;
}

// ============================================================================
// View Types
// ============================================================================

export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;
  showGrid: boolean;
  showGuides: boolean;
  showRulers: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

// ============================================================================
// App State
// ============================================================================

export interface ZPaintState {
  document: DocumentState;
  layers: LayerState;
  tools: ToolState;
  selection: Selection | null;
  view: ViewState;
  history: HistoryEntry[];
  historyIndex: number;
  colorHistory: RGBA[];
  swatches: ColorSwatch[];
}

// ============================================================================
// Utility Functions
// ============================================================================

export function rgbaToString(color: RGBA): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}

export function rgbaToHex(color: RGBA): string {
  const r = color.r.toString(16).padStart(2, '0');
  const g = color.g.toString(16).padStart(2, '0');
  const b = color.b.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function hexToRgba(hex: string, alpha: number = 1): RGBA {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0, a: alpha };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    a: alpha,
  };
}

export function rgbaToHsla(color: RGBA): HSLA {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a: color.a,
  };
}

export function hslaToRgba(color: HSLA): RGBA {
  const h = color.h / 360;
  const s = color.s / 100;
  const l = color.l / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: color.a,
  };
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
