// src/pipeline/pipeline.ts
import { grabFrame } from '../capture/camera'
import { roiVerticalCentroid, roiMeanLuma, clampRoi } from '../capture/roi'
import { RingBuffer } from '../signal/ringbuffer'
import { analyze } from './analyze'
import { renderIdentity, renderCvp, renderAcquiring } from '../ui/panels'
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
  const cap = Math.round(4 * (deps.fs || FS_DEFAULT)) // 4 s analysis window
  const neck = new RingBuffer(cap)
  const arterial = new RingBuffer(cap)
  const magnifier = new Magnifier(deps.glCanvas.getContext('webgl')!)
  const fs = deps.fs || FS_DEFAULT
  const sampleInterval = 1000 / fs // fixed sampling cadence, independent of the rAF frame rate
  const MAGNIFY = 9 // amplification for the motion band; high enough to see, low enough not to blow out
  let raf = 0
  let lastAnalysis = 0
  let lastSample = 0

  const loop = (t: number) => {
    const { w, h } = deps.sourceSize()
    if (w && h) {
      try {
      // Magnify every animation frame for a smooth live view.
      if (deps.glCanvas.width !== w) deps.glCanvas.width = w
      if (deps.glCanvas.height !== h) deps.glCanvas.height = h
      magnifier.render(deps.source() as TexImageSource, MAGNIFY, 3, 30)

      const roi = deps.roi()
      const meniscusY = roi.y + roi.h * 0.15 // meniscus proxy: top of the ROI column — illustrative

      // Dynamic measurement overlay, also every frame (cheap, keeps the reticle smooth).
      drawOverlay(deps.overlayCtx, roi, {
        w: deps.overlayCtx.canvas.width, h: deps.overlayCtx.canvas.height,
        sternalY: deps.sternalY(), pxPerCm: deps.pxPerCm, meniscusY,
      })

      // Sample the signal at a fixed rate so lag/frequency estimates are calibrated to `fs`.
      if (t - lastSample >= sampleInterval) {
        lastSample = t
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

        if (neck.full && arterial.full) {
          if (t - lastAnalysis > 500) {
            lastAnalysis = t
            const na = neck.toArray(), aa = arterial.toArray()
            const meniscusCm = (deps.sternalY() - meniscusY) / deps.pxPerCm
            const out = analyze({ neck: na, arterial: aa, fs, meniscusCm })
            renderIdentity(deps.identityEl, out.classification)
            renderCvp(deps.cvpEl, out.cvp)
            drawWaveform(deps.waveformCtx, Float32Array.from(na), Float32Array.from(aa),
              { w: deps.waveformCtx.canvas.width, h: deps.waveformCtx.canvas.height })
          }
        } else {
          // Warm-up: show acquisition progress so the panel never looks dead.
          renderAcquiring(deps.identityEl, (neck.length / cap) * 100)
        }
      }
      } catch (err) {
        if (import.meta.env.DEV) console.error('[jvp-loop] frame error:', err)
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
