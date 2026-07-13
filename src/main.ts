// src/main.ts
import './styles.css'
import { startCamera, stopCamera } from './capture/camera'
import { loadDemoClip, createSyntheticSource } from './demo/demoClip'
import { createPipeline } from './pipeline/pipeline'
import type { Mode, Rect } from './types'

const video = document.querySelector<HTMLVideoElement>('#video')!
const gl = document.querySelector<HTMLCanvasElement>('#gl')!
const overlay = document.querySelector<HTMLCanvasElement>('#overlay')!
const waveform = document.querySelector<HTMLCanvasElement>('#waveform')!
const identityEl = document.querySelector<HTMLElement>('#identity')!
const cvpEl = document.querySelector<HTMLElement>('#cvp')!
const grabCanvas = document.createElement('canvas')

overlay.width = 480; overlay.height = 400
waveform.width = 300; waveform.height = 96

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

const pipeline = createPipeline({
  source, sourceSize, grabCanvas, glCanvas: gl,
  overlayCtx: overlay.getContext('2d')!, waveformCtx: waveform.getContext('2d')!,
  identityEl, cvpEl, roi, faceRegion, sternalY, pxPerCm: 20, fs: 30,
})

async function setMode(m: Mode) {
  document.querySelector('#mode-live')?.classList.toggle('on', m === 'live')
  document.querySelector('#mode-demo')?.classList.toggle('on', m === 'demo')
  if (stream) { stopCamera(stream); stream = null }
  if (m === 'live') {
    useSynthetic = false
    try { stream = await startCamera(video) }
    catch { alert('Camera unavailable — switching to demo.'); return setMode('demo') }
  } else {
    video.srcObject = null
    try { await loadDemoClip(video); useSynthetic = false }
    catch { syntheticEl = createSyntheticSource(); useSynthetic = true }
  }
  pipeline.setMode(m)
}

document.querySelector('#mode-live')?.addEventListener('click', () => setMode('live'))
document.querySelector('#mode-demo')?.addEventListener('click', () => setMode('demo'))

pipeline.start()
setMode('live')
