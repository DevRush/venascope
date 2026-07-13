# JVP Scope — Design Spec

**Date:** 2026-07-13
**Status:** Approved design → ready for implementation plan
**Working title:** JVP Scope (subject to rename)

## 1. Purpose & positioning

A browser-based demo that turns a webcam into a **jugular venous pressure (JVP) assessment instrument**: it magnifies the invisible neck pulsation, extracts its waveform, distinguishes it from the carotid artery, and reports an estimated central venous pressure (CVP).

This is a **hackathon MVP built to show the potential**, not a clinically validated device. The bar is *one bulletproof ~2-minute demo* that makes a heart-failure clinician say "I see exactly where this goes." Clinical validation (against invasive CVP) is explicitly future work.

**Why it matters (the pitch):** bedside JVP is the standard tool for volume assessment, yet it's notoriously unreliable — in the AMPLIFY pilot, bedside exam disagreed categorically with right-heart catheterization **27%** of the time. Making the invisible pulsation *visible and measurable* addresses a real, universally-felt clinical pain point.

### The honesty principle (load-bearing)
Every stage does **genuine computation** — nothing is a scripted illusion. The only thing that is *illustrative* is the **clinical accuracy of the final CVP number**, because validating it requires invasive ground truth we don't have. This is stated plainly in the UI ("Illustrative estimate — not for clinical use") and in the pitch. Candor about what's real vs. estimated is a feature, not a liability, in front of expert judges.

## 2. Scope

### In scope (MVP)
- Live webcam capture + manual ROI placement over the neck
- Real motion magnification of the ROI (the visible "wow")
- Real waveform extraction from the ROI
- Real arterial reference + venous-vs-carotid discrimination (phase + lag)
- Meniscus/column-height detection → estimated CVP (real machinery, illustrative value)
- Technical-instrument UI with anatomical overlays, oscilloscope waveform, CVP readout
- **Demo-clip mode**: the identical pipeline run against a curated ideal-neck clip (stage safety net)

### Out of scope (explicitly deferred)
- Native iOS app, LiDAR / TrueDepth depth sensing, ARKit neck tracking, IMU motion compensation
- ML models trained on YouTube/instructional videos
- Any claim of clinical accuracy; validation against invasive CVP
- Auto neck/landmark detection (manual ROI instead)
- Accounts, storage, backend — fully client-side, static hosting

## 3. Architecture — the pipeline

Camera in → seven stages, each a self-contained module with a clean interface so units are built and tested independently. Real-time loop drives rendering; panel readouts update a few times per second.

| # | Stage | Module | Does | Real / Illustrative |
|---|-------|--------|------|---------------------|
| 0 | Capture | `capture/` | `getUserMedia` → frames on canvas; draggable/resizable ROI over the neck | Real |
| 1 | Magnify | `magnify/` | WebGL linear Eulerian video magnification (spatial blur → temporal bandpass ~0.7–3 Hz → amplify → recomposite) on the ROI | Real |
| 2 | Waveform | `signal/` | Reduce ROI to a 1-D signal (row-intensity centroid / optical-flow vertical displacement) → detrend → bandpass → live trace; tag a/c/x/v/y | Real |
| 3 | Arterial ref | `rppg/` | rPPG off a face region (cheek/forehead green channel) for arterial timing reference; in demo mode, use the clip's known reference | Real |
| 4 | Discriminate | `discriminate/` | Cross-correlate ROI signal vs arterial ref → sign of correlation + temporal lag; venous ≈ 180° out of phase and lags carotid ~400 ms → classify + confidence | Real |
| 5 | CVP | `cvp/` | Detect top-of-column (meniscus) in ROI; user drags a **sternal-angle reference line**; pixels→cm from a **default anatomical scale** (optional manual scale calibration); CVP = (meniscus height above sternal angle) + 5 cmH₂O | Real machinery, **illustrative value** |
| 6 | Present | `overlay/`, `ui/` | Anatomical overlays (SCM, IJ, carotid), ROI reticle, cm ruler, oscilloscope waveform, identity verdict, CVP gauge readout, mode toggles | Real |

Orchestration in `pipeline/` (per-frame loop + a slower analysis tick). Demo assets and curated reference signals in `demo/`.

### Module interfaces (contract sketch)
- `capture.getFrame() → ImageData`, `capture.roi → Rect`, events on ROI change
- `magnify.process(frame, roi) → magnifiedTexture` (WebGL)
- `signal.push(frame, roi) → { t, value }`; `signal.series → Float32Array`
- `rppg.reference → { t, value }` series
- `discriminate.classify(neckSeries, arterialSeries) → { label: 'venous'|'arterial', confidence, phaseDeg, lagMs }`
- `cvp.estimate(roiSeries, calibration) → { cvpCmH2O, band, category }`
- `ui.render(state)` — pure view over a plain state object

