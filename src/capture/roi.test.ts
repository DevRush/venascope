import { describe, it, expect } from 'vitest'
import { clampRoi, roiVerticalCentroid, roiMeanLuma } from './roi'
import type { Rect } from '../types'

// Build an ImageData with a bright horizontal band at rows [y0,y1)
function bandImage(w: number, h: number, y0: number, y1: number): ImageData {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    const v = y >= y0 && y < y1 ? 255 : 0
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      data[i] = data[i + 1] = data[i + 2] = v
      data[i + 3] = 255
    }
  }
  return { data, width: w, height: h, colorSpace: 'srgb' } as ImageData
}

describe('clampRoi', () => {
  it('keeps the ROI within bounds', () => {
    const r: Rect = { x: -10, y: 5, w: 200, h: 50 }
    const c = clampRoi(r, 100, 100)
    expect(c.x).toBe(0)
    expect(c.w).toBeLessThanOrEqual(100)
  })
})

describe('roiVerticalCentroid', () => {
  it('locates the bright band centre', () => {
    const img = bandImage(40, 100, 48, 52) // centre ~50
    const y = roiVerticalCentroid(img, { x: 0, y: 0, w: 40, h: 100 })
    expect(y).toBeGreaterThan(48)
    expect(y).toBeLessThan(52)
  })
})

describe('roiMeanLuma', () => {
  it('is higher for a brighter ROI', () => {
    const bright = bandImage(40, 40, 0, 40)
    const dark = bandImage(40, 40, 0, 0)
    expect(roiMeanLuma(bright, { x: 0, y: 0, w: 40, h: 40 }))
      .toBeGreaterThan(roiMeanLuma(dark, { x: 0, y: 0, w: 40, h: 40 }))
  })
})
