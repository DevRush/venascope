import { describe, it, expect } from 'vitest'
import { detrend, bandpass } from './filters'

const sine = (f: number, fs: number, n: number, phase = 0) =>
  Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * f * (i / fs) + phase))

const rms = (x: number[]) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length)

describe('detrend', () => {
  it('removes the mean', () => {
    const out = detrend([1, 2, 3, 4, 5])
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 6)
  })
})

describe('bandpass', () => {
  const fs = 30
  it('passes an in-band 1.2 Hz sine (settled portion retains energy)', () => {
    const x = sine(1.2, fs, 600)
    const y = bandpass(x, fs, 0.7, 3).slice(200) // drop transient
    expect(rms(y)).toBeGreaterThan(0.4)
  })
  it('attenuates a DC offset', () => {
    const x = sine(1.2, fs, 600).map((v) => v + 5)
    const y = bandpass(x, fs, 0.7, 3).slice(200)
    expect(Math.abs(y.reduce((a, b) => a + b, 0) / y.length)).toBeLessThan(0.05)
  })
  it('attenuates an out-of-band 0.1 Hz sine', () => {
    const x = sine(0.1, fs, 1200)
    const y = bandpass(x, fs, 0.7, 3).slice(400)
    expect(rms(y)).toBeLessThan(0.3)
  })
})
