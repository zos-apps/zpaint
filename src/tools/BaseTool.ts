/**
 * BaseTool - Abstract base class for all drawing tools
 */

import type { RasterEngine } from '../engine/RasterEngine';
import type { RGBA, ToolState } from '../types';

export interface PointerEvent {
  x: number;
  y: number;
  pressure: number;
  buttons: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

export interface ToolContext {
  engine: RasterEngine;
  toolState: ToolState;
  markDirty: () => void;
  pushHistory: (name: string) => void;
}

export abstract class BaseTool {
  protected ctx: ToolContext;
  protected isDrawing: boolean = false;
  protected lastX: number = 0;
  protected lastY: number = 0;

  constructor(ctx: ToolContext) {
    this.ctx = ctx;
  }

  abstract onPointerDown(e: PointerEvent): void;
  abstract onPointerMove(e: PointerEvent): void;
  abstract onPointerUp(e: PointerEvent): void;

  onPointerEnter(_e: PointerEvent): void {}
  onPointerLeave(_e: PointerEvent): void {}

  getCursor(): string {
    return 'crosshair';
  }

  protected getLayerContext(): CanvasRenderingContext2D | null {
    return this.ctx.engine.getActiveLayerContext();
  }

  protected getForegroundColor(): RGBA {
    return this.ctx.toolState.foregroundColor;
  }

  protected getBackgroundColor(): RGBA {
    return this.ctx.toolState.backgroundColor;
  }

  protected interpolatePoints(
    x1: number, y1: number,
    x2: number, y2: number,
    spacing: number
  ): { x: number; y: number }[] {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.floor(dist / spacing));
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push({
        x: x1 + dx * t,
        y: y1 + dy * t,
      });
    }

    return points;
  }
}
