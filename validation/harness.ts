// Headless validation harness — runs the REAL pipeline modules over pixel frames (no browser/rAF).
// Generates neck frames with camera-like degradations and measures how detection holds up.
// Run: npx tsx validation/harness.ts
import { roiVerticalCentroid, roiMeanLuma } from '../src/capture/roi'
import { dominantFreq, pearson, bestLagInRange } from '../src/signal/crosscorr'
import { bandpass } from '../src/signal/filters'
import { analyze } from '../src/pipeline/analyze'
import { respiratoryVariationCm } from '../src/signal/respiration'
import type { Rect } from '../src/types'

type Frame = { data: Uint8ClampedArray; width: number; height: number }

const W = 320, H = 240, FS = 30, SECONDS = 12
const FREQ = 1.2 // ground-truth pulse (Hz) ~72 bpm
const RESP_FREQ = 0.25 // ~15 breaths/min
const LAG = 0.4 // venous lags carotid (s)
const PX_PER_CM = (H * 0.9) / 8 // same scale rule as the app

// Deterministic PRNG so runs are reproducible (no Math.random).
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// Box–Muller gaussian
function gauss(rnd: () => number) {
  const u = Math.max(1e-9, rnd()), v = rnd()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const wave = (t: number) => Math.sin(2 * Math.PI * FREQ * t) + 0.35 * Math.sin(2 * Math.PI * 2 * FREQ * t)

interface Degrade {
  noise: number      // per-pixel gaussian sigma (0..~40)
  jitterPx: number   // random whole-frame shift each frame (motion)
  contrast: number   // 1 = normal, <1 = washed out
  lightDrift: number // slow global brightness swing (0..~40), unrelated to pulse
  fs: number         // sampling rate (frames/s)
}
const CLEAN: Degrade = { noise: 0, jitterPx: 0, contrast: 1, lightDrift: 0, fs: FS }

/** Render one neck frame at time t (s) into raw RGBA, with the given degradations. */
function makeFrame(t: number, d: Degrade, rnd: () => number): Frame {
  const data = new Uint8ClampedArray(W * H * 4)
  const art = wave(t)                 // arterial (drives face brightness)
  const ven = -wave(t - LAG)          // venous (drives meniscus vertical position)
  const resp = Math.sin(2 * Math.PI * RESP_FREQ * t)
  const meniscusY = 118 + ven * 16 + resp * 18
  const faceX = 90, faceY = 30
  const faceBright = 90 + 70 * (art * 0.5 + 0.5)          // luminance swing in the face patch
  const light = d.lightDrift * Math.sin(2 * Math.PI * 0.07 * t) // slow confounder
  const jx = d.jitterPx ? Math.round((rnd() * 2 - 1) * d.jitterPx) : 0
  const jy = d.jitterPx ? Math.round((rnd() * 2 - 1) * d.jitterPx) : 0

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // sample the "true" scene at jittered coords (simulates camera/subject motion)
      const sx = x + jx, sy = y + jy
      // skin: vertical warm gradient
      const g = sy / H
      let r = 198 - 40 * g, gr = 154 - 34 * g, b = 131 - 45 * g
      // jugular column shadow (x 178..208)
      if (sx >= 178 && sx <= 208 && sy >= 40 && sy <= 215) { r -= 20; gr -= 8; b += 6 }
      // venous meniscus bright band
      const dm = Math.abs(sy - meniscusY)
      if (sx >= 176 && sx <= 210 && dm < 12) { const a = (1 - dm / 12) * 90; r += a; gr += a * 1.05; b += a * 1.02 }
      // face/cheek highlight (radial), brightness pulses with arterial
      const fd = Math.hypot(sx - faceX, sy - faceY)
      if (fd < 46) { const a = (1 - fd / 46) * (faceBright - 60); r += a; gr += a * 0.92; b += a * 0.84 }
      // contrast toward mid-grey + light drift + noise
      r = 128 + (r - 128) * d.contrast + light
      gr = 128 + (gr - 128) * d.contrast + light
      b = 128 + (b - 128) * d.contrast + light
      if (d.noise) { const n = gauss(rnd) * d.noise; r += n; gr += n; b += n }
      const i = (y * W + x) * 4
      data[i] = r; data[i + 1] = gr; data[i + 2] = b; data[i + 3] = 255
    }
  }
  return { data, width: W, height: H }
}

const luma = (d: Uint8ClampedArray, i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]

/**
 * Candidate improved extractor: tracks the vertical position of the moving bright band by
 * removing the ROI's static vertical luminance trend (skin gradient) and centroiding the
 * positive residual. Far more motion-sensitive than a whole-ROI luminance centroid.
 */
function bandCentroid(frame: Frame, roi: Rect): number {
  const { data, width } = frame
  const x0 = Math.max(0, Math.floor(roi.x)), x1 = Math.min(width, Math.floor(roi.x + roi.w))
  const y0 = Math.max(0, Math.floor(roi.y)), y1 = Math.min(frame.height, Math.floor(roi.y + roi.h))
  const rows: number[] = []
  for (let y = y0; y < y1; y++) {
    let s = 0
    for (let x = x0; x < x1; x++) s += luma(data, (y * width + x) * 4)
    rows.push(s / Math.max(1, x1 - x0))
  }
  const n = rows.length
  if (n < 4) return (y0 + y1) / 2
  // remove linear trend (skin gradient): least-squares line over row index
  let sx = 0, sy = 0, sxx = 0, sxy = 0
  for (let k = 0; k < n; k++) { sx += k; sy += rows[k]; sxx += k * k; sxy += k * rows[k] }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1)
  const intercept = (sy - slope * sx) / n
  // weighted centroid of the positive residual (the bright band)
  let wsum = 0, ysum = 0
  for (let k = 0; k < n; k++) {
    const resid = rows[k] - (slope * k + intercept)
    if (resid > 0) { wsum += resid; ysum += resid * (y0 + k) }
  }
  return wsum === 0 ? (y0 + y1) / 2 : ysum / wsum
}

