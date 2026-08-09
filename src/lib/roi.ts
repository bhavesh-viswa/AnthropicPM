import type { Product, SeedData } from '@/data/types'
import { round2 } from './metrics'
import type { DateRange, MetricScope } from './metrics'
import { joinCodeSpendToOutcomes, scopedRows } from './metrics'

// Products the ROI calculator covers — Office Agents is out of scope (per
// the request, which named Code/Chat/Cowork specifically).
export const ROI_PRODUCTS: Product[] = ['Claude Code', 'Chat', 'Cowork']

export interface RoiAssumption {
  product: Product
  unitLabel: string
  minutesSavedPerUnit: number
  hourlyRateUsd: number
}

// Pre-filled "industry standard" defaults, editable by the admin. The
// Claude Code and Chat minute figures intentionally match the reference
// Analytics "Estimated time saved" panel (150 min/PR, 4 min/conversation).
export const DEFAULT_ROI_ASSUMPTIONS: RoiAssumption[] = [
  { product: 'Claude Code', unitLabel: 'PR merged', minutesSavedPerUnit: 150, hourlyRateUsd: 65 },
  { product: 'Chat', unitLabel: 'conversation', minutesSavedPerUnit: 4, hourlyRateUsd: 60 },
  { product: 'Cowork', unitLabel: 'session', minutesSavedPerUnit: 30, hourlyRateUsd: 75 },
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

export type RoiOverrideField = 'minutesSavedPerUnit' | 'hourlyRateUsd'
export type RoiOverrideMap = Partial<Record<Product, Partial<Record<RoiOverrideField, number>>>>

export function effectiveRoiAssumption(product: Product, overrides: RoiOverrideMap): RoiAssumption {
  const base = DEFAULT_ROI_ASSUMPTIONS.find((a) => a.product === product)
  if (!base) throw new Error(`No default ROI assumption for product: ${product}`)
  const override = overrides[product]
  return {
    ...base,
    minutesSavedPerUnit: override?.minutesSavedPerUnit ?? base.minutesSavedPerUnit,
    hourlyRateUsd: override?.hourlyRateUsd ?? base.hourlyRateUsd,
  }
}

// "Verified output" count per product. Claude Code uses merged PRs (a real
// countable event). Chat and Cowork derive an approximate conversation/
// session count from total_requests ÷ REQUESTS_PER_UNIT — documented in
// the README. May return a fractional count; round for display only.
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

export function estimatedValueUsd(
  data: SeedData,
  scope: MetricScope,
  product: Product,
  assumption: RoiAssumption,
  range?: DateRange,
): number {
  const count = verifiedOutputCount(data, scope, product, range)
  const hoursSaved = (count * assumption.minutesSavedPerUnit) / 60
  return round2(hoursSaved * assumption.hourlyRateUsd)
}

// Combined estimated value across every ROI-covered product (Code + Chat +
// Cowork) — the single number used wherever a table needs one "Est. value"
// figure for a scope, rather than a per-product breakdown. When
// scope.product is set (e.g. the See tab's Product filter), narrows to
// just that product instead of summing all three — mirrors how
// totalNetSpend already behaves under a product filter.
export function totalEstimatedValueUsd(
  data: SeedData,
  scope: MetricScope,
  overrides: RoiOverrideMap,
  range?: DateRange,
): number {
  const products = scope.product
    ? ROI_PRODUCTS.filter((p) => p === scope.product)
    : ROI_PRODUCTS
  return round2(
    products.reduce((sum, product) => {
      const assumption = effectiveRoiAssumption(product, overrides)
      return sum + estimatedValueUsd(data, scope, product, assumption, range)
    }, 0),
  )
}
