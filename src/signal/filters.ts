export function detrend(x: number[]): number[] {
  const mean = x.reduce((a, b) => a + b, 0) / (x.length || 1)
  return x.map((v) => v - mean)
}

// RBJ cookbook bandpass (constant 0 dB peak gain), causal direct-form I.
export function bandpass(x: number[], fs: number, low: number, high: number): number[] {
  const f0 = Math.sqrt(low * high)
  const bw = Math.max(high - low, 1e-3)
  const Q = f0 / bw
  const w0 = (2 * Math.PI * f0) / fs
  const alpha = Math.sin(w0) / (2 * Q)
  const cos = Math.cos(w0)

  const b0 = alpha, b1 = 0, b2 = -alpha
  const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha

  const nb0 = b0 / a0, nb1 = b1 / a0, nb2 = b2 / a0
  const na1 = a1 / a0, na2 = a2 / a0

  const y = new Array<number>(x.length).fill(0)
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  for (let i = 0; i < x.length; i++) {
    const xi = x[i]
    const yi = nb0 * xi + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2
    x2 = x1; x1 = xi; y2 = y1; y1 = yi
    y[i] = yi
  }
  return y
}
