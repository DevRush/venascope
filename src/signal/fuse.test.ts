import { describe, it, expect } from 'vitest'
import { pulsatility, fuseNeckSignal } from './fuse'

const sine = (f: number, fs: number, n: number) =>
  Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * f * (i / fs)))

describe('pulsatility', () => {
  const fs = 30
  it('is high for a clean cardiac-band sine', () => {
    expect(pulsatility(sine(1.2, fs, 300), fs)).toBeGreaterThan(0.8)
  })
  it('is low for a flat signal', () => {
    expect(pulsatility(new Array(300).fill(5), fs)).toBeLessThan(0.2)
  })
})

describe('fuseNeckSignal', () => {
  const fs = 30
  it('picks the motion channel when only motion is pulsatile', () => {
    const motion = sine(1.2, fs, 300)
    const colour = new Array(300).fill(150)
    const f = fuseNeckSignal(motion, colour, fs)
    expect(f.channel).toBe('motion')
    expect(f.signal).toBe(motion)
  })
  it('picks the colour channel when only colour is pulsatile', () => {
    const motion = new Array(300).fill(100)
    const colour = sine(1.2, fs, 300).map((v) => 150 + 3 * v) // colour pulse on a DC offset
    const f = fuseNeckSignal(motion, colour, fs)
    expect(f.channel).toBe('colour')
    expect(f.score).toBeGreaterThan(0.8)
  })
})
