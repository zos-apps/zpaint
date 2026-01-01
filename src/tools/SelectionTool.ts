/**
 * SelectionTool - Rectangle, Lasso, and Magic Wand selection
 */

import { BaseTool, type PointerEvent, type ToolContext } from './BaseTool';
import type { Selection, SelectionSettings, MagicWandSettings, ToolType } from '../types';

export class RectangleSelectTool extends BaseTool {
  private startX: number = 0;
  private startY: number = 0;
  private selectionCallback: ((selection: Selection | null) => void) | null = null;

  constructor(ctx: ToolContext, onSelection?: (selection: Selection | null) => void) {
    super(ctx);
    this.selectionCallback = onSelection ?? null;
  }

  private get settings(): SelectionSettings {
    return this.ctx.toolState.selection;
  }

  onPointerDown(e: PointerEvent): void {
    this.isDrawing = true;
    this.startX = e.x;
    this.startY = e.y;
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isDrawing) return;
    // Preview could be shown here via callback
    this.ctx.markDirty();
  }

  onPointerUp(e: PointerEvent): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    const { width, height } = this.ctx.engine.getSize();
    const x1 = Math.min(this.startX, e.x);
    const y1 = Math.min(this.startY, e.y);
    const x2 = Math.max(this.startX, e.x);
    const y2 = Math.max(this.startY, e.y);

    const rectWidth = Math.max(1, x2 - x1);
    const rectHeight = Math.max(1, y2 - y1);

    // Create selection mask
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(x1, y1, rectWidth, rectHeight);

    // Apply feather if needed
    if (this.settings.feather > 0) {
      this.applyFeather(ctx, width, height);
    }

    const mask = ctx.getImageData(0, 0, width, height);

    const selection: Selection = {
      mask,
      bounds: { x: x1, y: y1, width: rectWidth, height: rectHeight },
      active: true,
    };

    this.selectionCallback?.(selection);
    this.ctx.markDirty();
  }

  private applyFeather(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const feather = this.settings.feather;
    ctx.filter = `blur(${feather}px)`;
    const temp = document.createElement('canvas');
    temp.width = width;
    temp.height = height;
    const tempCtx = temp.getContext('2d');
    if (!tempCtx) return;
    tempCtx.drawImage(ctx.canvas, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(temp, 0, 0);
    ctx.filter = 'none';
  }

  getCursor(): string {
    return 'crosshair';
  }
}

export class LassoTool extends BaseTool {
  private points: { x: number; y: number }[] = [];
  private selectionCallback: ((selection: Selection | null) => void) | null = null;

  constructor(ctx: ToolContext, onSelection?: (selection: Selection | null) => void) {
    super(ctx);
    this.selectionCallback = onSelection ?? null;
  }

  private get settings(): SelectionSettings {
    return this.ctx.toolState.selection;
  }

  onPointerDown(e: PointerEvent): void {
    this.isDrawing = true;
    this.points = [{ x: e.x, y: e.y }];
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isDrawing) return;
    this.points.push({ x: e.x, y: e.y });
    this.ctx.markDirty();
  }

  onPointerUp(_e: PointerEvent): void {
    if (!this.isDrawing || this.points.length < 3) {
      this.isDrawing = false;
      this.points = [];
      return;
    }
    this.isDrawing = false;

    const { width, height } = this.ctx.engine.getSize();

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of this.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    // Create selection mask
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.closePath();
    ctx.fill();

    const mask = ctx.getImageData(0, 0, width, height);

    const selection: Selection = {
      mask,
      bounds: {
        x: Math.floor(minX),
        y: Math.floor(minY),
        width: Math.ceil(maxX - minX),
        height: Math.ceil(maxY - minY),
      },
      active: true,
    };

    this.selectionCallback?.(selection);
    this.points = [];
    this.ctx.markDirty();
  }

  getCursor(): string {
    return 'crosshair';
  }
}

export class MagicWandTool extends BaseTool {
  private selectionCallback: ((selection: Selection | null) => void) | null = null;

  constructor(ctx: ToolContext, onSelection?: (selection: Selection | null) => void) {
    super(ctx);
    this.selectionCallback = onSelection ?? null;
  }

  private get settings(): MagicWandSettings {
    return this.ctx.toolState.magicWand;
  }

  onPointerDown(e: PointerEvent): void {
    const { width, height } = this.ctx.engine.getSize();
    const composite = this.ctx.engine.getCompositeImageData();
    const { tolerance, contiguous } = this.settings;

    const x = Math.floor(e.x);
    const y = Math.floor(e.y);

    if (x < 0 || x >= width || y < 0 || y >= height) return;

    // Get target color
    const idx = (y * width + x) * 4;
    const targetR = composite.data[idx];
    const targetG = composite.data[idx + 1];
    const targetB = composite.data[idx + 2];
    const targetA = composite.data[idx + 3];

    // Create selection mask
    const mask = new ImageData(width, height);
    const visited = new Set<number>();

    const colorMatch = (i: number): boolean => {
      const dr = Math.abs(composite.data[i] - targetR);
      const dg = Math.abs(composite.data[i + 1] - targetG);
      const db = Math.abs(composite.data[i + 2] - targetB);
      const da = Math.abs(composite.data[i + 3] - targetA);
      return dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance;
    };

    if (contiguous) {
      // Flood fill algorithm
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

        // Mark as selected (white)
        mask.data[i] = 255;
        mask.data[i + 1] = 255;
        mask.data[i + 2] = 255;
        mask.data[i + 3] = 255;

        // Add neighbors
        if (px > 0) stack.push(pos - 1);
        if (px < width - 1) stack.push(pos + 1);
        if (py > 0) stack.push(pos - width);
        if (py < height - 1) stack.push(pos + width);
      }
    } else {
      // Select all matching colors
      for (let i = 0; i < composite.data.length; i += 4) {
        if (colorMatch(i)) {
          mask.data[i] = 255;
          mask.data[i + 1] = 255;
          mask.data[i + 2] = 255;
          mask.data[i + 3] = 255;
        }
      }
    }

    // Calculate bounds
    let minX = width, minY = height, maxX = 0, maxY = 0;
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const i = (py * width + px) * 4;
        if (mask.data[i] > 0) {
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        }
      }
    }

    const selection: Selection = {
      mask,
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      },
      active: true,
    };

    this.selectionCallback?.(selection);
    this.ctx.markDirty();
  }

  onPointerMove(_e: PointerEvent): void {}
  onPointerUp(_e: PointerEvent): void {}

  getCursor(): string {
    return 'crosshair';
  }
}
