/**
 * RasterEngine - Multi-layer compositing engine for zPaint
 *
 * Provides:
 * - Layer management with proper z-ordering
 * - Blend mode compositing
 * - Alpha channel support
 * - Layer masks
 * - Efficient dirty-rect rendering
 */

import type {
  Layer,
  BlendMode,
  RGBA,
  Selection,
  LayerSnapshot,
} from '../types';
import { generateId, rgbaToString } from '../types';

// Canvas blend mode mapping
const BLEND_MODE_MAP: Record<BlendMode, GlobalCompositeOperation> = {
  'normal': 'source-over',
  'multiply': 'multiply',
  'screen': 'screen',
  'overlay': 'overlay',
  'darken': 'darken',
  'lighten': 'lighten',
  'color-dodge': 'color-dodge',
  'color-burn': 'color-burn',
  'hard-light': 'hard-light',
  'soft-light': 'soft-light',
  'difference': 'difference',
  'exclusion': 'exclusion',
  'hue': 'hue',
  'saturation': 'saturation',
  'color': 'color',
  'luminosity': 'luminosity',
  'source-over': 'source-over',
  'source-in': 'source-in',
  'source-out': 'source-out',
  'source-atop': 'source-atop',
  'destination-over': 'destination-over',
  'destination-in': 'destination-in',
  'destination-out': 'destination-out',
  'lighter': 'lighter',
};

export class RasterEngine {
  private width: number;
  private height: number;
  private layers: Layer[] = [];
  private activeLayerId: string | null = null;
  private compositeCanvas: HTMLCanvasElement;
  private compositeCtx: CanvasRenderingContext2D;
  private tempCanvas: HTMLCanvasElement;
  private tempCtx: CanvasRenderingContext2D;
  private backgroundColor: RGBA = { r: 255, g: 255, b: 255, a: 1 };
  private dirtyRects: { x: number; y: number; w: number; h: number }[] = [];
  private subscribers: Set<() => void> = new Set();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    // Composite canvas for final output
    this.compositeCanvas = document.createElement('canvas');
    this.compositeCanvas.width = width;
    this.compositeCanvas.height = height;
    const ctx = this.compositeCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Failed to create composite context');
    this.compositeCtx = ctx;

