// src/pipeline/pipeline.ts
import { grabFrame } from '../capture/camera'
import { roiBandCentroid, roiMeanLuma, clampRoi } from '../capture/roi'
import { RingBuffer } from '../signal/ringbuffer'
import { respiratoryVariationCm } from '../signal/respiration'
import { analyze } from './analyze'
import { renderIdentity, renderJvp, renderAcquiring } from '../ui/panels'
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
  jvpEl: HTMLElement
  hudEl: HTMLElement
  roi: () => Rect
  faceRegion: () => Rect
  sternalY: () => number
  contrast: () => boolean // amplified-motion ("relief") view toggle
  pxPerCm: () => number // scales with the panel so the height reading is size-independent
  fs: number
}

const FS_DEFAULT = 30

export function createPipeline(deps: PipelineDeps) {
  const cap = Math.round(4 * (deps.fs || FS_DEFAULT)) // 4 s analysis window
  const neck = new RingBuffer(cap)
  const arterial = new RingBuffer(cap)
  const respBuf = new RingBuffer(Math.round(12 * (deps.fs || FS_DEFAULT))) // ~3 breaths for respiratory variation
  const magnifier = new Magnifier(deps.glCanvas.getContext('webgl')!)
  const fs = deps.fs || FS_DEFAULT
  const sampleInterval = 1000 / fs // fixed sampling cadence, independent of the rAF frame rate
  const MAGNIFY = 9 // base amplification; high enough to see, low enough not to blow out
  const CONTRAST_MAGNIFY = 24 // dialed-up "relief" view that exaggerates the pulsation motion
  let raf = 0
  let lastAnalysis = 0
  let lastSample = 0
  let fpsFrames = 0, fpsT0 = 0

  const setHud = (field: string, text: string) => {
    const el = deps.hudEl.querySelector(`[data-field=${field}]`)
    if (el) el.textContent = text
  }
  const setTrack = (state: 'stable' | 'poor' | 'acquiring', text: string) => {
    deps.hudEl.dataset.track = state
    setHud('track', text)
  }

  const loop = (t: number) => {
    const { w, h } = deps.sourceSize()
    fpsFrames++
    if (t - fpsT0 >= 500) {
      setHud('fps', String(Math.round(fpsFrames / ((t - fpsT0) / 1000))))
      fpsFrames = 0
      fpsT0 = t
    }
    if (w && h) {
      try {
      // Magnify every animation frame for a smooth live view. The GL canvas backing size is
      // owned by the layout (ResizeObserver in main), so the output matches the panel 1:1.
      magnifier.render(deps.source() as TexImageSource, deps.contrast() ? CONTRAST_MAGNIFY : MAGNIFY, 3, 30)

      const roi = deps.roi()
      const meniscusY = roi.y + roi.h * 0.15 // meniscus proxy: top of the ROI column — illustrative

      // Dynamic measurement overlay, also every frame (cheap, keeps the reticle smooth).
      drawOverlay(deps.overlayCtx, roi, {
        w: deps.overlayCtx.canvas.width, h: deps.overlayCtx.canvas.height,
        sternalY: deps.sternalY(), pxPerCm: deps.pxPerCm(), meniscusY,
        faceRegion: deps.faceRegion(),
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
        const neckVal = roiBandCentroid(frame, scale(deps.roi()))
        neck.push(neckVal)
        respBuf.push(neckVal)
        arterial.push(roiMeanLuma(frame, scale(deps.faceRegion())))

        if (neck.full && arterial.full) {
          if (t - lastAnalysis > 500) {
            lastAnalysis = t
            const na = neck.toArray(), aa = arterial.toArray()
            const heightCm = (deps.sternalY() - meniscusY) / deps.pxPerCm()
            const out = analyze({ neck: na, arterial: aa, fs, heightCm })
            renderIdentity(deps.identityEl, out.classification)
            renderJvp(deps.jvpEl, out.jvp)
            drawWaveform(deps.waveformCtx, Float32Array.from(na), Float32Array.from(aa),
              { w: deps.waveformCtx.canvas.width, h: deps.waveformCtx.canvas.height })
            setTrack(out.quality === 'good' ? 'stable' : 'poor', out.quality === 'good' ? 'stable' : 'low signal')

            // Respiratory variation — the meniscus swing with breathing (needs ~5 s of data).
            const respEl = deps.jvpEl.querySelector('[data-field=resp]')
            if (respEl) {
              const respCm = respBuf.length >= fs * 5
                ? respiratoryVariationCm(respBuf.toArray(), fs, deps.pxPerCm())
                : null
              respEl.textContent = respCm == null ? 'acquiring…' : `${respCm.toFixed(1)} cm with respiration`
            }
          }
        } else {
          // Warm-up: show acquisition progress so the panel never looks dead.
          renderAcquiring(deps.identityEl, (neck.length / cap) * 100)
          setTrack('acquiring', 'acquiring')
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
