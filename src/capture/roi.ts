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
