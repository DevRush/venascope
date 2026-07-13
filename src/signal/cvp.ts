// src/signal/cvp.ts — JVP height estimation.
// We report the meniscus HEIGHT above the sternal angle (what clinicians document), not a
// "measured CVP". Any CVP-equivalent is an explicitly-assumed right-atrium offset, flagged as such.
import type { JvpEstimate, Category } from '../types'

export function meniscusCmFromPixels(meniscusY: number, sternalY: number, pxPerCm: number): number {
  return (sternalY - meniscusY) / pxPerCm
}

/**
 * @param heightCm   meniscus height above the sternal angle (cm)
 * @param quality    signal quality → widens the uncertainty band when poor
 * @param raOffsetCm assumed RA offset below the sternal angle (default 5 cm; known to vary 5–10 cm)
 *
 * Category follows the standard bedside reading of JVP height above the sternal angle:
 * <1 cm ≈ low, 1–3 cm ≈ normal, >3 cm ≈ elevated.
 */
export function estimateJvp(heightCm: number, quality: 'good' | 'poor', raOffsetCm = 5): JvpEstimate {
  let category: Category = 'normal'
  if (heightCm < 1) category = 'low'
  else if (heightCm > 3) category = 'elevated'
  const half = quality === 'good' ? 1.0 : 2.0 // cm — band widens when the signal is poor
  return {
    heightCm,
    category,
    bandLow: heightCm - half,
    bandHigh: heightCm + half,
    raOffsetCm,
    cvpEquivCmH2O: heightCm + raOffsetCm,
  }
}
