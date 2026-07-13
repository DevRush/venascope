import type { Rect } from '../types'

export function clampRoi(roi: Rect, w: number, h: number): Rect {
  const x = Math.floor(Math.max(0, Math.min(roi.x, w - 1)))
  const y = Math.floor(Math.max(0, Math.min(roi.y, h - 1)))
  return { x, y, w: Math.floor(Math.min(roi.w, w - x)), h: Math.floor(Math.min(roi.h, h - y)) }
}

const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b

export function roiVerticalCentroid(frame: ImageData, roi: Rect): number {
  const { data, width } = frame
  const r = clampRoi(roi, frame.width, frame.height)
  let wsum = 0, ysum = 0
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      const i = (y * width + x) * 4
      const l = luma(data[i], data[i + 1], data[i + 2])
      wsum += l; ysum += l * y
    }
  }
  return wsum === 0 ? r.y + r.h / 2 : ysum / wsum
}

/**
 * Vertical position of the moving bright band (the venous meniscus) within the ROI.
 *
 * A whole-ROI luminance centroid (roiVerticalCentroid) is dominated by the static skin gradient,
 * so it transfers only a few percent of the meniscus's motion — the pulsation is swamped. Here we
 * collapse the ROI to a per-row luminance profile, remove its linear trend (the skin gradient),
 * and centroid the positive residual (the bright band). Validated to transfer band motion ~1:1 and
 * to keep venous/carotid discrimination robust under noise, motion, low light and low fps.
 */
export function roiBandCentroid(frame: ImageData, roi: Rect): number {
  const { data, width } = frame
  const r = clampRoi(roi, frame.width, frame.height)
  const rows: number[] = []
  for (let y = r.y; y < r.y + r.h; y++) {
    let s = 0
    for (let x = r.x; x < r.x + r.w; x++) {
      const i = (y * width + x) * 4
      s += luma(data[i], data[i + 1], data[i + 2])
    }
    rows.push(s / (r.w || 1))
  }
  const n = rows.length
  if (n < 4) return r.y + r.h / 2
  // least-squares linear detrend over the row index (removes the skin gradient)
  let sx = 0, sy = 0, sxx = 0, sxy = 0
  for (let k = 0; k < n; k++) { sx += k; sy += rows[k]; sxx += k * k; sxy += k * rows[k] }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1)
  const intercept = (sy - slope * sx) / n
  // luminance-weighted centroid of the positive residual (the bright band)
  let wsum = 0, ysum = 0
  for (let k = 0; k < n; k++) {
    const resid = rows[k] - (slope * k + intercept)
    if (resid > 0) { wsum += resid; ysum += resid * (r.y + k) }
  }
  return wsum === 0 ? r.y + r.h / 2 : ysum / wsum
}

export function roiMeanLuma(frame: ImageData, roi: Rect): number {
  const { data, width } = frame
  const r = clampRoi(roi, frame.width, frame.height)
  let sum = 0, n = 0
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      const i = (y * width + x) * 4
      sum += luma(data[i], data[i + 1], data[i + 2]); n++
    }
  }
  return n === 0 ? 0 : sum / n
}
