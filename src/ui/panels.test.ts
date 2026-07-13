import { describe, it, expect } from 'vitest'
import { renderIdentity, renderCvp } from './panels'

function identityRoot() {
  const el = document.createElement('div')
  el.innerHTML = `
    <span data-field="label"></span><span data-field="confidence"></span>
    <span data-field="phase"></span><span data-field="lag"></span>`
  return el
}
function cvpRoot() {
  const el = document.createElement('div')
  el.innerHTML = `
    <span data-field="cvp"></span><span data-field="mmhg"></span>
    <span data-field="category"></span><span data-field="band"></span>
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

describe('renderCvp', () => {
  it('writes the number and always the warning', () => {
    const root = cvpRoot()
    renderCvp(root, { meniscusCm: 4.2, cvpCmH2O: 9.2, cvpMmHg: 6.77, category: 'elevated', bandLow: 7.45, bandHigh: 10.95 })
    expect(root.querySelector('[data-field=cvp]')!.textContent).toContain('9.2')
    expect(root.querySelector('[data-field=category]')!.textContent).toMatch(/elevated/i)
    expect(root.querySelector('[data-field=warning]')!.textContent).toMatch(/not for clinical use/i)
  })
})
