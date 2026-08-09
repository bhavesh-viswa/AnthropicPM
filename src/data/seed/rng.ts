// Deterministic PRNG (mulberry32) — never use Math.random() in seed code, so
// the generated dataset (and the exact numbers quoted in the README) is
// byte-identical on every run.

export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let a = seed
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randFloat(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min)
}

export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(randFloat(rng, min, max + 1))
}

export function chance(rng: Rng, probability: number): boolean {
  return rng() < probability
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]
}

export function pickWeighted<T>(
  rng: Rng,
  items: readonly { value: T; weight: number }[],
): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0)
  let roll = rng() * total
  for (const item of items) {
    roll -= item.weight
    if (roll <= 0) return item.value
  }
  return items[items.length - 1].value
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

// --- date helpers (fixed synthetic window, not tied to wall-clock time) ---

export function dateRange(startIso: string, endIso: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${startIso}T00:00:00Z`)
  const end = new Date(`${endIso}T00:00:00Z`)
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}
