// src/main.ts — app entry: wires camera/demo sources into the pipeline and the mode UI.
import './styles.css'
import { startCamera, stopCamera, type Facing } from './capture/camera'
import { loadDemoClip, createSyntheticSource } from './demo/demoClip'
import { createPipeline } from './pipeline/pipeline'
import { analyze } from './pipeline/analyze'
import { respiratoryVariationCm } from './signal/respiration'
import { renderIdentity, renderJvp } from './ui/panels'
import { drawWaveform } from './ui/waveform'
import { drawOverlay } from './ui/overlay'
import type { Mode, Rect } from './types'

const video = document.querySelector<HTMLVideoElement>('#video')!
const gl = document.querySelector<HTMLCanvasElement>('#gl')!
const overlay = document.querySelector<HTMLCanvasElement>('#overlay')!
const waveform = document.querySelector<HTMLCanvasElement>('#waveform')!
const identityEl = document.querySelector<HTMLElement>('#identity')!
const jvpEl = document.querySelector<HTMLElement>('#jvp')!
const hudEl = document.querySelector<HTMLElement>('#hud')!
const statusEl = document.querySelector<HTMLElement>('#status')!
const grabCanvas = document.createElement('canvas')
const cam = document.querySelector<HTMLElement>('#camera')!

// overlay + gl backing sizes are set to the panel's real pixels by fitCanvases() below.
waveform.width = 300
waveform.height = 96

let syntheticEl: HTMLCanvasElement | null = null
let useSynthetic = false
let stream: MediaStream | null = null
let facing: Facing = 'environment' // rear camera by default
let cameraOn = true

const overlayCtx = overlay.getContext('2d')!
// Assumed anatomical scale, tied to panel height so the reading is size-independent
// (~8 cm of neck spans ~90% of the view). Would be user-calibrated in a real setting.
const pxPerCm = () => (overlay.height * 0.9) / 8

// Draggable calibration state, in overlay-canvas pixel space (initialised by fitCanvases()).
const ROI_FRAC = { x: 0.52, y: 0.22, w: 0.21, h: 0.42 }
let roiRect: Rect = { x: 0, y: 0, w: 0, h: 0 }
let sternalYVal = 0
const faceRegion = (): Rect => ({ x: overlay.width * 0.2, y: overlay.height * 0.05, w: 80, h: 60 })
const roi = () => roiRect
const sternalY = () => sternalYVal
let contrastOn = false
const contrast = () => contrastOn

// Redraw the measurement overlay immediately (independent of the rAF loop) so dragging is responsive.
function redrawOverlay() {
  drawOverlay(overlayCtx, roiRect, {
    w: overlay.width,
    h: overlay.height,
    sternalY: sternalYVal,
    pxPerCm: pxPerCm(),
    meniscusY: roiRect.y + roiRect.h * 0.15,
    faceRegion: faceRegion(),
  })
}

// Size the canvases to the panel's real pixels (no CSS stretch → crisp, undistorted reticle and
// video), and keep the ROI/sternal-line proportional across resizes.
function fitCanvases() {
  const cw = Math.max(1, Math.round(cam.clientWidth))
  const ch = Math.max(1, Math.round(cam.clientHeight))
  const pw = overlay.width, ph = overlay.height
  overlay.width = cw; overlay.height = ch
  gl.width = cw; gl.height = ch
  if (!pw || !ph) {
    roiRect = { x: ROI_FRAC.x * cw, y: ROI_FRAC.y * ch, w: ROI_FRAC.w * cw, h: ROI_FRAC.h * ch }
    sternalYVal = 0.7 * ch
  } else {
    roiRect = { x: (roiRect.x * cw) / pw, y: (roiRect.y * ch) / ph, w: (roiRect.w * cw) / pw, h: (roiRect.h * ch) / ph }
    sternalYVal = (sternalYVal * ch) / ph
  }
  redrawOverlay()
}
fitCanvases()
new ResizeObserver(fitCanvases).observe(cam)

// Drag the ROI box or the sternal-angle line (mouse + touch via pointer events).
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const toCanvas = (e: PointerEvent) => {
  const r = overlay.getBoundingClientRect()
  return { x: ((e.clientX - r.left) / r.width) * overlay.width, y: ((e.clientY - r.top) / r.height) * overlay.height }
}
const inRoi = (p: { x: number; y: number }) =>
  p.x >= roiRect.x && p.x <= roiRect.x + roiRect.w && p.y >= roiRect.y && p.y <= roiRect.y + roiRect.h
