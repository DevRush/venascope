import { describe, it, expect } from 'vitest'
import { drawWaveform } from './waveform'

function mockCtx() {
  const calls: string[] = []
  const ctx: any = new Proxy({}, {
    get(_t, prop: string) {
      if (['strokeStyle', 'lineWidth', 'fillStyle', 'globalAlpha'].includes(prop)) return ''
      return (..._args: any[]) => { calls.push(prop); return undefined }
    },
    set() { return true },
  })
  return { ctx, calls }
}

describe('drawWaveform', () => {
  it('clears and strokes without throwing', () => {
    const { ctx, calls } = mockCtx()
    const neck = new Float32Array(Array.from({ length: 60 }, (_, i) => Math.sin(i / 3)))
    const art = new Float32Array(Array.from({ length: 60 }, (_, i) => Math.cos(i / 3)))
    expect(() => drawWaveform(ctx, neck, art, { w: 300, h: 96 })).not.toThrow()
    expect(calls).toContain('clearRect')
    expect(calls).toContain('stroke')
  })
})
