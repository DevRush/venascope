import { describe, it, expect } from 'vitest'
import { respiratoryVariationCm } from './respiration'

describe('respiratoryVariationCm', () => {
  const fs = 30
  it('recovers the peak-to-trough respiratory swing in cm', () => {
    // 0.25 Hz breathing, amplitude 30 px → 60 px peak-to-trough → 60/45 ≈ 1.33 cm
    const n = fs * 12
    const centroid = Array.from({ length: n }, (_, i) => 200 + 30 * Math.sin(2 * Math.PI * 0.25 * (i / fs)))
    expect(respiratoryVariationCm(centroid, fs, 45)).toBeCloseTo(1.33, 1)
  })
  it('is near zero for a still baseline', () => {
    const centroid = new Array(fs * 12).fill(200)
    expect(respiratoryVariationCm(centroid, fs, 45)).toBeLessThan(0.05)
  })
  it('returns 0 without enough data', () => {
    expect(respiratoryVariationCm([1, 2, 3], fs, 45)).toBe(0)
  })
})
