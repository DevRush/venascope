import { bandpass, detrend } from '../signal/filters'
import { classify } from '../signal/discriminate'
import { estimateJvp } from '../signal/cvp'
import type { Classification, JvpEstimate, Quality } from '../types'

const rms = (x: number[]) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / (x.length || 1))

export interface AnalyzeInput { neck: number[]; arterial: number[]; fs: number; heightCm: number }
export interface AnalyzeOutput { classification: Classification; jvp: JvpEstimate; quality: Quality }

export function analyze(input: AnalyzeInput): AnalyzeOutput {
  const { neck, arterial, fs, heightCm } = input
  // Detrend before bandpass: the raw neck/arterial signals carry a large DC offset (centroid ~100s
  // of px, luminance ~150), which makes the biquad ring for ~1 s at the start. That transient,
  // aligned at lag 0 across both channels, otherwise swamps the cross-correlation and mislabels
  // a real venous signal as arterial. Also drop the residual settling window before classifying.
  const settle = Math.min(neck.length, Math.round(fs))
  const nb = bandpass(detrend(neck), fs, 0.7, 3).slice(settle)
  const ab = bandpass(detrend(arterial), fs, 0.7, 3).slice(settle)
  const quality: Quality = rms(nb) < 0.02 || rms(ab) < 0.02 ? 'poor' : 'good'
  const classification = classify(nb, ab, fs)
  const jvp = estimateJvp(heightCm, quality)
  return { classification, jvp, quality }
}
