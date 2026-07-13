import { describe, it, expect } from 'vitest'
import { meniscusCmFromPixels, estimateJvp } from './cvp'

describe('meniscusCmFromPixels', () => {
  it('converts pixels above the sternal angle to cm', () => {
    // meniscus 84px above sternal line, 20 px/cm => 4.2 cm
    expect(meniscusCmFromPixels(100, 184, 20)).toBeCloseTo(4.2, 3)
  })
})

describe('estimateJvp', () => {
  it('reports height, an assumed CVP-equivalent, and classifies elevated (>3 cm)', () => {
    const e = estimateJvp(3.7, 'good')
    expect(e.heightCm).toBeCloseTo(3.7, 3)
    expect(e.category).toBe('elevated')
    expect(e.raOffsetCm).toBe(5)
    expect(e.cvpEquivCmH2O).toBeCloseTo(8.7, 3) // heightCm + assumed RA offset
    expect(e.bandLow).toBeCloseTo(2.7, 3)
    expect(e.bandHigh).toBeCloseTo(4.7, 3)
  })
  it('classifies a low column (<1 cm)', () => {
    expect(estimateJvp(0.5, 'good').category).toBe('low')
  })
  it('classifies a normal column (1–3 cm)', () => {
    expect(estimateJvp(2, 'good').category).toBe('normal')
  })
  it('honors a custom RA offset assumption', () => {
    expect(estimateJvp(3, 'good', 8).cvpEquivCmH2O).toBeCloseTo(11, 3)
  })
  it('widens the band for poor quality', () => {
    const e = estimateJvp(3, 'poor')
    expect(e.bandLow).toBeCloseTo(1, 3)
    expect(e.bandHigh).toBeCloseTo(5, 3)
  })
  it('classifies the low/normal boundary at 1 cm as normal', () => {
    expect(estimateJvp(1, 'good').category).toBe('normal')
  })
  it('classifies the normal/elevated boundary at 3 cm as normal', () => {
    expect(estimateJvp(3, 'good').category).toBe('normal')
  })
})
