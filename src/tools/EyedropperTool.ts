/**
 * EyedropperTool - Sample colors from the canvas
 */

import { BaseTool, type PointerEvent, type ToolContext } from './BaseTool';
import type { RGBA } from '../types';

export class EyedropperTool extends BaseTool {
  private colorCallback: ((color: RGBA) => void) | null = null;

  constructor(ctx: ToolContext, onColorPick?: (color: RGBA) => void) {
    super(ctx);
    this.colorCallback = onColorPick ?? null;
  }

  private sampleColor(x: number, y: number): RGBA | null {
    const { width, height } = this.ctx.engine.getSize();

    if (x < 0 || x >= width || y < 0 || y >= height) return null;

    const composite = this.ctx.engine.getCompositeImageData();
    const idx = (Math.floor(y) * width + Math.floor(x)) * 4;

    return {
      r: composite.data[idx],
      g: composite.data[idx + 1],
      b: composite.data[idx + 2],
      a: composite.data[idx + 3] / 255,
    };
  }

  onPointerDown(e: PointerEvent): void {
    this.isDrawing = true;
    const color = this.sampleColor(e.x, e.y);
    if (color) {
      this.colorCallback?.(color);
    }
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isDrawing) return;
    const color = this.sampleColor(e.x, e.y);
    if (color) {
      this.colorCallback?.(color);
    }
  }

  onPointerUp(_e: PointerEvent): void {
    this.isDrawing = false;
  }

  getCursor(): string {
    return 'crosshair';
  }
}
