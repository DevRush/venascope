import { pearson, bestLag, dominantFreq } from './crosscorr'
import type { Classification, Label } from '../types'

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const wrap = (deg: number) => { let d = deg % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d }

export function classify(neck: number[], arterial: number[], fs: number): Classification {
  const p = pearson(neck, arterial)
  const maxLag = Math.round(0.6 * fs)
  const { lag, corr } = bestLag(neck, arterial, maxLag)
  const lagMs = (lag / fs) * 1000
  const freq = dominantFreq(arterial, fs) || 1.2
  const phaseDeg = wrap(360 * (lag / fs) * freq)

  const antiphase = clamp(-corr, 0, 1)
  const lagFit = Math.exp(-((lagMs - 400) ** 2) / (2 * 150 ** 2))
  const confidence = 0.5 * antiphase + 0.5 * lagFit

  let label: Label = 'uncertain'
  if (confidence >= 0.5) label = 'venous'
  else if (p > 0.5 && Math.abs(lagMs) < 150) label = 'arterial'

  return { label, confidence, phaseDeg, lagMs, pearson: p }
}
