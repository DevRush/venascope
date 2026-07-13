export async function startCamera(video: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 1280, height: 720, frameRate: 60 },
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
