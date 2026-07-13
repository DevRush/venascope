import { describe, it, expect } from 'vitest'
import { meniscusCmFromPixels, estimateCvp } from './cvp'

describe('meniscusCmFromPixels', () => {
  it('converts pixels above the sternal angle to cm', () => {
    // meniscus 84px above sternal line, 20 px/cm => 4.2 cm
    expect(meniscusCmFromPixels(100, 184, 20)).toBeCloseTo(4.2, 3)
  })
})

describe('estimateCvp', () => {
  it('adds the 5 cm reference and classifies elevated', () => {
    const e = estimateCvp(4.2, 'good')
    expect(e.cvpCmH2O).toBeCloseTo(9.2, 3)
    expect(e.cvpMmHg).toBeCloseTo(6.766, 2)
    expect(e.category).toBe('elevated')
    expect(e.bandLow).toBeCloseTo(7.45, 2)
    expect(e.bandHigh).toBeCloseTo(10.95, 2)
  })
  it('classifies a low column', () => {
    expect(estimateCvp(-1, 'good').category).toBe('low')
  })
  it('classifies a normal column', () => {
    expect(estimateCvp(2, 'good').category).toBe('normal')
  })
})
