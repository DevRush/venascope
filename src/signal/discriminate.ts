import { pearson, bestLagInRange, dominantFreq } from './crosscorr'
import type { Classification, Label } from '../types'

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const wrap = (deg: number) => { let d = deg % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d }

export function classify(neck: number[], arterial: number[], fs: number): Classification {
  const p = pearson(neck, arterial)
  // Search a physiological lag window: the venous pulse lags the carotid by a POSITIVE
  // ~200–450 ms, while the carotid itself is near zero lag. Bounding to [-0.15 s, +0.55 s]
  // avoids the half-period antiphase alias that a symmetric search would pick on a
  // quasi-periodic signal (which would otherwise report a spurious negative lag).
  const minLag = -Math.round(0.15 * fs)
  const maxLag = Math.round(0.55 * fs)
  const { lag, corr } = bestLagInRange(neck, arterial, minLag, maxLag)
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
