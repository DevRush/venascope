import type { Classification, JvpEstimate } from '../types'

const set = (root: HTMLElement, field: string, text: string) => {
  const el = root.querySelector(`[data-field=${field}]`)
  if (el) el.textContent = text
}

const setStyle = (root: HTMLElement, field: string, prop: 'width' | 'left', pct: number) => {
  const el = root.querySelector<HTMLElement>(`[data-field=${field}]`)
  if (el) el.style[prop] = `${Math.max(0, Math.min(100, pct))}%`
}

export function renderIdentity(root: HTMLElement, c: Classification): void {
  const name = c.label === 'venous' ? 'Jugular venous' : c.label === 'arterial' ? 'Carotid arterial' : 'Uncertain'
  set(root, 'label', name)
  set(root, 'confidence', `${Math.round(c.confidence * 100)}%`)
  set(root, 'phase', `${Math.round(c.phaseDeg)}°`)
  set(root, 'lag', `${Math.round(c.lagMs)} ms`)
  setStyle(root, 'meter', 'width', c.confidence * 100)
  root.dataset.label = c.label
}

/** Warm-up state shown while the analysis buffer fills, so the panel never looks dead. */
export function renderAcquiring(root: HTMLElement, pct: number): void {
  set(root, 'label', 'Acquiring signal')
  set(root, 'confidence', `${Math.round(pct)}%`)
  set(root, 'phase', '—')
  set(root, 'lag', '—')
  setStyle(root, 'meter', 'width', pct)
  root.dataset.label = 'acquiring'
}

/**
 * Reports JVP as a HEIGHT above the sternal angle (what clinicians document). The CVP-equivalent
 * is shown only as an explicitly-assumed conversion, never as the headline.
 */
export function renderJvp(root: HTMLElement, e: JvpEstimate): void {
  set(root, 'height', e.heightCm.toFixed(1))
  set(root, 'category', e.category)
  const half = (e.bandHigh - e.bandLow) / 2
  set(
    root,
    'band',
    `±${half.toFixed(1)} cm  ·  ≈ ${e.cvpEquivCmH2O.toFixed(0)} cmH₂O CVP (assumes ${e.raOffsetCm} cm RA offset)`,
  )
  set(root, 'warning', 'Illustrative estimate — not for clinical use')
  setStyle(root, 'mk', 'left', (e.heightCm / 8) * 100) // marker on a 0–8 cm scale
  root.dataset.category = e.category
}
