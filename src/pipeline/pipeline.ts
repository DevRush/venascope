// src/pipeline/pipeline.ts
import { grabFrame } from '../capture/camera'
import { roiVerticalCentroid, roiMeanLuma, clampRoi } from '../capture/roi'
import { RingBuffer } from '../signal/ringbuffer'
import { analyze } from './analyze'
import { renderIdentity, renderCvp } from '../ui/panels'
import { drawWaveform } from '../ui/waveform'
import { drawOverlay } from '../ui/overlay'
import { Magnifier } from '../magnify/evm'
import type { Mode, Rect } from '../types'

export interface PipelineDeps {
  source: () => CanvasImageSource     // video or synthetic canvas
  sourceSize: () => { w: number; h: number }
  grabCanvas: HTMLCanvasElement       // offscreen for ImageData
  glCanvas: HTMLCanvasElement         // WebGL display
  overlayCtx: CanvasRenderingContext2D
  waveformCtx: CanvasRenderingContext2D
  identityEl: HTMLElement
  cvpEl: HTMLElement
  roi: () => Rect
  faceRegion: () => Rect
  sternalY: () => number
  pxPerCm: number
  fs: number
}

const FS_DEFAULT = 30

export function createPipeline(deps: PipelineDeps) {
  const cap = Math.round(6 * (deps.fs || FS_DEFAULT)) // 6 s window
  const neck = new RingBuffer(cap)
  const arterial = new RingBuffer(cap)
  const magnifier = new Magnifier(deps.glCanvas.getContext('webgl')!)
  let raf = 0
  let lastAnalysis = 0

  const loop = (t: number) => {
    const { w, h } = deps.sourceSize()
    if (w && h) {
      deps.glCanvas.width = w; deps.glCanvas.height = h
      magnifier.render(deps.source() as TexImageSource, 18, 3, 30)

      const frame = grabFrame(deps.source(), Math.min(w, 320), Math.min(h, 240), deps.grabCanvas)
      const ow = deps.overlayCtx.canvas.width
      const oh = deps.overlayCtx.canvas.height
      const scale = (r: Rect): Rect => clampRoi({
        x: (r.x / ow) * frame.width,
        y: (r.y / oh) * frame.height,
        w: (r.w / ow) * frame.width,
        h: (r.h / oh) * frame.height,
      }, frame.width, frame.height)
      neck.push(roiVerticalCentroid(frame, scale(deps.roi())))
      arterial.push(roiMeanLuma(frame, scale(deps.faceRegion())))

      // meniscus proxy: top of the ROI column (top 15%) — illustrative
      const roi = deps.roi()
      const meniscusY = roi.y + roi.h * 0.15

      drawOverlay(deps.overlayCtx, roi, {
        w: deps.overlayCtx.canvas.width, h: deps.overlayCtx.canvas.height,
        sternalY: deps.sternalY(), pxPerCm: deps.pxPerCm, meniscusY,
      })

      if (t - lastAnalysis > 500 && neck.full && arterial.full) {
        lastAnalysis = t
        const na = neck.toArray(), aa = arterial.toArray()
        const meniscusCm = (deps.sternalY() - meniscusY) / deps.pxPerCm
        const out = analyze({ neck: na, arterial: aa, fs: deps.fs || FS_DEFAULT, meniscusCm })
        renderIdentity(deps.identityEl, out.classification)
        renderCvp(deps.cvpEl, out.cvp)
        drawWaveform(deps.waveformCtx, Float32Array.from(na), Float32Array.from(aa),
          { w: deps.waveformCtx.canvas.width, h: deps.waveformCtx.canvas.height })
      }
    }
    raf = requestAnimationFrame(loop)
  }

  return {
    start() { raf = requestAnimationFrame(loop) },
    stop() { cancelAnimationFrame(raf) },
    setMode(_m: Mode) { /* reserved for mode-specific pipeline behavior */ },
  }
}
