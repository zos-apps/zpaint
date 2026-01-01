/**
 * MaskEngine - Layer masks, clipping masks, and alpha channel management
 *
 * Provides:
 * - Layer mask creation and editing
 * - Clipping mask groups
 * - Alpha channel operations
 * - Mask refinement brushes
 */

import type { Layer, Selection, RGBA } from '../types';

export type MaskViewMode = 'normal' | 'mask-only' | 'mask-overlay' | 'on-black' | 'on-white';

export interface ClippingGroup {
  baseLayerId: string;
  clippedLayerIds: string[];
}

export class MaskEngine {
  private width: number;
  private height: number;
  private clippingGroups: ClippingGroup[] = [];
  private tempCanvas: HTMLCanvasElement;
  private tempCtx: CanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    this.tempCanvas = document.createElement('canvas');
    this.tempCanvas.width = width;
    this.tempCanvas.height = height;
    const ctx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Failed to create temp context');
    this.tempCtx = ctx;
  }

  // ============================================================================
  // Layer Mask Operations
  // ============================================================================

  /**
   * Create layer mask from selection
   */
  createMaskFromSelection(selection: Selection): HTMLCanvasElement {
    const mask = document.createElement('canvas');
    mask.width = this.width;
    mask.height = this.height;
    const ctx = mask.getContext('2d');
    if (!ctx) throw new Error('Failed to create mask context');

    ctx.putImageData(selection.mask, 0, 0);
    return mask;
  }

  /**
   * Create white (reveal all) mask
   */
  createRevealAllMask(): HTMLCanvasElement {
    const mask = document.createElement('canvas');
    mask.width = this.width;
    mask.height = this.height;
    const ctx = mask.getContext('2d');
    if (!ctx) throw new Error('Failed to create mask context');

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.width, this.height);
    return mask;
  }

  /**
   * Create black (hide all) mask
   */
  createHideAllMask(): HTMLCanvasElement {
    const mask = document.createElement('canvas');
    mask.width = this.width;
    mask.height = this.height;
    // Canvas is transparent (black) by default
    return mask;
  }

  /**
   * Invert mask
   */
  invertMask(mask: HTMLCanvasElement): void {
    const ctx = mask.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    const { data } = imageData;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Apply levels to mask
   */
  applyLevelsToMask(
    mask: HTMLCanvasElement,
    inputBlack: number,
    inputWhite: number,
    gamma: number
  ): void {
    const ctx = mask.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    const { data } = imageData;

    const range = inputWhite - inputBlack;
    const invGamma = 1 / gamma;

    for (let i = 0; i < data.length; i += 4) {
      let val = data[i];

      // Apply input levels
      val = Math.max(0, val - inputBlack);
      val = Math.min(255, (val / range) * 255);

      // Apply gamma
      val = Math.pow(val / 255, invGamma) * 255;

      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Feather mask edges
   */
  featherMask(mask: HTMLCanvasElement, radius: number): void {
    if (radius <= 0) return;

    const ctx = mask.getContext('2d');
    if (!ctx) return;

    // Use canvas filter for blur
    this.tempCtx.clearRect(0, 0, this.width, this.height);
    this.tempCtx.filter = `blur(${radius}px)`;
    this.tempCtx.drawImage(mask, 0, 0);
    this.tempCtx.filter = 'none';

    ctx.clearRect(0, 0, this.width, this.height);
    ctx.drawImage(this.tempCanvas, 0, 0);
  }

  /**
   * Refine mask with brush stroke (for Refine Edge brush)
   */
  refineMaskWithBrush(
    mask: HTMLCanvasElement,
    imageData: ImageData,
    x: number,
    y: number,
    radius: number,
    mode: 'refine' | 'erase'
  ): void {
    const ctx = mask.getContext('2d');
    if (!ctx) return;

    const maskData = ctx.getImageData(0, 0, this.width, this.height);
    const r = Math.ceil(radius);

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const px = Math.floor(x + dx);
        const py = Math.floor(y + dy);
        if (px < 0 || px >= this.width || py < 0 || py >= this.height) continue;

        const idx = (py * this.width + px) * 4;
        const falloff = 1 - dist / radius;

        if (mode === 'refine') {
          // Use image edge info to refine
          const edge = this.computeLocalEdge(imageData, px, py);
          const targetVal = edge > 0.3 ? 0 : 255;
          const currentVal = maskData.data[idx];
          const newVal = currentVal + (targetVal - currentVal) * falloff * 0.3;
          maskData.data[idx] = newVal;
          maskData.data[idx + 1] = newVal;
          maskData.data[idx + 2] = newVal;
        } else {
          // Erase refinement (restore to binary)
          const currentVal = maskData.data[idx];
          const binaryVal = currentVal > 127 ? 255 : 0;
          const newVal = currentVal + (binaryVal - currentVal) * falloff * 0.5;
          maskData.data[idx] = newVal;
          maskData.data[idx + 1] = newVal;
          maskData.data[idx + 2] = newVal;
        }
      }
    }

    ctx.putImageData(maskData, 0, 0);
  }

  private computeLocalEdge(imageData: ImageData, x: number, y: number): number {
    const { width, height, data } = imageData;
    let sumDiff = 0;
    const centerIdx = (y * width + x) * 4;
    const centerR = data[centerIdx];
    const centerG = data[centerIdx + 1];
    const centerB = data[centerIdx + 2];

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

        const idx = (ny * width + nx) * 4;
        const dr = Math.abs(data[idx] - centerR);
        const dg = Math.abs(data[idx + 1] - centerG);
        const db = Math.abs(data[idx + 2] - centerB);
        sumDiff += (dr + dg + db) / 3;
      }
    }

    return Math.min(1, sumDiff / (8 * 128));
  }

  // ============================================================================
  // Clipping Mask Operations
  // ============================================================================

  /**
   * Create clipping mask (clip layer to layer below)
   */
  createClippingMask(layerId: string, baseLayerId: string): void {
    // Find or create clipping group
    let group = this.clippingGroups.find(g => g.baseLayerId === baseLayerId);
    if (!group) {
      group = { baseLayerId, clippedLayerIds: [] };
      this.clippingGroups.push(group);
    }

    if (!group.clippedLayerIds.includes(layerId)) {
      group.clippedLayerIds.push(layerId);
    }
  }

  /**
   * Release clipping mask
   */
  releaseClippingMask(layerId: string): void {
    for (const group of this.clippingGroups) {
      const idx = group.clippedLayerIds.indexOf(layerId);
      if (idx !== -1) {
        group.clippedLayerIds.splice(idx, 1);
        break;
      }
    }

    // Clean up empty groups
    this.clippingGroups = this.clippingGroups.filter(g => g.clippedLayerIds.length > 0);
  }

  /**
   * Check if layer is clipped
   */
  isLayerClipped(layerId: string): boolean {
    return this.clippingGroups.some(g => g.clippedLayerIds.includes(layerId));
  }

  /**
   * Get clipping base layer for a clipped layer
   */
  getClippingBase(layerId: string): string | null {
    for (const group of this.clippingGroups) {
      if (group.clippedLayerIds.includes(layerId)) {
        return group.baseLayerId;
      }
    }
    return null;
  }

  /**
   * Get all layers clipped to a base layer
   */
  getClippedLayers(baseLayerId: string): string[] {
    const group = this.clippingGroups.find(g => g.baseLayerId === baseLayerId);
    return group ? [...group.clippedLayerIds] : [];
  }

  /**
   * Composite clipped layers using base layer's alpha
   */
  compositeClippedLayer(
    clippedCanvas: HTMLCanvasElement,
    baseCanvas: HTMLCanvasElement
  ): HTMLCanvasElement {
    const result = document.createElement('canvas');
    result.width = this.width;
    result.height = this.height;
    const ctx = result.getContext('2d');
    if (!ctx) throw new Error('Failed to create result context');

    // Draw clipped layer
    ctx.drawImage(clippedCanvas, 0, 0);

    // Use base layer as mask (destination-in)
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(baseCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';

    return result;
  }

  // ============================================================================
  // Alpha Channel Operations
  // ============================================================================

  /**
   * Extract alpha channel as grayscale
   */
  extractAlphaChannel(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const alpha = document.createElement('canvas');
    alpha.width = this.width;
    alpha.height = this.height;
    const ctx = alpha.getContext('2d');
    if (!ctx) throw new Error('Failed to create alpha context');

    const srcCtx = canvas.getContext('2d');
    if (!srcCtx) return alpha;

    const imageData = srcCtx.getImageData(0, 0, this.width, this.height);
    const { data } = imageData;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      data[i] = a;
      data[i + 1] = a;
      data[i + 2] = a;
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    return alpha;
  }

  /**
   * Apply grayscale image as alpha channel
   */
  applyAlphaChannel(canvas: HTMLCanvasElement, alpha: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    const alphaCtx = alpha.getContext('2d');
    if (!ctx || !alphaCtx) return;

    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    const alphaData = alphaCtx.getImageData(0, 0, this.width, this.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i + 3] = alphaData.data[i]; // Use red channel as alpha
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Load selection into alpha channel
   */
  loadSelectionToAlpha(canvas: HTMLCanvasElement, selection: Selection): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    const { data } = imageData;
    const maskData = selection.mask.data;

    for (let i = 0; i < data.length; i += 4) {
      // Multiply existing alpha with selection
      data[i + 3] = Math.round((data[i + 3] / 255) * (maskData[i] / 255) * 255);
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // ============================================================================
  // Mask Visualization
  // ============================================================================

  /**
   * Render mask visualization for editing
   */
  renderMaskVisualization(
    layer: Layer,
    mode: MaskViewMode
  ): HTMLCanvasElement {
    const result = document.createElement('canvas');
    result.width = this.width;
    result.height = this.height;
    const ctx = result.getContext('2d');
    if (!ctx) throw new Error('Failed to create visualization context');

    if (!layer.mask) {
      ctx.drawImage(layer.canvas, 0, 0);
      return result;
    }

    switch (mode) {
      case 'mask-only':
        ctx.drawImage(layer.mask, 0, 0);
        break;

      case 'mask-overlay':
        // Layer with red overlay on masked areas
        ctx.drawImage(layer.canvas, 0, 0);
        ctx.globalCompositeOperation = 'source-atop';

        // Draw inverted mask as red overlay
        const maskData = layer.mask.getContext('2d')?.getImageData(0, 0, this.width, this.height);
        if (maskData) {
          const overlay = new ImageData(this.width, this.height);
          for (let i = 0; i < maskData.data.length; i += 4) {
            const maskVal = 255 - maskData.data[i];
            overlay.data[i] = 255;     // R
            overlay.data[i + 1] = 0;   // G
            overlay.data[i + 2] = 0;   // B
            overlay.data[i + 3] = maskVal * 0.5; // A (50% opacity)
          }
          this.tempCtx.putImageData(overlay, 0, 0);
          ctx.drawImage(this.tempCanvas, 0, 0);
        }
        ctx.globalCompositeOperation = 'source-over';
        break;

      case 'on-black':
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.drawImage(layer.canvas, 0, 0);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(layer.mask, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        break;

      case 'on-white':
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, this.width, this.height);
        this.tempCtx.clearRect(0, 0, this.width, this.height);
        this.tempCtx.drawImage(layer.canvas, 0, 0);
        this.tempCtx.globalCompositeOperation = 'destination-in';
        this.tempCtx.drawImage(layer.mask, 0, 0);
        this.tempCtx.globalCompositeOperation = 'source-over';
        ctx.drawImage(this.tempCanvas, 0, 0);
        break;

      default: // normal
        ctx.drawImage(layer.canvas, 0, 0);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(layer.mask, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
    }

    return result;
  }

  // ============================================================================
  // Resize
  // ============================================================================

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.tempCanvas.width = width;
    this.tempCanvas.height = height;
  }
}
