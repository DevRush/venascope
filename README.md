# JVP Scope

**See the pulse everyone squints for.** A browser turns a webcam into a jugular-venous-pressure
instrument: it magnifies the invisible neck pulsation, extracts its waveform, **proves it's venous
(not carotid)**, and gauges how high the venous column sits.

> **Proof of concept — not for clinical use.** The signal pipeline is real; the height is an
> illustrative estimate, not validated against invasive measurement.

---

## Why

Bedside JVP is the standard tool for volume assessment, yet it's notoriously unreliable — in the
AMPLIFY pilot, bedside exam disagreed *categorically* with right-heart catheterization **27%** of the
time. Half the difficulty is simply that the venous pulsation is a sub-millimeter, low-frequency
undulation that's easily confused with the carotid. JVP Scope makes that pulsation **visible and
measurable**, and — its crown jewel — **discriminates venous from arterial** using the same physiology
a cardiologist uses, just measured instead of eyeballed.

## What's real vs. illustrative (the honesty principle)

Every stage does genuine computation. The **only** illustrative element is the *clinical accuracy of
the height number* — because validating it needs invasive ground truth we don't have.

| Stage | What it does | Real / Illustrative |
|-------|--------------|---------------------|
| Capture | Webcam → frames; ROI over the jugular | Real |
| Magnify | Temporal-bandpass magnification (EVM-*inspired*: per-pixel fast/slow EMA difference, ~0.7–3 Hz) | Real |
| Waveform | Reduce ROI to a 1-D pulsation trace; a·c·x·v·y shown as a **schematic** (assumes sinus rhythm) | Real trace, schematic labels |
| Arterial ref | rPPG off the face (green channel) for arterial timing | Real |
| **Discriminate** | Venous vs. carotid: ~180° out of phase + **~400 ms carotid lag**. Confidence is scored against that expected timing — not a blind classifier. | **Real — the crown jewel** |
| Height | Meniscus height above the sternal angle. A CVP-equivalent is shown **only** as an explicitly-labeled assumption (`+ RA offset`), never as a measured pressure. | Real machinery, **illustrative value** |

## Clinical framing (informed by a heart-failure attending's review)

- We report **JVP height in cm above the sternal angle** — what clinicians actually document — not a
  "measured CVP." The RA offset (default 5 cm, known to vary 5–10 cm and to grow when upright) is a
  **labeled assumption**, and there is no mmHg false-precision headline.
- The discrimination (antiphase + carotid lag) is the best literature-supported claim; it's the hero.
- `a·c·x·v·y` morphology is a schematic annotation gated on a stated sinus-rhythm assumption.

## Run it

```bash
npm install
npm run dev      # dev server
npm test         # unit tests (signal math, panels)
npm run build    # production build → dist/
```

Open the app, grant camera access, and follow the on-screen guide. No camera? It falls back to a
**synthetic neck** that runs the *identical* pipeline (stage-safe). Drop a real clip at
`public/demo/neck-demo.webm` to use recorded footage instead.

## Demo script

1. **Cold open** on the magnified neck — a pulsation invisible to the eye is suddenly moving.
2. "That's not a filter — it's a real temporal-bandpass magnification running in your browser."
3. **The discrimination beat:** "Is that the vein or the artery? 180° out of phase, lagging the
   carotid 400 ms — the same physiology a cardiologist uses, measured." Point at the phase/lag readouts.
4. **The height,** immediately with the caveat in the same breath: "JVP ~3–4 cm above the sternal
   angle — and to be honest, that number is illustrative, not yet validated against a catheter.
   Everything upstream of it is real, measured signal processing."
5. **Demo mode** as the safety net, framed as a feature: "identical code path, synthetic input."

## Method & assumptions (disclosed up front)

- **Privacy:** fully client-side. No video frame ever leaves your device — no upload, no analytics on
  frame data.
- **Frame rate:** the HUD shows the *actual negotiated* fps, not a requested one. Timing resolution
  depends on it.
- **Robustness:** green-channel rPPG is melanin- and lighting-sensitive; performance varies with skin
  tone and lighting. Trunk angle strongly affects JVP and is currently assumed (~45°).
- **Calibration:** pixel→cm uses a fixed anatomical scale for this demo (would be user-calibrated in v1).

## Roadmap

1. Clinical validation against right-heart catheterization (AMPLIFY-style).
2. Interactive calibration — drag-to-place ROI and sternal-angle reference.
3. **Respiratory variation** — quantify JVP fall on inspiration (the thing a camera does *better* than
   the eye).
4. Raw cross-correlogram + a non-vessel negative control (show the evidence, not just the verdict).
5. Auto neck/landmark detection; depth sensing (LiDAR/TrueDepth) for true column height.
6. Chrominance-based rPPG (POS/CHROM) to reduce skin-tone sensitivity.

## Literature

- AMPLIFY pilot — motion-magnified neck video vs. right-heart cath ([npj Digital Medicine 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6704101/))
- SRVI — camera carotid-vs-jugular discrimination ([Frontiers Bioeng 2022](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8979108/))
- Skin-displacement JVP waveform recovery ([Scientific Reports 2018](https://www.nature.com/articles/s41598-018-35483-4))
- Neck reflectance-PPG antiphase discrimination ([Nature Sci Reports 2020](https://www.nature.com/articles/s41598-020-60317-7))

## Tech

Vite + TypeScript, no UI framework. Canvas 2D + WebGL, hand-written CSS. Fully client-side; static-hostable.

## Docs

- Design spec: [`docs/superpowers/specs/2026-07-13-jvp-scope-design.md`](docs/superpowers/specs/2026-07-13-jvp-scope-design.md)
- Multi-perspective review synthesis: [`docs/superpowers/reviews/2026-07-13-multi-perspective-review.md`](docs/superpowers/reviews/2026-07-13-multi-perspective-review.md)
