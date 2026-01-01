/**
 * EraserTool - Erase pixels from the active layer
 */

import { BaseTool, type PointerEvent, type ToolContext } from './BaseTool';
import type { EraserSettings } from '../types';

export class EraserTool extends BaseTool {
  private eraserCanvas: HTMLCanvasElement;
  private eraserCtx: CanvasRenderingContext2D;

  constructor(ctx: ToolContext) {
    super(ctx);

    this.eraserCanvas = document.createElement('canvas');
    const ectx = this.eraserCanvas.getContext('2d');
    if (!ectx) throw new Error('Failed to create eraser canvas');
    this.eraserCtx = ectx;
  }

  private get settings(): EraserSettings {
    return this.ctx.toolState.eraser;
  }

  private createEraserTip(pressure: number = 1): void {
    const { size, hardness } = this.settings;
    const actualSize = Math.max(1, size * pressure);
    const radius = actualSize / 2;

    this.eraserCanvas.width = actualSize + 2;
    this.eraserCanvas.height = actualSize + 2;

    const ctx = this.eraserCtx;
    const centerX = radius + 1;
    const centerY = radius + 1;

    ctx.clearRect(0, 0, this.eraserCanvas.width, this.eraserCanvas.height);

    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius
    );

    const h = hardness / 100;

    if (h >= 1) {
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(1, 'white');
    } else {
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(h, 'white');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private erase(x: number, y: number, pressure: number = 1): void {
    const layerCtx = this.getLayerContext();
    if (!layerCtx) return;

    const { size, opacity, flow } = this.settings;
    const actualSize = Math.max(1, size * pressure);

    this.createEraserTip(pressure);

    layerCtx.save();
    layerCtx.globalCompositeOperation = 'destination-out';
    layerCtx.globalAlpha = (opacity / 100) * (flow / 100);
    layerCtx.drawImage(
      this.eraserCanvas,
      x - actualSize / 2 - 1,
      y - actualSize / 2 - 1
    );
    layerCtx.restore();
  }

  onPointerDown(e: PointerEvent): void {
    this.isDrawing = true;
    this.lastX = e.x;
    this.lastY = e.y;

    this.ctx.pushHistory('Eraser');
    this.erase(e.x, e.y, e.pressure || 1);
    this.ctx.markDirty();
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isDrawing) return;

    const spacingPx = Math.max(1, this.settings.size * 0.25);
    const points = this.interpolatePoints(
      this.lastX, this.lastY,
      e.x, e.y,
      spacingPx
    );

    for (const point of points) {
      this.erase(point.x, point.y, e.pressure || 1);
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
    return `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="none" stroke="gray" stroke-width="1"/></svg>') ${size/2} ${size/2}, crosshair`;
  }
}
