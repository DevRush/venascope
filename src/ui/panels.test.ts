import { describe, it, expect } from 'vitest'
import { renderIdentity, renderJvp } from './panels'

function identityRoot() {
  const el = document.createElement('div')
  el.innerHTML = `
    <span data-field="label"></span><span data-field="confidence"></span>
    <span data-field="phase"></span><span data-field="lag"></span>`
  return el
}
function jvpRoot() {
  const el = document.createElement('div')
  el.innerHTML = `
    <span data-field="height"></span><span data-field="category"></span>
    <span data-field="band"></span><span data-field="mk"></span>
    <span data-field="warning"></span>`
  return el
}

describe('renderIdentity', () => {
  it('writes verdict, confidence, phase, lag', () => {
    const root = identityRoot()
    renderIdentity(root, { label: 'venous', confidence: 0.87, phaseDeg: 178, lagMs: 410, pearson: -0.7 })
    expect(root.querySelector('[data-field=label]')!.textContent).toMatch(/venous/i)
    expect(root.querySelector('[data-field=confidence]')!.textContent).toContain('87')
    expect(root.querySelector('[data-field=phase]')!.textContent).toContain('178')
    expect(root.querySelector('[data-field=lag]')!.textContent).toContain('410')
  })
})

describe('renderJvp', () => {
  it('writes the height, category, CVP-equivalent assumption, and always the warning', () => {
    const root = jvpRoot()
    renderJvp(root, { heightCm: 3.7, category: 'elevated', bandLow: 2.7, bandHigh: 4.7, raOffsetCm: 5, cvpEquivCmH2O: 8.7 })
    expect(root.querySelector('[data-field=height]')!.textContent).toContain('3.7')
    expect(root.querySelector('[data-field=category]')!.textContent).toMatch(/elevated/i)
    expect(root.querySelector('[data-field=band]')!.textContent).toMatch(/assumes 5 cm RA offset/i)
    expect(root.querySelector('[data-field=warning]')!.textContent).toMatch(/not for clinical use/i)
  })
})