    // Temp canvas for layer compositing
    this.tempCanvas = document.createElement('canvas');
    this.tempCanvas.width = width;
    this.tempCanvas.height = height;
    const tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) throw new Error('Failed to create temp context');
    this.tempCtx = tempCtx;
  }

  // ============================================================================
  // Layer Management
  // ============================================================================

  createLayer(name: string, insertBelow?: string): Layer {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;

    const layer: Layer = {
      id: generateId(),
      name,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      canvas,
      maskEnabled: false,
      maskLinked: true,
    };

    if (insertBelow) {
      const index = this.layers.findIndex(l => l.id === insertBelow);
      if (index !== -1) {
        this.layers.splice(index, 0, layer);
      } else {
        this.layers.push(layer);
      }
    } else {
      this.layers.push(layer);
    }

    if (!this.activeLayerId) {
      this.activeLayerId = layer.id;
    }

    this.markDirty();
    this.notify();
    return layer;
  }

  duplicateLayer(layerId: string): Layer | null {
    const source = this.getLayer(layerId);
    if (!source) return null;

    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(source.canvas, 0, 0);
    }

    let mask: HTMLCanvasElement | undefined;
    if (source.mask) {
      mask = document.createElement('canvas');
      mask.width = this.width;
      mask.height = this.height;
      const maskCtx = mask.getContext('2d');
      if (maskCtx) {
        maskCtx.drawImage(source.mask, 0, 0);
      }
    }

    const layer: Layer = {
      id: generateId(),
      name: `${source.name} copy`,
      visible: source.visible,
      locked: false,
      opacity: source.opacity,
      blendMode: source.blendMode,
      canvas,
      mask,
      maskEnabled: source.maskEnabled,
      maskLinked: source.maskLinked,
    };

    const index = this.layers.findIndex(l => l.id === layerId);
    this.layers.splice(index + 1, 0, layer);

    this.markDirty();
    this.notify();
    return layer;
  }

  deleteLayer(layerId: string): boolean {
    const index = this.layers.findIndex(l => l.id === layerId);
    if (index === -1) return false;

    this.layers.splice(index, 1);

    if (this.activeLayerId === layerId) {
      this.activeLayerId = this.layers[Math.min(index, this.layers.length - 1)]?.id ?? null;
    }

    this.markDirty();
    this.notify();
    return true;
  }

  moveLayer(layerId: string, newIndex: number): void {
    const currentIndex = this.layers.findIndex(l => l.id === layerId);
    if (currentIndex === -1) return;

    const [layer] = this.layers.splice(currentIndex, 1);
    const targetIndex = Math.max(0, Math.min(this.layers.length, newIndex));
    this.layers.splice(targetIndex, 0, layer);

    this.markDirty();
    this.notify();
  }

  mergeLayerDown(layerId: string): Layer | null {
    const index = this.layers.findIndex(l => l.id === layerId);
    if (index <= 0) return null;

    const upper = this.layers[index];
    const lower = this.layers[index - 1];

    // Composite upper onto lower
    const ctx = lower.canvas.getContext('2d');
    if (ctx) {
      ctx.globalAlpha = upper.opacity;
      ctx.globalCompositeOperation = BLEND_MODE_MAP[upper.blendMode];
      ctx.drawImage(upper.canvas, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Remove upper layer
    this.layers.splice(index, 1);

    if (this.activeLayerId === layerId) {
      this.activeLayerId = lower.id;
    }

    this.markDirty();
    this.notify();
    return lower;
  }

  flattenImage(): Layer {
    // Create new layer with composited result
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      this.composite();
      ctx.drawImage(this.compositeCanvas, 0, 0);
    }

    const layer: Layer = {
      id: generateId(),
      name: 'Background',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      canvas,
      maskEnabled: false,
      maskLinked: true,
    };

    this.layers = [layer];
    this.activeLayerId = layer.id;

    this.markDirty();
    this.notify();
    return layer;
  }

  getLayer(layerId: string): Layer | undefined {
    return this.layers.find(l => l.id === layerId);
  }

  getActiveLayer(): Layer | undefined {
    return this.activeLayerId ? this.getLayer(this.activeLayerId) : undefined;
  }

  setActiveLayer(layerId: string): void {
    if (this.getLayer(layerId)) {
      this.activeLayerId = layerId;
      this.notify();
    }
  }

  getLayers(): Layer[] {
    return [...this.layers];
  }

  getActiveLayerId(): string | null {
    return this.activeLayerId;
  }

  // ============================================================================
  // Layer Properties
  // ============================================================================

  setLayerVisibility(layerId: string, visible: boolean): void {
    const layer = this.getLayer(layerId);
    if (layer) {
      layer.visible = visible;
      this.markDirty();
      this.notify();
    }
  }

  setLayerLocked(layerId: string, locked: boolean): void {
    const layer = this.getLayer(layerId);
    if (layer) {
      layer.locked = locked;
      this.notify();
    }
  }

  setLayerOpacity(layerId: string, opacity: number): void {
    const layer = this.getLayer(layerId);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
      this.markDirty();
      this.notify();
    }
  }

  setLayerBlendMode(layerId: string, blendMode: BlendMode): void {
    const layer = this.getLayer(layerId);
    if (layer) {
      layer.blendMode = blendMode;
      this.markDirty();
      this.notify();
    }
  }

  setLayerName(layerId: string, name: string): void {
    const layer = this.getLayer(layerId);
    if (layer) {
      layer.name = name;
      this.notify();
    }
  }

  // ============================================================================
  // Layer Masks
  // ============================================================================

  createLayerMask(layerId: string, fromSelection?: Selection): void {
    const layer = this.getLayer(layerId);
    if (!layer) return;

    const mask = document.createElement('canvas');
    mask.width = this.width;
    mask.height = this.height;
    const ctx = mask.getContext('2d');

    if (ctx) {
      if (fromSelection) {
        // Create mask from selection
        ctx.putImageData(fromSelection.mask, 0, 0);
      } else {
        // White (reveal all) by default
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, this.width, this.height);
      }
    }

    layer.mask = mask;
    layer.maskEnabled = true;
    this.markDirty();
    this.notify();
  }

  deleteLayerMask(layerId: string): void {
    const layer = this.getLayer(layerId);
    if (layer) {
      layer.mask = undefined;
      layer.maskEnabled = false;
      this.markDirty();
      this.notify();
    }
  }

  toggleLayerMask(layerId: string): void {
    const layer = this.getLayer(layerId);
    if (layer && layer.mask) {
      layer.maskEnabled = !layer.maskEnabled;
      this.markDirty();
      this.notify();
    }
  }

  // ============================================================================
  // Drawing API
  // ============================================================================

  getLayerContext(layerId: string): CanvasRenderingContext2D | null {
    const layer = this.getLayer(layerId);
    if (!layer || layer.locked) return null;
    return layer.canvas.getContext('2d', { willReadFrequently: true });
  }

  getActiveLayerContext(): CanvasRenderingContext2D | null {
    return this.activeLayerId ? this.getLayerContext(this.activeLayerId) : null;
  }

  getMaskContext(layerId: string): CanvasRenderingContext2D | null {
    const layer = this.getLayer(layerId);
    if (!layer || !layer.mask) return null;
    return layer.mask.getContext('2d', { willReadFrequently: true });
  }

  fillLayer(layerId: string, color: RGBA): void {
    const ctx = this.getLayerContext(layerId);
    if (!ctx) return;

    ctx.fillStyle = rgbaToString(color);
    ctx.fillRect(0, 0, this.width, this.height);
    this.markDirty();
  }

  clearLayer(layerId: string): void {
    const ctx = this.getLayerContext(layerId);
    if (!ctx) return;

    ctx.clearRect(0, 0, this.width, this.height);
    this.markDirty();
  }

  // ============================================================================
  // Compositing
  // ============================================================================

  composite(): void {
    const ctx = this.compositeCtx;

    // Clear with background color
    ctx.fillStyle = rgbaToString(this.backgroundColor);
    ctx.fillRect(0, 0, this.width, this.height);

    // Composite layers from bottom to top
    for (const layer of this.layers) {
      if (!layer.visible || layer.opacity <= 0) continue;

      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = BLEND_MODE_MAP[layer.blendMode];

      if (layer.mask && layer.maskEnabled) {
        // Apply mask using temp canvas
        this.tempCtx.clearRect(0, 0, this.width, this.height);
        this.tempCtx.drawImage(layer.canvas, 0, 0);
        this.tempCtx.globalCompositeOperation = 'destination-in';
        this.tempCtx.drawImage(layer.mask, 0, 0);
        this.tempCtx.globalCompositeOperation = 'source-over';
        ctx.drawImage(this.tempCanvas, 0, 0);
      } else {
        ctx.drawImage(layer.canvas, 0, 0);
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  getCompositeCanvas(): HTMLCanvasElement {
    this.composite();
    return this.compositeCanvas;
  }

  getCompositeImageData(): ImageData {
    this.composite();
    return this.compositeCtx.getImageData(0, 0, this.width, this.height);
  }

  // ============================================================================
  // Export/Import
  // ============================================================================

  toDataURL(type: string = 'image/png', quality?: number): string {
    this.composite();
    return this.compositeCanvas.toDataURL(type, quality);
  }

  toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number): void {
    this.composite();
    this.compositeCanvas.toBlob(callback, type, quality);
  }

  async loadImage(src: string, layerId?: string): Promise<Layer> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const layer = layerId ? this.getLayer(layerId) : this.createLayer('Image');
        if (!layer) {
          reject(new Error('Failed to get layer'));
          return;
        }

        const ctx = layer.canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, this.width, this.height);
        }

        this.markDirty();
        this.notify();
        resolve(layer);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = src;
    });
  }

  // ============================================================================
  // History/Snapshot
  // ============================================================================

  createSnapshot(): LayerSnapshot[] {
    return this.layers.map(layer => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      imageData: layer.canvas.getContext('2d')!.getImageData(0, 0, this.width, this.height),
      maskData: layer.mask
        ? layer.mask.getContext('2d')!.getImageData(0, 0, this.width, this.height)
        : undefined,
      maskEnabled: layer.maskEnabled,
      maskLinked: layer.maskLinked,
    }));
  }

  restoreSnapshot(snapshots: LayerSnapshot[]): void {
    this.layers = snapshots.map(snapshot => {
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(snapshot.imageData, 0, 0);
      }

      let mask: HTMLCanvasElement | undefined;
      if (snapshot.maskData) {
        mask = document.createElement('canvas');
        mask.width = this.width;
        mask.height = this.height;
        const maskCtx = mask.getContext('2d');
        if (maskCtx) {
          maskCtx.putImageData(snapshot.maskData, 0, 0);
        }
      }

      return {
        id: snapshot.id,
        name: snapshot.name,
        visible: snapshot.visible,
        locked: snapshot.locked,
        opacity: snapshot.opacity,
        blendMode: snapshot.blendMode,
        canvas,
        mask,
        maskEnabled: snapshot.maskEnabled,
        maskLinked: snapshot.maskLinked,
      };
    });

    this.markDirty();
    this.notify();
  }

  // ============================================================================
  // Resize
  // ============================================================================

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    // Resize all canvases
    this.compositeCanvas.width = width;
    this.compositeCanvas.height = height;
    this.tempCanvas.width = width;
    this.tempCanvas.height = height;

    for (const layer of this.layers) {
      const oldCanvas = layer.canvas;
      const newCanvas = document.createElement('canvas');
      newCanvas.width = width;
      newCanvas.height = height;
      const ctx = newCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(oldCanvas, 0, 0);
      }
      layer.canvas = newCanvas;

      if (layer.mask) {
        const oldMask = layer.mask;
        const newMask = document.createElement('canvas');
        newMask.width = width;
        newMask.height = height;
        const maskCtx = newMask.getContext('2d');
        if (maskCtx) {
          maskCtx.drawImage(oldMask, 0, 0);
        }
        layer.mask = newMask;
      }
    }

    this.markDirty();
    this.notify();
  }

  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  // ============================================================================
  // State Management
  // ============================================================================

  setBackgroundColor(color: RGBA): void {
    this.backgroundColor = color;
    this.markDirty();
  }

  private markDirty(): void {
    // For now, mark entire canvas dirty
    // Could optimize with dirty rect tracking
    this.dirtyRects = [{ x: 0, y: 0, w: this.width, h: this.height }];
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify(): void {
    this.subscribers.forEach(cb => cb());
  }

  destroy(): void {
    this.layers = [];
    this.subscribers.clear();
  }
}
