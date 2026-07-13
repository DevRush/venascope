# JVP Scope — Multi-Perspective Review Synthesis (2026-07-13)

Four independent critics reviewed the working MVP: a heart-failure cardiologist, a hackathon
judge, a skeptical HN/Twitter engineer, and a senior UX designer. Their feedback converged
strongly. This is the prioritized action list.

## Convergent themes (flagged by ≥2 reviewers)

### 1. The CVP number is the #1 credibility liability — reframe to JVP height
- **Cardiologist (HIGH):** "sternal angle + 5 cm" is the wrong constant (RA↔sternal-angle varies
  5–10 cm and grows when upright); CVP ≠ JVP; the mmHg conversion is false precision.
- **Judge (HIGH risk):** the CVP arithmetic won't survive a sharp question; `pxPerCm` is hardcoded.
- **Skeptic (#3):** "+5" is a 1930s assumption dressed up as computation; two guesses (offset + scale) compound.
- **ACTION:** Report **"JVP ≈ N cm above the sternal angle"** as the headline (what clinicians document).
  Drop mmHg. Make the RA offset an explicit, labeled assumption (not baked). Keep a clearly-flagged
  optional CVP-equivalent. Show what drives the uncertainty band (offset/scale vs signal SNR).

### 2. Interactivity: ROI + sternal-angle line are hardcoded
- **Judge (HIGH, "highest-ROI addition"):** fixed ROI means the demo depends on the neck landing in a
  box you never show how to move; wiring drag closes the calibration gap and is the best "prove it's real" beat.
- **UX (HIGH):** the reticle looks like a target, not a control; no affordance.
- **ACTION:** Draggable/repositionable ROI + draggable sternal-angle reference line, with affordance.

### 3. Honesty of the engineering claims
- **Skeptic (#1):** confidence Gaussian centered at 400 ms is a *prior*, not a measurement (circular).
- **Skeptic (#2):** "Eulerian video magnification" ≠ the 2-pole EMA in `evm.ts` (no spatial pyramid).
- **ACTION:** Rename to "temporal-bandpass magnification (EVM-inspired)". Relabel confidence honestly
  ("scored against the expected physiological lag window"). Stretch: show raw cross-correlogram + a
  non-vessel negative control.

### 4. Over-claiming the waveform
- **Cardiologist (MEDIUM):** can't reliably resolve a/c/x/v/y at 30–60 fps; wrong in AF/arrhythmia.
- **UX (MEDIUM):** a·c·x·v·y is unexplained jargon.
- **ACTION:** Present a·c·x·v·y as a *schematic annotation* (sinus assumption stated) + plain-language legend.

### 5. Onboarding, plain language, designed states (UX HIGH ×2)
- First-run guidance ("point camera at neck, drag box"); legends for phase/lag/ruler; designed
  permission / low-signal / tracking-lost / acquiring states.

### 6. Real telemetry + disclosures (Skeptic #4,5,6)
- Display **actual negotiated fps** (not hardcoded 60). Privacy line ("no frame leaves your device").
- Disclose skin-tone/lighting limits (green-channel rPPG is melanin-sensitive). A "Method & assumptions" surface.

### 7. Mobile/responsive + accessibility (UX HIGH)
- Stacked layout <768px, larger touch targets, camera flip, colorblind-safe (lean on solid/dashed as primary).

## Reframe the narrative (all four agree)
Hero = **"make the invisible venous pulsation visible, and prove it's venous (not carotid)."**
The discrimination (≈180° antiphase + ~400 ms carotid lag) is the crown jewel and the best-supported
claim. The height/CVP is a secondary, explicitly-illustrative readout.

## Best creative differentiator (Cardiologist, highest-value add)
**Respiratory variation** — quantify JVP fall on inspiration. It's the thing a camera does *better*
than the human eye, is dynamic/"wow", and sidesteps absolute-calibration fiction.

## Execution order (impact × effort)
1. Reframe CVP → JVP height; drop mmHg; RA offset as labeled assumption. **[done in this pass]**
2. Rename EVM-inspired; honest confidence label. **[done in this pass]**
3. Real fps display; privacy + Method/assumptions surface. **[done in this pass]**
4. Onboarding overlay; a·c·x·v·y legend + plain language. **[done in this pass]**
5. Draggable ROI + sternal-angle line. **[stretch]**
6. Designed states (permission/low-signal/lost); responsive/mobile; colorblind-safe. **[stretch]**
7. Respiratory-variation readout; cross-correlogram + negative control. **[future]**
8. Name. **[open]**
