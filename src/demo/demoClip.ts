export function loadDemoClip(video: HTMLVideoElement, url = '/demo/neck-demo.webm'): Promise<void> {
  return new Promise((resolve, reject) => {
    video.src = url
    video.loop = true
    video.muted = true
    video.oncanplay = () => { video.play().then(resolve, reject) }
    video.onerror = () => reject(new Error('demo clip missing'))
  })
}

export function createSyntheticSource(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 320; c.height = 240
  const ctx = c.getContext('2d')!
  let t = 0
  const draw = () => {
    t += 1 / 60
    ctx.fillStyle = '#2a1c16'; ctx.fillRect(0, 0, c.width, c.height)
    const y = 120 + Math.sin(2 * Math.PI * 1.2 * t) * 6 // ~1.2 Hz vertical pulse
    ctx.fillStyle = '#b98d79'; ctx.fillRect(140, y, 60, 40)
    requestAnimationFrame(draw)
  }
  draw()
  return c
}
