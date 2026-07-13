export type Facing = 'environment' | 'user'

export async function startCamera(video: HTMLVideoElement, facing: Facing = 'environment'): Promise<MediaStream> {
  // Request a 4:3 stream so it matches the (4:3) camera panel and synthetic source — no
  // aspect distortion. `ideal` constraints degrade gracefully on hardware that can't hit them.
  // Default to the rear camera (higher quality; pointed at the subject's neck).
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 960 },
      height: { ideal: 720 },
      aspectRatio: { ideal: 4 / 3 },
      frameRate: { ideal: 60 },
      facingMode: { ideal: facing },
    },
    audio: false,
  })
  video.srcObject = stream
  await new Promise<void>((res) => {
    video.onloadedmetadata = () => res()
  })
  try {
    await video.play()
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop())
    throw err
  }
  return stream
}

export function grabFrame(
  source: CanvasImageSource, w: number, h: number, canvas: HTMLCanvasElement,
): ImageData {
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(source, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

export function stopCamera(stream: MediaStream): void {
  stream.getTracks().forEach((t) => t.stop())
}
