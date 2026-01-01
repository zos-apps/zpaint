/**
 * FillTool - Flood fill with tolerance
 */

import { BaseTool, type PointerEvent, type ToolContext } from './BaseTool';
import { rgbaToString, type FillSettings, type RGBA } from '../types';

export class FillTool extends BaseTool {
  private get settings(): FillSettings {
    return this.ctx.toolState.fill;
  }

  onPointerDown(e: PointerEvent): void {
    const layerCtx = this.getLayerContext();
    if (!layerCtx) return;

    const { width, height } = this.ctx.engine.getSize();
    const x = Math.floor(e.x);
    const y = Math.floor(e.y);

    if (x < 0 || x >= width || y < 0 || y >= height) return;

    this.ctx.pushHistory('Fill');

    // Get source image data (all layers or current layer)
    const sourceData = this.settings.allLayers
      ? this.ctx.engine.getCompositeImageData()
      : layerCtx.getImageData(0, 0, width, height);

    const targetData = layerCtx.getImageData(0, 0, width, height);

    const { tolerance, contiguous } = this.settings;
    const fillColor = this.getForegroundColor();

    // Get target color at click point
    const idx = (y * width + x) * 4;
    const targetR = sourceData.data[idx];
    const targetG = sourceData.data[idx + 1];
    const targetB = sourceData.data[idx + 2];
    const targetA = sourceData.data[idx + 3];

    const colorMatch = (i: number): boolean => {
      const dr = Math.abs(sourceData.data[i] - targetR);
      const dg = Math.abs(sourceData.data[i + 1] - targetG);
      const db = Math.abs(sourceData.data[i + 2] - targetB);
      const da = Math.abs(sourceData.data[i + 3] - targetA);
      return dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance;
    };

    const setPixel = (i: number, color: RGBA): void => {
      // Alpha compositing
      const srcA = color.a;
      const dstA = targetData.data[i + 3] / 255;
      const outA = srcA + dstA * (1 - srcA);

      if (outA > 0) {
        targetData.data[i] = (color.r * srcA + targetData.data[i] * dstA * (1 - srcA)) / outA;
        targetData.data[i + 1] = (color.g * srcA + targetData.data[i + 1] * dstA * (1 - srcA)) / outA;
        targetData.data[i + 2] = (color.b * srcA + targetData.data[i + 2] * dstA * (1 - srcA)) / outA;
        targetData.data[i + 3] = outA * 255;
      }
    };

    const visited = new Set<number>();

    if (contiguous) {
      // Flood fill
      const stack: number[] = [x + y * width];

      while (stack.length > 0) {
        const pos = stack.pop()!;
        if (visited.has(pos)) continue;
        visited.add(pos);

        const px = pos % width;
        const py = Math.floor(pos / width);

        if (px < 0 || px >= width || py < 0 || py >= height) continue;

        const i = pos * 4;
        if (!colorMatch(i)) continue;

        setPixel(i, fillColor);

        // Add neighbors
        if (px > 0) stack.push(pos - 1);
        if (px < width - 1) stack.push(pos + 1);
        if (py > 0) stack.push(pos - width);
        if (py < height - 1) stack.push(pos + width);
      }
    } else {
      // Fill all matching pixels
      for (let i = 0; i < sourceData.data.length; i += 4) {
        if (colorMatch(i)) {
          setPixel(i, fillColor);
        }
      }
    }

    layerCtx.putImageData(targetData, 0, 0);
    this.ctx.markDirty();
  }

  onPointerMove(_e: PointerEvent): void {}
  onPointerUp(_e: PointerEvent): void {}

  getCursor(): string {
    return 'crosshair';
  }
}

export class GradientTool extends BaseTool {
  private startX: number = 0;
  private startY: number = 0;

  onPointerDown(e: PointerEvent): void {
    this.isDrawing = true;
    this.startX = e.x;
    this.startY = e.y;
  }

  onPointerMove(_e: PointerEvent): void {
    if (!this.isDrawing) return;
    // Could preview gradient here
    this.ctx.markDirty();
  }

  onPointerUp(e: PointerEvent): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    const layerCtx = this.getLayerContext();
    if (!layerCtx) return;

    const { width, height } = this.ctx.engine.getSize();
    const { type, opacity, blendMode } = this.ctx.toolState.gradient;
    const fg = this.getForegroundColor();
    const bg = this.getBackgroundColor();

    this.ctx.pushHistory('Gradient');

    layerCtx.save();
    layerCtx.globalAlpha = opacity / 100;
    layerCtx.globalCompositeOperation = blendMode as GlobalCompositeOperation;

    let gradient: CanvasGradient;

    switch (type) {
      case 'linear':
        gradient = layerCtx.createLinearGradient(this.startX, this.startY, e.x, e.y);
        break;
      case 'radial': {
        const dist = Math.sqrt((e.x - this.startX) ** 2 + (e.y - this.startY) ** 2);
        gradient = layerCtx.createRadialGradient(
          this.startX, this.startY, 0,
          this.startX, this.startY, dist
        );
        break;
      }
      default:
        gradient = layerCtx.createLinearGradient(this.startX, this.startY, e.x, e.y);
    }

    gradient.addColorStop(0, rgbaToString(fg));
    gradient.addColorStop(1, rgbaToString(bg));

    layerCtx.fillStyle = gradient;
    layerCtx.fillRect(0, 0, width, height);
    layerCtx.restore();

    this.ctx.markDirty();
  }

  getCursor(): string {
    return 'crosshair';
  }
}
