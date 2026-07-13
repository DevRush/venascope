import type { CvpEstimate, Category } from '../types'

export function meniscusCmFromPixels(meniscusY: number, sternalY: number, pxPerCm: number): number {
  return (sternalY - meniscusY) / pxPerCm
}

export function estimateCvp(meniscusCm: number, quality: 'good' | 'poor'): CvpEstimate {
  const cvpCmH2O = meniscusCm + 5
  const cvpMmHg = cvpCmH2O * 0.7355
  let category: Category = 'normal'
  if (cvpCmH2O < 5) category = 'low'
  else if (cvpCmH2O > 9) category = 'elevated'
  const half = quality === 'good' ? 1.75 : 3.5
  return {
    meniscusCm,
    cvpCmH2O,
    cvpMmHg,
    category,
    bandLow: cvpCmH2O - half,
    bandHigh: cvpCmH2O + half,
  }
}