let drag: 'roi' | 'sternal' | null = null
let dragOff = { x: 0, y: 0 }
overlay.addEventListener('pointerdown', (e) => {
  const p = toCanvas(e)
  if (Math.abs(p.y - sternalYVal) < 16) drag = 'sternal'
  else if (inRoi(p)) { drag = 'roi'; dragOff = { x: p.x - roiRect.x, y: p.y - roiRect.y } }
  if (drag) { overlay.setPointerCapture(e.pointerId); overlay.style.cursor = 'grabbing' }
})
overlay.addEventListener('pointermove', (e) => {
  const p = toCanvas(e)
  if (!drag) {
    overlay.style.cursor = Math.abs(p.y - sternalYVal) < 16 ? 'row-resize' : inRoi(p) ? 'grab' : 'default'
    return
  }
  if (drag === 'sternal') sternalYVal = clamp(p.y, 24, overlay.height - 4)
  else {
    roiRect = { ...roiRect, x: clamp(p.x - dragOff.x, 0, overlay.width - roiRect.w), y: clamp(p.y - dragOff.y, 0, overlay.height - roiRect.h) }
  }
  redrawOverlay()
})
const endDrag = () => { drag = null; overlay.style.cursor = 'grab' }
overlay.addEventListener('pointerup', endDrag)
overlay.addEventListener('pointercancel', endDrag)

const source = (): CanvasImageSource => (useSynthetic && syntheticEl ? syntheticEl : video)
const sourceSize = () => {
  if (useSynthetic && syntheticEl) return { w: syntheticEl.width, h: syntheticEl.height }
  return { w: video.videoWidth, h: video.videoHeight }
}

function setStatus(text: string, tone: 'live' | 'demo' | 'warn' = 'demo') {
  if (!statusEl) return
  statusEl.textContent = text
  statusEl.dataset.tone = tone
}

const pipeline = createPipeline({
  source,
  sourceSize,
  grabCanvas,
  glCanvas: gl,
  overlayCtx,
  waveformCtx: waveform.getContext('2d')!,
  identityEl,
  jvpEl,
  hudEl,
  roi,
  faceRegion,
  sternalY,
  contrast,
  pxPerCm,
  fs: 30,
})

/** Race a promise against a timeout so a stalled media load can never hang the app. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms)
    p.then(
      (v) => { clearTimeout(id); resolve(v) },
      (e) => { clearTimeout(id); reject(e) },
    )
  })
}

/** Fall back to the always-available synthetic neck source. */
function useSyntheticSource(reason: string) {
  if (!syntheticEl) syntheticEl = createSyntheticSource()
  useSynthetic = true
  setStatus(reason, 'demo')
}

async function setMode(m: Mode) {
  document.querySelector('#mode-live')?.classList.toggle('on', m === 'live')
  document.querySelector('#mode-demo')?.classList.toggle('on', m === 'demo')
  if (stream) { stopCamera(stream); stream = null }

  if (m === 'live') {
    useSynthetic = false
    if (!cameraOn) {
      // Camera powered off — show the "off" state, keep the loop idle (no source frames).
      video.srcObject = null
      cam.classList.add('cam-off')
      setStatus('Camera off', 'warn')
      pipeline.setMode(m)
      return
    }
    cam.classList.remove('cam-off')
    setStatus('Requesting camera…', 'live')
    try {
      stream = await startCamera(video, facing)
      setStatus(facing === 'environment' ? 'Live · rear camera' : 'Live · front camera', 'live')
    } catch {
      // No blocking dialog — degrade straight into demo mode.
      setStatus('Camera unavailable — running demo', 'warn')
      return setMode('demo')
    }
  } else {
    cam.classList.remove('cam-off')
    video.srcObject = null
    useSynthetic = false
    setStatus('Loading demo clip…', 'demo')
    try {
      await withTimeout(loadDemoClip(video), 1500)
      setStatus('Demo clip', 'demo')
    } catch {
      // Missing/stalled clip → guaranteed synthetic neck (never hangs).
      useSyntheticSource('Demo · synthetic neck')
    }
  }
  pipeline.setMode(m)
}

