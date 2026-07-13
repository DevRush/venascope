import type { Classification, CvpEstimate } from '../types'

const set = (root: HTMLElement, field: string, text: string) => {
  const el = root.querySelector(`[data-field=${field}]`)
  if (el) el.textContent = text
}

const setWidth = (root: HTMLElement, field: string, pct: number) => {
  const el = root.querySelector<HTMLElement>(`[data-field=${field}]`)
  if (el) el.style.width = `${Math.max(0, Math.min(100, pct))}%`
}

export function renderIdentity(root: HTMLElement, c: Classification): void {
  const name = c.label === 'venous' ? 'Jugular venous' : c.label === 'arterial' ? 'Carotid arterial' : 'Uncertain'
  set(root, 'label', name)
  set(root, 'confidence', `${Math.round(c.confidence * 100)}%`)
  set(root, 'phase', `${Math.round(c.phaseDeg)}°`)
  set(root, 'lag', `${Math.round(c.lagMs)} ms`)
  setWidth(root, 'meter', c.confidence * 100)
  root.dataset.label = c.label
}

/** Warm-up state shown while the analysis buffer fills, so the panel never looks dead. */
export function renderAcquiring(root: HTMLElement, pct: number): void {
  set(root, 'label', 'Acquiring signal')
  set(root, 'confidence', `${Math.round(pct)}%`)
  set(root, 'phase', '—')
  set(root, 'lag', '—')
  setWidth(root, 'meter', pct)
  root.dataset.label = 'acquiring'
}

export function renderCvp(root: HTMLElement, e: CvpEstimate): void {
  set(root, 'cvp', e.cvpCmH2O.toFixed(1))
  set(root, 'mmhg', `${e.cvpMmHg.toFixed(1)} mmHg`)
  set(root, 'category', e.category)
  set(root, 'band', `band ${e.bandLow.toFixed(1)}–${e.bandHigh.toFixed(1)}`)
  set(root, 'warning', 'Illustrative estimate — not for clinical use')
  root.dataset.category = e.category
}
