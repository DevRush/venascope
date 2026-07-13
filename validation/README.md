# Pipeline validation harness

`harness.ts` runs the **real** VenaScope pipeline modules (`roiBandCentroid`, `roiMeanLuma`,
`bandpass`, `classify`, `estimateJvp`, `respiratoryVariationCm`) over generated neck frames —
headless, no browser, no rAF. It renders a synthetic neck (moving venous meniscus + pulsing
cheek) with camera-like degradations and measures whether detection survives.

```bash
npx tsx validation/harness.ts          # current extractor
npx tsx validation/harness.ts --band   # bandCentroid extractor (now the app default)
```

## What it caught (2026-07-13)

Running the real modules on *extracted pixel signals* (not clean injected ones, as the browser
DEV probe used) surfaced two real bugs that the throttled-rAF browser check had hidden:

1. **Weak extraction.** `roiVerticalCentroid` (a whole-ROI luminance centroid) is dominated by the
   static skin gradient and transferred only ~5% of the meniscus's motion — the pulsation was
   swamped to near-noise (respiratory swing read 0.1 cm instead of ~1.3 cm), and discrimination
   collapsed. **Fix:** `roiBandCentroid` — detrend the per-row profile, centroid the residual band.
2. **DC-transient corrupting discrimination.** Raw neck/arterial signals carry a large DC offset,
   so the biquad bandpass rang for ~1 s at the start; that transient (aligned at lag 0 across both
   channels) swamped the cross-correlation and mislabelled venous as arterial. **Fix:** detrend
   before bandpass and drop the settling window in `analyze()`.

After both fixes, the battery passes across sensor noise (σ=25), motion jitter (±6 px), low
contrast, low light + drift, 15 fps, a realistic-webcam mix, and an 18 px ROI mis-placement:
**venous, ~90–96% confidence, 400 ms lag, ~1.3 cm respiratory swing.**

## Real-video check (`realvideo.ts`)

`realvideo.ts` runs the real extractors over decoded frames of actual JVP clips and scans a grid of
ROIs for a genuine cardiac pulse (motion via `roiBandCentroid`, colour via `roiMeanLuma`), scored by
band-passed autocorrelation.

```bash
ffmpeg -i clip.mp4 -vf "fps=30,scale=320:180" -pix_fmt rgba -f rawvideo clip.rgba
npx tsx validation/realvideo.ts clip.rgba 320 180
```

On three real reference clips (2026-07-13, user-provided; analysed locally, not committed) it found a
clear, spatially-coherent cardiac pulse in the neck region of every one:
- carotid+jugular demo → **73 bpm** (motion, score 0.62), consistent across adjacent ROIs
- JVP demo → 87 bpm (motion, 0.56)
- portrait short → 82–93 bpm (**colour**/rPPG, 0.62) — pulse was colour-based, caught by the luma path

Takeaway: the **extraction** recovers real pulses at physiological rates from real necks. A worthwhile
enhancement surfaced: the neck signal should *fuse* motion + colour, since real pulsations show up in
either channel depending on the view.

## Honest limits

Synthetic frames are an idealisation (clean band on a gradient); they do **not** prove the method
works on real skin under real lighting/compression, and there is no invasive ground truth. This is
a robustness / regression check, not clinical validation. A real webcam on a real neck remains the
next real-world test.
