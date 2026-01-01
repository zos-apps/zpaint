/**
 * SelectionEngine - Advanced selection algorithms and mask operations
 *
 * Provides:
 * - Edge detection for Quick Selection
 * - Color range selection
 * - Selection refinement (feather, expand, contract)
 * - Alpha channel editing
 * - Selection operations (add, subtract, intersect)
 */

import type { Selection, SelectionMode, RGBA } from '../types';

export interface EdgeDetectionOptions {
  sensitivity: number;    // 0-100, edge detection sensitivity
  radius: number;        // Brush radius for quick selection
  contiguous: boolean;   // Whether to select contiguous regions only
}

export interface ColorRangeOptions {
  targetColor: RGBA;
  fuzziness: number;     // 0-200, color tolerance
  range: 'shadows' | 'midtones' | 'highlights' | 'reds' | 'yellows' | 'greens' | 'cyans' | 'blues' | 'magentas' | 'sampled';
  localized: boolean;
  localizedRadius: number;
}

export interface RefineEdgeOptions {
  radius: number;        // Edge detection radius
  smooth: number;        // 0-100, edge smoothing
  feather: number;       // Feather amount in pixels
  contrast: number;      // 0-100, edge contrast
  shift: number;         // -100 to 100, shift edge in/out
  decontaminate: boolean; // Color decontamination
  decontaminateAmount: number; // 0-100
  output: 'selection' | 'layer-mask' | 'new-layer' | 'new-layer-with-mask';
}

export class SelectionEngine {
  private width: number;
  private height: number;
  private selectionMask: ImageData;
  private tempCanvas: HTMLCanvasElement;
  private tempCtx: CanvasRenderingContext2D;
  private edgeCanvas: HTMLCanvasElement;
  private edgeCtx: CanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.selectionMask = new ImageData(width, height);

    this.tempCanvas = document.createElement('canvas');
    this.tempCanvas.width = width;
    this.tempCanvas.height = height;
    const ctx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Failed to create temp context');
    this.tempCtx = ctx;