## 4. Data flow

`camera frame → [capture] → ROI pixels → [magnify → display]`
`camera frame → [signal] → neck series ┐`
`camera frame → [rppg]   → art. series ┘→ [discriminate] → identity`
`neck series + calibration → [cvp] → estimate`
All results merged into one `pipelineState` object; `ui` renders it. One-directional flow, no shared mutable state between modules beyond the state object.

## 5. Modes & graceful degradation
- **Live mode:** real camera. If the signal is poor (low SNR, motion, bad light), the UI shows **low confidence / "hold still, improve lighting"** rather than a confident fake number.
- **Demo-clip mode:** identical pipeline over a bundled ideal-neck video with a known-good arterial reference — guarantees the demo never fails on stage. Honest framing: "real pipeline, canned input."
- **Camera denied / unavailable:** clear prompt, auto-offer demo mode.
- **Contrast view toggle:** shows the amplified-motion field (heat/relief) over the ROI — an alternate visualization of the same real data.

## 6. Visual design (locked)
Technical-instrument direction (approved mockup `technical-v2`):
- Flat near-black panels, crisp 1px rules, **no glow / no gradient text / no bloom**
- Monospaced readouts for all data (brand, metrics, CVP number); sans for labels
- Camera: thin anatomical overlays with measurement-style labels, corner-tick ROI reticle with crosshair, vertical **cm ruler** with the meniscus marked
- Waveform: real **oscilloscope grid**, 2.0 s window, dashed arterial reference, a·c·x·v·y ticks
- Identity: verdict + confidence + hard readouts (`Phase offset 178°`, `Carotid lag 410 ms`)
- CVP: mono numeral + low/normal/elevated **scale-bar gauge** + spelled-out arithmetic + illustrative warning
- Palette: muted teal = venous, muted coral = arterial, blue = anatomy, amber = warning

## 7. Tech stack (decision)
- **Vite + TypeScript**, **no UI framework** — a real-time video app avoids React re-render churn; plain modules + direct canvas/DOM updates are simpler and faster to build here. (React considered, rejected for render overhead.)
- **Canvas 2D + WebGL** for capture, magnification, waveform rendering. Custom waveform canvas — no chart library.
- **Hand-written CSS** ported from the approved mockup (design already exists).
- Minimal dependencies; fully client-side; static hosting (e.g. Vercel).

## 8. Testing
Scaled to a hackathon, weighted to the parts that are pure and worth locking:
- **Unit tests** for the signal math (pure functions): bandpass filter, cross-correlation lag, phase estimate, CVP arithmetic + categorization. These are cheap to test and easy to get subtly wrong.
- **Manual verification** for live camera, magnification visibility, and overall look (the real-time/visual parts).
- **Demo-clip as regression fixture:** the bundled clip gives a deterministic end-to-end signal to sanity-check the pipeline without a live camera.

## 9. Success criteria (the demo must)
1. Open app → grant camera → live video with anatomical overlays.
2. Place ROI on the neck → the pulsation is **visibly magnified**.
3. A **live waveform** traces with a·c·x·v·y tags.
4. A **venous-vs-carotid verdict** shows with phase + lag readouts.
5. An **estimated CVP** shows with the illustrative label.
6. **Demo-clip mode** runs the entire flow reliably, no camera needed.
7. It **looks like** the technical-instrument mockup.

## 10. Risks & mitigations
- **Live signal quality (top risk):** webcams are 30–60 fps under uncontrolled light, vs 90–250 fps in the lab studies. *Mitigation:* demo-clip mode as the guaranteed path; magnification tuned for visible (not metric) motion; honest low-confidence states.
- **Meniscus detection is hard:** heuristic top-of-column detection for MVP; calibration is user-assisted and the number is labeled illustrative.
- **rPPG arterial reference is finicky live:** demo mode uses the clip's known reference; live mode degrades gracefully to lower confidence.
- **Real-time performance in-browser:** keep magnification confined to the ROI, not full frame; WebGL for the heavy lifting.

## 11. References (from the research pass)
- AMPLIFY pilot, npj Digital Medicine 2019 — video motion magnification vs right-heart cath (PMC6704101)
- SRVI, Frontiers Bioeng 2022 — camera carotid-vs-jugular discrimination (PMC8979108)
- Skin-displacement JVP waveform recovery, Scientific Reports 2018 (s41598-018-35483-4)
- Neck reflectance-PPG antiphase discrimination, Nature Sci Reports 2020 (s41598-020-60317-7)
