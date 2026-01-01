/**
 * BrushTool - Freehand drawing with customizable brush
 */

import { BaseTool, type PointerEvent, type ToolContext } from './BaseTool';
import { rgbaToString, type BrushSettings } from '../types';

export class BrushTool extends BaseTool {
  private brushCanvas: HTMLCanvasElement;
  private brushCtx: CanvasRenderingContext2D;
  private points: { x: number; y: number; pressure: number }[] = [];

  constructor(ctx: ToolContext) {
    super(ctx);

    // Pre-render brush tip
    this.brushCanvas = document.createElement('canvas');
    const bctx = this.brushCanvas.getContext('2d');
    if (!bctx) throw new Error('Failed to create brush canvas');
    this.brushCtx = bctx;
  }

  private get settings(): BrushSettings {
    return this.ctx.toolState.brush;
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

    // Clear
    ctx.clearRect(0, 0, this.brushCanvas.width, this.brushCanvas.height);

    // Create gradient for brush hardness
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius
    );

    const color = this.getForegroundColor();
    const h = hardness / 100;

    // Hardness affects the gradient falloff
    if (h >= 1) {
      // Full hardness - solid circle
      gradient.addColorStop(0, rgbaToString(color));
      gradient.addColorStop(1, rgbaToString(color));
    } else {
      gradient.addColorStop(0, rgbaToString(color));
      gradient.addColorStop(h, rgbaToString(color));
      gradient.addColorStop(1, rgbaToString({ ...color, a: 0 }));
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private stamp(x: number, y: number, pressure: number = 1): void {
    const layerCtx = this.getLayerContext();
    if (!layerCtx) return;

    const { size, opacity, flow } = this.settings;
    const actualSize = Math.max(1, size * pressure);

    this.createBrushTip(pressure);

    layerCtx.save();
    layerCtx.globalAlpha = (opacity / 100) * (flow / 100);
    layerCtx.drawImage(
      this.brushCanvas,
      x - actualSize / 2 - 1,
      y - actualSize / 2 - 1
    );
    layerCtx.restore();
  }

  onPointerDown(e: PointerEvent): void {
    this.isDrawing = true;
    this.points = [{ x: e.x, y: e.y, pressure: e.pressure || 1 }];
    this.lastX = e.x;
    this.lastY = e.y;

    this.ctx.pushHistory('Brush Stroke');
    this.stamp(e.x, e.y, e.pressure || 1);
    this.ctx.markDirty();
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isDrawing) return;

    const { spacing } = this.settings;
    const spacingPx = Math.max(1, (this.settings.size * spacing) / 100);

    const points = this.interpolatePoints(
      this.lastX, this.lastY,
      e.x, e.y,
      spacingPx
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
    this.points = [];
  }

  getCursor(): string {
    const size = this.settings.size;
    return `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="none" stroke="black" stroke-width="1"/></svg>') ${size/2} ${size/2}, crosshair`;
  }
}
