import type { Product, SeedData } from '@/data/types'
import { round2 } from './metrics'
import type { DateRange, MetricScope } from './metrics'
import { joinCodeSpendToOutcomes, scopedRows } from './metrics'

// Products the ROI calculator covers — Office Agents is out of scope (per
// the request, which named Code/Chat/Cowork specifically). Still used
// wherever a *real* per-product spend figure is needed (e.g. the See tab's
// product filter, the user table's per-product spend columns).
export const ROI_PRODUCTS: Product[] = ['Claude Code', 'Chat', 'Cowork']

// The ROI calculator's rows aren't all real `Product`s — Designs is an
// additional value category (modeled on the reference Analytics "Estimated
// time saved" panel) derived from existing Cowork activity rather than its
// own spend line. Kept as a separate id space from `Product` so it's never
// mistaken for something scopedRows/totalNetSpend can filter spend by.
export type RoiCategoryId = 'Claude Code' | 'Chat' | 'Cowork' | 'Designs'

export const ROI_CATEGORIES: RoiCategoryId[] = ['Claude Code', 'Chat', 'Cowork', 'Designs']

// Which real product each category's Product-filter narrowing follows —
// Designs tracks Cowork activity, so filtering the See tab to Cowork also
// narrows it.
const CATEGORY_PRODUCT: Record<RoiCategoryId, Product> = {
  'Claude Code': 'Claude Code',
  Chat: 'Chat',
  Cowork: 'Cowork',
  Designs: 'Cowork',
}

export interface RoiAssumption {
  id: RoiCategoryId
  unitLabel: string
  minutesSavedPerUnit: number
  hourlyRateUsd: number
}

// Pre-filled "industry standard" defaults, editable by the admin. The
// Claude Code and Chat minute figures intentionally match the reference
// Analytics "Estimated time saved" panel (150 min/PR, 4 min/conversation),
// as does Designs (30 min/design).
export const DEFAULT_ROI_ASSUMPTIONS: RoiAssumption[] = [
  { id: 'Claude Code', unitLabel: 'PR merged', minutesSavedPerUnit: 150, hourlyRateUsd: 59 },
  { id: 'Chat', unitLabel: 'conversation', minutesSavedPerUnit: 4, hourlyRateUsd: 60 },
  { id: 'Cowork', unitLabel: 'session', minutesSavedPerUnit: 30, hourlyRateUsd: 75 },
  { id: 'Designs', unitLabel: 'design', minutesSavedPerUnit: 30, hourlyRateUsd: 75 },
]

// Chat/Cowork have no "conversation"/"session" field in this seed's
// schema — only total_requests (individual messages/tool calls). Counting
// every request as its own unit would wildly overcount, since one real
// conversation or Cowork session spans many requests. This divisor
// converts requests into an approximate unit count.
const REQUESTS_PER_UNIT: Partial<Record<Product, number>> = {
  Chat: 20,
  Cowork: 30,
}

// Designs count from Cowork's total_requests, on the assumption that only
// a fraction of Cowork sessions produce a distinct artifact.
const COWORK_REQUESTS_PER_DESIGN = 70

export type RoiOverrideField = 'minutesSavedPerUnit' | 'hourlyRateUsd'
export type RoiOverrideMap = Partial<Record<RoiCategoryId, Partial<Record<RoiOverrideField, number>>>>

export function effectiveRoiAssumption(id: RoiCategoryId, overrides: RoiOverrideMap): RoiAssumption {
  const base = DEFAULT_ROI_ASSUMPTIONS.find((a) => a.id === id)
  if (!base) throw new Error(`No default ROI assumption for category: ${id}`)
  const override = overrides[id]
  return {
    ...base,
    minutesSavedPerUnit: override?.minutesSavedPerUnit ?? base.minutesSavedPerUnit,
    hourlyRateUsd: override?.hourlyRateUsd ?? base.hourlyRateUsd,
  }
}

// "Verified output" count for a real product. Claude Code uses merged PRs
// (a real countable event). Chat and Cowork derive an approximate
// conversation/session count from total_requests ÷ REQUESTS_PER_UNIT —
// documented in the README. May return a fractional count; round for
// display only.
export function verifiedOutputCount(
  data: SeedData,
  scope: MetricScope,
  product: Product,
  range?: DateRange,
): number {
  if (product === 'Claude Code') {
    const { matchedOutcomes } = joinCodeSpendToOutcomes(data, { ...scope, product }, range)
    return matchedOutcomes.filter((o) => o.state === 'merged').length
  }
  const totalRequests = scopedRows(data, { ...scope, product }, range).reduce(
    (sum, r) => sum + r.total_requests,
    0,
  )
  return totalRequests / (REQUESTS_PER_UNIT[product] ?? 1)
}

// Same idea as verifiedOutputCount, but for the one category that isn't a
// real product — dispatches to the ROI_PRODUCTS path for the other three
// so callers can treat all four categories uniformly.
export function categoryOutputCount(
  data: SeedData,
  scope: MetricScope,
  category: RoiCategoryId,
  range?: DateRange,
): number {
  if (category === 'Designs') {
    const totalRequests = scopedRows(data, { ...scope, product: 'Cowork' }, range).reduce(
      (sum, r) => sum + r.total_requests,
      0,
    )
    return totalRequests / COWORK_REQUESTS_PER_DESIGN
  }
  return verifiedOutputCount(data, scope, category, range)
}

export function estimatedValueUsd(
  data: SeedData,
  scope: MetricScope,
  category: RoiCategoryId,
  assumption: RoiAssumption,
  range?: DateRange,
): number {
  const count = categoryOutputCount(data, scope, category, range)
  const hoursSaved = (count * assumption.minutesSavedPerUnit) / 60
  return round2(hoursSaved * assumption.hourlyRateUsd)
}

// Combined estimated value across every ROI category (Code + Chat + Cowork
// + Designs) — the single number used wherever a table needs one
// "Est. value" figure for a scope, rather than a per-category breakdown.
// When scope.product is set (e.g. the See tab's Product filter), narrows
// to just the categories tied to that product instead of summing all four
// — mirrors how totalNetSpend already behaves under a product filter
// (Designs follows Cowork).
export function totalEstimatedValueUsd(
  data: SeedData,
  scope: MetricScope,
  overrides: RoiOverrideMap,
  range?: DateRange,
): number {
  const categories = scope.product
    ? ROI_CATEGORIES.filter((c) => CATEGORY_PRODUCT[c] === scope.product)
    : ROI_CATEGORIES
  return round2(
    categories.reduce((sum, category) => {
      const assumption = effectiveRoiAssumption(category, overrides)
      return sum + estimatedValueUsd(data, scope, category, assumption, range)
    }, 0),
  )
}
