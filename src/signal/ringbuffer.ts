export class RingBuffer {
  private buf: number[] = []
  readonly capacity: number
  constructor(capacity: number) { this.capacity = capacity }
  push(v: number): void {
    this.buf.push(v)
    if (this.buf.length > this.capacity) this.buf.shift()
  }
  toArray(): number[] { return this.buf.slice() }
  get length(): number { return this.buf.length }
  get full(): boolean { return this.buf.length >= this.capacity }
}
