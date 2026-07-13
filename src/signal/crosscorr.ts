export function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n === 0) return 0
  let ma = 0, mb = 0
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i] }
  ma /= n; mb /= n
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma, y = b[i] - mb
    num += x * y; da += x * x; db += y * y
  }
  const den = Math.sqrt(da * db)
  return den === 0 ? 0 : num / den
}

// Returns the lag of peak ABSOLUTE correlation and its signed value in `corr`, searching
// integer lags in [minLag, maxLag]. Lag sign follows a[i] ~ b[i-lag] (positive lag => a is
// delayed vs b); the peak may be an antiphase alignment (corr < 0), which venous
// discrimination relies on. A bounded window avoids half-period aliasing on periodic signals.
export function bestLagInRange(
  a: number[], b: number[], minLag: number, maxLag: number,
): { lag: number; corr: number } {
  let best = { lag: 0, corr: 0 }
  for (let lag = minLag; lag <= maxLag; lag++) {
    const av: number[] = [], bv: number[] = []
    for (let i = 0; i < a.length; i++) {
      const j = i - lag
      if (j >= 0 && j < b.length) { av.push(a[i]); bv.push(b[j]) }
    }
    if (av.length < 8) continue
    const c = pearson(av, bv)
    if (Math.abs(c) > Math.abs(best.corr)) best = { lag, corr: c }
  }
  return best
}

// Symmetric convenience wrapper: searches [-maxLag, maxLag].
export function bestLag(a: number[], b: number[], maxLag: number): { lag: number; corr: number } {
  return bestLagInRange(a, b, -maxLag, maxLag)
}

export function dominantFreq(x: number[], fs: number): number {
  let crossings = 0
  for (let i = 1; i < x.length; i++) {
    if ((x[i - 1] <= 0 && x[i] > 0) || (x[i - 1] >= 0 && x[i] < 0)) crossings++
  }
  const seconds = x.length / fs
  return crossings / 2 / seconds // two zero-crossings per cycle
}
