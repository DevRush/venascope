import { describe, it, expect } from 'vitest'
import { RingBuffer } from './ringbuffer'

describe('RingBuffer', () => {
  it('retains only the last N samples in order', () => {
    const rb = new RingBuffer(3)
    ;[1, 2, 3, 4, 5].forEach((v) => rb.push(v))
    expect(rb.toArray()).toEqual([3, 4, 5])
    expect(rb.full).toBe(true)
    expect(rb.length).toBe(3)
  })
  it('reports partial fill before capacity', () => {
    const rb = new RingBuffer(4)
    rb.push(1); rb.push(2)
    expect(rb.toArray()).toEqual([1, 2])
    expect(rb.full).toBe(false)
  })
})
