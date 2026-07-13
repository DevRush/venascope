import { describe, it, expect } from 'vitest'
import { clampRoi, roiVerticalCentroid, roiBandCentroid, roiMeanLuma } from './roi'
import type { Rect } from '../types'

// A vertical luminance gradient (skin) with a bright band centred at `bandY`.
function gradBandImage(w: number, h: number, bandY: number): ImageData {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    const grad = 60 + 100 * (y / h)
    for (let x = 0; x < w; x++) {
      const v = Math.min(255, grad + (Math.abs(y - bandY) < 3 ? 120 : 0))
      const i = (y * w + x) * 4
      data[i] = data[i + 1] = data[i + 2] = v
      data[i + 3] = 255
    }
  }
  return { data, width: w, height: h, colorSpace: 'srgb' } as ImageData
}

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

  it('returns a finite value for a non-integer roi', () => {
    const img = bandImage(40, 100, 48, 52) // centre ~50
    const roi: Rect = { x: 0.4, y: 0.6, w: 39.7, h: 99.3 }
    const y = roiVerticalCentroid(img, roi)
    expect(Number.isFinite(y)).toBe(true)
    expect(y).toBeGreaterThanOrEqual(0)
    expect(y).toBeLessThan(100)
  })

  it('falls back to the clamped-roi centre on an all-zero-luminance roi', () => {
    const img = bandImage(40, 100, 0, 0) // all black, no bright band
    const roi: Rect = { x: 0.4, y: 0.6, w: 39.7, h: 99.3 }
    const clamped = clampRoi(roi, img.width, img.height)
    const y = roiVerticalCentroid(img, roi)
    expect(y).toBe(clamped.y + clamped.h / 2)
  })
})

describe('roiBandCentroid', () => {
  const roi: Rect = { x: 0, y: 0, w: 40, h: 100 }
  it('tracks the bright band on a gradient background', () => {
    const y = roiBandCentroid(gradBandImage(40, 100, 50), roi)
    expect(y).toBeGreaterThan(47)
    expect(y).toBeLessThan(53)
  })
  it('transfers band motion far better than a whole-ROI centroid', () => {
    const a = gradBandImage(40, 100, 40)
    const b = gradBandImage(40, 100, 60) // band moved 20 px
    const bandShift = Math.abs(roiBandCentroid(b, roi) - roiBandCentroid(a, roi))
    const centroidShift = Math.abs(roiVerticalCentroid(b, roi) - roiVerticalCentroid(a, roi))
    expect(bandShift).toBeGreaterThan(15) // tracks most of the 20 px move
    expect(bandShift).toBeGreaterThan(centroidShift * 3) // much more sensitive than the plain centroid
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