    this.edgeCanvas = document.createElement('canvas');
    this.edgeCanvas.width = width;
    this.edgeCanvas.height = height;
    const edgeCtx = this.edgeCanvas.getContext('2d', { willReadFrequently: true });
    if (!edgeCtx) throw new Error('Failed to create edge context');
    this.edgeCtx = edgeCtx;
  }

  // ============================================================================
  // Edge Detection (Sobel/Canny-inspired for Quick Selection)
  // ============================================================================

  /**
   * Compute edge map from image data using Sobel operator
   */
  computeEdgeMap(imageData: ImageData): Float32Array {
    const { width, height, data } = imageData;
    const edges = new Float32Array(width * height);

    // Convert to grayscale luminance
    const gray = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const idx = i / 4;
      gray[idx] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // Sobel kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            const ki = (ky + 1) * 3 + (kx + 1);
            gx += gray[idx] * sobelX[ki];
            gy += gray[idx] * sobelY[ki];
          }
        }
        edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    // Normalize to 0-1
    let maxEdge = 0;
    for (let i = 0; i < edges.length; i++) {
      if (edges[i] > maxEdge) maxEdge = edges[i];
    }
    if (maxEdge > 0) {
      for (let i = 0; i < edges.length; i++) {
        edges[i] /= maxEdge;
      }
    }

    return edges;
  }

  /**
   * Quick Selection algorithm - expands selection following edges
   */
  quickSelect(
    imageData: ImageData,
    startX: number,
    startY: number,
    radius: number,
    mode: SelectionMode,
    existingSelection?: Selection
  ): Selection {
    const { width, height, data } = imageData;
    const edges = this.computeEdgeMap(imageData);

    // Start with existing selection or create new
    const mask = existingSelection
      ? new ImageData(new Uint8ClampedArray(existingSelection.mask.data), width, height)
      : new ImageData(width, height);

    // Get color at start point
    const startIdx = (Math.floor(startY) * width + Math.floor(startX)) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];

    // Flood fill with edge awareness
    const visited = new Set<number>();
    const queue: [number, number, number][] = [[startX, startY, 0]]; // x, y, depth

    const edgeThreshold = 0.3; // Edges above this value block selection
    const colorTolerance = 50; // Color similarity threshold
    const maxRadius = radius * 3;

    while (queue.length > 0) {
      const [x, y, depth] = queue.shift()!;
      const ix = Math.floor(x);
      const iy = Math.floor(y);

      if (ix < 0 || ix >= width || iy < 0 || iy >= height) continue;

      const pos = iy * width + ix;
      if (visited.has(pos)) continue;
      visited.add(pos);

      // Check if we've gone too far
      const dist = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2);
      if (dist > maxRadius) continue;

      // Check edge strength
      if (edges[pos] > edgeThreshold && depth > 1) continue;

      // Check color similarity
      const idx = pos * 4;
      const dr = Math.abs(data[idx] - targetR);
      const dg = Math.abs(data[idx + 1] - targetG);
      const db = Math.abs(data[idx + 2] - targetB);
      if (dr + dg + db > colorTolerance * 3 && depth > 1) continue;

      // Apply to mask based on mode
      const maskIdx = pos * 4;
      if (mode === 'new' || mode === 'add') {
        mask.data[maskIdx] = 255;
        mask.data[maskIdx + 1] = 255;
        mask.data[maskIdx + 2] = 255;
        mask.data[maskIdx + 3] = 255;
      } else if (mode === 'subtract') {
        mask.data[maskIdx] = 0;
        mask.data[maskIdx + 1] = 0;
        mask.data[maskIdx + 2] = 0;
        mask.data[maskIdx + 3] = 0;
      }

      // Add neighbors
      if (depth < maxRadius) {
        queue.push([x - 1, y, depth + 1]);
        queue.push([x + 1, y, depth + 1]);
        queue.push([x, y - 1, depth + 1]);
        queue.push([x, y + 1, depth + 1]);
      }
    }

    return {
      mask,
      bounds: this.computeBounds(mask),
      active: true,
    };
  }

  /**
   * Select Subject - AI-powered subject detection (simplified heuristic version)
   * Uses edge detection + saliency to find main subject
   */
  selectSubject(imageData: ImageData): Selection {
    const { width, height, data } = imageData;
    const edges = this.computeEdgeMap(imageData);
    const mask = new ImageData(width, height);

    // Compute center-weighted saliency
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2);

    // Find regions with high edge activity near center
    const saliency = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const centerBias = 1 - (dist / maxDist) * 0.5; // Prefer center

        // Color distinctiveness from image mean
        const pIdx = idx * 4;
        const r = data[pIdx], g = data[pIdx + 1], b = data[pIdx + 2];

        // Simple saliency: edge + center bias + color saturation
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        saliency[idx] = edges[idx] * 0.3 + centerBias * 0.4 + (sat / 255) * 0.3;
      }
    }

    // Find connected regions with high saliency
    const threshold = 0.35;
    const visited = new Set<number>();
    const regions: { points: number[]; score: number }[] = [];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (visited.has(idx) || saliency[idx] < threshold) continue;

        // Flood fill to find region
        const region: number[] = [];
        const queue = [idx];
        let totalScore = 0;

        while (queue.length > 0) {
          const pos = queue.pop()!;
          if (visited.has(pos)) continue;
          visited.add(pos);

          if (saliency[pos] < threshold * 0.8) continue;

          region.push(pos);
          totalScore += saliency[pos];

          const px = pos % width;
          const py = Math.floor(pos / width);

          if (px > 0) queue.push(pos - 1);
          if (px < width - 1) queue.push(pos + 1);
          if (py > 0) queue.push(pos - width);
          if (py < height - 1) queue.push(pos + width);
        }

        if (region.length > 100) { // Minimum region size
          regions.push({ points: region, score: totalScore });
        }
      }
    }

    // Select the largest high-scoring region
    if (regions.length > 0) {
      regions.sort((a, b) => b.score - a.score);
      const mainRegion = regions[0];

      for (const pos of mainRegion.points) {
        const maskIdx = pos * 4;
        mask.data[maskIdx] = 255;
        mask.data[maskIdx + 1] = 255;
        mask.data[maskIdx + 2] = 255;
        mask.data[maskIdx + 3] = 255;
      }
    }

    // Apply morphological closing to smooth
    this.morphClose(mask, 3);

    return {
      mask,
      bounds: this.computeBounds(mask),
      active: true,
    };
  }

  /**
   * Select by Color Range
   */
  selectColorRange(imageData: ImageData, options: ColorRangeOptions): Selection {
    const { width, height, data } = imageData;
    const mask = new ImageData(width, height);
    const { targetColor, fuzziness } = options;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];

      // Compute color distance
      const dr = r - targetColor.r;
      const dg = g - targetColor.g;
      const db = b - targetColor.b;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);

      // Compute selection strength based on fuzziness
      const maxDist = fuzziness * 2.55; // Scale 0-200 to ~0-510
      const strength = Math.max(0, 1 - dist / maxDist);
      const value = Math.round(strength * 255);

      mask.data[i] = value;
      mask.data[i + 1] = value;
      mask.data[i + 2] = value;
      mask.data[i + 3] = value;
    }

    return {
      mask,
      bounds: this.computeBounds(mask),
      active: true,
    };
  }

  // ============================================================================
  // Selection Modifications
  // ============================================================================

  /**
   * Grow selection by specified pixels
   */
  growSelection(selection: Selection, pixels: number): Selection {
    const mask = this.dilate(selection.mask, pixels);
    return {
      mask,
      bounds: this.computeBounds(mask),
      active: true,
    };
  }

  /**
   * Shrink selection by specified pixels
   */
  shrinkSelection(selection: Selection, pixels: number): Selection {
    const mask = this.erode(selection.mask, pixels);
    return {
      mask,
      bounds: this.computeBounds(mask),
      active: true,
    };
  }

  /**
   * Feather selection edges
   */
  featherSelection(selection: Selection, radius: number): Selection {
    const mask = this.gaussianBlur(selection.mask, radius);
    return {
      mask,
      bounds: this.computeBounds(mask),
      active: true,
    };
  }

  /**
   * Smooth selection edges
   */
  smoothSelection(selection: Selection, radius: number): Selection {
    // Apply median filter for smoothing
    const mask = this.medianFilter(selection.mask, radius);
    return {
      mask,
      bounds: this.computeBounds(mask),
      active: true,
    };
  }

  /**
   * Invert selection
   */
  invertSelection(selection: Selection): Selection {
    const mask = new ImageData(
      new Uint8ClampedArray(selection.mask.data),
      this.width,
      this.height
    );

    for (let i = 0; i < mask.data.length; i += 4) {
      mask.data[i] = 255 - mask.data[i];
      mask.data[i + 1] = 255 - mask.data[i + 1];
      mask.data[i + 2] = 255 - mask.data[i + 2];
      mask.data[i + 3] = 255;
    }

    return {
      mask,
      bounds: { x: 0, y: 0, width: this.width, height: this.height },
      active: true,
    };
  }

  /**
   * Combine selections based on mode
   */
  combineSelections(a: Selection, b: Selection, mode: SelectionMode): Selection {
    const mask = new ImageData(this.width, this.height);

    for (let i = 0; i < mask.data.length; i += 4) {
      const aVal = a.mask.data[i];
      const bVal = b.mask.data[i];
      let result: number;

      switch (mode) {
        case 'add':
          result = Math.min(255, aVal + bVal);
          break;
        case 'subtract':
          result = Math.max(0, aVal - bVal);
          break;
        case 'intersect':
          result = Math.min(aVal, bVal);
          break;
        default:
          result = bVal;
      }

      mask.data[i] = result;
      mask.data[i + 1] = result;
      mask.data[i + 2] = result;
      mask.data[i + 3] = 255;
    }

    return {
      mask,
      bounds: this.computeBounds(mask),
      active: true,
    };
  }

  // ============================================================================
  // Refine Edge
  // ============================================================================

  /**
   * Refine selection edges for hair/fur/complex edges
   */
  refineEdge(
    selection: Selection,
    imageData: ImageData,
    options: RefineEdgeOptions
  ): Selection {
    const { width, height } = this;
    let mask = new ImageData(
      new Uint8ClampedArray(selection.mask.data),
      width,
      height
    );

    // 1. Edge detection radius - find edge zone
    const edgeZone = this.findEdgeZone(mask, options.radius);

    // 2. Apply smart radius in edge zone using image edges
    if (options.radius > 0) {
      const edges = this.computeEdgeMap(imageData);
      this.applySmartRadius(mask, edges, edgeZone, options.radius);
    }

    // 3. Smooth
    if (options.smooth > 0) {
      mask = this.gaussianBlur(mask, options.smooth / 20);
    }

    // 4. Feather
    if (options.feather > 0) {
      mask = this.gaussianBlur(mask, options.feather);
    }

    // 5. Contrast
    if (options.contrast > 0) {
      this.applyContrast(mask, options.contrast / 50);
    }

    // 6. Shift edge
    if (options.shift !== 0) {
      if (options.shift > 0) {
        mask = this.dilate(mask, Math.abs(options.shift / 10));
      } else {
        mask = this.erode(mask, Math.abs(options.shift / 10));
      }
    }

    return {
      mask,
      bounds: this.computeBounds(mask),
      active: true,
    };
  }

  private findEdgeZone(mask: ImageData, radius: number): Set<number> {
    const { width, height, data } = mask;
    const edgeZone = new Set<number>();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const val = data[idx];

        // Check if near edge (partially selected)
        if (val > 0 && val < 255) {
          edgeZone.add(y * width + x);
          continue;
        }

        // Check if neighbors have different values
        let isEdge = false;
        for (let dy = -1; dy <= 1 && !isEdge; dy++) {
          for (let dx = -1; dx <= 1 && !isEdge; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const nIdx = (ny * width + nx) * 4;
            if (Math.abs(data[nIdx] - val) > 128) {
              isEdge = true;
            }
          }
        }

        if (isEdge) {
          // Add surrounding pixels within radius
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
              if (dx * dx + dy * dy <= radius * radius) {
                edgeZone.add(ny * width + nx);
              }
            }
          }
        }
      }
    }

    return edgeZone;
  }

  private applySmartRadius(
    mask: ImageData,
    edges: Float32Array,
    edgeZone: Set<number>,
    radius: number
  ): void {
    const { width, data } = mask;

    for (const pos of edgeZone) {
      const edgeStrength = edges[pos];
      // Use edge info to determine mask strength
      const maskIdx = pos * 4;
      const currentVal = data[maskIdx];

      // Blend based on edge - stronger edges = cleaner cut
      if (edgeStrength > 0.5) {
        // Sharp edge - make binary
        data[maskIdx] = currentVal > 127 ? 255 : 0;
        data[maskIdx + 1] = data[maskIdx];
        data[maskIdx + 2] = data[maskIdx];
      }
      // Soft edges keep their gradient
    }
  }

  private applyContrast(mask: ImageData, amount: number): void {
    const { data } = mask;
    for (let i = 0; i < data.length; i += 4) {
      const val = data[i] / 255;
      // S-curve contrast
      const contrast = (val - 0.5) * (1 + amount) + 0.5;
      const result = Math.max(0, Math.min(255, Math.round(contrast * 255)));
      data[i] = result;
      data[i + 1] = result;
      data[i + 2] = result;
    }
  }

  // ============================================================================
  // Morphological Operations
  // ============================================================================

  private dilate(mask: ImageData, radius: number): ImageData {
    const { width, height, data } = mask;
    const result = new ImageData(width, height);
    const r = Math.ceil(radius);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let maxVal = 0;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy > radius * radius) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const idx = (ny * width + nx) * 4;
            maxVal = Math.max(maxVal, data[idx]);
          }
        }
        const idx = (y * width + x) * 4;
        result.data[idx] = maxVal;
        result.data[idx + 1] = maxVal;
        result.data[idx + 2] = maxVal;
        result.data[idx + 3] = 255;
      }
    }

    return result;
  }

  private erode(mask: ImageData, radius: number): ImageData {
    const { width, height, data } = mask;
    const result = new ImageData(width, height);
    const r = Math.ceil(radius);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minVal = 255;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy > radius * radius) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const idx = (ny * width + nx) * 4;
            minVal = Math.min(minVal, data[idx]);
          }
        }
        const idx = (y * width + x) * 4;
        result.data[idx] = minVal;
        result.data[idx + 1] = minVal;
        result.data[idx + 2] = minVal;
        result.data[idx + 3] = 255;
      }
    }

    return result;
  }

  private morphClose(mask: ImageData, radius: number): void {
    const dilated = this.dilate(mask, radius);
    const closed = this.erode(dilated, radius);
    mask.data.set(closed.data);
  }

  private gaussianBlur(mask: ImageData, radius: number): ImageData {
    if (radius < 0.5) return mask;

    const { width, height, data } = mask;
    const result = new ImageData(width, height);
    const r = Math.ceil(radius * 3);
    const sigma = radius;

    // Compute Gaussian kernel
    const kernel: number[] = [];
    let sum = 0;
    for (let i = -r; i <= r; i++) {
      const val = Math.exp(-(i * i) / (2 * sigma * sigma));
      kernel.push(val);
      sum += val;
    }
    for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

    // Horizontal pass
    const temp = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let val = 0;
        for (let i = -r; i <= r; i++) {
          const nx = Math.max(0, Math.min(width - 1, x + i));
          val += data[(y * width + nx) * 4] * kernel[i + r];
        }
        temp[y * width + x] = val;
      }
    }

    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let val = 0;
        for (let i = -r; i <= r; i++) {
          const ny = Math.max(0, Math.min(height - 1, y + i));
          val += temp[ny * width + x] * kernel[i + r];
        }
        const idx = (y * width + x) * 4;
        const v = Math.round(val);
        result.data[idx] = v;
        result.data[idx + 1] = v;
        result.data[idx + 2] = v;
        result.data[idx + 3] = 255;
      }
    }

    return result;
  }

  private medianFilter(mask: ImageData, radius: number): ImageData {
    const { width, height, data } = mask;
    const result = new ImageData(width, height);
    const r = Math.ceil(radius);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const values: number[] = [];
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            values.push(data[(ny * width + nx) * 4]);
          }
        }
        values.sort((a, b) => a - b);
        const median = values[Math.floor(values.length / 2)];
        const idx = (y * width + x) * 4;
        result.data[idx] = median;
        result.data[idx + 1] = median;
        result.data[idx + 2] = median;
        result.data[idx + 3] = 255;
      }
    }

    return result;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private computeBounds(mask: ImageData): { x: number; y: number; width: number; height: number } {
    const { width, height, data } = mask;
    let minX = width, minY = height, maxX = 0, maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4] > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (minX > maxX || minY > maxY) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.selectionMask = new ImageData(width, height);
    this.tempCanvas.width = width;
    this.tempCanvas.height = height;
    this.edgeCanvas.width = width;
    this.edgeCanvas.height = height;
  }

  /**
   * Create selection from alpha channel
   */
  selectionFromAlpha(imageData: ImageData): Selection {
    const { width, height, data } = imageData;
    const mask = new ImageData(width, height);

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      mask.data[i] = alpha;
      mask.data[i + 1] = alpha;
      mask.data[i + 2] = alpha;
      mask.data[i + 3] = 255;
    }

    return {
      mask,
      bounds: this.computeBounds(mask),
      active: true,
    };
  }

  /**
   * Apply selection as alpha channel to image data
   */
  applySelectionAsAlpha(imageData: ImageData, selection: Selection): void {
    const { data } = imageData;
    const maskData = selection.mask.data;

    for (let i = 0; i < data.length; i += 4) {
      data[i + 3] = Math.min(data[i + 3], maskData[i]);
    }
  }
}
