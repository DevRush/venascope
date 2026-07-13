import type { Classification, CvpEstimate } from '../types'

const set = (root: HTMLElement, field: string, text: string) => {
  const el = root.querySelector(`[data-field=${field}]`)
  if (el) el.textContent = text
}

export function renderIdentity(root: HTMLElement, c: Classification): void {
  const name = c.label === 'venous' ? 'Jugular venous' : c.label === 'arterial' ? 'Carotid arterial' : 'Uncertain'
  set(root, 'label', name)
  set(root, 'confidence', `${Math.round(c.confidence * 100)}%`)
  set(root, 'phase', `${Math.round(c.phaseDeg)}°`)
  set(root, 'lag', `${Math.round(c.lagMs)} ms`)
}

export function renderCvp(root: HTMLElement, e: CvpEstimate): void {
  set(root, 'cvp', e.cvpCmH2O.toFixed(1))
  set(root, 'mmhg', `${e.cvpMmHg.toFixed(1)} mmHg`)
  set(root, 'category', e.category)
  set(root, 'band', `band ${e.bandLow.toFixed(1)}–${e.bandHigh.toFixed(1)}`)
  set(root, 'warning', 'Illustrative estimate — not for clinical use')
}
