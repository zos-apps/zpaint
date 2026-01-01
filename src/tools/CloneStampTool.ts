/**
 * CloneStampTool - Clone pixels from one area to another
 */

import { BaseTool, type PointerEvent, type ToolContext } from './BaseTool';
import type { CloneStampSettings } from '../types';

export class CloneStampTool extends BaseTool {
  private sourceX: number = -1;
  private sourceY: number = -1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private sourceSet: boolean = false;
  private stampCanvas: HTMLCanvasElement;
  private stampCtx: CanvasRenderingContext2D;

  constructor(ctx: ToolContext) {
    super(ctx);

    this.stampCanvas = document.createElement('canvas');
    const sctx = this.stampCanvas.getContext('2d');
    if (!sctx) throw new Error('Failed to create stamp canvas');
    this.stampCtx = sctx;
  }

  private get settings(): CloneStampSettings {
    return this.ctx.toolState.cloneStamp;
  }

  setSource(x: number, y: number): void {
    this.sourceX = x;
    this.sourceY = y;
    this.sourceSet = true;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  hasSource(): boolean {
    return this.sourceSet;
  }

  private createStampMask(pressure: number = 1): void {
    const { size, hardness } = this.settings;
    const actualSize = Math.max(1, size * pressure);
    const radius = actualSize / 2;

    this.stampCanvas.width = actualSize + 2;
    this.stampCanvas.height = actualSize + 2;

    const ctx = this.stampCtx;
    const centerX = radius + 1;
    const centerY = radius + 1;

    ctx.clearRect(0, 0, this.stampCanvas.width, this.stampCanvas.height);

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

  private stamp(x: number, y: number, pressure: number = 1): void {
    if (!this.sourceSet) return;

    const layerCtx = this.getLayerContext();
    if (!layerCtx) return;

    const { size, opacity, flow, aligned, allLayers } = this.settings;
    const actualSize = Math.max(1, size * pressure);
    const radius = actualSize / 2;

    // Calculate source position
    let srcX: number, srcY: number;
    if (aligned) {
      srcX = this.sourceX + (x - this.lastX) + this.offsetX;
      srcY = this.sourceY + (y - this.lastY) + this.offsetY;
    } else {
      srcX = this.sourceX + this.offsetX;
      srcY = this.sourceY + this.offsetY;
    }

    // Get source image data
    const sourceCanvas = allLayers
      ? this.ctx.engine.getCompositeCanvas()
      : this.ctx.engine.getActiveLayer()?.canvas;

    if (!sourceCanvas) return;

    // Create stamp mask
    this.createStampMask(pressure);

    // Sample source area
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = actualSize + 2;
    tempCanvas.height = actualSize + 2;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Draw source onto temp
    tempCtx.drawImage(
      sourceCanvas,
      srcX - radius - 1, srcY - radius - 1, actualSize + 2, actualSize + 2,
      0, 0, actualSize + 2, actualSize + 2
    );

    // Apply mask
    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.drawImage(this.stampCanvas, 0, 0);

    // Draw to layer
    layerCtx.save();
    layerCtx.globalAlpha = (opacity / 100) * (flow / 100);
    layerCtx.drawImage(tempCanvas, x - radius - 1, y - radius - 1);
    layerCtx.restore();

    // Update offset for aligned mode
    if (aligned) {
      this.offsetX += x - this.lastX;
      this.offsetY += y - this.lastY;
    }
  }

  onPointerDown(e: PointerEvent): void {
    // Alt+click to set source
    if (e.altKey) {
      this.setSource(e.x, e.y);
      return;
    }

    if (!this.sourceSet) return;

    this.isDrawing = true;
    this.lastX = e.x;
    this.lastY = e.y;

    if (!this.settings.aligned) {
      this.offsetX = 0;
      this.offsetY = 0;
    }

    this.ctx.pushHistory('Clone Stamp');
    this.stamp(e.x, e.y, e.pressure || 1);
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
      this.stamp(point.x, point.y, e.pressure || 1);
      this.lastX = point.x;
      this.lastY = point.y;
    }

    this.ctx.markDirty();
  }

  onPointerUp(_e: PointerEvent): void {
    this.isDrawing = false;
  }

  getCursor(): string {
    if (!this.sourceSet) {
      return 'crosshair';
    }
    const size = this.settings.size;
    return `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="none" stroke="blue" stroke-width="1"/></svg>') ${size/2} ${size/2}, crosshair`;
  }
}
