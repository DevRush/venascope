function trace(ctx: CanvasRenderingContext2D, s: Float32Array, w: number, h: number) {
  if (s.length < 2) return
  let min = Infinity, max = -Infinity
  for (const v of s) { if (v < min) min = v; if (v > max) max = v }
  const range = max - min || 1
  ctx.beginPath()
  for (let i = 0; i < s.length; i++) {
    const x = (i / (s.length - 1)) * w
    const y = h - ((s[i] - min) / range) * (h * 0.8) - h * 0.1
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
}

export function drawWaveform(
  ctx: CanvasRenderingContext2D, neck: Float32Array, arterial: Float32Array,
  opts: { w: number; h: number },
): void {
  const { w, h } = opts
  ctx.clearRect(0, 0, w, h)
  // grid
  ctx.strokeStyle = '#1b1f25'; ctx.lineWidth = 1
  for (let gy = h / 4; gy < h; gy += h / 4) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke() }
  for (let gx = w / 5; gx < w; gx += w / 5) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke() }
  // arterial reference (dashed)
  ctx.setLineDash([3, 3]); ctx.strokeStyle = '#d8795f'; ctx.lineWidth = 1
  trace(ctx, arterial, w, h)
  ctx.setLineDash([])
  // neck (venous)
  ctx.strokeStyle = '#4cc2b0'; ctx.lineWidth = 1.8
  trace(ctx, neck, w, h)
}
