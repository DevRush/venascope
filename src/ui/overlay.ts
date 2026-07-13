// src/ui/overlay.ts
import type { Rect } from '../types'

export function drawOverlay(
  ctx: CanvasRenderingContext2D, roi: Rect,
  opts: { w: number; h: number; sternalY: number; pxPerCm: number; meniscusY: number; faceRegion?: Rect },
): void {
  const { w, h, sternalY, pxPerCm, meniscusY, faceRegion } = opts
  ctx.clearRect(0, 0, w, h)

  // Arterial-reference region (rPPG source) — shown so the user knows to keep the face in view.
  if (faceRegion) {
    ctx.strokeStyle = 'rgba(216,121,95,0.5)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1
    ctx.strokeRect(faceRegion.x, faceRegion.y, faceRegion.w, faceRegion.h)
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(216,121,95,0.9)'; ctx.font = '8px ui-monospace, monospace'
    ctx.fillText('arterial ref', faceRegion.x, faceRegion.y - 4)
  }

  // ROI box + corner ticks
  ctx.strokeStyle = 'rgba(76,194,176,0.55)'; ctx.lineWidth = 1
  ctx.strokeRect(roi.x, roi.y, roi.w, roi.h)
  const tick = 7
  ctx.lineWidth = 1.5
  const corners: [number, number, number, number][] = [
    [roi.x, roi.y, 1, 1], [roi.x + roi.w, roi.y, -1, 1],
    [roi.x, roi.y + roi.h, 1, -1], [roi.x + roi.w, roi.y + roi.h, -1, -1],
  ]
  for (const [cx, cy, sx, sy] of corners) {
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + tick * sx, cy)
    ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + tick * sy); ctx.stroke()
  }
  // crosshair
  const mx = roi.x + roi.w / 2, my = roi.y + roi.h / 2
  ctx.strokeStyle = 'rgba(76,194,176,0.7)'
  ctx.beginPath(); ctx.moveTo(mx - 6, my); ctx.lineTo(mx + 6, my)
  ctx.moveTo(mx, my - 6); ctx.lineTo(mx, my + 6); ctx.stroke()

  // vertical cm ruler on the right
  const rx = w - 40
  ctx.strokeStyle = '#31363f'; ctx.fillStyle = '#5b616b'; ctx.font = '8px ui-monospace, monospace'
  for (let cm = 0; cm <= 8; cm += 2) {
    const y = sternalY - cm * pxPerCm
    ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx + 7, y); ctx.stroke()
    ctx.fillText(String(cm), rx + 10, y + 3)
  }
  // sternal-angle reference line (draggable) — the zero of the ruler
  ctx.strokeStyle = 'rgba(139,145,156,0.55)'
  ctx.setLineDash([5, 4])
  ctx.beginPath(); ctx.moveTo(0, sternalY); ctx.lineTo(w, sternalY); ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#8b919c'
  ctx.fillText('sternal angle', 10, sternalY - 5)

  // meniscus line
  ctx.strokeStyle = '#4cc2b0'
  ctx.beginPath(); ctx.moveTo(rx - 30, meniscusY); ctx.lineTo(rx + 7, meniscusY); ctx.stroke()
  const cm = (sternalY - meniscusY) / pxPerCm
  ctx.fillStyle = '#4cc2b0'
  ctx.fillText(`meniscus ${cm.toFixed(1)} cm`, rx - 30, meniscusY - 4)
}
