// src/signal/fuse.ts
// A neck pulsation shows up as MOTION (the meniscus moving) in some views and as COLOUR (skin
// perfusion / rPPG) in others — real reference clips confirmed both. Fuse the two by picking the
// more periodic channel for the pulse timing/waveform, rather than summing them (which would
// cancel when the two channels are out of phase).
import { bandpass, detrend } from './filters'
import { dominantFreq, pearson } from './crosscorr'

/** How strongly a signal carries a periodic cardiac pulse: autocorrelation at its dominant-freq lag. */
export function pulsatility(sig: number[], fs: number): number {
  const bp = bandpass(detrend(sig), fs, 0.7, 3)
  if (bp.length < fs) return 0
  const f = dominantFreq(bp, fs)
  if (f < 0.6 || f > 3.2) return 0
  const lag = Math.round(fs / f)
  if (lag <= 0 || lag >= bp.length) return 0
  return Math.max(0, pearson(bp.slice(0, bp.length - lag), bp.slice(lag)))
}

export interface FusedNeck {
  signal: number[] // the raw chosen channel (analyze() will detrend + bandpass it)
  channel: 'motion' | 'colour'
  score: number // pulsatility of the chosen channel (0..1)
}

/** Choose the more pulsatile of the neck motion (centroid) and colour (mean-luma) channels. */
export function fuseNeckSignal(motion: number[], colour: number[], fs: number): FusedNeck {
  const sm = pulsatility(motion, fs)
  const sc = pulsatility(colour, fs)
  return sm >= sc
    ? { signal: motion, channel: 'motion', score: sm }
    : { signal: colour, channel: 'colour', score: sc }
}