document.querySelector('#mode-live')?.addEventListener('click', () => setMode('live'))
document.querySelector('#mode-demo')?.addEventListener('click', () => setMode('demo'))
// CONTRAST is an independent visualization toggle (dials up the motion amplification),
// not a source like Live/Demo — it toggles its own state.
document.querySelector('#mode-contrast')?.addEventListener('click', (e) => {
  contrastOn = !contrastOn
  ;(e.currentTarget as HTMLElement).classList.toggle('on', contrastOn)
  const magEl = hudEl.querySelector('b') // first HUD value is the MAG chip
  if (magEl) magEl.textContent = contrastOn ? '×10' : 'off'
})

// Camera power on/off.
document.querySelector('#cam-power')?.addEventListener('click', () => {
  cameraOn = !cameraOn
  document.querySelector('#cam-power')?.classList.toggle('on', cameraOn)
  begin()          // ensure the loop has started even if the user never hit Start
  setMode('live')  // (re)acquire or stop the camera
})
// Tap the "camera off" panel to resume.
document.querySelector('#cam-off-msg')?.addEventListener('click', () => {
  if (!cameraOn) (document.querySelector('#cam-power') as HTMLElement | null)?.click()
})
// Flip front/rear.
document.querySelector('#cam-flip')?.addEventListener('click', () => {
  facing = facing === 'environment' ? 'user' : 'environment'
  cameraOn = true
  document.querySelector('#cam-power')?.classList.add('on')
  begin()
  setMode('live') // re-acquire with the new camera
})

// First-run explainer: show once, reopenable via the header "?".
// The camera is only requested once the user dismisses the intro (via Start), so the
// permission prompt never fires underneath the modal.
const intro = document.querySelector<HTMLElement>('#intro')
const showIntro = () => intro?.removeAttribute('hidden')
const hideIntro = () => intro?.setAttribute('hidden', '')
let started = false
function begin() {
  if (started) return
  started = true
  setMode('live')
}
document.querySelector('#intro-start')?.addEventListener('click', () => {
  hideIntro()
  try { localStorage.setItem('jvp-intro-seen', '1') } catch { /* private mode */ }
  begin()
})
document.querySelector('#help')?.addEventListener('click', showIntro)

// DEV-only render probe: runs one real analyze() cycle on the demo signals and paints
// the panels, so the render path can be verified where rAF is throttled (hidden tab).
if (import.meta.env.DEV) {
  ;(window as unknown as { __jvpTestRender: () => string }).__jvpTestRender = () => {
    const fs = 30
    const N = 120
    const wave = (tt: number) => Math.sin(2 * Math.PI * 1.2 * tt) + 0.35 * Math.sin(2 * Math.PI * 2.4 * tt)
    const arterial = Array.from({ length: N }, (_, i) => wave(i / fs))
    const neck = Array.from({ length: N }, (_, i) => -wave(i / fs - 0.4))
    const out = analyze({ neck, arterial, fs, heightCm: 3.7 })
    renderIdentity(identityEl, out.classification)
    renderJvp(jvpEl, out.jvp)
    const centroid = Array.from({ length: fs * 12 }, (_, i) =>
      200 + 18 * Math.sin(2 * Math.PI * 0.25 * (i / fs)) + 16 * Math.sin(2 * Math.PI * 1.2 * (i / fs)))
    const respCm = respiratoryVariationCm(centroid, fs, 45)
    const respEl = jvpEl.querySelector('[data-field=resp]')
    if (respEl) respEl.textContent = `${respCm.toFixed(1)} cm with respiration`
    drawWaveform(waveform.getContext('2d')!, Float32Array.from(neck), Float32Array.from(arterial), {
      w: waveform.width,
      h: waveform.height,
    })
    return `${out.classification.label} ${(out.classification.confidence * 100) | 0}% lag=${Math.round(out.classification.lagMs)}ms jvp=${out.jvp.heightCm.toFixed(1)}cm ${out.jvp.category}`
  }
}

pipeline.start()
try {
  if (localStorage.getItem('jvp-intro-seen')) begin() // returning visitor: skip intro, go live
  else showIntro() // first run: wait for Start before requesting the camera
} catch {
  showIntro()
}
