import { bandpass } from '../signal/filters'
import { classify } from '../signal/discriminate'
import { estimateJvp } from '../signal/cvp'
import type { Classification, JvpEstimate, Quality } from '../types'

const rms = (x: number[]) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / (x.length || 1))

export interface AnalyzeInput { neck: number[]; arterial: number[]; fs: number; heightCm: number }
export interface AnalyzeOutput { classification: Classification; jvp: JvpEstimate; quality: Quality }

export function analyze(input: AnalyzeInput): AnalyzeOutput {
  const { neck, arterial, fs, heightCm } = input
  const nb = bandpass(neck, fs, 0.7, 3)
  const ab = bandpass(arterial, fs, 0.7, 3)
  const quality: Quality = rms(nb) < 0.02 || rms(ab) < 0.02 ? 'poor' : 'good'
  const classification = classify(nb, ab, fs)
  const jvp = estimateJvp(heightCm, quality)
  return { classification, jvp, quality }
}
