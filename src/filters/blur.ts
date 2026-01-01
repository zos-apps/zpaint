/**
 * Blur Filters - Gaussian and Motion blur
 */

import { clamp } from '../types';

/**
 * Apply Gaussian blur to image data
 */
export function gaussianBlur(
  imageData: ImageData,
  radius: number
): ImageData {
  if (radius <= 0) return imageData;

  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  const resultData = result.data;

  // Pre-compute Gaussian kernel
  const size = Math.ceil(radius * 3) * 2 + 1;
  const kernel: number[] = [];
  const sigma = radius / 3;
  let sum = 0;

  for (let i = 0; i < size; i++) {
    const x = i - Math.floor(size / 2);
    const g = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel.push(g);
    sum += g;
  }

  // Normalize kernel
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }

  const halfSize = Math.floor(size / 2);

  // Horizontal pass
  const temp = new Float32Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let k = 0; k < size; k++) {
        const sx = clamp(x + k - halfSize, 0, width - 1);
        const idx = (y * width + sx) * 4;
        const weight = kernel[k];

        r += data[idx] * weight;
        g += data[idx + 1] * weight;
        b += data[idx + 2] * weight;
        a += data[idx + 3] * weight;
      }

      const idx = (y * width + x) * 4;
      temp[idx] = r;
      temp[idx + 1] = g;
      temp[idx + 2] = b;
      temp[idx + 3] = a;
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let k = 0; k < size; k++) {
        const sy = clamp(y + k - halfSize, 0, height - 1);
        const idx = (sy * width + x) * 4;
        const weight = kernel[k];

        r += temp[idx] * weight;
        g += temp[idx + 1] * weight;
        b += temp[idx + 2] * weight;
        a += temp[idx + 3] * weight;
      }

      const idx = (y * width + x) * 4;
      resultData[idx] = clamp(Math.round(r), 0, 255);
      resultData[idx + 1] = clamp(Math.round(g), 0, 255);
      resultData[idx + 2] = clamp(Math.round(b), 0, 255);
      resultData[idx + 3] = clamp(Math.round(a), 0, 255);
    }
  }

  return result;
}

/**
 * Apply motion blur to image data
 */
export function motionBlur(
  imageData: ImageData,
  radius: number,
  angle: number
): ImageData {
  if (radius <= 0) return imageData;

  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  const resultData = result.data;

  const radians = (angle * Math.PI) / 180;
  const dx = Math.cos(radians);
  const dy = Math.sin(radians);
  const steps = Math.ceil(radius);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      let count = 0;

      for (let i = -steps; i <= steps; i++) {
        const sx = Math.round(x + dx * i);
        const sy = Math.round(y + dy * i);

        if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
          const idx = (sy * width + sx) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }
      }

      const idx = (y * width + x) * 4;
      resultData[idx] = Math.round(r / count);
      resultData[idx + 1] = Math.round(g / count);
      resultData[idx + 2] = Math.round(b / count);
      resultData[idx + 3] = Math.round(a / count);
    }
  }

  return result;
}

/**
 * Box blur (faster but lower quality)
 */
export function boxBlur(imageData: ImageData, radius: number): ImageData {
  if (radius <= 0) return imageData;

  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  const resultData = result.data;

  const size = radius * 2 + 1;
  const area = size * size;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = clamp(x + dx, 0, width - 1);
          const sy = clamp(y + dy, 0, height - 1);
          const idx = (sy * width + sx) * 4;

          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
        }
      }

      const idx = (y * width + x) * 4;
      resultData[idx] = Math.round(r / area);
      resultData[idx + 1] = Math.round(g / area);
      resultData[idx + 2] = Math.round(b / area);
      resultData[idx + 3] = Math.round(a / area);
    }
  }

  return result;
}
