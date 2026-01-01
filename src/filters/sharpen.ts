/**
 * Sharpen Filter - Unsharp mask sharpening
 */

import { clamp } from '../types';
import { gaussianBlur } from './blur';

/**
 * Apply unsharp mask sharpening
 *
 * @param imageData - Source image data
 * @param amount - Sharpening strength (0-500)
 * @param radius - Blur radius for mask (0.1-250)
 * @param threshold - Minimum difference to sharpen (0-255)
 */
export function sharpen(
  imageData: ImageData,
  amount: number,
  radius: number,
  threshold: number
): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  const resultData = result.data;

  // Create blurred version
  const blurred = gaussianBlur(imageData, radius);
  const blurredData = blurred.data;

  const factor = amount / 100;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const original = data[i + c];
      const blur = blurredData[i + c];
      const diff = original - blur;

      if (Math.abs(diff) >= threshold) {
        resultData[i + c] = clamp(Math.round(original + diff * factor), 0, 255);
      } else {
        resultData[i + c] = original;
      }
    }
    resultData[i + 3] = data[i + 3]; // Preserve alpha
  }

  return result;
}

/**
 * Simple convolution-based sharpen
 */
export function convolutionSharpen(imageData: ImageData, strength: number = 1): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  const resultData = result.data;

  // Sharpen kernel
  const kernel = [
    0, -strength, 0,
    -strength, 1 + 4 * strength, -strength,
    0, -strength, 0,
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let ki = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4 + c;
            sum += data[idx] * kernel[ki];
            ki++;
          }
        }

        const idx = (y * width + x) * 4 + c;
        resultData[idx] = clamp(Math.round(sum), 0, 255);
      }

      const idx = (y * width + x) * 4;
      resultData[idx + 3] = data[idx + 3];
    }
  }

  // Copy edges
  for (let x = 0; x < width; x++) {
    const topIdx = x * 4;
    const bottomIdx = ((height - 1) * width + x) * 4;
    for (let c = 0; c < 4; c++) {
      resultData[topIdx + c] = data[topIdx + c];
      resultData[bottomIdx + c] = data[bottomIdx + c];
    }
  }

  for (let y = 0; y < height; y++) {
    const leftIdx = y * width * 4;
    const rightIdx = (y * width + width - 1) * 4;
    for (let c = 0; c < 4; c++) {
      resultData[leftIdx + c] = data[leftIdx + c];
      resultData[rightIdx + c] = data[rightIdx + c];
    }
  }

  return result;
}
