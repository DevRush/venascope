import { bandpass } from '../signal/filters'
import { classify } from '../signal/discriminate'
import { estimateCvp } from '../signal/cvp'
import type { Classification, CvpEstimate, Quality } from '../types'

const rms = (x: number[]) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / (x.length || 1))

export interface AnalyzeInput { neck: number[]; arterial: number[]; fs: number; meniscusCm: number }
export interface AnalyzeOutput { classification: Classification; cvp: CvpEstimate; quality: Quality }

export function analyze(input: AnalyzeInput): AnalyzeOutput {
  const { neck, arterial, fs, meniscusCm } = input
  const nb = bandpass(neck, fs, 0.7, 3)
  const ab = bandpass(arterial, fs, 0.7, 3)
  const quality: Quality = rms(nb) < 0.02 || rms(ab) < 0.02 ? 'poor' : 'good'
  const classification = classify(nb, ab, fs)
  const cvp = estimateCvp(meniscusCm, quality)
  return { classification, cvp, quality }
}
