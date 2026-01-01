/**
 * RefineEdgeTool - Refine Edge brush for mask editing
 *
 * Used in Select and Mask workspace to:
 * - Refine complex edges (hair, fur)
 * - Paint to reveal/hide edge details
 * - Smart edge detection while painting
 */

import { BaseTool, type PointerEvent, type ToolContext } from './BaseTool';
import { MaskEngine } from '../engine/MaskEngine';
import type { Selection } from '../types';

export type RefineEdgeMode = 'refine' | 'erase';

export interface RefineEdgeBrushSettings {
  size: number;
  hardness: number;
  mode: RefineEdgeMode;
}

export class RefineEdgeTool extends BaseTool {
  private maskEngine: MaskEngine | null = null;
  private settings: RefineEdgeBrushSettings;
  private currentMask: HTMLCanvasElement | null = null;
  private onMaskChange: ((mask: HTMLCanvasElement) => void) | null = null;

  constructor(
    ctx: ToolContext,
    settings: RefineEdgeBrushSettings,
    onMaskChange?: (mask: HTMLCanvasElement) => void
  ) {
    super(ctx);
    this.settings = settings;
    this.onMaskChange = onMaskChange ?? null;
  }

  setSettings(settings: Partial<RefineEdgeBrushSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  setMask(mask: HTMLCanvasElement): void {
    this.currentMask = mask;
  }

  getMask(): HTMLCanvasElement | null {
    return this.currentMask;
  }

  onPointerDown(e: PointerEvent): void {
    if (!this.currentMask) return;

    this.isDrawing = true;
    this.lastX = e.x;
    this.lastY = e.y;

    const { width, height } = this.ctx.engine.getSize();
    if (!this.maskEngine) {
      this.maskEngine = new MaskEngine(width, height);
    }

    this.refineAt(e.x, e.y);
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isDrawing || !this.currentMask) return;

    // Interpolate between last and current position
    const spacing = Math.max(1, this.settings.size / 4);
    const points = this.interpolatePoints(
      this.lastX, this.lastY,
      e.x, e.y,
      spacing
    );

    for (const point of points) {
      this.refineAt(point.x, point.y);
    }

    this.lastX = e.x;
    this.lastY = e.y;
  }

  onPointerUp(_e: PointerEvent): void {
    this.isDrawing = false;
  }

  private refineAt(x: number, y: number): void {
    if (!this.currentMask || !this.maskEngine) return;

    const imageData = this.ctx.engine.getCompositeImageData();

    this.maskEngine.refineMaskWithBrush(
      this.currentMask,
      imageData,
      x,
      y,
      this.settings.size / 2,
      this.settings.mode
    );

    this.onMaskChange?.(this.currentMask);
    this.ctx.markDirty();
  }

  getCursor(): string {
    const size = this.settings.size;
    const color = this.settings.mode === 'refine' ? 'lime' : 'red';
    return `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="none" stroke="${color}" stroke-width="2"/></svg>') ${size/2} ${size/2}, crosshair`;
  }
}

/**
 * MaskBrushTool - Paint directly on layer mask
 */
export class MaskBrushTool extends BaseTool {
  private brushCanvas: HTMLCanvasElement;
  private brushCtx: CanvasRenderingContext2D;
  private settings: {
    size: number;
    hardness: number;
    opacity: number;
    flow: number;
  };
  private paintWhite: boolean = true; // true = reveal, false = hide

  constructor(
    ctx: ToolContext,
    settings?: Partial<{
      size: number;
      hardness: number;
      opacity: number;
      flow: number;
    }>
  ) {
    super(ctx);
    this.settings = {
      size: settings?.size ?? 20,
      hardness: settings?.hardness ?? 80,
      opacity: settings?.opacity ?? 100,
      flow: settings?.flow ?? 100,
    };

    this.brushCanvas = document.createElement('canvas');
    const bctx = this.brushCanvas.getContext('2d');
    if (!bctx) throw new Error('Failed to create brush canvas');
    this.brushCtx = bctx;
  }

  setPaintMode(reveal: boolean): void {
    this.paintWhite = reveal;
  }

  setSettings(settings: Partial<typeof this.settings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  private createBrushTip(pressure: number = 1): void {
    const { size, hardness } = this.settings;
    const actualSize = Math.max(1, size * pressure);
    const radius = actualSize / 2;

    this.brushCanvas.width = actualSize + 2;
    this.brushCanvas.height = actualSize + 2;

    const ctx = this.brushCtx;
    const centerX = radius + 1;
    const centerY = radius + 1;

    ctx.clearRect(0, 0, this.brushCanvas.width, this.brushCanvas.height);

    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius
    );

    const color = this.paintWhite ? 'white' : 'black';
    const h = hardness / 100;

    if (h >= 1) {
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color);
    } else {
      gradient.addColorStop(0, color);
      gradient.addColorStop(h, color);
      gradient.addColorStop(1, 'transparent');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private stamp(x: number, y: number, pressure: number = 1): void {
    const layer = this.ctx.engine.getActiveLayer();
    if (!layer?.mask) return;

    const maskCtx = layer.mask.getContext('2d');
    if (!maskCtx) return;

    const { size, opacity, flow } = this.settings;
    const actualSize = Math.max(1, size * pressure);

    this.createBrushTip(pressure);

    maskCtx.save();
    maskCtx.globalAlpha = (opacity / 100) * (flow / 100);
    maskCtx.drawImage(
      this.brushCanvas,
      x - actualSize / 2 - 1,
      y - actualSize / 2 - 1
    );
    maskCtx.restore();
  }

  onPointerDown(e: PointerEvent): void {
    const layer = this.ctx.engine.getActiveLayer();
    if (!layer?.mask) return;

    this.isDrawing = true;
    this.lastX = e.x;
    this.lastY = e.y;

    this.ctx.pushHistory('Paint Mask');
    this.stamp(e.x, e.y, e.pressure || 1);
    this.ctx.markDirty();
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isDrawing) return;

    const spacing = Math.max(1, (this.settings.size * 25) / 100);
    const points = this.interpolatePoints(
      this.lastX, this.lastY,
      e.x, e.y,
      spacing
    );

    for (const point of points) {
      this.stamp(point.x, point.y, e.pressure || 1);
    }

    this.lastX = e.x;
    this.lastY = e.y;
    this.ctx.markDirty();
  }

  onPointerUp(_e: PointerEvent): void {
    this.isDrawing = false;
  }

  getCursor(): string {
    const size = this.settings.size;
    const color = this.paintWhite ? 'white' : 'gray';
    return `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="none" stroke="${color}" stroke-width="1"/></svg>') ${size/2} ${size/2}, crosshair`;
  }
}
