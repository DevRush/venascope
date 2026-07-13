// src/signal/respiration.ts
// JVP falls on inspiration; the meniscus baseline drifts slowly (~0.1–0.5 Hz) with breathing.
// This measures the peak-to-trough respiratory swing of the neck centroid — a signal a camera
// captures better than the eye, and one that doesn't depend on absolute height calibration.
import { bandpass, detrend } from './filters'

/**
 * Peak-to-trough respiratory variation of the meniscus, in cm.
 * @param centroid neck ROI vertical centroid over time (pixels)
 * @param fs       sampling rate (Hz)
 * @param pxPerCm  pixels per cm
 * Returns 0 until there is enough data (~4 s) to see a breath.
 */
export function respiratoryVariationCm(centroid: number[], fs: number, pxPerCm: number): number {
  if (centroid.length < fs * 4) return 0
  // Detrend first so the large DC offset doesn't create a big biquad start-up transient.
  const resp = bandpass(detrend(centroid), fs, 0.1, 0.5)
  const settled = resp.slice(Math.floor(fs * 1.5)) // drop the filter transient
  let min = Infinity
  let max = -Infinity
  for (const v of settled) {
    if (v < min) min = v
    if (v > max) max = v
  }
  return (max - min) / pxPerCm
}
