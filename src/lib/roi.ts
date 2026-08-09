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
  { product: 'Claude Code', unitLabel: 'PR merged', minutesSavedPerUnit: 150, hourlyRateUsd: 85 },
  { product: 'Chat', unitLabel: 'conversation', minutesSavedPerUnit: 4, hourlyRateUsd: 60 },
  { product: 'Cowork', unitLabel: 'session', minutesSavedPerUnit: 30, hourlyRateUsd: 75 },
]

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
// countable event). Chat and Cowork have no finer-grained unit in this
// seed's schema, so total_requests stands in as a proxy for
// "conversations"/"sessions" — documented in the README.
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
  return scopedRows(data, { ...scope, product }, range).reduce((sum, r) => sum + r.total_requests, 0)
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
