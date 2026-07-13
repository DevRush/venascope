import { describe, it, expect } from 'vitest'
import { classify } from './discriminate'

const sine = (f: number, fs: number, n: number, phase = 0) =>
  Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * f * (i / fs) + phase))

describe('classify', () => {
  const fs = 30
  it('labels an antiphase, carotid-lagging signal as venous', () => {
    const arterial = sine(1.2, fs, 600)
    // neck lags by ~400ms (12 samples at 30Hz) and is inverted
    const lag = 12
    const neck = Array.from({ length: 600 }, (_, i) => -(arterial[i - lag] ?? 0))
    const c = classify(neck, arterial, fs)
    expect(c.label).toBe('venous')
    expect(c.confidence).toBeGreaterThan(0.6)
    expect(c.lagMs).toBeGreaterThan(250)
  })
  it('labels an in-phase, zero-lag signal as arterial', () => {
    const arterial = sine(1.2, fs, 600)
    const neck = arterial.map((v) => v * 0.9)
    const c = classify(neck, arterial, fs)
    expect(c.label).toBe('arterial')
  })
})