/** Run the real pipeline over a scenario. roiOffset shifts the analysis ROI off the true column. */
function runScenario(name: string, d: Degrade, roiOffset = 0) {
  const rnd = mulberry32(12345)
  const fs = d.fs
  const n = Math.round(SECONDS * fs)
  // analysis ROI over the jugular column; faceRegion over the cheek (arterial ref).
  const roi: Rect = { x: 176 + roiOffset, y: 60 + roiOffset, w: 40, h: 150 }
  const face: Rect = { x: 60, y: 8, w: 60, h: 44 }
  const sternalY = H * 0.7

  const neck: number[] = [], arterial: number[] = []
  for (let k = 0; k < n; k++) {
    const t = k / fs
    const f = makeFrame(t, d, rnd)
    neck.push(USE_BAND ? bandCentroid(f, roi) : roiVerticalCentroid(f as unknown as ImageData, roi))
    arterial.push(roiMeanLuma(f as unknown as ImageData, face))
  }

  // Match the app: meniscus proxy = top 15% of the ROI column.
  const meniscusY = roi.y + roi.h * 0.15
  const heightCm = (sternalY - meniscusY) / PX_PER_CM
  const out = analyze({ neck, arterial, fs, heightCm })
  const neckFreq = dominantFreq(bandpass(neck, fs, 0.7, 3), fs)
  const respCm = respiratoryVariationCm(neck, fs, PX_PER_CM)

  const ok = out.classification.label === 'venous' && Math.abs(neckFreq - FREQ) < 0.35
  console.log(
    `${ok ? 'PASS' : 'flag'}  ${name.padEnd(26)}` +
    ` label=${out.classification.label.padEnd(9)}` +
    ` conf=${(out.classification.confidence * 100).toFixed(0).padStart(3)}%` +
    ` freq=${neckFreq.toFixed(2)}Hz` +
    ` lag=${Math.round(out.classification.lagMs).toString().padStart(4)}ms` +
    ` qual=${out.quality.padEnd(4)}` +
    ` JVP=${out.jvp.heightCm.toFixed(1)}cm(${out.jvp.category})` +
    ` resp=${respCm.toFixed(1)}cm`,
  )
}

const USE_BAND = process.argv.includes('--band')
console.log(`\nVenaScope pipeline robustness battery — real modules, generated neck frames`)
console.log(`neck extractor: ${USE_BAND ? 'bandCentroid (candidate fix)' : 'roiVerticalCentroid (current app)'}`)
console.log(`ground truth: venous · ${FREQ.toFixed(1)} Hz · lag ${LAG * 1000}ms · resp swing ~1.3cm\n`)
runScenario('baseline (clean)', CLEAN)
runScenario('sensor noise σ=12', { ...CLEAN, noise: 12 })
runScenario('heavy noise σ=25', { ...CLEAN, noise: 25 })
runScenario('motion jitter ±3px', { ...CLEAN, jitterPx: 3 })
runScenario('motion jitter ±6px', { ...CLEAN, jitterPx: 6 })
runScenario('low contrast 0.5', { ...CLEAN, contrast: 0.5 })
runScenario('low light+drift', { ...CLEAN, contrast: 0.55, lightDrift: 30, noise: 8 })
runScenario('low fps (15)', { ...CLEAN, fs: 15 })
runScenario('realistic webcam', { ...CLEAN, noise: 10, jitterPx: 2, contrast: 0.7, lightDrift: 12 })
runScenario('ROI misplaced +18px', CLEAN, 18)
console.log('')

// ---- Diagnostic: why does discrimination land on lag 0? Cross-correlogram, clean + bandCentroid.
{
  const rnd = mulberry32(12345), fs = FS, n = Math.round(SECONDS * fs)
  const roi: Rect = { x: 176, y: 60, w: 40, h: 150 }, face: Rect = { x: 60, y: 8, w: 60, h: 44 }
  const neck: number[] = [], arterial: number[] = []
  for (let k = 0; k < n; k++) { const f = makeFrame(k / fs, CLEAN, rnd); neck.push(bandCentroid(f, roi)); arterial.push(roiMeanLuma(f as unknown as ImageData, face)) }
  const nb = bandpass(neck, fs, 0.7, 3).slice(30), ab = bandpass(arterial, fs, 0.7, 3).slice(30)
  const rms = (x: number[]) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length)
  console.log(`diagnostic (clean, bandCentroid):  neckBP rms=${rms(nb).toFixed(3)}  artBP rms=${rms(ab).toFixed(3)}`)
  const corrAt = (lag: number) => { const a: number[] = [], b: number[] = []; for (let i = 0; i < nb.length; i++) { const j = i - lag; if (j >= 0 && j < ab.length) { a.push(nb[i]); b.push(ab[j]) } } return pearson(a, b) }
  const lags = [-4, 0, 4, 8, 12, 15]
  console.log('  corr by lag(samples): ' + lags.map((l) => `${l}:${corrAt(l).toFixed(2)}`).join('  '))
  const bl = bestLagInRange(nb, ab, -5, 17)
  console.log(`  bestLagInRange -> lag=${bl.lag} (${Math.round((bl.lag / fs) * 1000)}ms) corr=${bl.corr.toFixed(2)}`)
  console.log(`  NOTE: at ${FREQ}Hz the ~400ms venous lag ≈ half the cardiac period, so an inverted+lagged`)
  console.log(`        venous is nearly IN-PHASE with the carotid — phase/lag discrimination is ambiguous here.\n`)
}
