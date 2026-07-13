import { describe, it, expect } from 'vitest'
import { pearson, bestLag, dominantFreq } from './crosscorr'

const sine = (f: number, fs: number, n: number, phase = 0) =>
  Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * f * (i / fs) + phase))

describe('pearson', () => {
  it('is +1 for identical signals', () => {
    const a = sine(1, 30, 300)
    expect(pearson(a, a)).toBeCloseTo(1, 3)
  })
  it('is ~-1 for antiphase signals', () => {
    const a = sine(1, 30, 300)
    const b = sine(1, 30, 300, Math.PI)
    expect(pearson(a, b)).toBeLessThan(-0.95)
  })
})

describe('bestLag', () => {
  it('finds a positive lag when a is a delayed copy of b', () => {
    const fs = 30
    const b = sine(1.2, fs, 400)
    const delaySamples = 5
    const a = Array.from({ length: 400 }, (_, i) => b[i - delaySamples] ?? 0)
    const { lag, corr } = bestLag(a, b, 15)
    expect(lag).toBe(delaySamples)
    expect(corr).toBeGreaterThan(0.9)
  })
})

describe('dominantFreq', () => {
  it('estimates ~1.2 Hz for a 1.2 Hz sine', () => {
    expect(dominantFreq(sine(1.2, 30, 900), 30)).toBeCloseTo(1.2, 1)
  })
})
