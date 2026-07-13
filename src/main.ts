// src/main.ts — app entry: wires camera/demo sources into the pipeline and the mode UI.
import './styles.css'
import { startCamera, stopCamera } from './capture/camera'
import { loadDemoClip, createSyntheticSource } from './demo/demoClip'
import { createPipeline } from './pipeline/pipeline'
import { analyze } from './pipeline/analyze'
import { renderIdentity, renderJvp } from './ui/panels'
import { drawWaveform } from './ui/waveform'
import type { Mode, Rect } from './types'

const video = document.querySelector<HTMLVideoElement>('#video')!
const gl = document.querySelector<HTMLCanvasElement>('#gl')!
const overlay = document.querySelector<HTMLCanvasElement>('#overlay')!
const waveform = document.querySelector<HTMLCanvasElement>('#waveform')!
const identityEl = document.querySelector<HTMLElement>('#identity')!
const jvpEl = document.querySelector<HTMLElement>('#jvp')!
const statusEl = document.querySelector<HTMLElement>('#status')!
const grabCanvas = document.createElement('canvas')

overlay.width = 480
overlay.height = 400
waveform.width = 300
waveform.height = 96

let syntheticEl: HTMLCanvasElement | null = null
let useSynthetic = false
let stream: MediaStream | null = null

const roi = (): Rect => ({ x: overlay.width * 0.52, y: overlay.height * 0.22, w: 100, h: 170 })
const faceRegion = (): Rect => ({ x: overlay.width * 0.2, y: overlay.height * 0.05, w: 80, h: 60 })
const sternalY = () => overlay.height * 0.7

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
  overlayCtx: overlay.getContext('2d')!,
  waveformCtx: waveform.getContext('2d')!,
  identityEl,
  jvpEl,
  roi,
  faceRegion,
  sternalY,
  pxPerCm: 45, // assumed anatomical scale for the demo (would be user-calibrated live)
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
    setStatus('Requesting camera…', 'live')
    try {
      stream = await startCamera(video)
      setStatus('Live camera', 'live')
    } catch {
      // No blocking dialog — degrade straight into demo mode.
      setStatus('Camera unavailable — running demo', 'warn')
      return setMode('demo')
    }
  } else {
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

// First-run explainer: show once, reopenable via the header "?".
const intro = document.querySelector<HTMLElement>('#intro')
const showIntro = () => intro?.removeAttribute('hidden')
const hideIntro = () => intro?.setAttribute('hidden', '')
document.querySelector('#intro-start')?.addEventListener('click', () => {
  hideIntro()
  try { localStorage.setItem('jvp-intro-seen', '1') } catch { /* private mode */ }
})
document.querySelector('#help')?.addEventListener('click', showIntro)
try { if (!localStorage.getItem('jvp-intro-seen')) showIntro() } catch { showIntro() }

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
    drawWaveform(waveform.getContext('2d')!, Float32Array.from(neck), Float32Array.from(arterial), {
      w: waveform.width,
      h: waveform.height,
    })
    return `${out.classification.label} ${(out.classification.confidence * 100) | 0}% lag=${Math.round(out.classification.lagMs)}ms jvp=${out.jvp.heightCm.toFixed(1)}cm ${out.jvp.category}`
  }
}

pipeline.start()
setMode('live')
