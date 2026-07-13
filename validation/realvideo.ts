// Real-video validation — runs the app's real extractors over decoded frames of actual JVP clips
// and scans a grid of ROIs for a genuine cardiac pulsation. Internal analysis only (no redistribution).
// Frames come from: ffmpeg -i clip.mp4 -vf fps=30,scale=WxH -pix_fmt rgba -f rawvideo clip.rgba
// Run: npx tsx validation/realvideo.ts <clip.rgba> <W> <H>
import { readFileSync } from 'node:fs'
import { roiBandCentroid, roiMeanLuma } from '../src/capture/roi'
import { bandpass, detrend } from '../src/signal/filters'
import { dominantFreq, pearson } from '../src/signal/crosscorr'
import type { Rect } from '../src/types'

const [, , path, wArg, hArg] = process.argv
const W = Number(wArg), H = Number(hArg), FS = 30
const buf = readFileSync(path)
const frameBytes = W * H * 4
const N = Math.floor(buf.length / frameBytes)
const rms = (x: number[]) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / (x.length || 1))

function frame(k: number) {
  const off = k * frameBytes
  return { data: new Uint8ClampedArray(buf.buffer, buf.byteOffset + off, frameBytes), width: W, height: H } as unknown as ImageData
}

// Strength of a periodic cardiac pulse in a 1-D signal: dominant freq (bpm) + autocorrelation score.
function periodicity(sig: number[]) {
  const bp = bandpass(detrend(sig), FS, 0.7, 3).slice(FS) // drop the filter transient
  const freq = dominantFreq(bp, FS)
  if (freq < 0.6 || freq > 3.2 || bp.length < FS) return { bpm: freq * 60, score: 0 }
  const lag = Math.round(FS / freq)
  const a = bp.slice(0, bp.length - lag)
  const b = bp.slice(lag)
  const score = Math.max(0, pearson(a, b)) // periodic → high autocorr at the period lag
  return { bpm: freq * 60, score, amp: rms(bp) }
}

// Scan a grid of candidate ROIs; for each, test both the motion (bandCentroid) and colour
// (rPPG-style mean-luma) channels and keep the more periodic one.
const boxW = Math.round(W * 0.28), boxH = Math.round(H * 0.34)
type Hit = { cx: number; cy: number; bpm: number; score: number; chan: string; amp: number }
const hits: Hit[] = []
for (let cyf = 0.18; cyf <= 0.82; cyf += 0.1) {
  for (let cxf = 0.18; cxf <= 0.82; cxf += 0.1) {
    const roi: Rect = { x: cxf * W - boxW / 2, y: cyf * H - boxH / 2, w: boxW, h: boxH }
    const motion: number[] = [], colour: number[] = []
    for (let k = 0; k < N; k++) { const f = frame(k); motion.push(roiBandCentroid(f, roi)); colour.push(roiMeanLuma(f, roi)) }
    const pm = periodicity(motion), pc = periodicity(colour)
    const best = pm.score >= pc.score ? { ...pm, chan: 'motion' } : { ...pc, chan: 'colour' }
    hits.push({ cx: cxf, cy: cyf, bpm: best.bpm, score: best.score, chan: best.chan, amp: best.amp ?? 0 })
  }
}
hits.sort((a, b) => b.score - a.score)

console.log(`\n${path.split('/').pop()}  (${W}x${H}, ${N} frames @ ${FS}fps = ${(N / FS).toFixed(1)}s)`)
console.log('top pulsatile regions (grid position as fraction of frame):')
for (const h of hits.slice(0, 5)) {
  const plausible = h.bpm >= 42 && h.bpm <= 160 && h.score >= 0.4
  console.log(
    `  ${plausible ? 'PULSE' : '  .  '}  x=${h.cx.toFixed(2)} y=${h.cy.toFixed(2)}` +
    `  ${h.bpm.toFixed(0).padStart(3)} bpm  score=${h.score.toFixed(2)}  via ${h.chan}`,
  )
}
const top = hits[0]
const verdict = top.bpm >= 42 && top.bpm <= 160 && top.score >= 0.4
console.log(`  => ${verdict ? 'PASS' : 'no clear pulse'}: strongest region ${top.bpm.toFixed(0)} bpm, score ${top.score.toFixed(2)} (${top.chan})\n`)
