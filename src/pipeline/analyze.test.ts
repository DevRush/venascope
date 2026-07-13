import { describe, it, expect } from 'vitest'
import { analyze } from './analyze'

const sine = (f: number, fs: number, n: number, phase = 0) =>
  Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * f * (i / fs) + phase))

describe('analyze', () => {
  const fs = 30
  it('produces a venous classification and elevated CVP for antiphase lagged input', () => {
    const arterial = sine(1.2, fs, 600)
    const lag = 12
    const neck = Array.from({ length: 600 }, (_, i) => -(arterial[i - lag] ?? 0))
    const out = analyze({ neck, arterial, fs, meniscusCm: 4.2 })
    expect(out.classification.label).toBe('venous')
    expect(out.cvp.category).toBe('elevated')
    expect(out.quality).toBe('good')
  })
  it('flags poor quality for a flat neck signal', () => {
    const arterial = sine(1.2, fs, 600)
    const neck = new Array(600).fill(0)
    expect(analyze({ neck, arterial, fs, meniscusCm: 2 }).quality).toBe('poor')
  })
})
