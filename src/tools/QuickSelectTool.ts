/**
 * QuickSelectTool - Smart edge-aware selection tool
 *
 * Similar to Photoshop's Quick Selection tool:
 * - Automatically follows edges while painting
 * - Supports add/subtract modes
 * - Adjustable brush size
 */

import { BaseTool, type PointerEvent, type ToolContext } from './BaseTool';
import { SelectionEngine } from '../engine/SelectionEngine';
import type { Selection, SelectionMode } from '../types';

export interface QuickSelectSettings {
  size: number;          // Brush size
  hardness: number;      // Edge detection hardness
  sampleAllLayers: boolean;
  autoEnhance: boolean;  // Automatically enhance edge detection
}

export class QuickSelectTool extends BaseTool {
  private selectionEngine: SelectionEngine | null = null;
  private selectionCallback: ((selection: Selection | null) => void) | null = null;
  private currentSelection: Selection | null = null;
  private mode: SelectionMode = 'new';
  private settings: QuickSelectSettings;

  constructor(
    ctx: ToolContext,
    settings: QuickSelectSettings,
    onSelection?: (selection: Selection | null) => void
  ) {
    super(ctx);
    this.settings = settings;
    this.selectionCallback = onSelection ?? null;
  }

  setMode(mode: SelectionMode): void {
    this.mode = mode;
  }

  setSettings(settings: Partial<QuickSelectSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  setCurrentSelection(selection: Selection | null): void {
    this.currentSelection = selection;
  }

  onPointerDown(e: PointerEvent): void {
    this.isDrawing = true;
    this.lastX = e.x;
    this.lastY = e.y;

    // Initialize selection engine if needed
    const { width, height } = this.ctx.engine.getSize();
    if (!this.selectionEngine) {
      this.selectionEngine = new SelectionEngine(width, height);
    }

    // Determine effective mode
    let effectiveMode = this.mode;
    if (e.altKey) {
      effectiveMode = 'subtract';
    } else if (e.shiftKey && this.currentSelection) {
      effectiveMode = 'add';
    } else if (!this.currentSelection) {
      effectiveMode = 'new';
    }

    // If starting new selection (not add/subtract), reset current
    if (effectiveMode === 'new') {
      this.currentSelection = null;
    }

    this.ctx.pushHistory('Quick Select');
    this.performSelection(e.x, e.y, effectiveMode);
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isDrawing) return;

    // Determine effective mode
    let effectiveMode: SelectionMode = 'add';
    if (e.altKey) {
      effectiveMode = 'subtract';
    }

    this.performSelection(e.x, e.y, effectiveMode);
    this.lastX = e.x;
    this.lastY = e.y;
  }

  onPointerUp(_e: PointerEvent): void {
    this.isDrawing = false;
  }

  private performSelection(x: number, y: number, mode: SelectionMode): void {
    if (!this.selectionEngine) return;

    const imageData = this.ctx.engine.getCompositeImageData();
    const newSelection = this.selectionEngine.quickSelect(
      imageData,
      x,
      y,
      this.settings.size,
      mode,
      this.currentSelection ?? undefined
    );

    // Apply auto-enhance if enabled
    if (this.settings.autoEnhance && newSelection) {
      // Smooth edges slightly
      const enhanced = this.selectionEngine.smoothSelection(newSelection, 1);
      this.currentSelection = enhanced;
    } else {
      this.currentSelection = newSelection;
    }

    this.selectionCallback?.(this.currentSelection);
    this.ctx.markDirty();
  }

  getCursor(): string {
    const size = this.settings.size;
    return `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="none" stroke="black" stroke-width="1" stroke-dasharray="2,2"/></svg>') ${size/2} ${size/2}, crosshair`;
  }
}

/**
 * SelectSubjectTool - AI-powered automatic subject selection
 */
export class SelectSubjectTool extends BaseTool {
  private selectionEngine: SelectionEngine | null = null;
  private selectionCallback: ((selection: Selection | null) => void) | null = null;

  constructor(
    ctx: ToolContext,
    onSelection?: (selection: Selection | null) => void
  ) {
    super(ctx);
    this.selectionCallback = onSelection ?? null;
  }

  /**
   * Execute subject selection (call this directly, not via pointer events)
   */
  selectSubject(): void {
    const { width, height } = this.ctx.engine.getSize();
    if (!this.selectionEngine) {
      this.selectionEngine = new SelectionEngine(width, height);
    }

    this.ctx.pushHistory('Select Subject');

    const imageData = this.ctx.engine.getCompositeImageData();
    const selection = this.selectionEngine.selectSubject(imageData);

    this.selectionCallback?.(selection);
    this.ctx.markDirty();
  }

  onPointerDown(_e: PointerEvent): void {
    // Subject selection is triggered by button, not pointer
    this.selectSubject();
  }

  onPointerMove(_e: PointerEvent): void {}
  onPointerUp(_e: PointerEvent): void {}

  getCursor(): string {
    return 'default';
  }
}

/**
 * ColorRangeTool - Select by color range
 */
export class ColorRangeTool extends BaseTool {
  private selectionEngine: SelectionEngine | null = null;
  private selectionCallback: ((selection: Selection | null) => void) | null = null;
  private fuzziness: number = 40;

  constructor(
    ctx: ToolContext,
    onSelection?: (selection: Selection | null) => void
  ) {
    super(ctx);
    this.selectionCallback = onSelection ?? null;
  }

  setFuzziness(value: number): void {
    this.fuzziness = value;
  }

  onPointerDown(e: PointerEvent): void {
    const { width, height } = this.ctx.engine.getSize();
    if (!this.selectionEngine) {
      this.selectionEngine = new SelectionEngine(width, height);
    }

    const imageData = this.ctx.engine.getCompositeImageData();
    const x = Math.floor(e.x);
    const y = Math.floor(e.y);

    if (x < 0 || x >= width || y < 0 || y >= height) return;

    // Get color at click point
    const idx = (y * width + x) * 4;
    const targetColor = {
      r: imageData.data[idx],
      g: imageData.data[idx + 1],
      b: imageData.data[idx + 2],
      a: 1,
    };

    this.ctx.pushHistory('Select Color Range');

    const selection = this.selectionEngine.selectColorRange(imageData, {
      targetColor,
      fuzziness: this.fuzziness,
      range: 'sampled',
      localized: false,
      localizedRadius: 0,
    });

    this.selectionCallback?.(selection);
    this.ctx.markDirty();
  }

  onPointerMove(_e: PointerEvent): void {}
  onPointerUp(_e: PointerEvent): void {}

  getCursor(): string {
    return 'crosshair';
  }
}
