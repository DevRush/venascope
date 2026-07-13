// src/demo/demoClip.ts — demo frame sources for the pipeline.

export function loadDemoClip(video: HTMLVideoElement, url = '/demo/neck-demo.webm'): Promise<void> {
  return new Promise((resolve, reject) => {
    video.src = url
    video.loop = true
    video.muted = true
    video.oncanplay = () => { video.play().then(resolve, reject) }
    video.onerror = () => reject(new Error('demo clip missing'))
  })
}

/**
 * A self-animating stand-in "neck" used when no camera or demo clip is available.
 *
 * It is designed so the real pipeline produces a correct, legible result:
 *  - a cheek/face region whose brightness pulses at ~1.2 Hz  → arterial reference (rPPG)
 *  - a jugular column whose bright "meniscus" band moves vertically, INVERTED and
 *    LAGGED ~400 ms vs the arterial pulse → the venous signature the discriminator detects
 * So Demo mode honestly exercises the same code path as live video, and reports
 * "Jugular venous" with a plausible waveform and CVP — clearly labelled illustrative.
 */
export function createSyntheticSource(): HTMLCanvasElement {
  const W = 320
  const H = 240
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const start = performance.now()

  const FREQ = 1.2 // Hz, ~72 bpm
  // Asymmetric waveform (2nd harmonic) so cross-correlation has a unique peak.
  const wave = (tt: number) =>
    Math.sin(2 * Math.PI * FREQ * tt) + 0.35 * Math.sin(2 * Math.PI * 2 * FREQ * tt)

  const draw = () => {
    const t = (performance.now() - start) / 1000
    const art = wave(t)              // arterial pulse
    const ven = -wave(t - 0.4)       // venous: inverted + 400 ms lag

    // Skin base: vertical gradient, warm tones.
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#c69a83')
    g.addColorStop(1, '#8f6753')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)

    // Sternocleidomastoid shadow (diagonal), gives the neck depth.
    ctx.save()
    ctx.globalAlpha = 0.18
    ctx.fillStyle = '#4a3226'
    ctx.beginPath()
    ctx.moveTo(120, 0)
    ctx.bezierCurveTo(150, 90, 130, 160, 175, 240)
    ctx.lineTo(230, 240)
    ctx.bezierCurveTo(205, 150, 200, 80, 175, 0)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Jugular column (subtle vertical vein shadow) at the neck ROI (~x 178–208).
    ctx.save()
    ctx.globalAlpha = 0.22
    ctx.fillStyle = '#3f5a63'
    ctx.fillRect(178, 40, 30, 175)
    ctx.restore()

    // Venous "meniscus" — a soft bright band that rides up/down with the venous signal.
    const neckMidY = 120
    const meniscusY = neckMidY + ven * 16
    const mg = ctx.createLinearGradient(0, meniscusY - 12, 0, meniscusY + 12)
    mg.addColorStop(0, 'rgba(210,225,230,0)')
    mg.addColorStop(0.5, 'rgba(210,232,228,0.55)')
    mg.addColorStop(1, 'rgba(210,225,230,0)')
    ctx.fillStyle = mg
    ctx.fillRect(176, meniscusY - 12, 34, 24)

    // Cheek/face highlight — brightness pulses with the arterial signal (drives rPPG ref).
    const faceX = 90
    const faceY = 30
    const bright = 0.35 + 0.28 * (art * 0.5 + 0.5)
    const fg = ctx.createRadialGradient(faceX, faceY, 4, faceX, faceY, 46)
    fg.addColorStop(0, `rgba(255,236,214,${bright.toFixed(3)})`)
    fg.addColorStop(1, 'rgba(255,236,214,0)')
    ctx.fillStyle = fg
    ctx.fillRect(faceX - 46, faceY - 46, 92, 92)

    requestAnimationFrame(draw)
  }
  draw()
  return c
}
