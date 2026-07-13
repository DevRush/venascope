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

export interface CvpEstimate {
  meniscusCm: number
  cvpCmH2O: number
  cvpMmHg: number
  category: Category
  bandLow: number
  bandHigh: number
}

export type Mode = 'live' | 'demo'
export type Quality = 'good' | 'poor'

export interface PipelineState {
  fps: number
  magnification: number
  neckSeries: Float32Array
  arterialSeries: Float32Array
  classification: Classification | null
  cvp: CvpEstimate | null
  mode: Mode
  quality: Quality
}
