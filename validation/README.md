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

## Honest limits

Synthetic frames are an idealisation (clean band on a gradient); they do **not** prove the method
works on real skin under real lighting/compression, and there is no invasive ground truth. This is
a robustness / regression check, not clinical validation. A real webcam on a real neck remains the
next real-world test.
