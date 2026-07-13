export interface Sample { t: number; value: number }      // t in seconds
export interface Rect { x: number; y: number; w: number; h: number }

export type Label = 'venous' | 'arterial' | 'uncertain'

export interface Classification {
  label: Label
  confidence: number   // 0..1
  phaseDeg: number     // phase of neck signal vs arterial reference, wrapped to [-180,180]
  lagMs: number        // positive => neck lags the arterial reference
  pearson: number      // zero-lag Pearson correlation, [-1,1]
}

export type Category = 'low' | 'normal' | 'elevated'

// What clinicians actually document: JVP meniscus HEIGHT above the sternal angle (cm).
// The CVP conversion is an explicitly-assumed right-atrium offset, not a measured pressure.
export interface JvpEstimate {
  heightCm: number // meniscus height above the sternal angle
  category: Category
  bandLow: number // uncertainty band on heightCm
  bandHigh: number
  raOffsetCm: number // assumed RA-below-sternal-angle offset (labeled assumption, known to vary 5–10 cm)
  cvpEquivCmH2O: number // = heightCm + raOffsetCm; assumption-derived, not a measured pressure
}

export type Mode = 'live' | 'demo'
export type Quality = 'good' | 'poor'

export interface PipelineState {
  fps: number
  magnification: number
  neckSeries: Float32Array
  arterialSeries: Float32Array
  classification: Classification | null
  jvp: JvpEstimate | null
  mode: Mode
  quality: Quality
}
